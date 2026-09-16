/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Keys typing game: lessons, race, and code modes.
 */
'use strict';

goog.provide('Keys');

goog.require('BlocklyGames');
goog.require('Keys.Engine');
goog.require('Keys.html');
goog.require('Keys.Levels');
goog.require('ThinkaConfig');


/**
 * Active typing engine, or null on the mode picker.
 * @type {Keys.Engine}
 */
Keys.engine = null;

/**
 * Current mode record, or null on the picker.
 * @type {Object}
 */
Keys.mode = null;

/**
 * Latch so a tablet Shift tap uppercases the next click.
 * @type {boolean}
 */
Keys.shiftLatch_ = false;

/**
 * Overlay callback after the primary button.
 * @type {Function}
 */
Keys.overlayPrimary_ = null;

/**
 * Overlay callback after the secondary button.
 * @type {Function}
 */
Keys.overlaySecondary_ = null;

/**
 * Stats HUD timer.
 * @type {number}
 */
Keys.statsTimer_ = 0;


/**
 * Boot the picker or a level.
 */
function init() {
  const modeId = BlocklyGames.getStringParamFromUrl('mode', '');
  const mode = Keys.Levels.getMode(modeId);
  if (!mode) {
    initPicker();
    return;
  }
  initPlay(mode);
}

/**
 * Three-mode chooser.
 */
function initPicker() {
  BlocklyGames.storageName = 'keys';
  document.body.innerHTML = Keys.html.picker(
      {lang: BlocklyGames.LANG, html: BlocklyGames.IS_HTML},
      gameTitle(true));
  document.body.classList.add('keys-app');
  BlocklyGames.init(gameTitle(false));
  wireLanguage();
  wireHelp(null);
  installTeacherUnlock();
  relaxViewport();
  paintPicker();
}

/**
 * One playable level.
 * @param {!Object} mode Mode record.
 */
function initPlay(mode) {
  Keys.mode = mode;
  BlocklyGames.storageName = mode.storage;
  BlocklyGames.setMaxLevel(mode.levels.length);

  const level = Keys.Levels.getLevel(mode, BlocklyGames.LEVEL);
  if (!level) {
    window.location = modeUrl('');
    return;
  }

  const modesHtml = `<a class="keys-modes-link" id="keysModesLink" href="${modeUrl('')}">Modes</a>`;
  document.body.innerHTML = Keys.html.play(
      {
        lang: BlocklyGames.LANG,
        html: BlocklyGames.IS_HTML,
        level: BlocklyGames.LEVEL,
        maxLevel: BlocklyGames.MAX_LEVEL,
      },
      gameTitle(true),
      mode.id,
      modesHtml);
  document.body.classList.add('keys-app', 'keys-app--' + mode.id);

  installTeacherUnlock();
  BlocklyGames.init(gameTitle(false));
  wireLanguage();
  wireHelp(mode);
  relaxViewport();

  const kicker = BlocklyGames.getElementById('keysKicker');
  const title = BlocklyGames.getElementById('keysLevelTitle');
  const hint = BlocklyGames.getElementById('keysHint');
  if (kicker) {
    kicker.textContent = mode.title + ' · Level ' + BlocklyGames.LEVEL;
  }
  if (title) {
    title.textContent = level.title;
  }
  if (hint) {
    hint.textContent = level.hint;
  }

  const chip = BlocklyGames.getElementById('keysCodeChip');
  if (chip && mode.id === 'code' && level.token) {
    chip.hidden = false;
    BlocklyGames.getElementById('keysCodeToken').textContent = level.token;
    BlocklyGames.getElementById('keysCodeMeaning').textContent = level.meaning;
  }

  const track = BlocklyGames.getElementById('keysTrack');
  if (track && mode.id === 'race') {
    track.hidden = false;
  }

  const kb = BlocklyGames.getElementById('keysKeyboard');
  if (kb && mode.id === 'race') {
    kb.classList.add('keys-keyboard--compact');
  }

  Keys.engine = new Keys.Engine();
  Keys.engine.start(level.text);
  paintPrompt();
  paintStats();
  paintKeyboard();
  paintRacer();

  const catcher = BlocklyGames.getElementById('keysCatcher');
  const board = BlocklyGames.getElementById('keysBoard');
  const tap = BlocklyGames.getElementById('keysTap');
  if (catcher) {
    catcher.addEventListener('keydown', onCatcherKey, true);
    catcher.addEventListener('input', onCatcherInput, true);
  }
  document.addEventListener('keydown', onWindowKey, true);
  if (board) {
    BlocklyGames.bindClick(board, focusCatcher);
  }
  if (tap) {
    BlocklyGames.bindClick(tap, focusCatcher);
  }
  wireOnscreenKeys();
  focusCatcher();
  Keys.statsTimer_ = window.setInterval(paintStats, 400);
}

