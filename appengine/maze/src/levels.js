/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Maze curriculum: stages, concept units, and level data.
 *
 * A level is addressed by stage + unit + level number, e.g.
 * maze.html?stage=2&unit=repeat&level=3.  Every per-level knob lives in one
 * object here rather than being spread across main.js, blocks.js and html.js.
 *
 * Maps are 2D arrays of SquareType.  Authoring shorthand:
 *   0 wall, 1 open, 2 start, 3 finish, 4 collectible (an open square + item).
 */
'use strict';

goog.provide('Maze.Levels');


/**
 * The types of squares in the maze, which is represented
 * as a 2D array of SquareType values.
 * @enum {number}
 */
Maze.Levels.SquareType = {
  WALL: 0,
  OPEN: 1,
  START: 2,
  FINISH: 3,
  COLLECTIBLE: 4,
};

/**
 * Constants for cardinal directions.  Subsequent code assumes these are
 * in the range 0..3 and that opposites have an absolute difference of 2.
 * @enum {number}
 */
Maze.Levels.DirectionType = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
};

const DIR_NORTH = Maze.Levels.DirectionType.NORTH;
const DIR_SOUTH = Maze.Levels.DirectionType.SOUTH;
const DIR_WEST = Maze.Levels.DirectionType.WEST;

// Toolbox presets.  Each level names the blocks its student may use, so the
// flyout grows with the curriculum instead of being gated on a level number.
// A `type:value` entry pins that block's dropdown, e.g. 'maze_if:isPathLeft'
// offers only the left-hand variant.  'maze_turn' expands to both directions.
const T_MOVE = ['maze_moveForward'];
const T_TURN = ['maze_moveForward', 'maze_turn'];
const T_REPEAT = ['maze_moveForward', 'maze_turn', 'maze_repeat'];
const T_UNTIL = ['maze_moveForward', 'maze_turn', 'maze_forever'];
const T_IF = ['maze_moveForward', 'maze_turn', 'maze_forever', 'maze_if'];
const T_IF_ELSE = ['maze_moveForward', 'maze_turn', 'maze_forever', 'maze_if',
                   'maze_ifElse'];

// Authoring helpers for the pre-loaded (deliberately broken) code that
// debugging levels start from.  See Maze.Levels.toXml.

/**
 * A "move forward" block descriptor.
 * @returns {!Object} Block descriptor.
 */
function fwdBlock() {
  return {type: 'maze_moveForward'};
}

/**
 * A "turn" block descriptor.
 * @param {string} dir Either 'turnLeft' or 'turnRight'.
 * @returns {!Object} Block descriptor.
 */
function turnBlock(dir) {
  return {type: 'maze_turn', fields: {'DIR': dir}};
}

/**
 * A "repeat n times" block descriptor.
 * @param {number} times Iteration count.
 * @param {!Array<!Object>} body Blocks to nest inside the loop.
 * @returns {!Object} Block descriptor.
 */
function repeatBlock(times, body) {
  return {
    type: 'maze_repeat',
    fields: {'TIMES': times},
    statements: {'DO': body},
  };
}

/**
 * Render a stack of block descriptors as Blockly XML.
 * @param {!Array<!Object>} blocks Descriptors, in top-to-bottom order.
 * @returns {string} XML text suitable for BlocklyInterface.setCode.
 */
Maze.Levels.toXml = function(blocks) {
  return `<xml>${chainXml_(blocks, true)}</xml>`;
};

/**
 * Render a chain of blocks, each nested in the previous block's <next>.
 * @param {!Array<!Object>} blocks Descriptors, in top-to-bottom order.
 * @param {boolean} top True if this is the top-level stack (gets x/y).
 * @returns {string} XML text.
 * @private
 */
function chainXml_(blocks, top) {
  if (!blocks || !blocks.length) {
    return '';
  }
  const [head, ...tail] = blocks;
  let inner = '';
  for (const name in head.fields || {}) {
    inner += `<field name="${name}">${head.fields[name]}</field>`;
  }
  for (const name in head.statements || {}) {
    inner += `<statement name="${name}">` +
        chainXml_(head.statements[name], false) + '</statement>';
  }
  const next = chainXml_(tail, false);
  if (next) {
    inner += `<next>${next}</next>`;
  }
  const position = top ? ' x="70" y="70"' : '';
  return `<block type="${head.type}"${position}>${inner}</block>`;
}

// Maps reused across units.  Meeting the same maze again with a tighter block
// budget is the point of the "fewer blocks" units: the route is already known,
// so all the student has to think about is the structure of their program.

/**
 * Three sides of a ring, legs of four.  Solvable with one loop per leg, or
 * with a single nested loop.
 * @type {!Array<!Array<number>>}
 */
