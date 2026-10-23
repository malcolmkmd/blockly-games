/**
 * Small Chrome DevTools helper for headless classroom tests.
 * Node 22 provides a global WebSocket. No extra packages.
 */
'use strict';

const {spawn} = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

function chromeBin() {
  return process.env.CHROME || '/usr/local/bin/google-chrome';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({host: '127.0.0.1', port: port, path: pathname}, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.next = 1;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (err) => reject(err));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const {resolve, reject} = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result || {});
        }
      }
    });
  }

  async send(method, params) {
    await this.ready;
    const id = this.next++;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
    });
    this.ws.send(JSON.stringify({id: id, method: method, params: params || {}}));
    return result;
  }

  close() {
    try {
      this.ws.close();
    } catch (err) {
      // The browser is going away too.
    }
  }
}

async function launchChrome(width, height) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinka-chrome-'));
  const proc = spawn(chromeBin(), [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--hide-scrollbars',
    '--remote-debugging-port=0',
    '--window-size=' + width + ',' + height,
    '--user-data-dir=' + dir,
    'about:blank',
  ], {stdio: ['ignore', 'pipe', 'pipe']});
  let log = '';
  const browserUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('chrome did not start\n' + log)), 20000);
    function take(chunk) {
      log += chunk.toString();
      const matched = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (matched) {
        clearTimeout(timer);
        resolve(matched[1]);
      }
    }
    proc.stdout.on('data', take);
    proc.stderr.on('data', take);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('chrome exited ' + code + '\n' + log));
    });
  });
  const debugPort = new URL(browserUrl).port;
  let page = null;
  const started = Date.now();
  while (!page && Date.now() - started < 8000) {
    const list = await getJson(debugPort, '/json/list');
    page = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (!page) {
      await sleep(50);
    }
  }
  if (!page) {
    proc.kill('SIGKILL');
    throw new Error('no chrome page');
  }
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return {
    proc: proc,
    dir: dir,
    cdp: cdp,
    async close() {
      cdp.close();
      proc.kill('SIGKILL');
      await sleep(100);
      fs.rmSync(dir, {recursive: true, force: true});
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const text = (details.exception && details.exception.description) || details.text;
    throw new Error(text || 'evaluate failed');
  }
  return result.result ? result.result.value : undefined;
}

async function go(cdp, url) {
  await cdp.send('Page.navigate', {url: url});
  const start = Date.now();
  while (Date.now() - start < 10000) {
    const state = await evaluate(cdp, 'document.readyState');
    if (state === 'complete') {
      return;
    }
    await sleep(40);
  }
  throw new Error('page did not load ' + url);
}

async function waitFor(cdp, expression, timeout) {
  const start = Date.now();
  const limit = timeout || 8000;
  let last;
  while (Date.now() - start < limit) {
    last = await evaluate(cdp, expression);
    if (last) {
      return last;
    }
    await sleep(60);
  }
  throw new Error('timeout ' + expression + ' last=' + JSON.stringify(last));
}

async function click(cdp, selector) {
  const ok = await evaluate(cdp,
      '(function(){var el=document.querySelector(' + JSON.stringify(selector) +
      ');if(!el)return false;el.click();return true;})()');
  if (!ok) {
    throw new Error('missing ' + selector);
  }
}

async function clickText(cdp, selector, text) {
  const ok = await evaluate(cdp,
      '(function(){var nodes=document.querySelectorAll(' + JSON.stringify(selector) +
      ');var i;for(i=0;i<nodes.length;i++){if(nodes[i].textContent.indexOf(' +
      JSON.stringify(text) + ')!==-1){nodes[i].click();return true;}}return false;})()');
  if (!ok) {
    throw new Error('missing ' + selector + ' text ' + text);
  }
}

async function screenshot(cdp, file, full) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const opts = {format: 'png'};
  if (full) {
    const metrics = await cdp.send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize;
    opts.captureBeyondViewport = true;
    opts.clip = {
      x: 0,
      y: 0,
      width: Math.ceil(size.width),
      height: Math.min(Math.ceil(size.height), 2200),
      scale: 1,
    };
  }
  const shot = await cdp.send('Page.captureScreenshot', opts);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
}

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: width,
    height: height,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

module.exports = {
  launchChrome: launchChrome,
  evaluate: evaluate,
  go: go,
  waitFor: waitFor,
  click: click,
  clickText: clickText,
  screenshot: screenshot,
  setViewport: setViewport,
  sleep: sleep,
};
