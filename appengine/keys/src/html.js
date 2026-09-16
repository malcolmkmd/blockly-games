/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HTML for the Keys typing game.
 */
'use strict';

goog.provide('Keys.html');

goog.require('BlocklyGames');
goog.require('BlocklyGames.html');


/**
 * QWERTY rows shown on the hint keyboard. Space is its own row.
 * @type {!Array<!Array<string>>}
 */
Keys.html.ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

/**
 * Home-row keys get finger-zone colours in Lessons.
 * @type {!Object<string, string>}
 */
Keys.html.HOME_ZONE = {
  'a': 'pinky',
  's': 'ring',
  'd': 'middle',
  'f': 'index',
  'j': 'index',
  'k': 'middle',
  'l': 'ring',
  ';': 'pinky',
};

/**
 * Mode picker (no Blockly workspace).
 * @param {!Object} ij Injected options.
 * @param {string} appName Escaped game title.
 * @returns {string} HTML.
 */
Keys.html.picker = function(ij, appName) {
  return `
${BlocklyGames.html.headerBar(ij, appName, '', false, true, '')}
<div class="keys-page keys-page--picker">
  <p class="keys-intro" id="keysIntro">Pick a way to play. Lessons teach. Race is a sprint. Code types the words you will see in Maze.</p>
  <div class="keys-modes" id="keysModes"></div>
</div>
${Keys.html.overlays_()}
`;
};

/**
 * Play screen for one mode + level.
 * @param {!Object} ij Injected options.
 * @param {string} appName Escaped game title.
 * @param {string} modeId lessons, race, or code.
 * @param {string} modesHtml Extra header control.
 * @returns {string} HTML.
 */
Keys.html.play = function(ij, appName, modeId, modesHtml) {
  const suffix = 'mode=' + encodeURIComponent(modeId);
  return `
${BlocklyGames.html.headerBar(ij, appName, suffix, false, true, modesHtml)}
<div class="keys-page keys-page--${BlocklyGames.esc(modeId)}">
  <div class="keys-meta">
    <p class="keys-kicker" id="keysKicker"></p>
    <h2 class="keys-level-title" id="keysLevelTitle"></h2>
    <p class="keys-hint" id="keysHint"></p>
  </div>
  <div class="keys-code-chip" id="keysCodeChip" hidden>
    <span class="keys-code-token" id="keysCodeToken"></span>
    <span class="keys-code-meaning" id="keysCodeMeaning"></span>
  </div>
  <div class="keys-track" id="keysTrack" hidden>
    <div class="keys-track-lane">
      <div class="keys-racer" id="keysRacer" aria-hidden="true">${Keys.html.carSvg_()}</div>
      <div class="keys-finish" aria-hidden="true">${Keys.html.flagSvg_()}</div>
    </div>
  </div>
  <div class="keys-board" id="keysBoard">
    <div class="keys-prompt" id="keysPrompt" role="textbox" aria-readonly="true" aria-label="Words to type"></div>
    <input id="keysCatcher" class="keys-catcher" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type here">
  </div>
  <div class="keys-stats" id="keysStats">
    <div class="keys-stat"><span class="keys-stat-label">Accuracy</span><span class="keys-stat-value" id="keysAccuracy">100%</span></div>
    <div class="keys-stat"><span class="keys-stat-label">WPM</span><span class="keys-stat-value" id="keysWpm">0</span></div>
    <div class="keys-stat"><span class="keys-stat-label">Errors</span><span class="keys-stat-value" id="keysErrors">0</span></div>
  </div>
  <div class="keys-keyboard" id="keysKeyboard" aria-hidden="true">${Keys.html.keyboard_()}</div>
  <p class="keys-tap" id="keysTap">Tap the words or any key to start. On a tablet, tap here so the keyboard opens.</p>
</div>
${Keys.html.overlays_()}
`;
};

/**
 * Shared help / done / teacher-unlock shells.
 * @returns {string} HTML.
 * @private
 */
Keys.html.overlays_ = function() {
  return `
${BlocklyGames.html.dialog()}
<div id="keysOverlay" class="keys-overlay" hidden>
  <div class="keys-overlay-card" id="keysOverlayPanel" role="dialog" aria-modal="true" aria-labelledby="keysOverlayTitle">
    <h2 class="keys-overlay-title" id="keysOverlayTitle"></h2>
    <div class="keys-overlay-stars" id="keysOverlayStars"></div>
    <p class="keys-overlay-copy" id="keysOverlayCopy"></p>
    <div class="keys-overlay-actions">
      <button type="button" id="keysOverlaySecondary" class="secondary"></button>
      <button type="button" id="keysOverlayPrimary" class="primary"></button>
    </div>
  </div>
</div>
`;
};

/**
 * On-screen QWERTY hint keyboard.
 * @returns {string} HTML.
 * @private
 */
Keys.html.keyboard_ = function() {
  let html = '';
  for (let r = 0; r < Keys.html.ROWS.length; r++) {
    const row = Keys.html.ROWS[r];
    html += '<div class="keys-kb-row">';
    if (r === 3) {
      html += '<button type="button" class="keys-kb-key keys-kb-key--mod" data-key="Shift">Shift</button>';
    }
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      const zone = Keys.html.HOME_ZONE[ch] || '';
      const zoneClass = zone ? ' keys-kb-key--' + zone : '';
      html += `<button type="button" class="keys-kb-key${zoneClass}" data-key="${BlocklyGames.esc(ch)}">${BlocklyGames.esc(ch === '\'' ? '\'' : ch)}</button>`;
    }
    if (r === 3) {
      html += '<button type="button" class="keys-kb-key keys-kb-key--mod" data-key="Shift">Shift</button>';
    }
    html += '</div>';
  }
  html += '<div class="keys-kb-row keys-kb-row--space">';
  html += '<button type="button" class="keys-kb-key keys-kb-key--space" data-key=" ">space</button>';
  html += '</div>';
  return html;
};

/**
 * Tiny SVG race car.
 * @returns {string} SVG markup.
 * @private
 */
Keys.html.carSvg_ = function() {
  return `
<svg class="keys-car-svg" viewBox="0 0 88 48" width="88" height="48" aria-hidden="true">
  <rect x="10" y="18" width="62" height="16" rx="8" fill="#FF4500"/>
  <rect x="28" y="8" width="28" height="14" rx="6" fill="#FFB199"/>
  <circle cx="26" cy="36" r="8" fill="#121F12"/>
  <circle cx="26" cy="36" r="3.5" fill="#F8FAFC"/>
  <circle cx="62" cy="36" r="8" fill="#121F12"/>
  <circle cx="62" cy="36" r="3.5" fill="#F8FAFC"/>
  <circle cx="70" cy="22" r="3" fill="#FACC15"/>
</svg>`;
};

/**
 * Finish-line flag.
 * @returns {string} SVG markup.
 * @private
 */
Keys.html.flagSvg_ = function() {
  return `
<svg viewBox="0 0 36 44" width="36" height="44" aria-hidden="true">
  <path d="M8 4 v36" stroke="#F8FAFC" stroke-width="3" stroke-linecap="round"/>
  <path d="M10 6 h22 l-4 7 4 7 H10 z" fill="#FACC15"/>
  <path d="M12 8 h4 v4 h-4 z M20 8 h4 v4 h-4 z M16 12 h4 v4 h-4 z M24 12 h4 v4 h-4 z" fill="#030A03"/>
</svg>`;
};