/**
 * Game title from the language pack, with an English fallback.
 * @param {boolean} escape Escape HTML.
 * @returns {string} Title.
 */
function gameTitle(escape) {
  const pack = window['BlocklyGamesMsg'];
  if (pack && pack['Games.keys']) {
    return BlocklyGames.getMsg('Games.keys', escape);
  }
  return escape ? 'Keys' : 'Keys';
}

/**
 * Keys URL for a mode (empty string opens the picker).
 * @param {string} modeId Mode id or ''.
 * @param {number=} level Level number.
 * @returns {string} URL.
 */
function modeUrl(modeId, level) {
  const file = BlocklyGames.IS_HTML ? 'keys.html' : 'keys';
  let url = file + '?lang=' + BlocklyGames.LANG;
  if (modeId) {
    url += '&mode=' + encodeURIComponent(modeId);
    url += '&level=' + (level || 1);
  }
  return url;
}

/**
 * Language <select> handler (no Blockly workspace to stash).
 */
function wireLanguage() {
  const languageMenu = BlocklyGames.getElementById('languageMenu');
  if (languageMenu) {
    languageMenu.addEventListener('change', BlocklyGames.changeLanguage, true);
  }
}

/**
 * Help button for the current screen.
 * @param {Object} mode Mode record or null.
 */
function wireHelp(mode) {
  const help = BlocklyGames.getElementById('helpButton');
  if (!help) {
    return;
  }
  BlocklyGames.bindClick(help, function() {
    const copy = mode ? mode.help :
        'Keys has three games. Lessons teach the keyboard. Race drives a car as you type. Code types the words you will see in Maze and Bird.';
    showOverlay({
      title: 'How to play',
      copy: copy,
      primary: 'OK',
      secondary: '',
      stars: 0,
    });
  });
}

/**
 * Fill the three mode cards with live progress.
 */
function paintPicker() {
  const host = BlocklyGames.getElementById('keysModes');
  if (!host) {
    return;
  }
  host.textContent = '';
  for (let i = 0; i < Keys.Levels.MODE_IDS.length; i++) {
    const mode = Keys.Levels.MODES[Keys.Levels.MODE_IDS[i]];
    let done = 0;
    for (let lv = 1; lv <= mode.levels.length; lv++) {
      if (BlocklyGames.loadFromLocalStorage(mode.storage, lv)) {
        done++;
      }
    }
    const card = document.createElement('a');
    card.className = 'keys-mode-card keys-mode-card--' + mode.id;
    card.href = modeUrl(mode.id, nextLevel(mode));
    card.setAttribute('data-mode', mode.id);
    const pct = Math.round((done / mode.levels.length) * 100);
    card.innerHTML =
        '<span class="keys-mode-kicker">' + BlocklyGames.esc(mode.kicker) + '</span>' +
        '<span class="keys-mode-title">' + BlocklyGames.esc(mode.title) + '</span>' +
        '<span class="keys-mode-blurb">' + BlocklyGames.esc(mode.blurb) + '</span>' +
        '<span class="keys-mode-progress">' + done + ' / ' + mode.levels.length + '</span>' +
        '<span class="keys-mode-bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="keys-mode-go">Play</span>';
    host.appendChild(card);
  }
}

/**
 * First unfinished level, or 1.
 * @param {!Object} mode Mode record.
 * @returns {number} Level number.
 */
function nextLevel(mode) {
  for (let i = 1; i <= mode.levels.length; i++) {
    if (!BlocklyGames.loadFromLocalStorage(mode.storage, i) &&
        BlocklyGames.isLevelPlayable(mode.storage, i)) {
      return i;
    }
  }
  return 1;
}

/**
 * Classroom tablets should zoom, not lock to the Blockly 725px trick.
 */
function relaxViewport() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, user-scalable=yes');
  }
}

/**
 * Focus the hidden catcher so a laptop or tablet can type.
 */
function focusCatcher() {
  const catcher = BlocklyGames.getElementById('keysCatcher');
  if (catcher) {
    catcher.focus();
  }
}

/**
 * Keydown on the focused catcher.
 * @param {!Event} e Keyboard event.
 */
function onCatcherKey(e) {
  handleKeyEvent(e);
}

