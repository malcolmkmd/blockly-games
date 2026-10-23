#!/usr/bin/env node
/**
 * Play the Week 1 explainer in headless Chromium.
 * Run: node build/test_lessons_play.js
 */
'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const {spawn} = require('child_process');
const cdp = require('./chrome_cdp');

const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.THINKA_SHOTS || '/opt/cursor/artifacts/screenshots';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((err) => err ? reject(err) : resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUp(port) {
  const start = Date.now();
  while (Date.now() - start < 8000) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:' + port + '/lessons.html', (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else reject(new Error('status ' + res.statusCode));
        });
        req.on('error', reject);
      });
      return;
    } catch (err) {
      await sleep(40);
    }
  }
  throw new Error('lessons page did not start');
}

async function drag(browser, fromSel, toSel) {
  const boxes = await cdp.evaluate(browser, `(function(){
    function box(sel){
      var el = document.querySelector(sel);
      if (!el) return null;
      var r = el.getBoundingClientRect();
      return {x: r.left + r.width / 2, y: r.top + r.height / 2};
    }
    return {from: box(${JSON.stringify(fromSel)}), to: box(${JSON.stringify(toSel)})};
  })()`);
  if (!boxes || !boxes.from || !boxes.to) {
    throw new Error('drag targets missing ' + JSON.stringify(boxes));
  }
  const from = boxes.from;
  const to = boxes.to;
  await browser.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1,
  });
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * (i / steps);
    const y = from.y + (to.y - from.y) * (i / steps);
    await browser.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: x, y: y, button: 'left', buttons: 1,
    });
    await sleep(20);
  }
  await browser.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1,
  });
}

async function play(browser, band, shots) {
  const base = browser._origin;
  await cdp.go(browser, base + '/lesson-play.html?week=1&band=' + band + '&fast=1&stay=1');
  await cdp.waitFor(browser,
      `document.getElementById('xpRoot') && document.getElementById('xpRoot').getAttribute('data-scene')==='meet' && document.getElementById('xpRobot') && document.getElementById('xpRobot').getAttribute('class').indexOf('face-asleep')!==-1`);
  const overflow = await cdp.evaluate(browser,
      'document.documentElement.scrollWidth <= window.innerWidth + 2');
  assert.strictEqual(overflow, true, band + ' page is wider than the window');
  if (band === 'senior') {
    const term = await cdp.evaluate(browser, `(function(){
      var el = document.getElementById('xpTerm');
      return el && !el.hidden && el.textContent;
    })()`);
    assert.match(term, /sequence/);
    assert.match(term, /algorithm/);
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-senior-terms.png'));
  }
  if (shots) {
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-1-meet.png'));
  }
  await cdp.click(browser, '#xpWake');
  await cdp.waitFor(browser, `!document.getElementById('xpNext').hidden`);
  await cdp.click(browser, '#xpNext');
  await cdp.waitFor(browser, `document.getElementById('xpRoot').getAttribute('data-scene')==='arrows'`);
  if (shots) {
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-2-arrows.png'));
  }
  await drag(browser, '[data-arrow="right"]', '.xp-slot');
  await cdp.waitFor(browser, `!document.getElementById('xpNext').hidden`, 8000);
  await cdp.click(browser, '#xpNext');
  await cdp.waitFor(browser, `document.getElementById('xpRoot').getAttribute('data-scene')==='order'`);
  if (shots) {
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-3-order.png'));
  }
  await cdp.click(browser, '#xpChoiceBad');
  await cdp.waitFor(browser, `document.getElementById('xpHint').textContent.indexOf('Try again')!==-1`);
  await cdp.click(browser, '#xpChoiceGood');
  await cdp.waitFor(browser, `!document.getElementById('xpNext').hidden`);
  await cdp.click(browser, '#xpNext');
  await cdp.waitFor(browser, `document.getElementById('xpRoot').getAttribute('data-scene')==='program'`);
  if (shots) {
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-4-program.png'));
  }
  const steps = await cdp.evaluate(browser, `(function(){
    var slots = document.querySelectorAll('.xp-slot');
    return slots.length;
  })()`);
  const presses = {foundation: ['right', 'right'], intermediate: ['right', 'right', 'up'],
    senior: ['right', 'right', 'up', 'right']}[band];
  assert.strictEqual(steps, presses.length);
  for (const dir of presses) {
    await cdp.click(browser, '[data-arrow="' + dir + '"]');
    await sleep(30);
  }
  await cdp.click(browser, '#xpRun');
  await cdp.waitFor(browser, `!document.getElementById('xpNext').hidden`, 8000);
  await cdp.click(browser, '#xpNext');
  await cdp.waitFor(browser,
      `document.getElementById('xpRoot').getAttribute('data-scene')==='bug' && document.getElementById('xpBug') && document.getElementById('xpHint').textContent.length > 0`);
  if (shots) {
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-5-bug.png'));
  }
  await cdp.click(browser, '#xpBug');
  await cdp.waitFor(browser, `!document.getElementById('xpCelebrate').hidden`, 8000);
  if (shots) {
    await sleep(80);
    await cdp.screenshot(browser, path.join(SHOTS, 'explainer-celebration.png'));
  }
  const done = await cdp.evaluate(browser, `(function(){
    return {
      flag: localStorage.getItem('thinkaLesson_w1_explainer'),
      href: document.getElementById('xpMaze').getAttribute('href'),
      yay: document.querySelector('.xp-yay').textContent
    };
  })()`);
  assert.strictEqual(done.flag, '1');
  assert.strictEqual(done.href, 'maze.html?stage=1&unit=sequence&level=1');
  assert.match(done.yay, /You did it/);
}

async function main() {
  const port = await freePort();
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: path.join(ROOT, 'appengine'),
    stdio: 'ignore',
  });
  let chrome = null;
  try {
    await waitUp(port);
    const origin = 'http://127.0.0.1:' + port;
    chrome = await cdp.launchChrome(1280, 800);
    const browser = chrome.cdp;
    browser._origin = origin;
    await cdp.go(browser, origin + '/lessons.html');
    await cdp.waitFor(browser, `document.body && document.body.innerText.indexOf('Sequencing')!==-1 && document.body.innerText.indexOf('Coming soon')!==-1`);
    const page = await cdp.evaluate(browser, `(function(){
      return {
        weeks: document.querySelectorAll('article.lesson-card').length,
        soon: document.querySelectorAll('.lesson-card.is-soon').length,
        explainer: document.getElementById('startExplainer').getAttribute('href'),
        exercise: document.getElementById('startExercise').getAttribute('href'),
        early: document.getElementById('startEarly').getAttribute('href'),
        notes: !!document.getElementById('teacherNotes'),
        pairs: document.getElementById('exerciseNote').textContent
      };
    })()`);
    assert.strictEqual(page.weeks, 10);
    assert.strictEqual(page.soon, 9);
    assert.match(page.explainer, /lesson-play\.html\?week=1&band=foundation/);
    assert.strictEqual(page.exercise, 'maze.html?stage=1&unit=sequence&level=1');
    assert.strictEqual(page.early, 'maze.html?stage=1&unit=sequence&level=2');
    assert.strictEqual(page.notes, true);
    assert.match(page.pairs, /pairs/i);
    await cdp.screenshot(browser, path.join(SHOTS, 'lessons-page.png'), true);
    await play(browser, 'foundation', true);
    await cdp.setViewport(browser, 1024, 768);
    await play(browser, 'senior', false);
    console.log('lessons play passed');
  } finally {
    if (chrome) await chrome.close();
    server.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
