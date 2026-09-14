/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Common HTML snippets.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('BlocklyGames.html');

goog.require('Blockly.Msg');
goog.require('BlocklyGames');


/**
 * Top toolbar for page
 * @param {!Object} ij Injected options.
 * @param {string} appName Name of application.
 * @param {string} levelLinkSuffix Any extra parameters for links.
 * @param {boolean} _hasLinkButton Unused. Share-by-link needed cloud storage
 *     and is not available offline.
 * @param {boolean} hasHelpButton Whether the page has a help button.
 * @param {string} farLeftHtml Additional content to add to farLeft toolbar.
 * @returns {string} HTML.
 */
BlocklyGames.html.headerBar = function(ij, appName, levelLinkSuffix,
    _hasLinkButton, hasHelpButton, farLeftHtml) {
  let helpButton = '';
  if (hasHelpButton) {
    helpButton = `
&nbsp;
<button id="helpButton">${BlocklyGames.getMsg('Games.help', true)}</button>
`;
  }
  if (farLeftHtml) {
    farLeftHtml = ' &nbsp; ' + farLeftHtml;
  }
  return `
<table width="100%">
  <tr>
    <td>
      <h1>
        ${BlocklyGames.html.titleSpan_(ij, appName)}
        ${ij.level ? BlocklyGames.html.levelLinks_(ij, levelLinkSuffix) : ''}
      </h1>
    </td>
    <td id="header_cta" class="farSide">
      <select id="languageMenu"></select>
      ${helpButton}
      ${farLeftHtml}
    </td>
  </tr>
</table>
`;
};

/**
 * Print the title span (Blockly Games : AppName).
 * @param {!Object} ij Injected options.
 * @param {string} appName Name of application.
 * @returns {string} HTML.
 * @private
 */
BlocklyGames.html.titleSpan_ = function(ij, appName) {
  return `
<span id="title">
  <a href="${ij.html ? 'index.html' : './'}?lang=${ij.lang}">${BlocklyGames.getMsg('Games.name', true)}</a> : ${appName}
</span>
`;
};

/**
 * List of links to other levels.
 * @param {!Object} ij Injected options.
 * @param {string} suffix Any extra parameters for links.
 * @returns {string} HTML.
 * @private
 */
BlocklyGames.html.levelLinks_ = function(ij, suffix) {
  let html = ' &nbsp ';
  for (let i = 1; i <= ij.maxLevel; i++) {
    let url = `?lang=${ij.lang}&level=${i}`;
    if (suffix) {
      url += '&' + suffix;
    }
    html += ' ';
    if (i === ij.level) {
      html += `<span class="level_number level_done" id="level${i}">${i}</span>`;
    } else if (i === ij.maxLevel) {
      html += `<a class="level_number" id="level${i}" href="${url}">${i}</a>`;
    } else {
      html += `<a class="level_dot" id="level${i}" href="${url}"></a>`;
    }
  }
  return html;
};

/**
 * Dialogs.
 * @returns {string} HTML.
 */
BlocklyGames.html.dialog = function() {
  return `
<div id="dialogShadow" class="dialogAnimate"></div>
<div id="dialogBorder"></div>
<div id="dialog"></div>
${BlocklyGames.html.teacherUnlockDialog_()}
`;
};

/**
 * Teacher password prompt for a locked level.
 * @returns {string} HTML.
 * @private
 */
BlocklyGames.html.teacherUnlockDialog_ = function() {
  return `
<div id="dialogTeacherUnlock" class="dialogHiddenContent">
  <div id="teacherUnlockTitle" style="font-size: large; margin: 1em;">This level is locked</div>
  <div style="margin: 1em;">Ask a teacher to type the password to play it.</div>
  <form id="teacherUnlockForm" style="margin: 1em;">
    <label for="teacherUnlockPassword">Password:</label>
    <input type="password" id="teacherUnlockPassword" autocomplete="off" spellcheck="false">
    <div id="teacherUnlockError"></div>
    <div class="farSide" style="padding: 1ex 0 0">
      <button type="button" id="teacherUnlockCancel">${BlocklyGames.esc(Blockly.Msg['DIALOG_CANCEL'])}</button>
      <button type="submit" class="secondary" id="teacherUnlockOk">${BlocklyGames.esc(Blockly.Msg['DIALOG_OK'])}</button>
    </div>
  </form>
</div>
`;
};

/**
 * Done dialog.
 * @returns {string} HTML.
 */
BlocklyGames.html.doneDialog = function() {
  return `
<div id="dialogDone" class="dialogHiddenContent">
  <div style="font-size: large; margin: 1em;">${BlocklyGames.getMsg('Games.congratulations', true)}</div>
  <div id="dialogLinesText" style="font-size: large; margin: 1em;"></div>
  <pre id="containerCode"></pre>
  <div id="dialogDoneText" style="font-size: large; margin: 1em;"></div>
  <div id="dialogDoneButtons" class="farSide" style="padding: 1ex 3ex 0">
    <button class="addHideHandler">${BlocklyGames.esc(Blockly.Msg['DIALOG_CANCEL'])}</button>
    <button id="doneOk" class="secondary">${BlocklyGames.esc(Blockly.Msg['DIALOG_OK'])}</button>
  </div>
</div>
`;
};

/**
 * Abort dialog.
 * @returns {string} HTML.
 */
BlocklyGames.html.abortDialog = function() {
  return `
<div id="dialogAbort" class="dialogHiddenContent">
  ${BlocklyGames.getMsg('Games.helpAbort', true)}
  <div class="farSide" style="padding: 1ex 3ex 0">
    <button class="addHideHandler">${BlocklyGames.esc(Blockly.Msg['DIALOG_CANCEL'])}</button>
    <button id="abortOk" class="secondary">${BlocklyGames.esc(Blockly.Msg['DIALOG_OK'])}</button>
  </div>
</div>
`;
};

/**
 * OK button for dialogs.
 * @returns {string} HTML.
 */
BlocklyGames.html.ok = function() {
  return `
<div class="farSide" style="padding: 1ex 3ex 0">
  <button class="secondary addHideHandler">${BlocklyGames.esc(Blockly.Msg['DIALOG_OK'])}</button>
</div>
`;
};
