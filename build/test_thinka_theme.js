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
  assert.match(css, /--thinka-orange:\s*#FF5A1F/i);
  assert.match(css, /--thinka-sky:\s*#60A5FA/i);
  assert.match(css, /--thinka-blue:\s*#3B82F6/i);
  assert.match(css, /--thinka-navy:\s*#0A1628/i);
  assert.match(css, /--thinka-cream:\s*#FFF8F1/i);
  assert.match(css, /--thinka-success:\s*#16A34A/i);
  assert.doesNotMatch(css, /fonts\.googleapis/);
});

test('common.css imports tokens and drops Google red', () => {
  const css = read('appengine/common/common.css');
  assert.match(css, /@import url\("thinka-theme\.css"\)/);
  assert.match(css, /button\.primary/);
  assert.match(css, /var\(--thinka-orange\)/);
  assert.match(css, /var\(--thinka-blue\)/);
  assert.doesNotMatch(css, /#dd4b39/i);
  assert.doesNotMatch(css, /#4d90fe/i);
});

test('hub markup is card-based and Thinka-named', () => {
  const html = read('appengine/index/src/html.js');
  assert.match(html, /thinka-card/);
  assert.match(html, /Thinka/);
  assert.doesNotMatch(html, /title\.svg/);
  const index = read('appengine/index.html');
  assert.match(index, /Thinka Games/);
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
