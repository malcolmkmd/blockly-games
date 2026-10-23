#!/usr/bin/env node
/**
 * Week outline and sequencing plans. Run: node build/test_lessons.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function loadLessons() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(read('appengine/lessons/outline.js'), sandbox);
  vm.runInContext(read('appengine/lessons/sequence.js'), sandbox);
  return sandbox;
}

const world = loadLessons();
const lessons = world.THINKA_LESSONS;
const plans = world.ThinkaSequence.plans;

function local(value) {
  return JSON.parse(JSON.stringify(value));
}

test('term has ten weeks and only week 1 is ready', () => {
  assert.strictEqual(lessons.length, 10);
  assert.deepStrictEqual(local(lessons.map((lesson) => lesson.concept)), [
    'Sequencing',
    'Algorithms',
    'Loops',
    'Events',
    'Conditionals',
    'Debugging',
    'Variables',
    'Functions',
    'Sensors and robots',
    'How computers work and internet safety',
  ]);
  assert.strictEqual(lessons.filter((lesson) => lesson.ready).length, 1);
  assert.strictEqual(lessons[0].ready, true);
  assert.strictEqual(lessons[0].player, 'sequence');
  lessons.slice(1).forEach((lesson) => {
    assert.strictEqual(lesson.ready, false);
  });
});

test('each lesson is a 20 minute club slot', () => {
  lessons.forEach((lesson) => {
    assert.strictEqual(lesson.minutes, 20);
    const total = lesson.parts.reduce((sum, part) => sum + part.minutes, 0);
    assert.strictEqual(total, 20);
    assert.deepStrictEqual(local(lesson.parts.map((part) => part.id)),
        ['hook', 'explainer', 'exercise', 'share']);
  });
});

test('week 1 bands deep-link Maze and name the senior words', () => {
  const bands = lessons[0].bands;
  assert.strictEqual(bands.foundation.exerciseHref, 'maze.html?stage=1&unit=sequence&level=1');
  assert.strictEqual(bands.foundation.earlyHref, 'maze.html?stage=1&unit=sequence&level=2');
  assert.strictEqual(bands.foundation.levels, 1);
  assert.match(bands.foundation.exerciseNote, /pairs/i);
  assert.strictEqual(bands.intermediate.levels, 2);
  assert.strictEqual(bands.intermediate.earlyHref, 'maze.html?stage=1&unit=sequence&level=3');
  assert.strictEqual(bands.senior.levels, 3);
  assert.strictEqual(bands.senior.earlyHref, 'maze.html?stage=1&unit=sequence&level=4');
  assert.deepStrictEqual(local(bands.senior.terms.map((term) => term.word)), ['sequence', 'algorithm']);
  assert.ok(lessons[0].teacherNotes.length >= 4);
});

test('sequencing scenes and foundation uses fewer steps', () => {
  ['foundation', 'intermediate', 'senior'].forEach((band) => {
    const ids = world.ThinkaSequence.scenes(band).map((scene) => scene.id);
    assert.deepStrictEqual(local(ids), ['meet', 'arrows', 'order', 'program', 'bug']);
  });
  assert.ok(plans.foundation.program.steps.length < plans.senior.program.steps.length);
  assert.ok(plans.foundation.arrows.length < plans.senior.arrows.length);
  assert.deepStrictEqual(local(plans.foundation.program.steps), ['right', 'right']);
  assert.deepStrictEqual(local(plans.intermediate.program.steps), ['right', 'right', 'up']);
  assert.deepStrictEqual(local(plans.senior.program.steps), ['right', 'right', 'up', 'right']);
  assert.strictEqual(plans.foundation.bug.fixIndex, 1);
  assert.strictEqual(plans.senior.bug.fixTo, 'up');
  assert.deepStrictEqual(local(plans.foundation.predict.good), ['right', 'right']);
  assert.deepStrictEqual(local(plans.foundation.predict.bad), ['up', 'right']);
});

test('explainer has no narration and the hub links it', () => {
  const files = [
    'appengine/lessons/player.js',
    'appengine/lessons/sequence.js',
    'appengine/lessons/player.css',
    'appengine/lesson-play.html',
    'appengine/lessons.html',
    'appengine/lessons/lessons.js',
  ];
  files.forEach((file) => {
    const text = read(file);
    assert.doesNotMatch(text, /speechSynthesis|new Audio\(|<audio|HTMLAudioElement/);
  });
  const play = read('appengine/lesson-play.html');
  assert.match(play, /id="xpReplay"/);
  assert.match(play, /id="xpNext"/);
  assert.match(play, /id="xpMaze"/);
  assert.match(play, /href="maze\.html\?stage=1&unit=sequence&level=1"/);
  assert.match(play, /class_sync\.js/);
  const index = read('appengine/index.html');
  assert.match(index, /id="card-lessons"/);
  assert.match(index, /lessons\.html/);
  assert.doesNotMatch(index, /boot\.js/);
  assert.doesNotMatch(index, /compressed\.js/);
  const hub = read('appengine/index/hub.js');
  assert.match(hub, /paintLessons/);
  assert.match(hub, /thinkaLesson_w1_explainer/);
  assert.match(hub, /thinkaLesson_w1_exercise/);
});

console.log('\n' + passed + ' tests passed');