/**
 * Document-level keydown (laptop, catcher not focused).
 * @param {!Event} e Keyboard event.
 */
function onWindowKey(e) {
  const overlay = BlocklyGames.getElementById('keysOverlay');
  if (overlay && !overlay.hidden) {
    return;
  }
  if (BlocklyGames.awaitingTeacherUnlock) {
    return;
  }
  const t = e.target;
  if (t && (t.id === 'keysCatcher' || t.id === 'teacherUnlockPassword' ||
      t.id === 'languageMenu')) {
    return;
  }
  handleKeyEvent(e);
}

/**
 * Mobile software keyboards sometimes only fire input.
 * @param {!Event} e Input event.
 */
function onCatcherInput(e) {
  const catcher = e.target;
  const val = catcher.value;
  catcher.value = '';
  if (!val || !Keys.engine) {
    return;
  }
  for (let i = 0; i < val.length; i++) {
    applyChar(val.charAt(i));
  }
}

/**
 * Consume a keyboard event for the engine.
 * @param {!Event} e Keyboard event.
 */
function handleKeyEvent(e) {
  if (!Keys.engine) {
    return;
  }
  if (Keys.Engine.isIgnorableKey(e.key, !!(e.ctrlKey || e.metaKey), !!e.altKey)) {
    if (e.key === 'Tab') {
      e.preventDefault();
    }
    return;
  }
  e.preventDefault();
  applyChar(e.key);
}

/**
 * Feed one character through the engine and refresh the playfield.
 * @param {string} ch Character.
 */
function applyChar(ch) {
  if (!Keys.engine) {
    return;
  }
  const result = Keys.engine.handleChar(ch);
  paintPrompt();
  paintStats();
  paintKeyboard();
  paintRacer();
  const board = BlocklyGames.getElementById('keysBoard');
  if (board) {
    board.classList.toggle('is-wrong', !result.ok && !result.done);
    if (!result.ok && !result.done) {
      window.setTimeout(function() {
        board.classList.remove('is-wrong');
      }, 180);
    }
  }
  if (result.done && result.ok) {
    finishLevel();
  }
}

/**
 * Render the prompt with a caret on the next character.
 */
function paintPrompt() {
  const host = BlocklyGames.getElementById('keysPrompt');
  const engine = Keys.engine;
  if (!host || !engine) {
    return;
  }
  host.textContent = '';
  const text = engine.text;
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    const ch = text.charAt(i);
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    if (i < engine.index) {
      span.className = 'keys-ch keys-ch--done';
    } else if (i === engine.index) {
      span.className = 'keys-ch keys-ch--caret';
      if (engine.lastWrong) {
        span.classList.add('is-miss');
      }
    } else {
      span.className = 'keys-ch keys-ch--todo';
    }
    if (ch === ' ') {
      span.classList.add('keys-ch--space');
    }
    host.appendChild(span);
  }
}

/**
 * WPM / accuracy / errors.
 */
function paintStats() {
  if (!Keys.engine) {
    return;
  }
  const stats = Keys.engine.stats();
  const acc = BlocklyGames.getElementById('keysAccuracy');
  const wpm = BlocklyGames.getElementById('keysWpm');
  const err = BlocklyGames.getElementById('keysErrors');
  if (acc) {
    acc.textContent = Math.round(stats.accuracy) + '%';
  }
  if (wpm) {
    wpm.textContent = String(Math.max(0, Math.round(stats.wpm)));
  }
  if (err) {
    err.textContent = String(stats.errors);
  }
}

/**
 * Light the target key (and Shift when needed).
 */
function paintKeyboard() {
  const kb = BlocklyGames.getElementById('keysKeyboard');
  if (!kb || !Keys.engine) {
    return;
  }
  const hint = Keys.engine.hintKey();
  const shift = Keys.engine.needsShift() || Keys.shiftLatch_;
  const keys = kb.querySelectorAll('[data-key]');
  for (let i = 0; i < keys.length; i++) {
    const el = keys[i];
    const key = el.getAttribute('data-key');
    el.classList.toggle('is-target', key === hint);
    el.classList.toggle('is-shift', key === 'Shift' && shift);
  }
}

/**
 * Slide the race car. No-op outside Race.
 */
function paintRacer() {
  const racer = BlocklyGames.getElementById('keysRacer');
  if (!racer || !Keys.engine) {
    return;
  }
  const pct = Math.min(100, Math.round(Keys.engine.stats().progress * 100));
  racer.style.left = pct + '%';
}

/**
 * Clicks on the drawn keyboard type that key.
 */
