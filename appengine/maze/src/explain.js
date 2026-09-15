/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Picture-book explainer for a maze topic.
 *
 * Each authored unit can name a few slides.  The first visit to a topic
 * opens them automatically; afterwards a child can reopen them from the
 * topic list or from the maze breadcrumb.  Skip still counts as seen, so
 * the book does not nag.
 */
'use strict';

goog.provide('Maze.Explain');

goog.require('Blockly');
goog.require('Blockly.Msg');
goog.require('BlocklyDialogs');
goog.require('BlocklyGames');
goog.require('Maze.Levels');
goog.require('ThinkaConfig');


/**
 * Doodle kinds a slide may name.  The test file lists the same set.
 * @enum {string}
 */
Maze.Explain.DOODLE = {
  PATH_SHORT: 'path-short',
  PATH_BEND: 'path-bend',
  BLOCKS_STACK: 'blocks-stack',
  BLOCKS_TURN: 'blocks-turn',
  BLOCKS_REPEAT: 'blocks-repeat',
  BLOCKS_NESTED: 'blocks-nested',
  GEMS: 'gems',
  BROKEN: 'broken',
  UNTIL: 'until',
  IF_PATH: 'if-path',
  IF_ELSE: 'if-else',
  WALL: 'wall',
  RUN: 'run',
};

let explainStage_ = 0;
let explainUnit_ = null;
let explainIndex_ = 0;
let onClose_ = null;
let bound_ = false;


/**
 * True if this unit has a picture-book to show.
 * @param {Object} unit Unit record.
 * @returns {boolean} True if there are slides.
 */
Maze.Explain.has = function(unit) {
  return !!(unit && unit.explainer && unit.explainer.length);
};

/**
 * Hidden dialog shell.  Injected on the picker and on the maze page.
 * @returns {string} HTML.
 */
Maze.Explain.shell = function() {
  return `
<div id="dialogExplain" class="dialogHiddenContent">
  <button type="button" id="explainSkip" class="mazeExplainSkip"></button>
  <div id="explainTitle" class="mazeExplainTitle"></div>
  <div class="mazeExplainBody">
    <div class="mazeExplainTalk">
      <div class="mazeExplainPegman" aria-hidden="true"></div>
      <p id="explainText" class="mazeExplainBubble"></p>
    </div>
    <div id="explainDoodle" class="mazeExplainDoodle"></div>
  </div>
  <div class="mazeExplainNav">
    <button type="button" id="explainBack" class="secondary"></button>
    <div id="explainDots" class="mazeExplainDots"></div>
    <button type="button" id="explainNext" class="primary"></button>
  </div>
</div>
`;
};

/**
 * Bind the dialog's buttons once.  Safe to call from both screens.
 */
Maze.Explain.init = function() {
  if (bound_ || !BlocklyGames.getElementById('explainSkip')) {
    return;
  }
  bound_ = true;
  BlocklyGames.bindClick('explainSkip', onSkip_);
  BlocklyGames.bindClick('explainBack', onBack_);
  BlocklyGames.bindClick('explainNext', onNext_);
  document.body.addEventListener('keydown', onKey_, true);
};

/**
 * Open the picture-book for a unit.  Marks the topic seen when it closes.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @param {Element} origin Optional button to animate from.
 * @param {Function=} onClose Called after the dialog closes.
 */
Maze.Explain.show = function(stage, unit, origin, onClose) {
  if (!Maze.Explain.has(unit)) {
    return;
  }
  Maze.Explain.init();
  explainStage_ = stage;
  explainUnit_ = unit;
  explainIndex_ = 0;
  onClose_ = onClose || null;

  BlocklyGames.getElementById('explainTitle').textContent = unit.name;
  BlocklyGames.getElementById('explainSkip').textContent =
      BlocklyGames.getMsg('Maze.explainSkip', false);
  BlocklyGames.getElementById('explainBack').textContent =
      BlocklyGames.getMsg('Maze.explainBack', false);
  render_();

  const style = {
    'width': '36em',
    'left': '15%',
    'top': '3.5em',
  };
  BlocklyDialogs.showDialog(
      BlocklyGames.getElementById('dialogExplain'),
      origin || null, !!origin, true, style,
      function() {
        if (onClose_) {
          const cb = onClose_;
          onClose_ = null;
          cb();
        }
      });
};

