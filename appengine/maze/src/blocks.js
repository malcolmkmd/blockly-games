/**
 * @license
 * Copyright 2012 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Blocks for Maze game.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

goog.provide('Maze.Blocks');

goog.require('Blockly');
goog.require('Blockly.JavaScript');
goog.require('Blockly.Extensions');
goog.require('Blockly.FieldDropdown');
goog.require('Blockly.FieldImage');
goog.require('Blockly.FieldNumber');
goog.require('BlocklyGames');


/**
 * Construct custom maze block types.  Called on page load.
 */
Maze.Blocks.init = function() {
  /**
   * Common HSV hue for all movement blocks.
   */
  const MOVEMENT_HUE = 290;

  /**
   * HSV hue for loop block.
   */
  const LOOPS_HUE = 120;

  /**
   * Common HSV hue for all logic blocks.
   */
  const LOGIC_HUE = 210;

  /**
   * Counterclockwise arrow to be appended to left turn option.
   */
  const LEFT_TURN = ' ↺';

  /**
   * Clockwise arrow to be appended to right turn option.
   */
  const RIGHT_TURN = ' ↻';

  const TURN_DIRECTIONS = [
    [BlocklyGames.getMsg('Maze.turnLeft', false), 'turnLeft'],
    [BlocklyGames.getMsg('Maze.turnRight', false), 'turnRight'],
  ];

  const PATH_DIRECTIONS = [
    [BlocklyGames.getMsg('Maze.pathAhead', false), 'isPathForward'],
    [BlocklyGames.getMsg('Maze.pathLeft', false), 'isPathLeft'],
    [BlocklyGames.getMsg('Maze.pathRight', false), 'isPathRight'],
  ];

  // Add arrows to turn options after prefix/suffix have been separated.
  Blockly.Extensions.register('maze_turn_arrows',
      function() {
        const options = this.getField('DIR').getOptions();
        options[options.length - 2][0] += LEFT_TURN;
        options[options.length - 1][0] += RIGHT_TURN;
      });

  Blockly.defineBlocksWithJsonArray([
    // Block for moving forward.
    {
      "type": "maze_moveForward",
      "message0": BlocklyGames.getMsg('Maze.moveForward', false),
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.moveForwardTooltip', false),
    },

    // Block for turning left or right.
    {
      "type": "maze_turn",
      "message0": "%1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": TURN_DIRECTIONS,
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": MOVEMENT_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.turnTooltip', false),
      "extensions": ["maze_turn_arrows"],
    },

    // Block for conditional "if there is a path".
    {
      "type": "maze_if",
      "message0": `%1%2${BlocklyGames.getMsg('Maze.doCode', false)}%3`,
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": PATH_DIRECTIONS,
        },
        {
          "type": "input_dummy",
        },
        {
          "type": "input_statement",
          "name": "DO",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.ifTooltip', false),
      "extensions": ["maze_turn_arrows"],
    },

    // Block for conditional "if there is a path, else".
    {
      "type": "maze_ifElse",
      "message0": `%1%2${BlocklyGames.getMsg('Maze.doCode', false)}%3${window['BlocklyMsg']['CONTROLS_IF_MSG_ELSE']}%4`,
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": PATH_DIRECTIONS,
        },
        {
          "type": "input_dummy",
        },
        {
          "type": "input_statement",
          "name": "DO",
        },
        {
          "type": "input_statement",
          "name": "ELSE",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOGIC_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.ifelseTooltip', false),
      "extensions": ["maze_turn_arrows"],
    },

    // Block for repeat loop.
    {
      "type": "maze_forever",
      "message0": `${BlocklyGames.getMsg('Maze.repeatUntil', false)}%1%2${BlocklyGames.getMsg('Maze.doCode', false)}%3`,
      "args0": [
        {
          "type": "field_image",
          "src": "maze/marker.png",
          "width": 12,
          "height": 16,
        },
        {
          "type": "input_dummy",
        },
        {
          "type": "input_statement",
          "name": "DO",
        }
      ],
      "previousStatement": null,
      "colour": LOOPS_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.whileTooltip', false),
    },

    // Block for a counted loop.  The message already contains %1 for the
    // count, so the dummy input and statement continue from %2.
    {
      "type": "maze_repeat",
      "message0": `${BlocklyGames.getMsg('Maze.repeatTimes', false)}%2${BlocklyGames.getMsg('Maze.doCode', false)}%3`,
      "args0": [
        {
          "type": "field_number",
          "name": "TIMES",
          "value": 4,
          "min": 1,
          "max": 100,
          "precision": 1,
        },
        {
          "type": "input_dummy",
        },
        {
          "type": "input_statement",
          "name": "DO",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOOPS_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.repeatTimesTooltip', false),
    },

    // Block for looping while a path is available.
    {
      "type": "maze_whilePath",
      "message0": `${BlocklyGames.getMsg('Maze.whilePath', false)}%1%2${BlocklyGames.getMsg('Maze.doCode', false)}%3`,
      "args0": [
        {
          "type": "field_dropdown",
          "name": "DIR",
          "options": PATH_DIRECTIONS,
        },
        {
          "type": "input_dummy",
        },
        {
          "type": "input_statement",
          "name": "DO",
        },
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": LOOPS_HUE,
      "tooltip": BlocklyGames.getMsg('Maze.whilePathTooltip', false),
      "extensions": ["maze_turn_arrows"],
    },
  ]);
};


Blockly.JavaScript['maze_moveForward'] = function(block) {
  // Generate JavaScript for moving forward.
  return `moveForward('block_id_${block.id}');\n`;
};

Blockly.JavaScript['maze_turn'] = function(block) {
  // Generate JavaScript for turning left or right.
  return `${block.getFieldValue('DIR')}('block_id_${block.id}');\n`;
};

Blockly.JavaScript['maze_if'] = function(block) {
  // Generate JavaScript for conditional "if there is a path".
  const argument = `${block.getFieldValue('DIR')}('block_id_${block.id}')`;
  const branch = Blockly.JavaScript.statementToCode(block, 'DO');
  return `if (${argument}) {\n${branch}}\n`;
};

Blockly.JavaScript['maze_ifElse'] = function(block) {
  // Generate JavaScript for conditional "if there is a path, else".
  const argument = `${block.getFieldValue('DIR')}('block_id_${block.id}')`;
  const branch0 = Blockly.JavaScript.statementToCode(block, 'DO');
  const branch1 = Blockly.JavaScript.statementToCode(block, 'ELSE');
  return `if (${argument}) {\n${branch0}} else {\n${branch1}}\n`;
};

Blockly.JavaScript['maze_forever'] = function(block) {
  // Generate JavaScript for repeat loop.
  let branch = Blockly.JavaScript.statementToCode(block, 'DO');
  if (Blockly.JavaScript.INFINITE_LOOP_TRAP) {
    branch = Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,
        `'block_id_${block.id}'`) + branch;
  }
  return `while (notDone()) {\n${branch}}\n`;
};

Blockly.JavaScript['maze_repeat'] = function(block) {
  // Generate JavaScript for a counted loop.  The counter is named after the
  // block so that nested loops never share a variable.
  const times = Number(block.getFieldValue('TIMES')) || 0;
  const counter = 'count_' + block.id.replace(/\W/g, '_');
  let branch = Blockly.JavaScript.statementToCode(block, 'DO');
  if (Blockly.JavaScript.INFINITE_LOOP_TRAP) {
    branch = Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,
        `'block_id_${block.id}'`) + branch;
  }
  return `for (var ${counter} = 0; ${counter} < ${times}; ${counter}++) {\n` +
      `${branch}}\n`;
};

Blockly.JavaScript['maze_whilePath'] = function(block) {
  // Generate JavaScript for looping while a path is available.
  const argument = `${block.getFieldValue('DIR')}('block_id_${block.id}')`;
  let branch = Blockly.JavaScript.statementToCode(block, 'DO');
  if (Blockly.JavaScript.INFINITE_LOOP_TRAP) {
    branch = Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,
        `'block_id_${block.id}'`) + branch;
  }
  return `while (${argument}) {\n${branch}}\n`;
};
