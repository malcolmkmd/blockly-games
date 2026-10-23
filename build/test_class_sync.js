#!/usr/bin/env node
/**
 * Progress sync queue. Run: node build/test_class_sync.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../appengine/common/class_sync_core.js');

let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('ok  ' + name);
}

test('private keys are never queued', () => {
  let queue = {};
  queue = core.noteChange(queue, 'thinkaTeacherPassword', 'off');
  queue = core.noteChange(queue, 'thinkaStudentSession', '{}');
  queue = core.noteChange(queue, 'thinkaSyncQueue', '{}');
  queue = core.noteChange(queue, 'maze_g1_sequence1', '<xml>');
  assert.deepStrictEqual(queue, {maze_g1_sequence1: '<xml>'});
});

test('overlay lets the offline queue win, including deletes', () => {
  const remote = {maze_g1_sequence1: 'server', bird1: 'keep', puzzle1: 'gone'};
  const queue = {maze_g1_sequence1: 'local', puzzle1: null, turtle1: 'new'};
  assert.deepStrictEqual(core.overlay(remote, queue), {
    maze_g1_sequence1: 'local',
    bird1: 'keep',
    turtle1: 'new',
  });
});

test('ack drops only the values that were sent', () => {
  const queued = {maze_g1_sequence1: 'a', bird1: 'b', turtle1: null};
  const sent = {maze_g1_sequence1: 'a', bird1: 'old'};
  assert.deepStrictEqual(core.ackQueue(queued, sent), {
    bird1: 'b',
    turtle1: null,
  });
});

test('a broken queue reads as empty', () => {
  assert.deepStrictEqual(core.readQueue(''), {});
  assert.deepStrictEqual(core.readQueue('not-json'), {});
  assert.deepStrictEqual(core.readQueue('{"bird1":null}'), {bird1: null});
});

test('progress key filter keeps the password and the session', () => {
  const keys = core.progressKeys([
    'thinkaTeacherPassword', 'maze1', 'thinkaSyncQueue', 'thinkaStudentSession', 'bird1',
  ]);
  assert.deepStrictEqual(keys, ['maze1', 'bird1']);
});

test('two students on one laptop do not keep each others queue', () => {
  const amahle = core.overlay({maze_g1_sequence1: 'A'}, {});
  let queue = core.noteChange({}, 'maze_g1_sequence2', 'queued');
  const withQueue = core.overlay(amahle, queue);
  assert.strictEqual(withQueue.maze_g1_sequence2, 'queued');
  // Sign-out drops the queue. The next child gets only the server copy.
  queue = {};
  const thabo = core.overlay({bird1: 'B'}, queue);
  assert.strictEqual(thabo.maze_g1_sequence1, undefined);
  assert.strictEqual(thabo.bird1, 'B');
  assert.strictEqual(core.overlay(amahle, {}).maze_g1_sequence1, 'A');
});

test('the browser wrapper bails out on file:// before any request', () => {
  const src = fs.readFileSync(
      path.join(__dirname, '../appengine/common/class_sync.js'), 'utf8');
  const fileAt = src.indexOf("location.protocol === 'file:'");
  const pingAt = src.indexOf('/class/api/ping');
  assert.ok(fileAt > 0 && pingAt > fileAt);
  assert.match(src, /thinkaSyncQueue/);
  assert.match(src, /signOut/);
  assert.match(src, /forgetLocalProgress/);
  assert.doesNotMatch(src, /google-analytics|\/storage['"]/);
});

test('picture animals in the sign-in page match the server list', () => {
  const py = fs.readFileSync(path.join(__dirname, 'class_store.py'), 'utf8');
  const js = fs.readFileSync(
      path.join(__dirname, '../appengine/common/class_signin.js'), 'utf8');
  const block = py.match(/ANIMALS = \(([^)]*)\)/)[1];
  const ids = block.match(/'([a-z]+)'/g).map((item) => item.slice(1, -1));
  assert.ok(ids.length >= 8);
  ids.forEach((id) => {
    assert.ok(js.indexOf("id: '" + id + "'") !== -1, id);
  });
});

test('solo hub still has no sign-in of its own', () => {
  const index = fs.readFileSync(
      path.join(__dirname, '../appengine/index.html'), 'utf8');
  assert.match(index, /class_sync\.js/);
  assert.match(index, /index\/hub\.js/);
  assert.doesNotMatch(index, /boot\.js/);
});

console.log('\n' + passed + ' tests passed');
