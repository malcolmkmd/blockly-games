/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HTML for index page.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Index.html');

goog.require('BlocklyGames');


/**
 * Web page structure.
 * @param {!Object} ij Injected options.
 * @returns {string} HTML.
 */
Index.html.start = function(ij) {
  const suffix = ij.html ? '.html' : '';
  return `
<div class="thinka-page">
  <div class="thinka-bg" aria-hidden="true"></div>
  <header class="thinka-bar">
    <a class="thinka-logo" href="index${suffix}?lang=${ij.lang}">thinka<span class="thinka-logo-dot">.</span></a>
    <p class="thinka-bar-tag" id="subtitle">Coding club</p>
    <div class="thinka-bar-tools">
      <a class="thinka-bar-about" href="about${suffix}?lang=${ij.lang}">${BlocklyGames.getMsg('Index.moreInfo', true)}</a>
      <select id="languageMenu"></select>
    </div>
  </header>

  <section class="thinka-featured thinka-featured--maze" id="thinkaFeatured">
    <div class="thinka-featured-art">
      <img id="featuredArt" src="index/art/maze.svg" width="240" height="240" alt="">
    </div>
    <div class="thinka-featured-copy">
      <p class="thinka-featured-kicker" id="featuredKicker">Let's play</p>
      <h1 class="thinka-featured-title" id="featuredName">${BlocklyGames.getMsg('Games.maze', true)}</h1>
      <p class="thinka-featured-blurb" id="featuredBlurb">Help the explorer find the path. Loops are your superpower!</p>
      <div class="thinka-featured-progress">
        <span class="thinka-stars" id="stars-featured"></span>
        <span class="thinka-card-progress-label" id="progress-label-featured"></span>
      </div>
      <a class="thinka-play" id="thinkaPlayNow" href="maze${suffix}?lang=${ij.lang}">
        <span id="thinkaPlayNowLabel">Start playing</span>
      </a>
    </div>
  </section>

  <h2 class="thinka-shelf-title">All games</h2>
  <main class="thinka-grid" id="thinkaGames">
    ${Index.html.appLink_(ij, 'keys', 'Games.keys', 'Type to learn. Race. Then code words.')}
    ${Index.html.appLink_(ij, 'puzzle', 'Games.puzzle', 'Snap the pieces. That is coding!')}
    ${Index.html.appLink_(ij, 'maze', 'Games.maze', 'Find the path. Loops are magic.')}
    ${Index.html.appLink_(ij, 'bird', 'Games.bird', 'Fly home with if and else.')}
    ${Index.html.appLink_(ij, 'turtle', 'Games.turtle', 'Draw wild pictures with loops.')}
    ${Index.html.appLink_(ij, 'movie', 'Games.movie', 'Make a film with maths.')}
    ${Index.html.appLink_(ij, 'music', 'Games.music', 'Compose a tune with functions.')}
    ${Index.html.appLink_(ij, 'pond-tutor', 'Games.pondTutor', 'Blocks today, JavaScript tomorrow.')}
    ${Index.html.appLink_(ij, 'pond-duck', 'Games.pond', 'Program the smartest duck.')}
  </main>

  <footer class="thinka-foot">
    <p id="clearDataPara" class="thinka-reset" style="visibility: hidden">
      ${BlocklyGames.getMsg('Index.startOver', true)}
      <button class="secondary" id="clearData">${BlocklyGames.getMsg('Index.clearData', true)}</button>
    </p>
    <p class="thinka-foot-meta">Thinka.org.za · Code. Build. Innovate.</p>
  </footer>
</div>
`;
};

/**
 * Create a card that links to an app.
 * @param {!Object} ij Injected options.
 * @param {string} app Name of application.
 * @param {string} msgName Name of text content to place in link.
 * @param {string} blurb Short English classroom hint.
 * @returns {string} HTML.
 * @private
 */
Index.html.appLink_ = function(ij, app, msgName, blurb) {
  const suffix = ij.html ? '.html' : '';
  return `
<a class="thinka-card thinka-card--${app}" id="card-${app}"
    href="${app}${suffix}?lang=${ij.lang}"
    data-app="${app}" data-blurb="${blurb}">
  <span class="thinka-card-glow" aria-hidden="true"></span>
  <span class="thinka-card-art">
    <img class="thinka-card-icon" src="index/art/${app}.svg" width="200" height="200" alt="">
  </span>
  <span class="thinka-card-name">${BlocklyGames.getMsg(msgName, true)}</span>
  <span class="thinka-card-blurb">${blurb}</span>
  <span class="thinka-card-progress">
    <span class="thinka-stars" id="stars-${app}"></span>
    <span class="thinka-card-progress-track">
      <span class="thinka-card-progress-bar" id="progress-${app}"></span>
    </span>
    <span class="thinka-card-progress-label" id="progress-label-${app}"></span>
  </span>
  <span class="thinka-card-go">Play</span>
</a>
`;
};
