#!/usr/bin/env node
/**
 * Two students, one laptop, then an unreachable server.
 * Run: node build/test_class_browser.js
 */
'use strict';

const assert = require('assert');
const {spawn} = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const chrome = require('./chrome_cdp.js');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.THINKA_SHOTS || '/opt/cursor/artifacts/screenshots';
let passed = 0;

function test(name) {
  passed++;
  console.log('ok  ' + name);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function startServer(port, dataDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath.replace(/node$/, 'python3') === process.execPath ?
        'python3' : 'python3', [
      path.join(ROOT, 'build', 'serve.py'),
      '--bind', '127.0.0.1',
      '--port', String(port),
      '--root', path.join(ROOT, 'appengine'),
    ], {
      cwd: ROOT,
      env: Object.assign({}, process.env, {
        PYTHONUNBUFFERED: '1',
        THINKA_DATA_DIR: dataDir,
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('server did not start\n' + log));
    }, 10000);
    function take(chunk) {
      log += chunk.toString();
      if (log.indexOf('Thinka hub:') !== -1) {
        clearTimeout(timer);
        resolve(proc);
      }
    }
    proc.stdout.on('data', take);
    proc.stderr.on('data', take);
    proc.on('exit', (code) => {
      if (code) {
        clearTimeout(timer);
        reject(new Error('server exited ' + code + '\n' + log));
      }
    });
  });
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1',
      port: port,
      path: urlPath,
      method: method,
      headers: data ? {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)} : {},
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let parsed = raw;
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          parsed = raw;
        }
        resolve({status: res.statusCode, body: parsed});
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function readRoster(dataDir) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'thinka-class.json'), 'utf8'));
}

function studentNamed(dataDir, name) {
  const data = readRoster(dataDir);
  return Object.values(data.students).find((student) => student.firstName === name);
}

async function pickAnimals(cdp, animals) {
  for (const id of animals) {
    await chrome.click(cdp, '[data-animal="' + id + '"]');
  }
  await chrome.click(cdp, '#whoOk');
}

async function signIn(cdp, className, studentName, animals, needsConfirm) {
  await chrome.waitFor(cdp, "document.body && document.body.innerText.indexOf('Your class') !== -1");
  await chrome.clickText(cdp, '[data-class]', className);
  await chrome.waitFor(cdp, "document.body.innerText.indexOf(" + JSON.stringify(studentName) + ") !== -1");
  await chrome.clickText(cdp, '[data-student]', studentName);
  await chrome.waitFor(cdp, "document.querySelector('[data-animal]')");
  await pickAnimals(cdp, animals);
  if (needsConfirm) {
    await chrome.waitFor(cdp, "document.querySelector('.who-title') && document.querySelector('.who-title').textContent === 'Again'");
    await pickAnimals(cdp, animals);
  }
  await chrome.waitFor(cdp, "document.getElementById('thinkaSwitch')");
}

async function flush(cdp) {
  return chrome.evaluate(cdp, 'new Promise(function(resolve){ThinkaClass.flushNow(function(ok){resolve(!!ok);});})');
}