/**
 * Escape closes the book.  Enter is left to the focused Next button so it
 * can turn the page instead of dismissing the whole thing.
 * @param {!Event} e Keyboard event.
 * @private
 */
function onKey_(e) {
  if (e.keyCode !== 27) {
    return;
  }
  const content = BlocklyGames.getElementById('dialogExplain');
  if (!content || content.classList.contains('dialogHiddenContent')) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  onSkip_();
}

/**
 * Open the book the first time a child enters this topic.  Returning
 * students who already finished a level are not interrupted.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @param {Function=} onClose Called after a freshly opened book closes.
 * @returns {boolean} True if the dialog was shown.
 */
Maze.Explain.maybeAutoShow = function(stage, unit, onClose) {
  if (!Maze.Explain.has(unit) || isSeen_(stage, unit) ||
      hasFinishedLevel_(stage, unit)) {
    return false;
  }
  Maze.Explain.show(stage, unit, null, onClose);
  return true;
};

/**
 * Draw the current slide.
 * @private
 */
function render_() {
  const slides = explainUnit_.explainer;
  const slide = slides[explainIndex_];
  const last = explainIndex_ === slides.length - 1;
  BlocklyGames.getElementById('explainText').textContent =
      BlocklyGames.getMsg(slide.text, false);
  BlocklyGames.getElementById('explainDoodle').innerHTML =
      doodle_(slide.doodle);

  const back = BlocklyGames.getElementById('explainBack');
  back.disabled = explainIndex_ === 0;
  BlocklyGames.getElementById('explainNext').textContent = last ?
      BlocklyGames.getMsg('Maze.explainPlay', false) :
      BlocklyGames.getMsg('Maze.explainNext', false);

  const dots = BlocklyGames.getElementById('explainDots');
  let html = '';
  for (let i = 0; i < slides.length; i++) {
    const on = i === explainIndex_ ? ' mazeExplainDotOn' : '';
    html += `<button type="button" class="mazeExplainDot${on}" data-i="${i}"` +
        ` aria-label="${i + 1}"></button>`;
  }
  dots.innerHTML = html;
  for (const btn of dots.querySelectorAll('button')) {
    BlocklyGames.bindClick(btn, onDot_);
  }
}

/**
 * Jump to a page whose dot was clicked.
 * @param {!Event} e Click event.
 * @private
 */
function onDot_(e) {
  const i = Number(e.currentTarget.getAttribute('data-i'));
  if (i >= 0 && i < explainUnit_.explainer.length) {
    explainIndex_ = i;
    render_();
  }
}

/**
 * Close without reading the rest.  Still counts as seen.
 * @private
 */
function onSkip_() {
  markSeen_(explainStage_, explainUnit_);
  BlocklyDialogs.hideDialog(false);
}

/**
 * Previous page.
 * @private
 */
function onBack_() {
  if (explainIndex_ > 0) {
    explainIndex_--;
    render_();
  }
}

/**
 * Next page, or close on the last one.
 * @private
 */
function onNext_() {
  if (explainIndex_ >= explainUnit_.explainer.length - 1) {
    markSeen_(explainStage_, explainUnit_);
    BlocklyDialogs.hideDialog(false);
    return;
  }
  explainIndex_++;
  render_();
}

/**
 * Persist that this topic's book has been shown.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @private
 */
function markSeen_(stage, unit) {
  if (!window.localStorage) {
    return;
  }
  try {
    window.localStorage[ThinkaConfig.explainedKey(
        Maze.Levels.storageName(stage, unit.id))] = '1';
  } catch (e) {
    // Quota / SecurityError: they will see the book again next visit.
  }
}

/**
 * True if this browser already closed (or skipped) the book.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {boolean} True if seen.
 * @private
 */
function isSeen_(stage, unit) {
  try {
    return !!(window.localStorage &&
        window.localStorage[ThinkaConfig.explainedKey(
            Maze.Levels.storageName(stage, unit.id))]);
  } catch (e) {
    return false;
  }
}

