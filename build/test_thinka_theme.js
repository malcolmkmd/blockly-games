#!/usr/bin/env node
/**
 * Guardrails for the Thinka visual system.
 * Run: node build/test_thinka_theme.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkCss(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'third-party' || name === 'generated') {
        continue;
      }
      walkCss(full, acc);
    } else if (name.endsWith('.css') || name.endsWith('.html')) {
      acc.push(full);
    }
  }
  return acc;
}

test('thinka theme tokens exist', () => {
  const css = read('appengine/common/thinka-theme.css');
  assert.match(css, /--thinka-orange:\s*#FF4500/i);
  assert.match(css, /--thinka-orange-hot:\s*#FF5A1F/i);
  assert.match(css, /--thinka-page:\s*#030A03/i);
  assert.match(css, /--thinka-surface:\s*#0A140A/i);
  assert.match(css, /--thinka-panel:\s*#121F12/i);
  assert.match(css, /--thinka-navy-accent:\s*#031666/i);
  assert.match(css, /--thinka-yellow:\s*#FACC15/i);
  assert.match(css, /--thinka-sky:\s*#60A5FA/i);
  assert.match(css, /--thinka-mint:\s*#4ADE80/i);
  assert.match(css, /--thinka-purple:\s*#C084FC/i);
  assert.match(css, /--thinka-pink:\s*#F472B6/i);
  assert.match(css, /Thinka Fredoka/);
  assert.match(css, /fonts\/fredoka-700\.woff2/);
  assert.doesNotMatch(css, /fonts\.googleapis/);
});

test('common.css imports tokens and drops Google red', () => {
  const css = read('appengine/common/common.css');
  assert.match(css, /@import url\("thinka-theme\.css"\)/);
  assert.match(css, /button\.primary/);
  assert.match(css, /var\(--thinka-orange\)/);
  assert.match(css, /var\(--thinka-navy-accent\)/);
  assert.doesNotMatch(css, /#dd4b39/i);
  assert.doesNotMatch(css, /#4d90fe/i);
});

test('bundled fonts ship next to the theme', () => {
  const dir = path.join(ROOT, 'appengine', 'common', 'fonts');
  for (const name of ['fredoka-600.woff2', 'fredoka-700.woff2',
                     'nunito-400.woff2', 'nunito-700.woff2']) {
    assert.strictEqual(fs.existsSync(path.join(dir, name)), true, name);
  }
});

test('repo-root index redirects into the static hub', () => {
  const root = read('index.html');
  assert.match(root, /appengine\/index\.html/);
  assert.match(root, /location\.replace\('appengine\/index\.html'\)/);
  assert.match(root, /#030A03/);
  assert.doesNotMatch(root, /id="path"/);
});

test('hub markup is a static game menu with featured play path', () => {
  const html = read('appengine/index/src/html.js');
  assert.match(html, /thinka-card/);
  assert.match(html, /thinka-featured/);
  assert.match(html, /thinkaPlayNow/);
  assert.match(html, /index\/art\/maze\.svg/);
  assert.match(html, /thinka-stars/);
  assert.doesNotMatch(html, /title\.svg/);
  const index = read('appengine/index.html');
  assert.match(index, /Thinka Games/);
  assert.match(index, /thinka-card--maze/);
  assert.match(index, /thinkaFeatured/);
  assert.match(index, /index\/art\/maze\.svg/);
  assert.match(index, /index\/hub\.js/);
  assert.doesNotMatch(index, /boot\.js/);
  assert.doesNotMatch(index, /compressed\.js/);
  assert.doesNotMatch(index, /id="path"/);
});

test('hub HTML is standalone and never loads compressed.js', () => {
  const boot = read('appengine/common/boot.js');
  assert.match(boot, /appName === 'index'/);
  assert.match(boot, /index\/hub\.js/);
  const hub = read('appengine/index/hub.js');
  assert.match(hub, /progress-' \+ app/);
  assert.match(hub, /detectLanguage/);
  assert.match(hub, /decorateFeatured/);
  assert.doesNotMatch(hub, /gauge-/);
});

test('hub ships local illustrated art for every game', () => {
  const dir = path.join(ROOT, 'appengine', 'index', 'art');
  for (const name of ['puzzle.svg', 'maze.svg', 'bird.svg', 'turtle.svg',
                     'movie.svg', 'music.svg', 'pond-tutor.svg',
                     'pond-duck.svg']) {
    const full = path.join(dir, name);
    assert.strictEqual(fs.existsSync(full), true, name);
    const svg = fs.readFileSync(full, 'utf8');
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /fonts\.googleapis/);
  }
});

test('runtime CSS/HTML do not require a CDN', () => {
  const files = walkCss(path.join(ROOT, 'appengine'), []);
  const hits = [];
  const forbidden = [
    /fonts\.googleapis/,
    /fonts\.gstatic/,
    /ajax\.googleapis/,
    /#dd4b39/i,
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of forbidden) {
      if (re.test(text)) {
        hits.push(path.relative(ROOT, file) + ' matches ' + re);
      }
    }
  }
  assert.deepStrictEqual(hits, []);
});

test('teacher unlock dialog ids are unchanged', () => {
  const src = read('appengine/src/html.js');
  assert.match(src, /id="dialogTeacherUnlock"/);
  assert.match(src, /id="teacherUnlockPassword"/);
  assert.match(src, /id="teacherUnlockOk"/);
  assert.match(src, /class="primary" id="teacherUnlockOk"/);
  assert.match(src, /class="thinka-header"/);
});

console.log('\n' + passed + ' tests passed');