const LAP_4 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 2, 0, 0, 0, 3, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Three sides of a ring, legs of six.
 * @type {!Array<!Array<number>>}
 */
const LAP_6 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 2, 0, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Six-tread staircase.  Each tread is one step forward and one step up.
 * @type {!Array<!Array<number>>}
 */
const STAIRS_6 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 2, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Six steps in a straight line, heading east.
 * @type {!Array<!Array<number>>}
 */
const STRAIGHT_6 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 1, 1, 1, 1, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Seven steps east.  Long enough that counting by hand is tedious.
 * @type {!Array<!Array<number>>}
 */
const STRAIGHT_7 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 1, 1, 1, 1, 1, 1, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * Three-tread staircase.  Six blocks unrolled, or one small loop.
 * @type {!Array<!Array<number>>}
 */
const STAIRS_3 = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0],
  [0, 0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0, 0],
  [0, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

/**
 * Two sides of a small square: four along, then four up.
 * @type {!Array<!Array<number>>}
 */
const L_4 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 2, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

/**
 * The curriculum.  Stages hold concept units; units hold levels.
 *
 * Stages 1-3 are fully authored.  Later stages declare their concept units so
 * the whole progression is visible to teachers; units with no levels yet show
 * as "coming soon" in the picker and are filled in by later content phases.
 *
 * Level fields:
 *   map                     Required.  2D array of SquareType.
 *   startDirection          Direction the player faces.  Default east.
 *   maxBlocks               Hard cap feeding the capacity counter.
 *                           Default unlimited.
 *   targetBlocks            Solve within this many blocks for the second star.
 *   toolbox                 Block types offered in the flyout.
 *   startXml                Pre-loaded student code (debugging levels).
 *   requireAllCollectibles  Finish only counts once every item is gathered.
 *   validateMaps            Extra maps the same program must also solve.
 *   lockFirstBlock          Make the pre-placed block immovable.
 *   introDialogId           Modal shown once before the level starts.
 *   hints                   Ordered hint specs; the first applicable one shows.
 *
 * Unit fields:
 *   explainer               Picture-book slides shown the first time a child
 *                           opens this topic.  Each is {doodle, text} where
 *                           text is a Maze.explain* message name.
 *
 * Hint kinds: 'stack', 'oneTopBlock', 'run', 'reset', 'capacity', 'skins',
 * 'missingBlock' (blockType), 'missingField' (blockType, field, value),
 * 'nestedBlocks' (blockType, minCount).
 */
Maze.Levels.STAGES = [
  {
    stage: 1,
    name: 'Stage 1',
    theme: 'First steps',
    units: [
      {
        id: 'sequence',
        name: 'Sequencing',
        description: 'Give the player one instruction at a time.',
        explainer: [
          {doodle: 'path-short', text: 'Maze.explainSequence1'},
          {doodle: 'blocks-stack', text: 'Maze.explainSequence2'},
          {doodle: 'run', text: 'Maze.explainSequence3'},
        ],
        levels: [
          {
            // One step.  Also the first level a student ever sees, so it
            // carries the introductory hint chain.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            targetBlocks: 1,
            lockFirstBlock: true,
            hints: [
              {kind: 'stack', dialogId: 'dialogHelpStack',
               style: {width: '370px', top: '130px', side: '215px'},
               toolbarIndex: 0},
              {kind: 'oneTopBlock', dialogId: 'dialogHelpOneTopBlock',
               style: {width: '360px', top: '120px', side: '225px'}},
              {kind: 'run', dialogId: 'dialogHelpRun',
               style: {width: '360px', top: '410px', side: '400px'},
               origin: 'runButton'},
            ],
          },
          {
            // Two steps.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            targetBlocks: 2,
            hints: [
              {kind: 'reset', dialogId: 'dialogHelpReset',
               style: {width: '360px', top: '410px', side: '400px'},
               origin: 'resetButton'},
            ],
          },
          {
            // Four steps east.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            targetBlocks: 4,
          },
          {
            // Same idea facing south: "forward" is relative to the player.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_SOUTH,
            toolbox: T_MOVE,
            targetBlocks: 4,
          },
          {
            // And facing west.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 3, 1, 1, 1, 2, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_WEST,
            toolbox: T_MOVE,
            targetBlocks: 4,
          },
          {
            // Three steps east.  Still one instruction at a time.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            targetBlocks: 3,
          },
          {
            // Five steps east.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 1, 3],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            targetBlocks: 5,
          },
          {
            // Two steps south.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_SOUTH,
            toolbox: T_MOVE,
            targetBlocks: 2,
          },
          {
            // Three steps west.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 3, 1, 1, 2, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_WEST,
            toolbox: T_MOVE,
            targetBlocks: 3,
          },
          {
            // Five steps north.
            map: [
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 2, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_NORTH,
            toolbox: T_MOVE,
            targetBlocks: 5,
          },
        ],
      },
      {
        id: 'turns',
        name: 'Turning',
        description: 'Turn left and right to follow a bending path.',
        explainer: [
          {doodle: 'path-bend', text: 'Maze.explainTurns1'},
          {doodle: 'blocks-turn', text: 'Maze.explainTurns2'},
          {doodle: 'path-bend', text: 'Maze.explainTurns3'},
        ],
        levels: [
          {
            // One right turn.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 6,
            targetBlocks: 4,
            hints: [
              {kind: 'skins', dialogId: 'dialogHelpSkins',
               style: {width: '360px', top: '60px', farSide: '20px'},
               origin: 'pegmanButton'},
            ],
          },
          {
            // One left turn.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 6,
            targetBlocks: 4,
          },
          {
            // Two turns.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 1, 1, 3, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 8,
          },
          {
            // Three turns, starting out facing south.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 0, 0, 0, 0, 0],
              [0, 1, 0, 1, 1, 3, 0],
              [0, 1, 0, 1, 0, 0, 0],
              [0, 1, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_SOUTH,
            toolbox: T_TURN,
            maxBlocks: 14,
            targetBlocks: 12,
          },
          {
            // A long path around three sides.  Deliberately repetitive: the
            // next stage introduces the loop that collapses it.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 3, 1, 1, 0],
              [0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 1, 0],
              [0, 2, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 16,
            targetBlocks: 12,
          },
          {
            // Right turn after a longer first leg.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 8,
            targetBlocks: 6,
          },
          {
            // Left turn after three steps.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 2, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 8,
            targetBlocks: 6,
          },
          {
            // Two right turns: a U.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 3, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 7,
          },
          {
            // Two left turns.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 3, 1, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 7,
          },
          {
            // Four turns around a small block.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 3, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 14,
            targetBlocks: 11,
          },
        ],
      },
      {
        id: 'debug',
        name: 'Debugging',
        description: 'Somebody left broken code behind.  Find the mistake.',
        explainer: [
          {doodle: 'broken', text: 'Maze.explainDebug1'},
          {doodle: 'run', text: 'Maze.explainDebug2'},
          {doodle: 'blocks-stack', text: 'Maze.explainDebug3'},
        ],
        levels: [
          {
            // Too few moves: add one.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            maxBlocks: 5,
            targetBlocks: 3,
            startXml: Maze.Levels.toXml([fwdBlock(), fwdBlock()]),
          },
          {
            // Too many moves: the player crashes into the wall.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            maxBlocks: 6,
            targetBlocks: 2,
            startXml: Maze.Levels.toXml(
                [fwdBlock(), fwdBlock(), fwdBlock(), fwdBlock()]),
          },
          {
            // Turning the wrong way.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 2, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 6,
            targetBlocks: 4,
            startXml: Maze.Levels.toXml(
                [fwdBlock(), turnBlock('turnRight'), fwdBlock(), fwdBlock()]),
          },
          {
            // The right blocks in the wrong order.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 1, 1, 3, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 8,
            startXml: Maze.Levels.toXml([
              fwdBlock(), fwdBlock(), turnBlock('turnRight'),
              fwdBlock(), fwdBlock(), turnBlock('turnLeft'),
              fwdBlock(), fwdBlock(),
            ]),
          },
          {
            // One extra step on a four-step path.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            maxBlocks: 6,
            targetBlocks: 4,
            startXml: Maze.Levels.toXml(
                [fwdBlock(), fwdBlock(), fwdBlock(), fwdBlock(), fwdBlock()]),
          },
          {
            // Facing south with too few steps.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 2, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_SOUTH,
            toolbox: T_MOVE,
            maxBlocks: 5,
            targetBlocks: 3,
            startXml: Maze.Levels.toXml([fwdBlock(), fwdBlock()]),
          },
          {
            // Right turn where a left is needed.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 3, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 6,
            targetBlocks: 5,
            startXml: Maze.Levels.toXml(
                [fwdBlock(), fwdBlock(), turnBlock('turnLeft'),
                 fwdBlock(), fwdBlock()]),
          },
          {
            // A missing turn in the middle of a U.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 3, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 7,
            startXml: Maze.Levels.toXml(
                [fwdBlock(), fwdBlock(), fwdBlock(), fwdBlock()]),
          },
          {
            // Turns swapped on a two-bend path.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 1, 1, 3, 0],
              [0, 0, 0, 1, 0, 0, 0],
              [0, 2, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 10,
            targetBlocks: 8,
            startXml: Maze.Levels.toXml([
              fwdBlock(), fwdBlock(), turnBlock('turnRight'),
              fwdBlock(), fwdBlock(), turnBlock('turnLeft'),
              fwdBlock(), fwdBlock(),
            ]),
          },
        ],
      },
    ],
  },
  {
    stage: 2,
    name: 'Stage 2',
    theme: 'Repetition',
    units: [
      {
        id: 'sequence-long',
        name: 'Long sequences',
        description: 'Plan a longer route before you press Run.',
        explainer: [
          {doodle: 'path-short', text: 'Maze.explainSequenceLong1'},
          {doodle: 'blocks-stack', text: 'Maze.explainSequenceLong2'},
          {doodle: 'path-short', text: 'Maze.explainSequenceLong3'},
        ],
        levels: [
          {
            // Six steps.
            map: STRAIGHT_6,
            toolbox: T_MOVE,
            maxBlocks: 8,
            targetBlocks: 6,
          },
          {
            // Two long legs.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 2, 1, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 14,
            targetBlocks: 10,
          },
          {
            // A short staircase: three treads, eleven blocks.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 1, 1, 0, 0],
              [0, 0, 1, 1, 0, 0, 0],
              [0, 2, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 14,
            targetBlocks: 11,
          },
          {
            // Three sides of a ring the long way round.  Fourteen blocks is
            // tiring on purpose.
            map: LAP_4,
            startDirection: DIR_NORTH,
            toolbox: T_TURN,
            maxBlocks: 16,
            targetBlocks: 14,
          },
          {
            // Five steps.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 1, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_MOVE,
            maxBlocks: 7,
            targetBlocks: 5,
          },
          {
            // Seven steps.
            map: STRAIGHT_7,
            toolbox: T_MOVE,
            maxBlocks: 9,
            targetBlocks: 7,
          },
          {
            // Long first leg, then a left turn.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 3, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 12,
            targetBlocks: 8,
          },
          {
            // Long U: two right turns.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0, 0],
              [0, 3, 1, 1, 1, 1, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 16,
            targetBlocks: 12,
          },
          {
            // The same three-tread stairs, heading the other way.
            map: [
              [0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 0, 0, 0, 0],
              [0, 0, 1, 1, 0, 0, 0],
              [0, 0, 0, 1, 1, 0, 0],
              [0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 14,
            targetBlocks: 11,
          },
          {
            // Four sides of a ring the long way.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 3, 1, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_TURN,
            maxBlocks: 18,
            targetBlocks: 13,
          },
        ],
      },
      {
        id: 'repeat',
        name: 'Repeat loops',
        description: 'Say it once, do it many times.',
        explainer: [
          {doodle: 'blocks-stack', text: 'Maze.explainRepeat1'},
          {doodle: 'blocks-repeat', text: 'Maze.explainRepeat2'},
          {doodle: 'blocks-repeat', text: 'Maze.explainRepeat3'},
        ],
        levels: [
          {
            // Six identical steps.
            map: STRAIGHT_6,
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
            hints: [
              {kind: 'missingBlock', blockType: 'maze_repeat',
               dialogId: 'dialogHelpRepeatCount',
               style: {width: '360px', top: '360px', side: '425px'},
               toolbarIndex: 3},
              {kind: 'capacity', dialogId: 'dialogHelpCapacity',
               style: {width: '430px', top: '310px', side: '50px'},
               origin: 'capacityBubble'},
            ],
          },
          {
            // The same loop, facing north.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 3, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 1, 0, 0, 0, 0],
              [0, 0, 0, 0, 2, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
          },
          {
            // The same ring as the last unit, now with one loop per leg.
            map: LAP_4,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 8,
          },
          {
            // Two loops of different lengths, back to back.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 2, 1, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 5,
          },
          {
            // A staircase: one loop repeats the whole tread.
            map: STAIRS_6,
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 5,
          },
          {
            // Three legs, three loops.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 3, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 2, 1, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 11,
            targetBlocks: 8,
          },
          {
            // Seven identical steps.
            map: STRAIGHT_7,
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
          },
          {
            // The same loop, facing west.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 3, 1, 1, 1, 1, 1, 2, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_WEST,
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
          },
          {
            // Two equal legs of five.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 1, 0, 0],
              [0, 2, 1, 1, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 5,
          },
          {
            // Three-tread stairs as one loop.
            map: STAIRS_3,
            toolbox: T_REPEAT,
            maxBlocks: 6,
            targetBlocks: 5,
          },
        ],
      },
      {
        id: 'debug-loops',
        name: 'Debugging loops',
        description: 'The loop is nearly right.  Find what is off.',
        explainer: [
          {doodle: 'blocks-repeat', text: 'Maze.explainDebugLoops1'},
          {doodle: 'run', text: 'Maze.explainDebugLoops2'},
          {doodle: 'broken', text: 'Maze.explainDebugLoops3'},
        ],
        levels: [
          {
            // The count is too low.
            map: STRAIGHT_6,
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
            startXml: Maze.Levels.toXml([repeatBlock(3, [fwdBlock()])]),
          },
          {
            // The count is too high, so the player overshoots and crashes.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 2, 1, 1, 1, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
            startXml: Maze.Levels.toXml([repeatBlock(7, [fwdBlock()])]),
          },
          {
            // The turn is inside the loop when it belongs between the legs.
            map: LAP_4,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 8,
            startXml: Maze.Levels.toXml([
              repeatBlock(4, [fwdBlock(), turnBlock('turnRight')]),
            ]),
          },
          {
            // A staircase with the two turns swapped.
            map: STAIRS_6,
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 5,
            startXml: Maze.Levels.toXml([
              repeatBlock(6, [fwdBlock(), turnBlock('turnRight'),
                              fwdBlock(), turnBlock('turnLeft')]),
            ]),
          },
        ],
      },
    ],
  },
  {
    stage: 3,
    name: 'Stage 3',
    theme: 'Loops and collecting',
    units: [
      {
        id: 'repeat-collect',
        name: 'Collecting',
        description: 'Gather every gem before you reach the flag.',
        explainer: [
          {doodle: 'gems', text: 'Maze.explainCollect1'},
          {doodle: 'gems', text: 'Maze.explainCollect2'},
          {doodle: 'gems', text: 'Maze.explainCollect3'},
        ],
        levels: [
          {
            // Gems sit on the route, so the loop is unchanged.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 4, 1, 4, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 3,
            targetBlocks: 2,
            requireAllCollectibles: true,
            hints: [
              {kind: 'missingBlock', blockType: 'maze_repeat',
               dialogId: 'dialogHelpCollect',
               style: {width: '360px', top: '360px', side: '425px'},
               toolbarIndex: 3},
            ],
          },
          {
            // Gems at the far corners of the ring.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 4, 1, 1, 1, 4, 0, 0],
              [0, 0, 1, 0, 0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0, 0, 1, 0, 0],
              [0, 0, 1, 0, 0, 0, 1, 0, 0],
              [0, 0, 2, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 8,
            requireAllCollectibles: true,
          },
          {
            // A gem beyond the flag: go past it, then come back.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 3, 1, 1, 4, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 10,
            targetBlocks: 6,
            requireAllCollectibles: true,
          },
          {
            // A gem on every other tread of the staircase.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 3, 0],
              [0, 0, 0, 0, 0, 0, 4, 1, 0],
              [0, 0, 0, 0, 0, 1, 1, 0, 0],
              [0, 0, 0, 0, 4, 1, 0, 0, 0],
              [0, 0, 0, 1, 1, 0, 0, 0, 0],
              [0, 0, 4, 1, 0, 0, 0, 0, 0],
              [0, 2, 1, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 8,
            targetBlocks: 5,
            requireAllCollectibles: true,
          },
          {
            // Gems on all three legs.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 3, 1, 4, 1, 4, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 4, 0],
              [0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 4, 0],
              [0, 2, 1, 4, 1, 4, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 11,
            targetBlocks: 8,
            requireAllCollectibles: true,
          },
        ],
      },
      {
        id: 'nested-loops',
        name: 'Nested loops',
        description: 'Put a loop inside a loop.',
        explainer: [
          {doodle: 'path-bend', text: 'Maze.explainNested1'},
          {doodle: 'blocks-nested', text: 'Maze.explainNested2'},
          {doodle: 'blocks-nested', text: 'Maze.explainNested3'},
        ],
        levels: [
          {
            // The legs-of-four ring again.  Eight blocks was fine last stage;
            // four forces the inner loop.
            map: LAP_4,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 4,
            targetBlocks: 4,
            hints: [
              {kind: 'nestedBlocks', blockType: 'maze_repeat', minCount: 2,
               dialogId: 'dialogHelpNestedLoops',
               style: {width: '360px', top: '360px', side: '425px'},
               toolbarIndex: 3},
            ],
          },
          {
            // Longer legs, same four blocks.
            map: LAP_6,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 5,
            targetBlocks: 4,
          },
          {
            // A wide staircase: two treads, four steps along each edge.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_REPEAT,
            maxBlocks: 7,
            targetBlocks: 7,
          },
          {
            // Nested loops and gems together.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
              [0, 4, 1, 1, 4, 1, 1, 4, 0],
              [0, 1, 0, 0, 0, 0, 0, 1, 0],
              [0, 1, 0, 0, 0, 0, 0, 1, 0],
              [0, 4, 0, 0, 0, 0, 0, 4, 0],
              [0, 1, 0, 0, 0, 0, 0, 1, 0],
              [0, 1, 0, 0, 0, 0, 0, 1, 0],
              [0, 2, 0, 0, 0, 0, 0, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 0, 0],
            ],
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 5,
            targetBlocks: 4,
            requireAllCollectibles: true,
          },
        ],
      },
      {
        id: 'optimise',
        name: 'Fewer blocks',
        description: 'You already know the route.  Now make it shorter.',
        explainer: [
          {doodle: 'blocks-stack', text: 'Maze.explainOptimise1'},
          {doodle: 'blocks-repeat', text: 'Maze.explainOptimise2'},
          {doodle: 'blocks-repeat', text: 'Maze.explainOptimise3'},
        ],
        levels: [
          {
            map: STRAIGHT_6,
            toolbox: T_REPEAT,
            maxBlocks: 2,
            targetBlocks: 2,
          },
          {
            map: STAIRS_6,
            toolbox: T_REPEAT,
            maxBlocks: 5,
            targetBlocks: 5,
          },
          {
            map: LAP_4,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 4,
            targetBlocks: 4,
          },
          {
            map: LAP_6,
            startDirection: DIR_NORTH,
            toolbox: T_REPEAT,
            maxBlocks: 4,
            targetBlocks: 4,
          },
        ],
      },
    ],
  },
  {
    stage: 4,
    name: 'Stage 4',
    theme: 'Conditionals',
    units: [
      {
        id: 'until',
        name: 'Repeat until',
        description: 'Keep going until you reach the flag.',
        explainer: [
          {doodle: 'until', text: 'Maze.explainUntil1'},
          {doodle: 'until', text: 'Maze.explainUntil2'},
          {doodle: 'path-short', text: 'Maze.explainUntil3'},
        ],
        levels: [
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 2, 1, 1, 1, 1, 3, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_UNTIL,
            maxBlocks: 2,
            targetBlocks: 2,
            hints: [
              {kind: 'missingBlock', blockType: 'maze_forever',
               dialogId: 'dialogHelpRepeat',
               style: {width: '360px', top: '360px', side: '425px'},
               toolbarIndex: 3},
              {kind: 'capacity', dialogId: 'dialogHelpCapacity',
               style: {width: '430px', top: '310px', side: '50px'},
               origin: 'capacityBubble'},
            ],
          },
          {
            // The path continues past the start and the goal in both
            // directions.  Intentional: the maze is about getting from the
            // start to the goal, not about covering every square.
            map: [
              [0, 0, 0, 0, 0, 0, 0, 1],
              [0, 0, 0, 0, 0, 0, 1, 1],
              [0, 0, 0, 0, 0, 3, 1, 0],
              [0, 0, 0, 0, 1, 1, 0, 0],
              [0, 0, 0, 1, 1, 0, 0, 0],
              [0, 0, 1, 1, 0, 0, 0, 0],
              [0, 2, 1, 0, 0, 0, 0, 0],
              [1, 1, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_UNTIL,
            maxBlocks: 5,
            targetBlocks: 4,
            hints: [
              {kind: 'capacity', dialogId: 'dialogHelpCapacity',
               style: {width: '430px', top: '310px', side: '50px'},
               origin: 'capacityBubble'},
              {kind: 'nestedBlocks', blockType: 'maze_forever', minCount: 2,
               dialogId: 'dialogHelpRepeatMany',
               style: {width: '360px', top: '360px', side: '425px'},
               toolbarIndex: 3},
            ],
          },
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 2, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_UNTIL,
            maxBlocks: 5,
            targetBlocks: 4,
          },
        ],
      },
      {
        id: 'if-path',
        name: 'If there is a path',
        description: 'Look before you move.',
        explainer: [
          {doodle: 'if-path', text: 'Maze.explainIfPath1'},
          {doodle: 'if-path', text: 'Maze.explainIfPath2'},
          {doodle: 'if-path', text: 'Maze.explainIfPath3'},
        ],
        levels: [
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 1, 1, 1, 1, 1, 0, 0],
              [0, 1, 0, 0, 0, 1, 0, 0],
              [0, 1, 1, 3, 0, 1, 0, 0],
              [0, 0, 0, 0, 0, 1, 0, 0],
              [0, 2, 1, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: ['maze_moveForward', 'maze_turn', 'maze_forever',
                      'maze_if:isPathLeft'],
            maxBlocks: 5,
            targetBlocks: 5,
            hints: [
              {kind: 'missingBlock', blockType: 'maze_if',
               dialogId: 'dialogHelpIf',
               style: {width: '360px', top: '430px', side: '425px'},
               toolbarIndex: 4},
            ],
          },
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 1, 1, 0],
              [0, 2, 1, 1, 1, 1, 0, 0],
              [0, 0, 0, 0, 0, 1, 1, 0],
              [0, 1, 1, 3, 0, 1, 0, 0],
              [0, 1, 0, 1, 0, 1, 0, 0],
              [0, 1, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_IF,
            maxBlocks: 5,
            targetBlocks: 5,
            hints: [
              {kind: 'missingField', blockType: 'maze_if', field: 'DIR',
               value: 'isPathRight', dialogId: 'dialogHelpMenu',
               style: {width: '360px', top: '430px', side: '425px'},
               toolbarIndex: 4},
            ],
          },
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 1, 1, 1, 1, 0, 0, 0],
              [0, 1, 0, 0, 1, 1, 0, 0],
              [0, 1, 1, 1, 0, 1, 0, 0],
              [0, 0, 0, 1, 0, 1, 0, 0],
              [0, 2, 1, 1, 0, 3, 0, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_IF,
            maxBlocks: 10,
            targetBlocks: 7,
          },
        ],
      },
      {
        id: 'debug-conditionals',
        name: 'Debugging conditionals',
        description: 'Coming soon.',
        levels: [],
      },
    ],
  },
  {
    stage: 5,
    name: 'Stage 5',
    theme: 'Decisions',
    units: [
      {
        id: 'if-else',
        name: 'If / else',
        description: 'Do one thing, otherwise do another.',
        explainer: [
          {doodle: 'if-else', text: 'Maze.explainIfElse1'},
          {doodle: 'if-else', text: 'Maze.explainIfElse2'},
          {doodle: 'if-else', text: 'Maze.explainIfElse3'},
        ],
        levels: [
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 1, 1, 1, 1, 1, 0, 0],
              [0, 0, 1, 0, 0, 0, 0, 0],
              [3, 1, 1, 1, 1, 1, 1, 0],
              [0, 1, 0, 1, 0, 1, 1, 0],
              [1, 1, 1, 1, 1, 0, 1, 0],
              [0, 1, 0, 1, 0, 2, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_IF_ELSE,
            maxBlocks: 7,
            targetBlocks: 5,
            hints: [
              {kind: 'missingBlock', blockType: 'maze_ifElse',
               dialogId: 'dialogHelpIfElse',
               style: {width: '360px', top: '305px', side: '425px'},
               toolbarIndex: 5},
            ],
          },
        ],
      },
      {
        id: 'nested-if',
        name: 'Nested conditionals',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'optimise-decisions',
        name: 'Fewer blocks',
        description: 'Coming soon.',
        levels: [],
      },
    ],
  },
  {
    stage: 6,
    name: 'Stage 6',
    theme: 'Functions',
    units: [
      {
        id: 'function-basic',
        name: 'Making a function',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'decompose',
        name: 'Breaking it down',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'debug-functions',
        name: 'Debugging functions',
        description: 'Coming soon.',
        levels: [],
      },
    ],
  },
  {
    stage: 7,
    name: 'Stage 7',
    theme: 'Variables',
    units: [
      {
        id: 'variable-count',
        name: 'Counting',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'while-condition',
        name: 'While loops',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'optimise-variables',
        name: 'Fewer blocks',
        description: 'Coming soon.',
        levels: [],
      },
    ],
  },
  {
    stage: 8,
    name: 'Stage 8',
    theme: 'Boolean logic',
    units: [
      {
        id: 'boolean-and-or',
        name: 'And / or',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'boolean-not',
        name: 'Not',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'wall-follow',
        name: 'Wall following',
        description: 'One rule solves the whole maze.',
        explainer: [
          {doodle: 'wall', text: 'Maze.explainWall1'},
          {doodle: 'if-else', text: 'Maze.explainWall2'},
          {doodle: 'wall', text: 'Maze.explainWall3'},
        ],
        levels: [
          {
            map: [
              [0, 0, 0, 0, 0, 0, 0, 0],
              [0, 1, 1, 0, 3, 0, 1, 0],
              [0, 1, 1, 0, 1, 1, 1, 0],
              [0, 1, 0, 1, 0, 1, 0, 0],
              [0, 1, 1, 1, 1, 1, 1, 0],
              [0, 0, 0, 1, 0, 0, 1, 0],
              [0, 2, 1, 1, 1, 0, 1, 0],
              [0, 0, 0, 0, 0, 0, 0, 0],
            ],
            toolbox: T_IF_ELSE,
            maxBlocks: 10,
            targetBlocks: 6,
          },
        ],
      },
    ],
  },
  {
    stage: 9,
    name: 'Stage 9',
    theme: 'Algorithms',
    units: [
      {
        id: 'function-params',
        name: 'Functions with inputs',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'general-solver',
        name: 'One program, many mazes',
        description: 'Coming soon.',
        levels: [],
      },
      {
        id: 'efficiency',
        name: 'Efficiency',
        description: 'Coming soon.',
        levels: [],
      },
    ],
  },
];

/**
 * Look up a stage by number.
 * @param {number} stage Stage number (1-based).
 * @returns {Object} Stage record, or null.
 */
Maze.Levels.getStage = function(stage) {
  for (const record of Maze.Levels.STAGES) {
    if (record.stage === stage) {
      return record;
    }
  }
  return null;
};

/**
 * Look up a unit within a stage.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier (e.g. 'repeat').
 * @returns {Object} Unit record, or null.
 */
Maze.Levels.getUnit = function(stage, unitId) {
  const record = Maze.Levels.getStage(stage);
  if (!record) {
    return null;
  }
  for (const unit of record.units) {
    if (unit.id === unitId) {
      return unit;
    }
  }
  return null;
};

/**
 * Look up a single level.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @param {number} level Level number within the unit (1-based).
 * @returns {Object} Level record, or null.
 */
Maze.Levels.resolve = function(stage, unitId, level) {
  const unit = Maze.Levels.getUnit(stage, unitId);
  if (!unit || level < 1 || level > unit.levels.length) {
    return null;
  }
  return unit.levels[level - 1];
};

/**
 * The first unit in a stage that has any levels authored.  Used when the URL
 * names no unit, or names one that does not exist.
 * @param {number} stage Stage number.
 * @returns {Object} Unit record, or null if the whole stage is still empty.
 */
Maze.Levels.firstPlayableUnit = function(stage) {
  const record = Maze.Levels.getStage(stage);
  if (!record) {
    return null;
  }
  for (const unit of record.units) {
    if (unit.levels.length) {
      return unit;
    }
  }
  return null;
};

/**
 * localStorage prefix for a unit.  Progress for level 3 of stage 2's repeat
 * unit lands in `maze_g2_repeat3`, which keeps every existing helper in
 * lib-games.js (progress, sequential locks, teacher unlock) working per unit.
 *
 * The `g` dates from when stages were called grades.  Renaming it would
 * orphan the progress already in students' browsers, since "Clear data" only
 * deletes the keys this function can name.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @returns {string} Storage name.
 */
Maze.Levels.storageName = function(stage, unitId) {
  return `maze_g${stage}_${unitId}`;
};

/**
 * Every unit across every stage, in curriculum order.
 * @returns {!Array<!Object>} Records of {stage, unit}.
 */
Maze.Levels.allUnits = function() {
  const units = [];
  for (const record of Maze.Levels.STAGES) {
    for (const unit of record.units) {
      units.push({stage: record.stage, unit: unit});
    }
  }
  return units;
};

/**
 * Total number of authored levels in the whole curriculum.  Used by the index
 * page's progress gauge.
 * @returns {number} Level count.
 */
Maze.Levels.totalLevels = function() {
  let total = 0;
  for (const {unit} of Maze.Levels.allUnits()) {
    total += unit.levels.length;
  }
  return total;
};

/**
 * The location that follows a given level: the next level in the same unit,
 * else the first level of the next unit with content in the same stage.
 *
 * It stops at the end of the stage rather than spilling into the next one.
 * Stages are a choice the student makes, not a queue, so finishing one hands
 * them back to that stage's topic list instead of starting harder work they
 * never asked for.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @param {number} level Level number.
 * @returns {Object} {stage, unitId, level}, or null at the end of the stage.
 */
Maze.Levels.next = function(stage, unitId, level) {
  const unit = Maze.Levels.getUnit(stage, unitId);
  if (unit && level < unit.levels.length) {
    return {stage: stage, unitId: unitId, level: level + 1};
  }
  const record = Maze.Levels.getStage(stage);
  if (!record) {
    return null;
  }
  const index = record.units.findIndex((each) => each.id === unitId);
  if (index === -1) {
    return null;
  }
  for (let i = index + 1; i < record.units.length; i++) {
    if (record.units[i].levels.length) {
      return {stage: stage, unitId: record.units[i].id, level: 1};
    }
  }
  return null;
};

/**
 * The unit before this one within the same stage, skipping units with no
 * content.  Used to decide whether a unit is unlocked yet.
 *
 * Stages deliberately do not chain into each other: a stage says how hard its
 * topics are, not what a student has already earned, and it is not a school
 * year.  A ten-year-old who still needs sequencing opens stage 1, while a
 * classmate who is ready opens stage 4, neither having finished anything
 * first.  Only the topics inside a stage run in order.
 * @param {number} stage Stage number.
 * @param {string} unitId Unit identifier.
 * @returns {Object} {stage, unit}, or null if this is the stage's first unit.
 */
Maze.Levels.previousUnit = function(stage, unitId) {
  const record = Maze.Levels.getStage(stage);
  if (!record) {
    return null;
  }
  const index = record.units.findIndex((unit) => unit.id === unitId);
  for (let i = index - 1; i >= 0; i--) {
    if (record.units[i].levels.length) {
      return {stage: stage, unit: record.units[i]};
    }
  }
  return null;
};
