/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HTML for Maze game.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Maze.html');

goog.require('BlocklyGames');
goog.require('BlocklyGames.html');
goog.require('BlocklyInterface');
goog.require('Maze.Explain');


/**
 * Web page structure.
 * @param {!Object} ij Injected options.
 * @returns {string} HTML.
 */
Maze.html.start = function(ij) {
  return `
${BlocklyGames.html.headerBar(ij, BlocklyGames.getMsg('Games.maze', true),
    BlocklyInterface.nextLevelParam, true, false,
    '<button id="pegmanButton"><img src="common/1x1.gif"><span id="pegmanButtonArrow"></span></button>')}

${Maze.html.breadcrumb_(ij)}

<div id="visualization">
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="svgMaze" width="400px" height="400px">
    <g id="look">
      <path d="M 0,-15 a 15 15 0 0 1 15 15" />
      <path d="M 0,-35 a 35 35 0 0 1 35 35" />
      <path d="M 0,-55 a 55 55 0 0 1 55 55" />
    </g>
  </svg>
  <div id="capacityBubble">
    <div id="capacity"></div>
  </div>
</div>

<table width=400>
  <tr>
    <td style="width: 190px; text-align: center; vertical-align: top;">
    <td>
      <button id="runButton" class="primary" title="${BlocklyGames.getMsg('Maze.runTooltip', true)}">
        <img src="common/1x1.gif" class="run icon21"> ${BlocklyGames.getMsg('Games.runProgram', true)}
      </button>
      <button id="resetButton" class="primary" style="display: none" title="${BlocklyGames.getMsg('Maze.resetTooltip', true)}">
        <img src="common/1x1.gif" class="stop icon21"> ${BlocklyGames.getMsg('Games.resetProgram', true)}
      </button>
    </td>
  </tr>
</table>

${Maze.html.toolbox_(ij.toolbox)}
<div id="blockly"></div>

<div id="pegmanMenu"></div>

${BlocklyGames.html.dialog()}
${BlocklyGames.html.doneDialog()}
${BlocklyGames.html.abortDialog()}

${Maze.html.helpDialogs_()}
${Maze.Explain.shell()}
`;
};

/**
 * Where a "type:value" toolbox entry's value belongs.  Anything not listed
 * pins the block's DIR dropdown, which is what the maze blocks use.
 * @private
 */
Maze.html.PINNED_FIELD_ = {
  'maze_repeat': 'TIMES',
};

/**
 * Child XML that core Blockly blocks need to arrive usable, mostly shadow
 * number inputs so a fresh block is not full of empty sockets.
 * @private
 */
Maze.html.SHADOWS_ = {
  'controls_repeat_ext':
      '<value name="TIMES"><shadow type="math_number">' +
      '<field name="NUM">4</field></shadow></value>',
  'math_arithmetic':
      '<value name="A"><shadow type="math_number">' +
      '<field name="NUM">1</field></shadow></value>' +
      '<value name="B"><shadow type="math_number">' +
      '<field name="NUM">1</field></shadow></value>',
  'logic_compare':
      '<value name="A"><shadow type="math_number">' +
      '<field name="NUM">0</field></shadow></value>' +
      '<value name="B"><shadow type="math_number">' +
      '<field name="NUM">0</field></shadow></value>',
  'variables_set':
      '<value name="VALUE"><shadow type="math_number">' +
      '<field name="NUM">0</field></shadow></value>',
};

/**
 * The toolbox for one level.
 * @param {!Array<string>} types Block types the level offers.  An entry of the
 *     form 'type:value' pins that block's dropdown (or number field), e.g.
 *     'maze_if:isPathLeft' offers only the left-hand variant.
 * @returns {string} HTML.
 * @private
 */
Maze.html.toolbox_ = function(types) {
  let xml = '';
  for (const entry of types) {
    xml += Maze.html.toolboxBlock_(entry);
  }
  return `<xml id="toolbox" xmlns="https://developers.google.com/blockly/xml">${xml}</xml>`;
};

/**
 * One entry in a level's toolbox.
 * @param {string} entry A block type, optionally 'type:value'.
 * @returns {string} HTML.
 * @private
 */
Maze.html.toolboxBlock_ = function(entry) {
  const separator = entry.indexOf(':');
  const type = separator === -1 ? entry : entry.substring(0, separator);
  const value = separator === -1 ? null : entry.substring(separator + 1);

  if (type === 'maze_turn' && value === null) {
    // Turning is easier to grasp when both directions are already on offer.
    return '<block type="maze_turn"><field name="DIR">turnLeft</field></block>\n' +
        '<block type="maze_turn"><field name="DIR">turnRight</field></block>\n';
  }

  let inner = Maze.html.SHADOWS_[type] || '';
  if (value !== null) {
    const field = Maze.html.PINNED_FIELD_[type] || 'DIR';
    inner = `<field name="${field}">${value}</field>` + inner;
  }
  return `<block type="${type}">${inner}</block>\n`;
};