function wireOnscreenKeys() {
  const kb = BlocklyGames.getElementById('keysKeyboard');
  if (!kb) {
    return;
  }
  kb.addEventListener('mousedown', function(e) {
    e.preventDefault();
  });
  const buttons = kb.querySelectorAll('[data-key]');
  for (let i = 0; i < buttons.length; i++) {
    BlocklyGames.bindClick(buttons[i], onscreenKey);
  }
}

/**
 * @param {!Event} e Click on a drawn key.
 */
function onscreenKey(e) {
  const el = e.currentTarget;
  const key = el && el.getAttribute('data-key');
  if (!key || !Keys.engine) {
    return;
  }
  if (key === 'Shift') {
    Keys.shiftLatch_ = !Keys.shiftLatch_;
    paintKeyboard();
    focusCatcher();
    return;
  }
  let ch = key;
  const expected = Keys.engine.expected();
  if (expected && expected.toLowerCase() === key && expected !== key) {
    ch = expected;
    Keys.shiftLatch_ = false;
  } else if (Keys.shiftLatch_) {
    ch = shiftChar(key);
    Keys.shiftLatch_ = false;
  }
  applyChar(ch);
  paintKeyboard();
  focusCatcher();
}

/**
 * Shift a base key for the tablet latch.
 * @param {string} ch Base character.
 * @returns {string} Shifted character.
 */
function shiftChar(ch) {
  if (ch >= 'a' && ch <= 'z') {
    return ch.toUpperCase();
  }
  const map = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '-': '_', '=': '+', '[': '{', ']': '}', ';': ':',
    '\'': '"', ',': '<', '.': '>', '/': '?', '`': '~',
  };
  return map[ch] || ch;
}

/**
 * Persist progress and show the finish card.
 */
function finishLevel() {
  if (Keys.statsTimer_) {
    window.clearInterval(Keys.statsTimer_);
    Keys.statsTimer_ = 0;
  }
  const stats = Keys.engine.stats();
  const stars = Keys.Levels.starsFor(Keys.mode.id, stats);
  saveProgress(stats, stars);

  const next = BlocklyGames.LEVEL + 1;
  const hasNext = next <= Keys.mode.levels.length;
  const copy = 'Accuracy ' + Math.round(stats.accuracy) +
      '% · ' + Math.round(stats.wpm) + ' WPM · ' +
      stats.errors + (stats.errors === 1 ? ' miss' : ' misses');
  showOverlay({
    title: hasNext ? 'Nice typing!' : 'Mode complete!',
    copy: copy,
    stars: stars,
    primary: hasNext ? 'Next' : 'Modes',
    secondary: 'Try again',
    onPrimary: function() {
      if (hasNext) {
        window.location = modeUrl(Keys.mode.id, next);
      } else {
        window.location = modeUrl('');
      }
    },
    onSecondary: function() {
      window.location = modeUrl(Keys.mode.id, BlocklyGames.LEVEL);
    },
  });
}

/**
 * Write localStorage progress + best stars.
 * @param {!Object} stats Run stats.
 * @param {number} stars Stars 1-3.
 */
function saveProgress(stats, stars) {
  if (!window.localStorage) {
    return;
  }
  const payload = JSON.stringify({
    accuracy: Math.round(stats.accuracy),
    wpm: Math.round(stats.wpm * 10) / 10,
    stars: stars,
  });
  try {
    window.localStorage[BlocklyGames.storageName + BlocklyGames.LEVEL] = payload;
  } catch (e) {
    // Ignore quota / SecurityError.
  }
  BlocklyGames.saveStars(BlocklyGames.storageName, BlocklyGames.LEVEL, stars);
}

/**
 * Lightweight modal (help, done). Teacher unlock uses the same overlay
 * shell plus the shared form from BlocklyGames.html.dialog.
 * @param {!Object} opts Overlay options.
 */
