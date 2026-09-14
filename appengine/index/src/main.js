/**
 * @license
 * Copyright 2014 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript for index page.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Index');

goog.require('BlocklyGames');
goog.require('Index.html');
goog.require('ThinkaConfig');

/**
 * Array of application names.
 */
const APPS = ['puzzle', 'maze', 'bird', 'turtle', 'movie', 'music',
              'pond-tutor', 'pond-duck'];

/**
 * Render the page and load any progress data.  Called on page load.
 */
function init() {
  // Render the HTML.
  document.body.innerHTML = Index.html.start(
    {lang: BlocklyGames.LANG,
     html: BlocklyGames.IS_HTML,
     rtl: BlocklyGames.IS_RTL});
  document.body.classList.add('thinka-hub');

  BlocklyGames.init('');

  const languageMenu = BlocklyGames.getElementById('languageMenu');
  languageMenu.addEventListener('change', BlocklyGames.changeLanguage, true);

  let storedData = false;
  const levelsDone = [];
  for (let i = 0; i < APPS.length; i++) {
    levelsDone[i] = 0;
    for (let j = 1; j <= BlocklyGames.MAX_LEVEL; j++) {
      if (BlocklyGames.loadFromLocalStorage(APPS[i], j)) {
        storedData = true;
        levelsDone[i]++;
      }
    }
  }
  if (storedData) {
    const clearButtonPara = BlocklyGames.getElementById('clearDataPara');
    clearButtonPara.style.visibility = 'visible';
    BlocklyGames.bindClick('clearData', clearData);
  }

  for (let i = 0; i < levelsDone.length; i++) {
    const app = APPS[i];
    const denominator = (i === 0) ? 1 : BlocklyGames.MAX_LEVEL;
    const done = levelsDone[i];
    const bar = BlocklyGames.getElementById('progress-' + app);
    const label = BlocklyGames.getElementById('progress-label-' + app);
    const card = BlocklyGames.getElementById('card-' + app);
    const pct = denominator ? (done / denominator) * 100 : 0;
    if (bar) {
      bar.style.width = pct + '%';
      if (done >= denominator && done > 0) {
        bar.classList.add('is-complete');
        if (card) {
          card.classList.add('thinka-card--done');
        }
      }
    }
    if (label) {
      label.textContent = done + ' / ' + denominator;
    }
  }
}

/**
 * Clear all stored data.
 */
function clearData() {
  if (!confirm(BlocklyGames.getMsg('Index.clear', false))) {
    return;
  }
  for (let i = 0; i < APPS.length; i++) {
    for (let j = 1; j <= BlocklyGames.MAX_LEVEL; j++) {
      delete window.localStorage[APPS[i] + j];
      delete window.localStorage[ThinkaConfig.unlockKey(APPS[i], j)];
    }
  }
  location.reload();
}

BlocklyGames.callWhenLoaded(init);
