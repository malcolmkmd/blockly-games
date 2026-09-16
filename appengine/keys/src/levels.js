/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Curriculum for the Keys typing game.
 */
'use strict';

goog.provide('Keys.Levels');


/**
 * Mode ids in hub / URL order.
 * @type {!Array<string>}
 */
Keys.Levels.MODE_IDS = ['lessons', 'race', 'code'];

/**
 * Lesson, race, and code passages.
 *
 * Accuracy-first lessons start on the home row, then mix rows, words, and
 * a couple of short sentences. Race passages stay short for a classroom
 * sprint. Code levels type the same words kids will meet in Blockly.
 *
 * @type {!Object<string, !Object>}
 */
Keys.Levels.MODES = {
  'lessons': {
    id: 'lessons',
    storage: 'keys_lessons',
    title: 'Lessons',
    blurb: 'Home row first. Accuracy, then speed.',
    kicker: 'Learn',
    help: 'Rest your fingers on A S D F and J K L. Type the glowing letter. A wrong key stays put — try again. Accuracy matters more than speed.',
    levels: [
      {
        title: 'Home row · left',
        hint: 'Park four fingers on A S D F. Type only those keys.',
        text: 'asdf asdf asdf',
      },
      {
        title: 'Home row · right',
        hint: 'Right hand rests on J K L. Keep your eyes on the words.',
        text: 'jkl jkl jkl',
      },
      {
        title: 'Home row · both hands',
        hint: 'Both hands together. Semicolon sits under your right pinky.',
        text: 'asdf jkl; asdf jkl;',
      },
      {
        title: 'Home row words',
        hint: 'Little words that stay on the home row.',
        text: 'a sad lad asks dad',
      },
      {
        title: 'Top row',
        hint: 'Reach up for Q W E R T and friends, then come home.',
        text: 'wet red tree',
      },
      {
        title: 'Mixed words',
        hint: 'Bottom and top rows join in. Keep a soft look at the line.',
        text: 'a cat can run',
      },
      {
        title: 'Short sentence',
        hint: 'Thumb on the space bar. One calm sentence.',
        text: 'the sun is up',
      },
      {
        title: 'Capital letters',
        hint: 'Hold Shift for the first letter, then type the rest.',
        text: 'The cat sat on a mat.',
      },
    ],
  },
  'race': {
    id: 'race',
    storage: 'keys_race',
    title: 'Race',
    blurb: 'Drive the car. Every correct key rolls you forward.',
    kicker: 'Go',
    help: 'Type the track words. Your car only moves on correct keys. Finish the line to cross the flag. Stars love tidy accuracy and a bit of speed.',
    levels: [
      {
        title: 'Warm-up sprint',
        hint: 'Short hop. Get the car rolling.',
        text: 'asdf jkl asdf jkl',
      },
      {
        title: 'Home stretch',
        hint: 'Home-row words. Smooth beats smashy.',
        text: 'a sad lad asks dad',
      },
      {
        title: 'City loop',
        hint: 'A little longer. Keep the car in your lane.',
        text: 'the red car can go',
      },
      {
        title: 'Club cup',
        hint: 'Shift for W. You can code and play!',
        text: 'We can code and play.',
      },
      {
        title: 'Grand prix',
        hint: 'Last race. Type the whole cheer.',
        text: 'Type fast and have fun today!',
      },
    ],
  },
  'code': {
    id: 'code',
    storage: 'keys_code',
    title: 'Code',
    blurb: 'Type the words that make programs go.',
    kicker: 'Hack',
    help: 'These are coding words you will see in Maze and Bird. Type them exactly — brackets and quotes count. They are short on purpose.',
    levels: [
      {
        title: 'If',
        hint: 'if asks a question: should we do this?',
        text: 'if',
        token: 'if',
        meaning: 'Ask a yes/no question.',
      },
      {
        title: 'Else',
        hint: 'else is the other path: if not this, then that.',
        text: 'else',
        token: 'else',
        meaning: 'The other path.',
      },
      {
        title: 'While',
        hint: 'while is a loop — keep going while it is true.',
        text: 'while',
        token: 'while',
        meaning: 'A loop that keeps going.',
      },
      {
        title: 'Function',
        hint: 'A function is a named recipe you can reuse.',
        text: 'function',
        token: 'function',
        meaning: 'A reusable recipe.',
      },
      {
        title: 'Print',
        hint: 'print shows a message. Quotes hug the words.',
        text: 'print("hi")',
        token: 'print',
        meaning: 'Show a message.',
      },
      {
        title: 'Brackets',
        hint: 'Curly brackets { } hold a bundle of steps.',
        text: 'if (go) { }',
        token: '{ }',
        meaning: 'Brackets hold the steps.',
      },
    ],
  },
};

/**
 * Mode record for a URL id, or null.
 * @param {string} id Mode id.
 * @returns {Object} Mode, or null.
 */
Keys.Levels.getMode = function(id) {
  return Keys.Levels.MODES[id] || null;
};

/**
 * Level record (1-based), or null.
 * @param {!Object} mode Mode record.
 * @param {number} level Level number.
 * @returns {Object} Level, or null.
 */
Keys.Levels.getLevel = function(mode, level) {
  if (!mode || !mode.levels) {
    return null;
  }
  return mode.levels[level - 1] || null;
};

/**
 * localStorage names the hub uses to size the Keys progress bar.
 * @returns {!Array<!Object>} Records of {name, levels}.
 */
Keys.Levels.storageNames = function() {
  const names = [];
  for (let i = 0; i < Keys.Levels.MODE_IDS.length; i++) {
    const mode = Keys.Levels.MODES[Keys.Levels.MODE_IDS[i]];
    names.push({name: mode.storage, levels: mode.levels.length});
  }
  return names;
};

/**
 * Total playable Keys levels across every mode.
 * @returns {number} Count.
 */
Keys.Levels.totalLevels = function() {
  let total = 0;
  const names = Keys.Levels.storageNames();
  for (let i = 0; i < names.length; i++) {
    total += names[i].levels;
  }
  return total;
};

/**
 * Mastery stars for a finished run. Accuracy first, then a little speed
 * on Race so a careful finish still earns two stars.
 * @param {string} modeId lessons, race, or code.
 * @param {{accuracy: number, wpm: number}} stats Run stats.
 * @returns {number} Stars from 1 to 3.
 */
Keys.Levels.starsFor = function(modeId, stats) {
  const acc = stats && stats.accuracy ? stats.accuracy : 0;
  const wpm = stats && stats.wpm ? stats.wpm : 0;
  if (modeId === 'race') {
    if (acc >= 95 && wpm >= 12) {
      return 3;
    }
    if (acc >= 85) {
      return 2;
    }
    return 1;
  }
  if (acc >= 96) {
    return 3;
  }
  if (acc >= 88) {
    return 2;
  }
  return 1;
};