/**
 * Where in the curriculum this level sits, with a way back to the picker.
 * @param {!Object} ij Injected options.
 * @returns {string} HTML.
 * @private
 */
Maze.html.breadcrumb_ = function(ij) {
  const again = ij.hasExplainer ? `
  <button type="button" id="explainAgain" class="mazeExplainOpen"
      title="${BlocklyGames.getMsg('Maze.explainAgain', true)}">?</button>` : '';
  return `
<div id="mazeBreadcrumb">
  <a href="${ij.html ? 'maze.html' : 'maze'}?lang=${ij.lang}">${BlocklyGames.getMsg('Maze.allStages', true)}</a>
  &rsaquo; <a href="${ij.html ? 'maze.html' : 'maze'}?lang=${ij.lang}&amp;stage=${ij.stage}">${BlocklyGames.esc(ij.stageName)}</a>
  &rsaquo; ${BlocklyGames.esc(ij.unitName)}${again}
</div>
`;
};

/**
 * Help dialogs for each level.
 * @returns {string} HTML.
 * @private
 */
 Maze.html.helpDialogs_ = function() {
   return `
<div id="dialogHelpStack" class="dialogHiddenContent">
  <table><tr><td>
    <img src="common/help.png">
  </td><td>&nbsp;</td><td>
    ${BlocklyGames.getMsg('Maze.helpStack', true)}
  </td><td valign="top">
    <img src="maze/help_stack.png" class="mirrorImg" height=63 width=136>
  </td></tr></table>
</div>
<div id="dialogHelpOneTopBlock" class="dialogHiddenContent">
  <table><tr><td>
    <img src="common/help.png">
  </td><td>&nbsp;</td><td>
    ${BlocklyGames.getMsg('Maze.helpOneTopBlock', true)}
    <div id="sampleOneTopBlock" class="readonly"></div>
  </td></tr></table>
</div>
<div id="dialogHelpRun" class="dialogHiddenContent">
  <table><tr><td>
    ${BlocklyGames.getMsg('Maze.helpRun', true)}
  </td><td rowspan=2>
    <img src="common/help.png">
  </td></tr><tr><td>
    <div><img src="maze/help_run.png" class="mirrorImg" height=27 width=141></div>
  </td></tr></table>
</div>
<div id="dialogHelpReset" class="dialogHiddenContent">
  <table><tr><td>
    ${BlocklyGames.getMsg('Maze.helpReset', true)}
  </td><td rowspan=2>
    <img src="common/help.png">
  </td></tr><tr><td>
    <div><img src="maze/help_run.png" class="mirrorImg" height=27 width=141></div>
  </td></tr></table>
</div>
<div id="dialogHelpRepeat" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpRepeat', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpRepeatCount" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpRepeatCount', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpNestedLoops" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpNestedLoops', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpCollect" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpCollect', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpCapacity" class="dialogHiddenContent">
  <table><tr><td>
    <img src="common/help.png">
  </td><td>&nbsp;</td><td>
    ${BlocklyGames.getMsg('Maze.helpCapacity', true)}
  </td></tr></table>
</div>
<div id="dialogHelpRepeatMany" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpRepeatMany', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpSkins" class="dialogHiddenContent">
  <table><tr><td>
    <img src="common/help.png">
  </td><td width="95%">
    ${BlocklyGames.getMsg('Maze.helpSkins', true)}
  </td><td>
    <img src="maze/help_up.png">
  </td></tr></table>
</div>
<div id="dialogHelpIf" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpIf', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpMenu" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_up.png">
  </td><td id="helpMenuText">
    ${BlocklyGames.getMsg('Maze.helpMenu', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpIfElse" class="dialogHiddenContent">
  <table><tr><td>
    <img src="maze/help_down.png">
  </td><td>
    ${BlocklyGames.getMsg('Maze.helpIfElse', true)}
  </td><td>
    <img src="common/help.png">
  </td></tr></table>
</div>
<div id="dialogHelpWallFollow" class="dialogHiddenContent">
  <table><tr><td>
    <img src="common/help.png">
  </td><td>&nbsp;</td><td>
    ${BlocklyGames.getMsg('Maze.helpWallFollow', true)}
    ${BlocklyGames.html.ok()}
  </td></tr></table>
</div>
`;
};