/**
 * True if any level of this unit is already finished.
 * @param {number} stage Stage number.
 * @param {!Object} unit Unit record.
 * @returns {boolean} True if the student has progress here.
 * @private
 */
function hasFinishedLevel_(stage, unit) {
  const name = Maze.Levels.storageName(stage, unit.id);
  for (let i = 1; i <= unit.levels.length; i++) {
    if (BlocklyGames.loadFromLocalStorage(name, i)) {
      return true;
    }
  }
  return false;
}

/**
 * HTML for one doodle kind.
 * @param {string} kind Doodle id.
 * @returns {string} HTML.
 * @private
 */
function doodle_(kind) {
  switch (kind) {
    case Maze.Explain.DOODLE.PATH_SHORT:
      return mazeSvg_(['#####', '#S.F#', '#####']);
    case Maze.Explain.DOODLE.PATH_BEND:
      return mazeSvg_(['#####', '#S.##', '#..F#', '#####']);
    case Maze.Explain.DOODLE.BLOCKS_STACK:
      return moveBlock_() + moveBlock_() + moveBlock_();
    case Maze.Explain.DOODLE.BLOCKS_TURN:
      return moveBlock_() + turnBlock_('right') + moveBlock_();
    case Maze.Explain.DOODLE.BLOCKS_REPEAT:
      return repeatBlock_('5', moveBlock_());
    case Maze.Explain.DOODLE.BLOCKS_NESTED:
      return repeatBlock_('4',
          repeatBlock_('3', moveBlock_()) + turnBlock_('left'));
    case Maze.Explain.DOODLE.GEMS:
      return mazeSvg_(['#######', '#S.G.F#', '#######']);
    case Maze.Explain.DOODLE.BROKEN:
      return `<div class="mazeFakeWrong">${moveBlock_()}${turnBlock_('right')}</div>`;
    case Maze.Explain.DOODLE.UNTIL:
      return untilBlock_(moveBlock_());
    case Maze.Explain.DOODLE.IF_PATH:
      return mazeSvg_(['#####', '##F##', '#..L#', '#S###', '#####']) +
          ifBlock_(BlocklyGames.getMsg('Maze.pathLeft', true),
              turnBlock_('left'));
    case Maze.Explain.DOODLE.IF_ELSE:
      return ifElseBlock_(
          BlocklyGames.getMsg('Maze.pathAhead', true),
          moveBlock_(),
          turnBlock_('right'));
    case Maze.Explain.DOODLE.WALL:
      return mazeSvg_([
        '#######',
        '#...#F#',
        '#.#.#.#',
        '#.#...#',
        '#S#####',
      ]);
    case Maze.Explain.DOODLE.RUN:
      return `<div class="mazeFakeRun">` +
          BlocklyGames.getMsg('Games.runProgram', true) + `</div>`;
    default:
      return '';
  }
}

/**
 * A tiny maze drawn as SVG squares.
 * @param {!Array<string>} rows Rows of # wall, . path, S start, F finish,
 *     G gem.
 * @returns {string} SVG markup.
 * @private
 */
function mazeSvg_(rows) {
  const size = 22;
  const pad = 2;
  const h = rows.length * size + pad * 2;
  const w = rows[0].length * size + pad * 2;
  let cells = '';
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const px = pad + x * size;
      const py = pad + y * size;
      if (ch === '#') {
        cells += `<rect x="${px}" y="${py}" width="${size}" height="${size}"` +
            ` rx="2" fill="#7cb342"/>`;
        continue;
      }
      cells += `<rect x="${px}" y="${py}" width="${size}" height="${size}"` +
          ` fill="#f3e0b5"/>`;
      const cx = px + size / 2;
      const cy = py + size / 2;
      if (ch === 'S') {
        cells += `<circle cx="${cx}" cy="${cy}" r="7" fill="#f4d03f"` +
            ` stroke="#d4a017" stroke-width="1.5"/>`;
      } else if (ch === 'F') {
        cells += `<rect x="${cx - 1.5}" y="${py + 4}" width="3" height="14"` +
            ` fill="#6d4c41"/>` +
            `<path d="M${cx + 1.5} ${py + 4} h10 l-4 5 l4 5 h-10 z"` +
            ` fill="#c62828"/>`;
      } else if (ch === 'G') {
        cells += `<path d="M${cx} ${py + 5} l7 6 l-7 6 l-7 -6 z"` +
            ` fill="#ff9800" stroke="#e65100"/>`;
      } else if (ch === 'L') {
        cells += `<circle cx="${cx}" cy="${cy}" r="3" fill="#5b80a5"/>`;
      }
    }
  }
  return `<svg class="mazeExplainMaze" viewBox="0 0 ${w} ${h}" ` +
      `width="${w}" height="${h}" aria-hidden="true">${cells}</svg>`;
}

