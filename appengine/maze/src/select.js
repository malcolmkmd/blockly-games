/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Stage and concept-unit picker for the Maze game.
 *
 * Two screens sit in front of the maze.  Opening maze.html bare asks the
 * student which stage they are in; naming a stage but no unit lists that
 * stage's topics, the levels inside each one, and the stars earned so far.
 */
'use strict';

goog.provide('Maze.Select');

goog.require('Blockly.Msg');
goog.require('BlocklyDialogs');
goog.require('BlocklyGames');
goog.require('BlocklyGames.html');
goog.require('Maze.Explain');
goog.require('Maze.Levels');
goog.require('ThinkaConfig');


/**
 * True if the page should show a picker rather than a level.  A level needs
 * both a stage and a unit; anything less picks one of them first.
 * @returns {boolean} True if no unit was requested.
 */
Maze.Select.isRequested = function() {
  return !BlocklyGames.getStringParamFromUrl('unit', '');
};

/**
 * URL of the stage picker.
 * @returns {string} URL.
 */
Maze.Select.url = function() {
  return (BlocklyGames.IS_HTML ? 'maze.html' : 'maze') +
      '?lang=' + BlocklyGames.LANG;
};

/**
 * URL of one stage's topic picker.
 * @param {number} stage Stage number.
 * @returns {string} URL.
 */
Maze.Select.stageUrl = function(stage) {
  return Maze.Select.url() + '&stage=' + stage;
};

/**
 * The stage named by the URL, if it names a real one.
 * @returns {number} Stage number, or 0 for the stage picker.
 * @private
 */
function requestedStage_() {
  const raw = BlocklyGames.getStringParamFromUrl('stage', '');
  const stage = Math.floor(Number(raw));
  return (raw && Maze.Levels.getStage(stage)) ? stage : 0;
}

/**
 * How far a student has got through one unit.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {!Object} {total, done, started, stars}.
 * @private
 */
function progress_(stage, unit) {
  const name = Maze.Levels.storageName(stage, unit.id);
  let done = 0;
  let stars = 0;
  for (let i = 1; i <= unit.levels.length; i++) {
    if (BlocklyGames.loadFromLocalStorage(name, i)) {
      done++;
    }
    stars += BlocklyGames.loadStars(name, i);
  }
  return {total: unit.levels.length, done: done, started: done, stars: stars};
}

/**
 * Whether a unit may be entered yet.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @param {!Object} own This unit's progress summary.
 * @returns {boolean} True if the unit is unlocked.
 * @private
 */
function isUnlocked_(stage, unit, own) {
  const before = Maze.Levels.previousUnit(stage, unit.id);
  const previous = before ? progress_(before.stage, before.unit) : null;
  const name = Maze.Levels.storageName(stage, unit.id);
  return ThinkaConfig.isUnitPlayable(previous, own.started,
      BlocklyGames.hasTeacherUnlock(name, 1));
}

/**
 * Render whichever picker the URL asks for, and wire up its links.  Called on
 * page load.
 */
Maze.Select.init = function() {
  const ij = {
    lang: BlocklyGames.LANG,
    html: BlocklyGames.IS_HTML,
  };
  const stage = requestedStage_();
  const record = stage ? Maze.Levels.getStage(stage) : null;
  document.body.innerHTML = `
${BlocklyGames.html.headerBar(ij, BlocklyGames.getMsg('Games.maze', true),
    '', false, false, '')}
${record ? Maze.Select.topics_(record) : Maze.Select.stages_()}
${BlocklyGames.html.dialog()}
${Maze.Explain.shell()}
`;

  BlocklyGames.init(BlocklyGames.getMsg('Games.maze', false));

  const languageMenu = BlocklyGames.getElementById('languageMenu');
  if (languageMenu) {
    languageMenu.addEventListener('change', BlocklyGames.changeLanguage, true);
  }

  Maze.Explain.init();

  for (const unit of (record ? record.units : [])) {
    const button = BlocklyGames.getElementById(unlockId_(stage, unit.id));
    if (button) {
      BlocklyGames.bindClick(button, unlockHandler_(stage, unit));
    }
    const explain = BlocklyGames.getElementById(explainId_(stage, unit.id));
    if (explain) {
      BlocklyGames.bindClick(explain, explainHandler_(stage, unit));
    }
  }
};