function showOverlay(opts) {
  const overlay = BlocklyGames.getElementById('keysOverlay');
  const title = BlocklyGames.getElementById('keysOverlayTitle');
  const copy = BlocklyGames.getElementById('keysOverlayCopy');
  const stars = BlocklyGames.getElementById('keysOverlayStars');
  const primary = BlocklyGames.getElementById('keysOverlayPrimary');
  const secondary = BlocklyGames.getElementById('keysOverlaySecondary');
  if (!overlay || !title || !copy || !primary || !secondary) {
    return;
  }
  title.textContent = opts.title || '';
  copy.textContent = opts.copy || '';
  stars.textContent = '';
  const count = opts.stars || 0;
  if (count) {
    for (let i = 1; i <= 3; i++) {
      const star = document.createElement('span');
      star.className = i <= count ? 'keys-star is-on' : 'keys-star';
      star.textContent = '★';
      stars.appendChild(star);
    }
  }
  primary.textContent = opts.primary || 'OK';
  if (opts.secondary) {
    secondary.hidden = false;
    secondary.textContent = opts.secondary;
  } else {
    secondary.hidden = true;
  }
  Keys.overlayPrimary_ = opts.onPrimary || hideOverlay;
  Keys.overlaySecondary_ = opts.onSecondary || hideOverlay;
  primary.onclick = function() {
    hideOverlay();
    if (Keys.overlayPrimary_) {
      Keys.overlayPrimary_();
    }
  };
  secondary.onclick = function() {
    hideOverlay();
    if (Keys.overlaySecondary_) {
      Keys.overlaySecondary_();
    }
  };
  overlay.hidden = false;
}

/**
 * Hide the Keys overlay.
 */
function hideOverlay() {
  const overlay = BlocklyGames.getElementById('keysOverlay');
  if (overlay) {
    overlay.hidden = true;
  }
}

/**
 * Hook the shared teacher-password form so locked levels match Maze.
 */
function installTeacherUnlock() {
  window['BlocklyDialogs'] = {
    'teacherUnlock': keysTeacherUnlock,
  };
}

/**
 * Teacher password prompt using the shared dialog markup.
 * @param {number} level Target level.
 * @param {Element} _origin Unused.
 * @param {function(boolean)} callback Called with true if unlocked.
 */
function keysTeacherUnlock(level, _origin, callback) {
  const overlay = BlocklyGames.getElementById('keysOverlay');
  const panel = BlocklyGames.getElementById('keysOverlayPanel');
  const formBox = BlocklyGames.getElementById('dialogTeacherUnlock');
  const form = BlocklyGames.getElementById('teacherUnlockForm');
  const input = BlocklyGames.getElementById('teacherUnlockPassword');
  const error = BlocklyGames.getElementById('teacherUnlockError');
  const cancel = BlocklyGames.getElementById('teacherUnlockCancel');
  const title = BlocklyGames.getElementById('keysOverlayTitle');
  const copy = BlocklyGames.getElementById('keysOverlayCopy');
  const stars = BlocklyGames.getElementById('keysOverlayStars');
  const actions = panel && panel.querySelector('.keys-overlay-actions');
  if (!overlay || !panel || !formBox || !form || !input || !error || !cancel) {
    const entered = window.prompt(
        'This level is locked. Enter the teacher password to play it.');
    if (entered === null) {
      callback(false);
      return;
    }
    if (ThinkaConfig.checkPassword(entered)) {
      BlocklyGames.saveTeacherUnlock(BlocklyGames.storageName, level);
      callback(true);
    } else {
      window.alert('That password is not correct. Try again.');
      keysTeacherUnlock(level, _origin, callback);
    }
    return;
  }

  BlocklyGames.awaitingTeacherUnlock = true;
  let finished = false;
  const finish = function(ok) {
    if (finished) {
      return;
    }
    finished = true;
    BlocklyGames.awaitingTeacherUnlock = false;
    formBox.classList.add('dialogHiddenContent');
    if (title) {
      title.hidden = false;
    }
    if (copy) {
      copy.hidden = false;
    }
    if (stars) {
      stars.hidden = false;
    }
    if (actions) {
      actions.hidden = false;
    }
    overlay.hidden = true;
    callback(ok);
  };

  if (title) {
    title.hidden = true;
  }
  if (copy) {
    copy.hidden = true;
  }
  if (stars) {
    stars.hidden = true;
    stars.textContent = '';
  }
  if (actions) {
    actions.hidden = true;
  }
  formBox.classList.remove('dialogHiddenContent');
  if (formBox.parentNode !== panel) {
    panel.insertBefore(formBox, panel.firstChild);
  }
  input.value = '';
  error.textContent = '';
  form.onsubmit = function(e) {
    e.preventDefault();
    if (ThinkaConfig.checkPassword(input.value)) {
      BlocklyGames.saveTeacherUnlock(BlocklyGames.storageName, level);
      finish(true);
      return;
    }
    error.textContent = 'That password is not correct. Try again.';
    input.value = '';
    input.focus();
  };
  cancel.onclick = function(e) {
    e.preventDefault();
    finish(false);
  };
  overlay.hidden = false;
  window.setTimeout(function() {
    input.focus();
  }, 50);
}

BlocklyGames.callWhenLoaded(init);
