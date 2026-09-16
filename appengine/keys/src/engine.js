/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Shared typing engine for Keys (lessons, race, code).
 */
'use strict';

goog.provide('Keys.Engine');


/**
 * Create a typing run.
 * @constructor
 */
Keys.Engine = function() {
  this.text = '';
  this.index = 0;
  this.correct = 0;
  this.errors = 0;
  this.startedAt = 0;
  this.finishedAt = 0;
  this.lastWrong = '';
};

/**
 * Physical key that produces a shifted character. Used by the on-screen
 * keyboard to light Shift plus the base key.
 * @type {!Object<string, string>}
 */
Keys.Engine.SHIFT_BASE = {
  '!': '1',
  '@': '2',
  '#': '3',
  '$': '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  '_': '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': '\'',
  '<': ',',
  '>': '.',
  '?': '/',
  '~': '`',
};

/**
 * Load a new passage and clear counters.
 * @param {string} text Prompt to type.
 */
Keys.Engine.prototype.start = function(text) {
  this.text = String(text || '');
  this.index = 0;
  this.correct = 0;
  this.errors = 0;
  this.startedAt = 0;
  this.finishedAt = 0;
  this.lastWrong = '';
};

/**
 * Next character the student should type.
 * @returns {string} One character, or '' when finished.
 */
Keys.Engine.prototype.expected = function() {
  if (this.index >= this.text.length) {
    return '';
  }
  return this.text.charAt(this.index);
};

/**
 * Base key to highlight for the expected character (lowercase letter or
 * the unshifted symbol).
 * @returns {string} Keyboard data-key value.
 */
Keys.Engine.prototype.hintKey = function() {
  const ch = this.expected();
  if (!ch) {
    return '';
  }
  if (Keys.Engine.SHIFT_BASE[ch]) {
    return Keys.Engine.SHIFT_BASE[ch];
  }
  if (ch >= 'A' && ch <= 'Z') {
    return ch.toLowerCase();
  }
  return ch;
};

/**
 * Whether the expected character needs the Shift key.
 * @returns {boolean} True if Shift should light up.
 */
Keys.Engine.prototype.needsShift = function() {
  const ch = this.expected();
  if (!ch) {
    return false;
  }
  if (ch >= 'A' && ch <= 'Z') {
    return true;
  }
  return !!Keys.Engine.SHIFT_BASE[ch];
};

/**
 * True if this browser event should be ignored (modifiers, function keys).
 * @param {string} key event.key value.
 * @param {boolean} ctrlOrMeta Ctrl/meta held.
 * @param {boolean} alt Alt held.
 * @returns {boolean} True to ignore.
 */
Keys.Engine.isIgnorableKey = function(key, ctrlOrMeta, alt) {
  if (ctrlOrMeta || alt) {
    return true;
  }
  if (!key) {
    return true;
  }
  if (key === 'Shift' || key === 'Control' || key === 'Alt' ||
      key === 'Meta' || key === 'CapsLock' || key === 'Tab' ||
      key === 'Escape' || key === 'Enter' || key === 'Backspace' ||
      key === 'Dead' || key === 'Process') {
    return true;
  }
  return key.length !== 1;
};

/**
 * Type one character. Wrong keys count as errors and do not advance
 * (accuracy-first, Typing Club style).
 * @param {string} ch Typed character.
 * @returns {{ok: boolean, done: boolean}} Result.
 */
Keys.Engine.prototype.handleChar = function(ch) {
  if (this.finishedAt || this.index >= this.text.length) {
    return {ok: false, done: true};
  }
  if (!this.startedAt) {
    this.startedAt = Date.now();
  }
  const expected = this.text.charAt(this.index);
  if (ch === expected) {
    this.index++;
    this.correct++;
    this.lastWrong = '';
    if (this.index >= this.text.length) {
      this.finishedAt = Date.now();
    }
    return {ok: true, done: this.index >= this.text.length};
  }
  this.errors++;
  this.lastWrong = ch;
  return {ok: false, done: false};
};

/**
 * Live or final stats for the HUD and star scoring.
 * @param {number=} nowMs Clock override for tests.
 * @returns {!Object} Stats record.
 */
Keys.Engine.prototype.stats = function(nowMs) {
  const done = this.text.length > 0 && this.index >= this.text.length;
  let now;
  if (this.finishedAt) {
    now = this.finishedAt;
  } else if (nowMs) {
    now = nowMs;
  } else if (this.startedAt) {
    now = Date.now();
  } else {
    now = 0;
  }
  const elapsedMs = this.startedAt ? Math.max(0, now - this.startedAt) : 0;
  const minutes = elapsedMs > 0 ? elapsedMs / 60000 : 0;
  const wpm = minutes > 0 ? (this.correct / 5) / minutes : 0;
  const attempts = this.correct + this.errors;
  const accuracy = attempts ? (this.correct / attempts) * 100 : 100;
  return {
    correct: this.correct,
    errors: this.errors,
    index: this.index,
    total: this.text.length,
    wpm: wpm,
    accuracy: accuracy,
    elapsedMs: elapsedMs,
    done: done,
    progress: this.text.length ? this.index / this.text.length : 0,
  };
};