/**
 * A fake "move forward" block.
 * @returns {string} HTML.
 * @private
 */
function moveBlock_() {
  return `<div class="mazeFakeBlock mazeFakeMove">` +
      BlocklyGames.getMsg('Maze.moveForward', true) + `</div>`;
}

/**
 * A fake turn block.
 * @param {string} dir 'left' or 'right'.
 * @returns {string} HTML.
 * @private
 */
function turnBlock_(dir) {
  const key = dir === 'left' ? 'Maze.turnLeft' : 'Maze.turnRight';
  const arrow = dir === 'left' ? ' ↺' : ' ↻';
  return `<div class="mazeFakeBlock mazeFakeMove">` +
      BlocklyGames.getMsg(key, true) + arrow + `</div>`;
}

/**
 * A C-shaped counted repeat wrapping inner blocks.
 * @param {string} times Repeat count, as text.
 * @param {string} inner Inner HTML.
 * @returns {string} HTML.
 * @private
 */
function repeatBlock_(times, inner) {
  const title = BlocklyGames.getMsg('Maze.repeatTimes', true)
      .replace('%1', `<span class="mazeFakeNumber">${times}</span>`);
  return cBlock_('mazeFakeLoop', title, inner);
}

/**
 * Repeat-until-the-flag wrapping inner blocks.
 * @param {string} inner Inner HTML.
 * @returns {string} HTML.
 * @private
 */
function untilBlock_(inner) {
  const title = BlocklyGames.getMsg('Maze.repeatUntil', true) +
      ` <span class="mazeFakeFlag" aria-hidden="true"></span>`;
  return cBlock_('mazeFakeLoop', title, inner);
}

/**
 * A C-shaped if wrapping inner blocks.
 * @param {string} cond Escaped condition label.
 * @param {string} inner Inner HTML.
 * @returns {string} HTML.
 * @private
 */
function ifBlock_(cond, inner) {
  const title = cond + ' ' + BlocklyGames.getMsg('Maze.doCode', true);
  return cBlock_('mazeFakeLogic', title, inner);
}

/**
 * An if/else with two mouths.
 * @param {string} cond Escaped condition label.
 * @param {string} thenInner Then-branch HTML.
 * @param {string} elseInner Else-branch HTML.
 * @returns {string} HTML.
 * @private
 */
function ifElseBlock_(cond, thenInner, elseInner) {
  const elseWord = Blockly.Msg ?
      Blockly.Msg['CONTROLS_IF_MSG_ELSE'] : 'else';
  const title = cond + ' ' + BlocklyGames.getMsg('Maze.doCode', true);
  return `<div class="mazeFakeC mazeFakeLogic">` +
      `<div class="mazeFakeHat">${title}</div>` +
      `<div class="mazeFakeMouth">${thenInner}</div>` +
      `<div class="mazeFakeHat">${BlocklyGames.esc(elseWord)}</div>` +
      `<div class="mazeFakeMouth">${elseInner}</div>` +
      `</div>`;
}

/**
 * Shared C-shaped block chrome.
 * @param {string} colourClass Colour class.
 * @param {string} title Hat HTML (already escaped / trusted).
 * @param {string} inner Inner HTML.
 * @returns {string} HTML.
 * @private
 */
function cBlock_(colourClass, title, inner) {
  return `<div class="mazeFakeC ${colourClass}">` +
      `<div class="mazeFakeHat">${title}</div>` +
      `<div class="mazeFakeMouth">${inner}</div>` +
      `</div>`;
}