async function main() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thinka-roster-'));
  const port = await freePort();
  const server = await startServer(port, dataDir);
  const browser = await chrome.launchChrome(1280, 800);
  const base = 'http://127.0.0.1:' + port;
  try {
    const tuesday = await request(port, 'POST', '/class/api/classes', {name: 'Tuesday', grade: 2});
    const friday = await request(port, 'POST', '/class/api/classes', {name: 'Friday', grade: 5, pinRequired: false});
    assert.strictEqual(tuesday.body.ok, true);
    assert.strictEqual(friday.body.ok, true);
    const classId = tuesday.body['class'].id;
    await request(port, 'POST', '/class/api/classes/' + classId + '/students', {firstName: 'Amahle', surnameInitial: 'K'});
    await request(port, 'POST', '/class/api/classes/' + classId + '/students', {firstName: 'Thabo', surnameInitial: ''});
    test('two classes and two students are on the server');

    const cdp = browser.cdp;
    await chrome.go(cdp, base + '/index.html');
    await chrome.waitFor(cdp, "document.body && document.body.innerText.indexOf('Your class') !== -1");
    await chrome.screenshot(cdp, path.join(SHOTS, 'class-picker.png'));
    await chrome.clickText(cdp, '[data-class]', 'Tuesday');
    await chrome.waitFor(cdp, "document.body.innerText.indexOf('Amahle') !== -1 && document.body.innerText.indexOf('Thabo') !== -1");
    await chrome.screenshot(cdp, path.join(SHOTS, 'name-picker.png'));
    await chrome.clickText(cdp, '[data-student]', 'Amahle');
    await chrome.waitFor(cdp, "document.querySelector('[data-animal=\"lion\"]')");
    await chrome.screenshot(cdp, path.join(SHOTS, 'picture-password.png'));
    await pickAnimals(cdp, ['lion', 'owl']);
    await chrome.waitFor(cdp, "document.querySelector('.who-title') && document.querySelector('.who-title').textContent === 'Again'");
    await pickAnimals(cdp, ['lion', 'owl']);
    await chrome.waitFor(cdp, "document.getElementById('thinkaStudentBar') && document.getElementById('thinkaStudentBar').textContent.indexOf('Amahle') !== -1");
    test('Amahle is signed in on this laptop');

    await chrome.evaluate(cdp, "localStorage.setItem('thinkaTeacherPassword', 'off')");
    await chrome.evaluate(cdp, "localStorage.setItem('maze_g1_sequence1', 'level-a')");
    assert.strictEqual(await flush(cdp), true);
    assert.strictEqual(studentNamed(dataDir, 'Amahle').progress.maze_g1_sequence1, 'level-a');
    test('Amahle maze progress reached the teacher laptop');

    await chrome.click(cdp, '#thinkaSwitch');
    await chrome.waitFor(cdp, "document.body && document.body.innerText.indexOf('Your class') !== -1");
    const cleared = await chrome.evaluate(cdp, "({maze: localStorage.getItem('maze_g1_sequence1'), session: localStorage.getItem('thinkaStudentSession'), password: localStorage.getItem('thinkaTeacherPassword')})");
    assert.strictEqual(cleared.maze, null);
    assert.strictEqual(cleared.session, null);
    assert.strictEqual(cleared.password, 'off');
    assert.strictEqual(studentNamed(dataDir, 'Amahle').progress.maze_g1_sequence1, 'level-a');
    test('sign-out clears this laptop and keeps her server progress and the teacher password');

    await signIn(cdp, 'Tuesday', 'Thabo', ['frog', 'bee'], true);
    const thaboLocal = await chrome.evaluate(cdp, "localStorage.getItem('maze_g1_sequence1')");
    assert.strictEqual(thaboLocal, null);
    await chrome.evaluate(cdp, "localStorage.setItem('maze_g1_sequence1', 'level-b')");
    assert.strictEqual(await flush(cdp), true);
    assert.strictEqual(studentNamed(dataDir, 'Thabo').progress.maze_g1_sequence1, 'level-b');
    assert.strictEqual(studentNamed(dataDir, 'Amahle').progress.maze_g1_sequence1, 'level-a');
    test('Thabo on the same laptop does not see or overwrite Amahle');

    await chrome.click(cdp, '#thinkaSwitch');
    await chrome.waitFor(cdp, "document.body && document.body.innerText.indexOf('Your class') !== -1");
    await signIn(cdp, 'Tuesday', 'Amahle', ['lion', 'owl'], false);
    const back = await chrome.evaluate(cdp, "localStorage.getItem('maze_g1_sequence1')");
    assert.strictEqual(back, 'level-a');
    test('Amahle gets her maze back on the same laptop');

    await chrome.evaluate(cdp, [
      '(function(){',
      '  window.__thinkaOffline = true;',
      '  var open = XMLHttpRequest.prototype.open;',
      '  var send = XMLHttpRequest.prototype.send;',
      '  XMLHttpRequest.prototype.open = function(method, url){ this.__url = url; return open.apply(this, arguments); };',
      '  XMLHttpRequest.prototype.send = function(){',
      '    if (window.__thinkaOffline && String(this.__url).indexOf("/class/api/progress") !== -1) {',
      '      var xhr = this;',
      '      setTimeout(function(){ if (xhr.onerror) xhr.onerror(); }, 0);',
      '      return;',
      '    }',
      '    return send.apply(this, arguments);',
      '  };',
      '})()',
    ].join('\n'));
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await chrome.evaluate(cdp, "localStorage.setItem('maze_g1_sequence2', 'queued')");
    assert.strictEqual(await flush(cdp), false);
    const queued = await chrome.evaluate(cdp, "localStorage.getItem('thinkaSyncQueue')");
    assert.ok(queued && queued.indexOf('maze_g1_sequence2') !== -1 && queued.indexOf('queued') !== -1);
    assert.strictEqual(studentNamed(dataDir, 'Amahle').progress.maze_g1_sequence2, undefined);
    test('an unreachable server keeps the change in the local queue');

    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await chrome.evaluate(cdp, 'window.__thinkaOffline = false; window.dispatchEvent(new Event("online"));');
    let synced = false;
    const started = Date.now();
    while (Date.now() - started < 5000) {
      await flush(cdp);
      if (studentNamed(dataDir, 'Amahle').progress.maze_g1_sequence2 === 'queued') {
        synced = true;
        break;
      }
      await chrome.sleep(100);
    }
    assert.strictEqual(synced, true);
    const queueLeft = await chrome.evaluate(cdp, "localStorage.getItem('thinkaSyncQueue')");
    assert.ok(!queueLeft || queueLeft === '{}' || queueLeft.indexOf('maze_g1_sequence2') === -1);
    test('reconnect sends the queued progress');

    await chrome.evaluate(cdp, "localStorage.removeItem('thinkaTeacherPassword')");
    await chrome.go(cdp, base + '/class.html');
    await chrome.waitFor(cdp, "document.getElementById('currentPassword')");
    await chrome.evaluate(cdp, "document.getElementById('currentPassword').value = 'thinka'");
    await chrome.click(cdp, '#gateForm button');
    await chrome.waitFor(cdp, "document.getElementById('classApp') && !document.getElementById('classApp').hidden");
    await chrome.clickText(cdp, '.class-pick', 'Tuesday');
    await chrome.waitFor(cdp, "document.getElementById('progressTable') && document.getElementById('progressTable').innerText.indexOf('Amahle') !== -1");
    await chrome.evaluate(cdp, "window.scrollTo(0, 0)");
    await chrome.sleep(100);
    await chrome.screenshot(cdp, path.join(SHOTS, 'teacher-dashboard.png'), true);
    const table = await chrome.evaluate(cdp, "document.getElementById('progressTable').innerText");
    assert.ok(table.indexOf('Amahle') !== -1);
    assert.ok(table.indexOf('Yes') !== -1);
    test('teacher dashboard shows Amahle after the password');
  } finally {
    await browser.close();
    server.kill('SIGKILL');
    fs.rmSync(dataDir, {recursive: true, force: true});
  }
  console.log('\n' + passed + ' tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
