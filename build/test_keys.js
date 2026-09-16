#!/usr/bin/env node
/**
 * Unit tests for the Keys typing curriculum and engine.
 * Run: node build/test_keys.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadModule(rel, sandbox) {
  sandbox.goog = sandbox.goog || {
    provide: function(name) {
      const parts = name.split('.');
      let obj = sandbox;
      for (const part of parts) {
        obj[part] = obj[part] || {};
        obj = obj[part];
      }
    },
    require: function() {},
  };
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox;
}

const sandbox = {};
loadModule('appengine/keys/src/levels.js', sandbox);
loadModule('appengine/keys/src/engine.js', sandbox);
const Levels = sandbox.Keys.Levels;
const Engine = sandbox.Keys.Engine;

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}

test('three modes with the v1 level counts', () => {
  assert.strictEqual(Levels.MODE_IDS.join(','), 'lessons,race,code');
  assert.strictEqual(Levels.getMode('lessons').levels.length, 8);
  assert.strictEqual(Levels.getMode('race').levels.length, 5);
  assert.strictEqual(Levels.getMode('code').levels.length, 6);
  assert.strictEqual(Levels.totalLevels(), 19);
  assert.strictEqual(Levels.getMode('nope'), null);
});

test('storage names match the hub progress keys', () => {
  const names = Levels.storageNames();
  assert.strictEqual(names.length, 3);
  assert.strictEqual(names[0].name, 'keys_lessons');
  assert.strictEqual(names[0].levels, 8);
  assert.strictEqual(names[1].name, 'keys_race');
  assert.strictEqual(names[1].levels, 5);
  assert.strictEqual(names[2].name, 'keys_code');
  assert.strictEqual(names[2].levels, 6);
});

test('curriculum walks home row to sentences and coding tokens', () => {
  const lessons = Levels.getMode('lessons').levels;
  assert.match(lessons[0].text, /asdf/);
  assert.match(lessons[1].text, /jkl/);
  assert.match(lessons[3].text, /sad/);
  assert.match(lessons[7].text, /The cat/);
  const code = Levels.getMode('code').levels.map((level) => level.text);
  assert.ok(code.includes('if'));
  assert.ok(code.includes('else'));
  assert.ok(code.includes('while'));
  assert.ok(code.includes('function'));
  assert.ok(code.some((text) => text.indexOf('print') !== -1));
  assert.ok(code.some((text) => text.indexOf('{') !== -1));
});

test('engine advances only on the next correct character', () => {
  const run = new Engine();
  run.start('if');
  assert.strictEqual(run.expected(), 'i');
  const miss = run.handleChar('x');
  assert.strictEqual(miss.ok, false);
  assert.strictEqual(miss.done, false);
  assert.strictEqual(run.index, 0);
  assert.strictEqual(run.errors, 1);
  const first = run.handleChar('i');
  assert.strictEqual(first.ok, true);
  assert.strictEqual(first.done, false);
  const last = run.handleChar('f');
  assert.strictEqual(last.ok, true);
  assert.strictEqual(last.done, true);
  assert.strictEqual(run.stats().done, true);
  assert.strictEqual(run.stats().correct, 2);
  assert.strictEqual(run.stats().errors, 1);
});

test('WPM and accuracy use correct / errors / elapsed time', () => {
  const run = new Engine();
  run.start('asdfj');
  run.startedAt = 1;
  run.finishedAt = 1 + 60000;
  run.correct = 5;
  run.errors = 1;
  run.index = 5;
  const stats = run.stats();
  assert.strictEqual(stats.wpm, 1);
  assert.ok(Math.abs(stats.accuracy - (5 / 6) * 100) < 0.01);
  assert.strictEqual(stats.progress, 1);
});

test('hint key lights Shift for capitals and braces', () => {
  const run = new Engine();
  run.start('The {');
  assert.strictEqual(run.hintKey(), 't');
  assert.strictEqual(run.needsShift(), true);
  run.index = 4;
  assert.strictEqual(run.hintKey(), '[');
  assert.strictEqual(run.needsShift(), true);
});

test('stars prefer accuracy, with a race speed bonus', () => {
  assert.strictEqual(Levels.starsFor('lessons', {accuracy: 97, wpm: 4}), 3);
  assert.strictEqual(Levels.starsFor('lessons', {accuracy: 90, wpm: 40}), 2);
  assert.strictEqual(Levels.starsFor('lessons', {accuracy: 70, wpm: 40}), 1);
  assert.strictEqual(Levels.starsFor('code', {accuracy: 96, wpm: 1}), 3);
  assert.strictEqual(Levels.starsFor('race', {accuracy: 96, wpm: 14}), 3);
  assert.strictEqual(Levels.starsFor('race', {accuracy: 96, wpm: 8}), 2);
  assert.strictEqual(Levels.starsFor('race', {accuracy: 80, wpm: 30}), 1);
});

test('hub and Makefile register Keys as a first-class game', () => {
  const hub = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'index', 'hub.js'), 'utf8');
  const index = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'index.html'), 'utf8');
  const page = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'keys.html'), 'utf8');
  assert.match(hub, /keys_lessons/);
  assert.match(hub, /keys_race/);
  assert.match(hub, /keys_code/);
  assert.match(index, /id="card-keys"/);
  assert.match(index, /keys\.html/);
  assert.match(page, /keys\/style\.css/);
  assert.match(page, /common\/boot\.js/);
  assert.doesNotMatch(page, /fonts\.googleapis/);
});

test('modifier keys are ignored so Ctrl+R does not count as a miss', () => {
  assert.strictEqual(Engine.isIgnorableKey('r', true, false), true);
  assert.strictEqual(Engine.isIgnorableKey('Shift', false, false), true);
  assert.strictEqual(Engine.isIgnorableKey('Tab', false, false), true);
  assert.strictEqual(Engine.isIgnorableKey('a', false, false), false);
  assert.strictEqual(Engine.isIgnorableKey(' ', false, false), false);
});

console.log('\n' + passed + ' tests passed');