/**
 * The first screen: one card per stage.
 * @returns {string} HTML.
 * @private
 */
Maze.Select.stages_ = function() {
  let cards = '';
  for (const record of Maze.Levels.STAGES) {
    cards += Maze.Select.stageCard_(record);
  }
  return `
<div id="mazeSelect">
  <p id="mazeSelectIntro">${BlocklyGames.getMsg('Maze.selectIntro', true)}</p>
  <div id="mazeStageList">${cards}</div>
</div>
`;
};

/**
 * One stage on the first screen: what it covers and how far the student is.
 * @param {!Object} record Stage record.
 * @returns {string} HTML.
 * @private
 */
Maze.Select.stageCard_ = function(record) {
  let total = 0;
  let done = 0;
  let stars = 0;
  let topics = 0;
  for (const unit of record.units) {
    if (!unit.levels.length) {
      continue;
    }
    const own = progress_(record.stage, unit);
    total += own.total;
    done += own.done;
    stars += own.stars;
    topics++;
  }

  const heading = `
  <div class="mazeStageCardName">${BlocklyGames.esc(record.name)}</div>
  <div class="mazeStageCardTheme">${BlocklyGames.esc(record.theme)}</div>`;

  if (!total) {
    return `
<div class="mazeStageCard mazeStageCardEmpty">
  ${heading}
  <div class="mazeStageCardProgress">${BlocklyGames.getMsg('Maze.comingSoon', true)}</div>
</div>
`;
  }

  const count = topics === 1 ?
      BlocklyGames.getMsg('Maze.stageTopics1', true) :
      BlocklyGames.getMsg('Maze.stageTopics', true).replace('%1', String(topics));
  const summary = progressMsg_(done, total, stars);
  return `
<a class="mazeStageCard" href="${Maze.Select.stageUrl(record.stage)}">
  ${heading}
  <div class="mazeStageCardTopics">${count}</div>
  <div class="mazeStageCardProgress">${summary}</div>
  <div class="mazeStageCardBar"><span style="width: ${Math.round(done / total * 100)}%"></span></div>
</a>
`;
};

/**
 * The second screen: the topics of one stage, each with its levels.
 * @param {!Object} record Stage record.
 * @returns {string} HTML.
 * @private
 */
Maze.Select.topics_ = function(record) {
  let units = '';
  for (const unit of record.units) {
    units += Maze.Select.unit_(record.stage, unit);
  }
  return `
<div id="mazeSelect">
  <div id="mazeSelectBack">
    <a href="${Maze.Select.url()}">&lsaquo; ${BlocklyGames.getMsg('Maze.allStages', true)}</a>
  </div>
  <h2 class="mazeStageName">
    ${BlocklyGames.esc(record.name)}
    <span class="mazeStageTheme">${BlocklyGames.esc(record.theme)}</span>
  </h2>
  <p id="mazeSelectIntro">${BlocklyGames.getMsg('Maze.selectTopic', true)}</p>
  ${units}
</div>
`;
};

/**
 * Levels finished and stars earned, as a sentence.
 * @param {number} done Levels finished.
 * @param {number} total Levels available.
 * @param {number} stars Stars earned.
 * @returns {string} Escaped message.
 * @private
 */
function progressMsg_(done, total, stars) {
  return BlocklyGames.getMsg('Maze.unitProgress', true)
      .replace('%1', String(done))
      .replace('%2', String(total))
      .replace('%3', String(stars))
      .replace('%4', String(total * 3));
}

/**
 * One concept unit: its name, what it teaches, and a dot per level.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {string} HTML.
 * @private
 */
