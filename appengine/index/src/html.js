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
  return `
<div class="thinka-page">
  <header class="thinka-hero">
    <select id="languageMenu"></select>
    <div class="thinka-hero-inner">
      <div class="thinka-brand">
        <span class="thinka-brand-mark" aria-hidden="true">
          <span class="thinka-brand-block thinka-brand-block--orange"></span>
          <span class="thinka-brand-block thinka-brand-block--blue"></span>
        </span>
        <h1 class="thinka-brand-title">
          <span class="thinka-brand-name">Thinka</span>
          <span class="thinka-brand-games">Games</span>
        </h1>
      </div>
      <p id="subtitle" class="thinka-hero-sub">${BlocklyGames.getMsg('Index.subTitle', true)}</p>
      <a class="thinka-hero-about" href="about${ij.html ? '.html' : ''}?lang=${ij.lang}">${BlocklyGames.getMsg('Index.moreInfo', true)}</a>
    </div>
  </header>
  <main class="thinka-grid" id="thinkaGames">
    ${Index.html.appLink_(ij, 'puzzle', 'Games.puzzle', 'Snap the pieces together')}
    ${Index.html.appLink_(ij, 'maze', 'Games.maze', 'Find the path with loops')}
    ${Index.html.appLink_(ij, 'bird', 'Games.bird', 'Fly with if and else')}
    ${Index.html.appLink_(ij, 'turtle', 'Games.turtle', 'Draw with nested loops')}
    ${Index.html.appLink_(ij, 'movie', 'Games.movie', 'Animate with maths')}
    ${Index.html.appLink_(ij, 'music', 'Games.music', 'Compose with functions')}
    ${Index.html.appLink_(ij, 'pond-tutor', 'Games.pondTutor', 'From blocks to JavaScript')}
    ${Index.html.appLink_(ij, 'pond-duck', 'Games.pond', 'Program the smartest duck')}
  </main>
  <p id="clearDataPara" class="thinka-reset" style="visibility: hidden">
    ${BlocklyGames.getMsg('Index.startOver', true)}
    <button class="secondary" id="clearData">${BlocklyGames.getMsg('Index.clearData', true)}</button>
  </p>
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
  return `
<a class="thinka-card thinka-card--${app}" id="card-${app}"
    href="${app}${ij.html ? '.html' : ''}?lang=${ij.lang}">
  <span class="thinka-card-accent" aria-hidden="true"></span>
  <img class="thinka-card-icon" src="index/${app}.png" height="100" width="100" alt="">
  <span class="thinka-card-name">${BlocklyGames.getMsg(msgName, true)}</span>
  <span class="thinka-card-blurb">${blurb}</span>
  <span class="thinka-card-progress">
    <span class="thinka-card-progress-track">
      <span class="thinka-card-progress-bar" id="progress-${app}"></span>
    </span>
    <span class="thinka-card-progress-label" id="progress-label-${app}"></span>
  </span>
</a>
`;
};
