#!/usr/bin/env node
/**
 * Guardrails: runtime source must not call a backend or CDN.
 * Run: node build/test_offline_first.js
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

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'third-party' || name === 'generated' || name === 'json') {
        continue;
      }
      walk(full, acc);
    } else if (/\.(js|html|py|yaml|sh)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const srcFiles = walk(path.join(ROOT, 'appengine'), [])
    .concat([
      path.join(ROOT, 'Makefile'),
      path.join(ROOT, 'build', 'compress.py'),
    ]);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('index hub does not depend on compiled compressed.js', () => {
  const boot = read('appengine/common/boot.js');
  assert.match(boot, /index\/hub\.js/);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/index.html')), true);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/index/hub.js')), true);
});

test('IS_HTML is hardcoded true', () => {
  const src = read('appengine/src/lib-games.js');
  assert.match(src, /BlocklyGames\.IS_HTML\s*=\s*true/);
  assert.doesNotMatch(src, /BlocklyGames\.IS_HTML\s*=\s*\/\\\.html/);
});

test('error reporter and analytics are gone from lib-games.js', () => {
  const src = read('appengine/src/lib-games.js');
  assert.doesNotMatch(src, /errorReporter/);
  assert.doesNotMatch(src, /google-analytics/);
  assert.doesNotMatch(src, /XMLHttpRequest/);
  assert.doesNotMatch(src, /importAnalytics/);
});

test('cloud storage and gallery libraries are deleted', () => {
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/src/lib-storage.js')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/src/lib-gallery.js')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/storage.py')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/errorReporter.py')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/reddit.py')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/app.yaml')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/deploy.sh')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/gallery.html')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/admin.html')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/gallery')), false);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'appengine/gallery_api')), false);
});

test('runtime sources do not POST to server endpoints', () => {
  const forbidden = [
    /['"]\/storage['"]/,
    /['"]\/errorReporter['"]/,
    /\/gallery-api\//,
    /google-analytics\.com/,
    /blockly-games\.appspot\.com/,
    /BlocklyStorage/,
    /BlocklyGallery/,
  ];
  const hits = [];
  for (const file of srcFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const re of forbidden) {
      if (re.test(text)) {
        hits.push(path.relative(ROOT, file) + ' matches ' + re);
      }
    }
  }
  assert.deepStrictEqual(hits, []);
});

test('Makefile games target no longer builds gallery', () => {
  const mk = read('Makefile');
  assert.match(mk, /^games: .+$/m);
  const gamesLine = mk.match(/^games: (.+)$/m)[1];
  assert.doesNotMatch(gamesLine, /\bgallery\b/);
  assert.match(mk, /^offline:/m);
  assert.match(mk, /git clone/);
  assert.match(mk, /SHELL := \/bin\/bash/);
  assert.doesNotMatch(mk, /\bsvn\b/);
});

test('teacher config still ships for offline unlock', () => {
  const src = read('appengine/src/thinka.config.js');
  assert.match(src, /TEACHER_PASSWORD\s*=\s*'thinka'/);
});

console.log('\n' + passed + ' tests passed');
