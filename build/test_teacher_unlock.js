#!/usr/bin/env node
/**
 * Unit tests for the shared teacher-password lock rules.
 * Run: python3 is not required; `node build/test_teacher_unlock.js`
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadThinkaConfig() {
  const sandbox = {
    goog: {
      provide: function(name) {
        const parts = name.split('.');
        let obj = sandbox;
        for (const part of parts) {
          obj[part] = obj[part] || {};
          obj = obj[part];
        }
      },
      require: function() {},
    },
  };
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'src', 'thinka.config.js'),
      'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.ThinkaConfig;
}

const ThinkaConfig = loadThinkaConfig();
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}

test('default password is the documented placeholder', () => {
  assert.strictEqual(ThinkaConfig.TEACHER_PASSWORD, 'thinka');
});

test('checkPassword trims and matches', () => {
  assert.strictEqual(ThinkaConfig.checkPassword('thinka'), true);
  assert.strictEqual(ThinkaConfig.checkPassword('  thinka  '), true);
  assert.strictEqual(ThinkaConfig.checkPassword('THINKA'), false);
  assert.strictEqual(ThinkaConfig.checkPassword('wrong'), false);
  assert.strictEqual(ThinkaConfig.checkPassword(''), false);
  assert.strictEqual(ThinkaConfig.checkPassword(null), false);
});

test('unlock keys sit next to progress keys', () => {
  assert.strictEqual(ThinkaConfig.unlockKey('maze', 5), 'maze5_teacherUnlock');
  assert.strictEqual(ThinkaConfig.unlockKey('pond-tutor', 10),
      'pond-tutor10_teacherUnlock');
});

function playable(level, saved, unlocked) {
  const savedSet = new Set(saved);
  const unlockedSet = new Set(unlocked);
  return ThinkaConfig.isLevelPlayable(
      level,
      (lvl) => savedSet.has(lvl),
      (lvl) => unlockedSet.has(lvl));
}

test('level 1 is always playable', () => {
  assert.strictEqual(playable(1, [], []), true);
});

test('level 2 stays locked without progress or password', () => {
  assert.strictEqual(playable(2, [], []), false);
  assert.strictEqual(playable(5, [], []), false);
});

test('completing a level unlocks only the next one', () => {
  assert.strictEqual(playable(2, [1], []), true);
  assert.strictEqual(playable(3, [1], []), false);
  assert.strictEqual(playable(3, [1, 2], []), true);
  assert.strictEqual(playable(5, [1, 2, 3], []), false);
});

test('saved progress on a level keeps it playable', () => {
  assert.strictEqual(playable(5, [5], []), true);
});

test('teacher unlock opens only that target level', () => {
  assert.strictEqual(playable(5, [], [5]), true);
  assert.strictEqual(playable(4, [], [5]), false);
  assert.strictEqual(playable(6, [], [5]), false);
});

test('password unlock plus later completion does not skip further', () => {
  // Teacher opened 5; student finished 5. Level 6 opens; 4 stays locked.
  assert.strictEqual(playable(5, [5], [5]), true);
  assert.strictEqual(playable(6, [5], [5]), true);
  assert.strictEqual(playable(4, [5], [5]), false);
});

test('star keys sit next to progress keys', () => {
  assert.strictEqual(ThinkaConfig.starsKey('maze_g2_repeat', 3),
      'maze_g2_repeat3_stars');
  assert.strictEqual(ThinkaConfig.starsKey('bird', 10), 'bird10_stars');
});

test('explained keys sit next to a unit\'s progress', () => {
  assert.strictEqual(ThinkaConfig.explainedKey('maze_g2_repeat'),
      'maze_g2_repeat_explained');
});

test('the first unit is always playable', () => {
  assert.strictEqual(ThinkaConfig.isUnitPlayable(null, 0, false), true);
});

test('a unit stays locked until the one before it is finished', () => {
  const half = {total: 6, done: 3};
  const whole = {total: 6, done: 6};
  assert.strictEqual(ThinkaConfig.isUnitPlayable(half, 0, false), false);
  assert.strictEqual(ThinkaConfig.isUnitPlayable(whole, 0, false), true);
});

test('a started unit stays open even if the one before it regresses', () => {
  const half = {total: 6, done: 3};
  assert.strictEqual(ThinkaConfig.isUnitPlayable(half, 2, false), true);
});

test('the teacher password opens a locked unit', () => {
  const none = {total: 6, done: 0};
  assert.strictEqual(ThinkaConfig.isUnitPlayable(none, 0, true), true);
});

test('an empty preceding unit does not count as finished', () => {
  assert.strictEqual(ThinkaConfig.isUnitPlayable({total: 0, done: 0}, 0, false),
      false);
});

console.log('\n' + passed + ' tests passed');
