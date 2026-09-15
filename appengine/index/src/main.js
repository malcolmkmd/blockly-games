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
goog.require('Maze.Levels');
goog.require('ThinkaConfig');

/**
 * Array of application names.
 */
const APPS = ['puzzle', 'maze', 'bird', 'turtle', 'movie', 'music',
              'pond-tutor', 'pond-duck'];

/**
 * Play order for the featured "Start playing" path.
 * Maze is the club favourite; other games follow after it is complete.
 */
const START_ORDER = ['maze', 'puzzle', 'bird', 'turtle', 'movie', 'music',
                     'pond-tutor', 'pond-duck'];

/**
 * Every localStorage name an app keeps progress under, paired with how many
 * levels that name holds.
 *
 * Most apps store progress as `<app><level>` for levels 1..MAX_LEVEL.  Puzzle
 * is a single level, and Maze splits its curriculum across one name per
 * concept unit (`maze_g2_repeat1`), so it contributes many names.
 * @param {string} app Name of application.
 * @returns {!Array<!Object>} Records of {name, levels}.
 */
function storageNames(app) {
  if (app === 'puzzle') {
    return [{name: app, levels: 1}];
  }
  if (app === 'maze') {
    const names = [];
    for (const {stage, unit} of Maze.Levels.allUnits()) {
      if (unit.levels.length) {
        names.push({
          name: Maze.Levels.storageName(stage, unit.id),
          levels: unit.levels.length,
        });
      }
    }
    return names;
  }
  return [{name: app, levels: BlocklyGames.MAX_LEVEL}];
}

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
  const levelsTotal = [];
  for (let i = 0; i < APPS.length; i++) {
    levelsDone[i] = 0;
    levelsTotal[i] = 0;
    for (const {name, levels} of storageNames(APPS[i])) {
      levelsTotal[i] += levels;
      for (let j = 1; j <= levels; j++) {
        if (BlocklyGames.loadFromLocalStorage(name, j)) {
          storedData = true;
          levelsDone[i]++;
        }
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
    const denominator = levelsTotal[i];
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
      label.textContent = done ? (done + ' / ' + denominator) : 'New';
    }
    if (card && done === 0) {
      card.classList.add('thinka-card--fresh');
    }
    renderStars('stars-' + app, done, denominator);
  }

  decorateFeatured(levelsDone, levelsTotal);
}

/**
 * First incomplete game in START_ORDER, or Maze if everything is done.
 * @param {!Array<number>} levelsDone Completed-level counts, APPS order.
 * @param {!Array<number>} levelsTotal Total-level counts, APPS order.
 * @returns {string} Application id.
 */
function pickStartApp(levelsDone, levelsTotal) {
  for (let o = 0; o < START_ORDER.length; o++) {
    const app = START_ORDER[o];
    const i = APPS.indexOf(app);
    if (levelsDone[i] < levelsTotal[i]) {
      return app;
    }
  }
  return 'maze';
}

/**
 * Draw Maze-style level dots into a star row.
 * @param {string} containerId Element id.
 * @param {number} done Completed levels.
 * @param {number} total Level count for this game.
 */
function renderStars(containerId, done, total) {
  const el = BlocklyGames.getElementById(containerId);
  if (!el) {
    return;
  }
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', done + ' / ' + total);
  const slots = Math.min(total, BlocklyGames.MAX_LEVEL);
  const lit = total ? Math.round(done / total * slots) : 0;
  for (let i = 0; i < slots; i++) {
    const star = document.createElement('i');
    if (i < lit) {
      star.className = 'is-lit';
    }
    el.appendChild(star);
  }
}

/**
 * Point the featured banner at the next game to play.
 * @param {!Array<number>} levelsDone Completed-level counts, APPS order.
 * @param {!Array<number>} levelsTotal Total-level counts, APPS order.
 */
function decorateFeatured(levelsDone, levelsTotal) {
  const startApp = pickStartApp(levelsDone, levelsTotal);
  const startCard = BlocklyGames.getElementById('card-' + startApp);
  const featured = BlocklyGames.getElementById('thinkaFeatured');
  const playNow = BlocklyGames.getElementById('thinkaPlayNow');
  if (!featured || !startCard || !playNow) {
    return;
  }

  featured.className = 'thinka-featured thinka-featured--' + startApp;
  const art = BlocklyGames.getElementById('featuredArt');
  if (art) {
    art.src = 'index/art/' + startApp + '.svg';
  }
  const name = BlocklyGames.getElementById('featuredName');
  const blurb = BlocklyGames.getElementById('featuredBlurb');
  const nameEl = startCard.querySelector('.thinka-card-name');
  if (name && nameEl) {
    name.textContent = nameEl.textContent;
  }
  if (blurb) {
    blurb.textContent = startCard.getAttribute('data-blurb') || '';
  }
  playNow.href = startCard.href;

  const i = APPS.indexOf(startApp);
  const denom = levelsTotal[i];
  const done = levelsDone[i];
  renderStars('stars-featured', done, denom);
  const featLabel = BlocklyGames.getElementById('progress-label-featured');
  if (featLabel) {
    featLabel.textContent = done ? (done + ' / ' + denom) : 'New';
  }

  const kicker = BlocklyGames.getElementById('featuredKicker');
  const playLabel = BlocklyGames.getElementById('thinkaPlayNowLabel');
  let allDone = true;
  for (let a = 0; a < APPS.length; a++) {
    if (levelsDone[a] < levelsTotal[a]) {
      allDone = false;
      break;
    }
  }
  if (allDone) {
    if (kicker) {
      kicker.textContent = 'Play again';
    }
    if (playLabel) {
      playLabel.textContent = 'Play again';
    }
  } else if (done > 0) {
    if (kicker) {
      kicker.textContent = 'Keep going';
    }
    if (playLabel) {
      playLabel.textContent = 'Keep playing';
    }
  } else {
    if (kicker) {
      kicker.textContent = "Let's play";
    }
    if (playLabel) {
      playLabel.textContent = 'Start playing';
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
  for (const app of APPS) {
    for (const {name, levels} of storageNames(app)) {
      for (let j = 1; j <= levels; j++) {
        delete window.localStorage[name + j];
        delete window.localStorage[ThinkaConfig.unlockKey(name, j)];
        delete window.localStorage[ThinkaConfig.starsKey(name, j)];
      }
      delete window.localStorage[ThinkaConfig.explainedKey(name)];
    }
  }
  location.reload();
}

BlocklyGames.callWhenLoaded(init);
