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
 * Play order for the featured "Start playing" path.
 * Maze is the club favourite; other games follow after it is complete.
 */
const START_ORDER = ['maze', 'puzzle', 'bird', 'turtle', 'movie', 'music',
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
    renderStars('stars-' + app, done, denominator);
  }

  decorateFeatured(levelsDone);
}

/**
 * First incomplete game in START_ORDER, or Maze if everything is done.
 * @param {!Array<number>} levelsDone Completed-level counts, APPS order.
 * @returns {string} Application id.
 */
function pickStartApp(levelsDone) {
  for (let o = 0; o < START_ORDER.length; o++) {
    const app = START_ORDER[o];
    const i = APPS.indexOf(app);
    const denom = (i === 0) ? 1 : BlocklyGames.MAX_LEVEL;
    if (levelsDone[i] < denom) {
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
  for (let i = 0; i < total; i++) {
    const star = document.createElement('i');
    if (i < done) {
      star.className = 'is-lit';
    }
    el.appendChild(star);
  }
}

/**
 * Point the featured banner at the next game to play.
 * @param {!Array<number>} levelsDone Completed-level counts, APPS order.
 */
function decorateFeatured(levelsDone) {
  const startApp = pickStartApp(levelsDone);
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
  const denom = (i === 0) ? 1 : BlocklyGames.MAX_LEVEL;
  const done = levelsDone[i];
  renderStars('stars-featured', done, denom);
  const featLabel = BlocklyGames.getElementById('progress-label-featured');
  if (featLabel) {
    featLabel.textContent = done + ' / ' + denom;
  }

  const kicker = BlocklyGames.getElementById('featuredKicker');
  const playLabel = BlocklyGames.getElementById('thinkaPlayNowLabel');
  let allDone = true;
  for (let a = 0; a < APPS.length; a++) {
    const need = (a === 0) ? 1 : BlocklyGames.MAX_LEVEL;
    if (levelsDone[a] < need) {
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
  for (let i = 0; i < APPS.length; i++) {
    for (let j = 1; j <= BlocklyGames.MAX_LEVEL; j++) {
      delete window.localStorage[APPS[i] + j];
      delete window.localStorage[ThinkaConfig.unlockKey(APPS[i], j)];
    }
  }
  location.reload();
}

BlocklyGames.callWhenLoaded(init);