Maze.Select.unit_ = function(stage, unit) {
  if (!unit.levels.length) {
    return `
<div class="mazeUnit mazeUnitEmpty">
  <div class="mazeUnitText">
    <div class="mazeUnitName">${BlocklyGames.esc(unit.name)}</div>
    <div class="mazeUnitDescription">${BlocklyGames.getMsg('Maze.comingSoon', true)}</div>
  </div>
</div>
`;
  }

  const own = progress_(stage, unit);
  const unlocked = isUnlocked_(stage, unit, own);
  const name = Maze.Levels.storageName(stage, unit.id);

  let levels = '';
  for (let i = 1; i <= unit.levels.length; i++) {
    const stars = BlocklyGames.loadStars(name, i);
    const classes = ['mazeLevel'];
    if (!unlocked || !BlocklyGames.isLevelPlayable(name, i)) {
      classes.push('level_locked');
    } else if (BlocklyGames.loadFromLocalStorage(name, i)) {
      classes.push('level_done');
    }
    if (stars) {
      classes.push('level_stars' + stars);
    }
    const url = `?lang=${BlocklyGames.LANG}&stage=${stage}` +
        `&unit=${encodeURIComponent(unit.id)}&level=${i}`;
    levels +=
        `<a class="${classes.join(' ')}" href="${url}">${i}</a>`;
  }

  const summary = progressMsg_(own.done, own.total, own.stars);

  const explainButton = (unlocked && Maze.Explain.has(unit)) ? `
  <button type="button" id="${explainId_(stage, unit.id)}" class="mazeExplainAgain">
    ${BlocklyGames.getMsg('Maze.explainAgain', true)}
  </button>
` : '';

  const unlockButton = unlocked ? '' : `
  <button id="${unlockId_(stage, unit.id)}" class="mazeUnitUnlock">
    ${BlocklyGames.getMsg('Maze.unlockUnit', true)}
  </button>
`;

  return `
<div class="mazeUnit${unlocked ? '' : ' mazeUnitLocked'}">
  <div class="mazeUnitText">
    <div class="mazeUnitName">${BlocklyGames.esc(unit.name)}</div>
    <div class="mazeUnitDescription">${BlocklyGames.esc(unit.description)}</div>
    ${explainButton}
    <div class="mazeUnitProgress">${summary}</div>
  </div>
  <div class="mazeUnitLevels">${levels}</div>
  ${unlockButton}
</div>
`;
};

/**
 * DOM id of a locked unit's unlock button.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @returns {string} Element id.
 * @private
 */
function unlockId_(stage, unitId) {
  return `unlock_g${stage}_${unitId}`;
}

/**
 * DOM id of an unlocked unit's "How this works" button.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @returns {string} Element id.
 * @private
 */
function explainId_(stage, unitId) {
  return `explain_g${stage}_${unitId}`;
}

/**
 * Click handler for a unit's picture-book button.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {!Function} Event handler.
 * @private
 */
function explainHandler_(stage, unit) {
  return function(e) {
    e.preventDefault();
    const button = BlocklyGames.getElementById(explainId_(stage, unit.id));
    Maze.Explain.show(stage, unit, button);
  };
}

/**
 * Click handler for a locked unit's unlock button.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {!Function} Event handler.
 * @private
 */
function unlockHandler_(stage, unit) {
  return function(e) {
    e.preventDefault();
    const button = BlocklyGames.getElementById(unlockId_(stage, unit.id));
    const title = BlocklyGames.getElementById('teacherUnlockTitle');
    if (title) {
      title.textContent = `"${unit.name}" is locked`;
    }
    // teacherUnlock records the unlock against BlocklyGames.storageName, so
    // point that at the unit being opened.
    BlocklyGames.storageName = Maze.Levels.storageName(stage, unit.id);
    BlocklyDialogs['teacherUnlock'](1, button, function(ok) {
      if (ok) {
        location = `?lang=${BlocklyGames.LANG}&stage=${stage}` +
            `&unit=${encodeURIComponent(unit.id)}&level=1`;
      }
    });
  };
}
