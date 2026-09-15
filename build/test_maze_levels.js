#!/usr/bin/env node
/**
 * Playtests the Maze curriculum.
 *
 * Every authored level is checked for structural sanity (one start, one
 * finish, a rectangular map, a sane block budget) and for reachability.
 * A solver then searches for a program that uses only that level's toolbox
 * and actually reaches the flag (and gathers every gem) without crashing,
 * inside the block cap — so a level cannot ship if it cannot be passed.
 *
 * Known solutions for stages 1-3 are still executed when present, as a
 * check that the intended teaching program still fits the star budget.
 *
 * Run: `node build/test_maze_levels.js`
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadLevels() {
  const sandbox = {
    goog: {
      provide: function(name) {
        const parts = name.split('.');
        let obj = sandbox;
        for (const part of parts) {
          obj[part] = obj[part] || {};
          obj = obj[part];
        }
      },
      require: function() {},
    },
  };
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'maze', 'src', 'levels.js'),
      'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.Maze.Levels;
}

/**
 * The toolbox renderer from html.js, with just enough of the game stubbed out
 * to call it.
 */
function loadToolboxRenderer() {
  const sandbox = {
    window: {BlocklyMsg: {CONTROLS_IF_MSG_ELSE: 'else'}},
    goog: {
      provide: function(name) {
        const parts = name.split('.');
        let obj = sandbox;
        for (const part of parts) {
          obj[part] = obj[part] || {};
          obj = obj[part];
        }
      },
      require: function() {},
    },
    BlocklyGames: {
      getMsg: (name) => name,
      esc: (text) => text,
      html: {
        headerBar: () => '',
        dialog: () => '',
        doneDialog: () => '',
        abortDialog: () => '',
        storageDialog: () => '',
      },
    },
    BlocklyInterface: {nextLevelParam: ''},
  };
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'maze', 'src', 'html.js'),
      'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.Maze.html;
}

/**
 * Block types the maze defines for itself, read straight out of blocks.js.
 */
function mazeBlockTypes() {
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'maze', 'src', 'blocks.js'),
      'utf8');
  const types = new Set();
  for (const m of src.matchAll(/"type":\s*"(maze_\w+)"/g)) {
    types.add(m[1]);
  }
  return types;
}

function loadThinkaConfig() {
  const sandbox = {
    goog: {
      provide: function(name) {
        sandbox[name] = sandbox[name] || {};
      },
      require: function() {},
    },
  };
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'src', 'thinka.config.js'),
      'utf8');
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.ThinkaConfig;
}

const Levels = loadLevels();
const ThinkaConfig = loadThinkaConfig();
const {WALL, START, FINISH, COLLECTIBLE} = Levels.SquareType;
const {NORTH, EAST, SOUTH, WEST} = Levels.DirectionType;

// A program is a tree of these, mirroring the blocks a student would drag.
// The block count is what the capacity counter in the game would show.
const forward = () => ({op: 'forward'});
const left = () => ({op: 'left'});
const right = () => ({op: 'right'});
const loop = (times, body) => ({op: 'loop', times, body});
const forever = (body) => ({op: 'forever', body});
const ifThen = (dir, body) => ({op: 'if', dir, body});
const ifElse = (dir, body, elseBody) => ({op: 'ifElse', dir, body, elseBody});

const REL = {forward: 0, right: 1, back: 2, left: 3};

/**
 * Number of blocks a program uses.  Matches the game's capacity counter:
 * each move, turn, loop, forever, if and if/else counts as one, plus the
 * blocks nested inside.
 */
function blockCount(program) {
  let n = 0;
  for (const step of program || []) {
    n++;
    if (step.body) {
      n += blockCount(step.body);
    }
    if (step.elseBody) {
      n += blockCount(step.elseBody);
    }
  }
  return n;
}

/**
 * Blocks this level actually offers the student.
 */
function toolboxInfo(level) {
  const types = new Set();
  const pinnedIf = [];
  for (const entry of level.toolbox || []) {
    const [type, value] = entry.split(':');
    types.add(type);
    if (type === 'maze_if' && value) {
      pinnedIf.push(value.replace(/^isPath/, '').toLowerCase());
    }
  }
  return {
    canMove: types.has('maze_moveForward'),
    canTurn: types.has('maze_turn'),
    canRepeat: types.has('maze_repeat'),
    canForever: types.has('maze_forever'),
    canIf: types.has('maze_if'),
    canIfElse: types.has('maze_ifElse'),
    ifDirs: pinnedIf.length ? pinnedIf : ['left', 'right', 'forward'],
  };
}

/**
 * Run a program against a level, the way the game's interpreter would.
 * forever is `while (notDone())`, if/ifElse look for a path relative to
 * the player, and walking into a wall throws — same as a crash.
 */
function run(level, program) {
  const map = level.map;
  const rows = map.length;
  const cols = map[0].length;
  let x, y;
  let finishX, finishY;
  let gems = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (map[j][i] === START) {
        x = i;
        y = j;
      } else if (map[j][i] === FINISH) {
        finishX = i;
        finishY = j;
      } else if (map[j][i] === COLLECTIBLE) {
        gems++;
      }
    }
  }
  let dir = level.startDirection === undefined ? EAST : level.startDirection;
  const collected = new Set();
  let steps = 0;

  const isOpen = (i, j) =>
      j >= 0 && j < rows && i >= 0 && i < cols && map[j][i] !== WALL;

  const pathIn = (relName) => {
    const look = (dir + REL[relName]) % 4;
    return isOpen(x + [0, 1, 0, -1][look], y + [-1, 0, 1, 0][look]);
  };

  const notDone = () => {
    if (x !== finishX || y !== finishY) {
      return true;
    }
    if (level.requireAllCollectibles && collected.size < gems) {
      return true;
    }
    return false;
  };

  const exec = function(body) {
    for (const step of body) {
      if (++steps > 8000) {
        throw new Error('program ran away');
      }
      if (step.op === 'loop') {
        for (let k = 0; k < step.times; k++) {
          exec(step.body);
        }
      } else if (step.op === 'forever') {
        let n = 0;
        while (notDone()) {
          if (++n > 400) {
            throw new Error('forever loop ran away');
          }
          exec(step.body);
        }
      } else if (step.op === 'if') {
        if (pathIn(step.dir)) {
          exec(step.body);
        }
      } else if (step.op === 'ifElse') {
        if (pathIn(step.dir)) {
          exec(step.body);
        } else {
          exec(step.elseBody);
        }
      } else if (step.op === 'left') {
        dir = (dir + 3) % 4;
      } else if (step.op === 'right') {
        dir = (dir + 1) % 4;
      } else {
        const dx = [0, 1, 0, -1][dir];
        const dy = [-1, 0, 1, 0][dir];
        if (!isOpen(x + dx, y + dy)) {
          throw new Error(`crashed into a wall at ${x},${y}`);
        }
        x += dx;
        y += dy;
        if (map[y][x] === COLLECTIBLE) {
          collected.add(x + ',' + y);
        }
      }
    }
  };
  exec(program);

  return {
    solved: !notDone(),
    collected: collected.size,
    gems: gems,
  };
}

/**
 * Whether this program solves the level inside the block cap.
 */
function passes(level, program) {
  const max = level.maxBlocks === undefined ? Infinity : level.maxBlocks;
  if (blockCount(program) > max) {
    return false;
  }
  try {
    const outcome = run(level, program);
    if (!outcome.solved) {
      return false;
    }
    if (level.requireAllCollectibles && outcome.collected < outcome.gems) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Shortest number of forward/turn actions that solves a level, ignoring loops.
 * Breadth-first over (x, y, direction, gems collected).
 */
function shortestActions(level) {
  const map = level.map;
  const rows = map.length;
  const cols = map[0].length;
  const gemKeys = [];
  let start = null;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (map[j][i] === START) {
        start = {x: i, y: j};
      } else if (map[j][i] === COLLECTIBLE) {
        gemKeys.push(i + ',' + j);
      }
    }
  }
  const needGems = !!level.requireAllCollectibles;
  const goalMask = needGems ? (1 << gemKeys.length) - 1 : 0;
  const dir0 = level.startDirection === undefined ? EAST : level.startDirection;
  const key = (x, y, d, mask) => `${x},${y},${d},${mask}`;
  const queue = [{x: start.x, y: start.y, d: dir0, mask: 0, cost: 0}];
  const seen = new Set([key(start.x, start.y, dir0, 0)]);

  while (queue.length) {
    const node = queue.shift();
    if (map[node.y][node.x] === FINISH && node.mask === goalMask) {
      return node.cost;
    }
    const moves = [
      {x: node.x, y: node.y, d: (node.d + 3) % 4, mask: node.mask},
      {x: node.x, y: node.y, d: (node.d + 1) % 4, mask: node.mask},
    ];
    const dx = [0, 1, 0, -1][node.d];
    const dy = [-1, 0, 1, 0][node.d];
    const nx = node.x + dx;
    const ny = node.y + dy;
    if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && map[ny][nx] !== WALL) {
      const index = gemKeys.indexOf(nx + ',' + ny);
      const mask = index === -1 ? node.mask : (node.mask | (1 << index));
      moves.push({x: nx, y: ny, d: node.d, mask: mask});
    }
    for (const move of moves) {
      const k = key(move.x, move.y, move.d, move.mask);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({...move, cost: node.cost + 1});
      }
    }
  }
  return Infinity;
}

/**
 * Shortest move/turn action list that solves the level, or null.
 * `allowTurn` is false when the toolbox has no turn block.
 */
function shortestActionList(level, allowTurn) {
  const map = level.map;
  const rows = map.length;
  const cols = map[0].length;
  const gemKeys = [];
  let start = null;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (map[j][i] === START) {
        start = {x: i, y: j};
      } else if (map[j][i] === COLLECTIBLE) {
        gemKeys.push(i + ',' + j);
      }
    }
  }
  if (!start) {
    return null;
  }
  const needGems = !!level.requireAllCollectibles;
  const goalMask = needGems ? (1 << gemKeys.length) - 1 : 0;
  const dir0 = level.startDirection === undefined ? EAST : level.startDirection;
  const key = (x, y, d, mask) => `${x},${y},${d},${mask}`;
  const queue = [{x: start.x, y: start.y, d: dir0, mask: 0, actions: []}];
  const seen = new Set([key(start.x, start.y, dir0, 0)]);

  while (queue.length) {
    const node = queue.shift();
    if (map[node.y][node.x] === FINISH && node.mask === goalMask) {
      return node.actions;
    }
    const tryMove = (actions, x, y, d, mask) => {
      const k = key(x, y, d, mask);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({x, y, d, mask, actions});
      }
    };
    if (allowTurn) {
      tryMove(node.actions.concat('L'), node.x, node.y, (node.d + 3) % 4,
          node.mask);
      tryMove(node.actions.concat('R'), node.x, node.y, (node.d + 1) % 4,
          node.mask);
    }
    const dx = [0, 1, 0, -1][node.d];
    const dy = [-1, 0, 1, 0][node.d];
    const nx = node.x + dx;
    const ny = node.y + dy;
    if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && map[ny][nx] !== WALL) {
      const index = gemKeys.indexOf(nx + ',' + ny);
      const mask = index === -1 ? node.mask : (node.mask | (1 << index));
      tryMove(node.actions.concat('F'), nx, ny, node.d, mask);
    }
  }
  return null;
}

function actionsToProgram(actions) {
  return actions.map((a) => {
    if (a === 'L') {
      return left();
    }
    if (a === 'R') {
      return right();
    }
    return forward();
  });
}

/**
 * Candidate programs built from the toolbox: an unrolled route if it
 * fits, counted loops, nested loops, and the forever / if patterns the
 * later stages teach.
 */
function* candidates(level) {
  const tb = toolboxInfo(level);
  const max = level.maxBlocks === undefined ? Infinity : level.maxBlocks;
  const F = [forward()];
  const seen = new Set();

  const emit = function*(program) {
    if (blockCount(program) > max) {
      return;
    }
    const sig = JSON.stringify(program);
    if (seen.has(sig)) {
      return;
    }
    seen.add(sig);
    yield program;
  };

  if (tb.canMove) {
    const actions = shortestActionList(level, tb.canTurn);
    if (actions) {
      yield* emit(actionsToProgram(actions));
    }
  }

  if (tb.canRepeat && tb.canMove) {
    for (let n = 1; n <= 16; n++) {
      yield* emit([loop(n, F)]);
    }
    if (tb.canTurn) {
      for (const which of ['left', 'right']) {
        const turn = which === 'left' ? left() : right();
        const other = which === 'left' ? right() : left();
        for (let n = 1; n <= 12; n++) {
          for (let m = 1; m <= 12; m++) {
            yield* emit([loop(n, F), turn, loop(m, F)]);
            yield* emit([loop(n, F), turn, turn, loop(m, F)]);
          }
        }
        for (let a = 1; a <= 8; a++) {
          for (let b = 1; b <= 8; b++) {
            for (let c = 1; c <= 8; c++) {
              yield* emit([loop(a, F), turn, loop(b, F), turn, loop(c, F)]);
            }
          }
        }
        for (let n = 1; n <= 10; n++) {
          yield* emit([loop(n, [forward(), turn, forward(), other])]);
        }
        for (let outer = 2; outer <= 6; outer++) {
          for (let inner = 2; inner <= 10; inner++) {
            yield* emit([loop(outer, [loop(inner, F), turn])]);
          }
        }
      }
      for (let outer = 2; outer <= 4; outer++) {
        yield* emit([loop(outer, [loop(4, F), left(), loop(4, F), right()])]);
      }
    }
  }

  if (tb.canForever && tb.canMove) {
    yield* emit([forever(F)]);
    if (tb.canTurn) {
      yield* emit([forever([forward(), left(), forward(), right()])]);
      yield* emit([forever([forward(), right(), forward(), left()])]);
      yield* emit([forever([forward(), left()])]);
      yield* emit([forever([forward(), right()])]);
      const actions = shortestActionList(level, true);
      if (actions) {
        for (let i = 0; i < actions.length; i++) {
          const rest = actions.slice(i);
          if (rest.length && rest.every((a) => a === 'F')) {
            yield* emit(actionsToProgram(actions.slice(0, i))
                .concat([forever(F)]));
          }
        }
      }
    }
    if (tb.canIf) {
      for (const d of tb.ifDirs) {
        const turn = d === 'right' ? [right()] : [left()];
        yield* emit([forever([forward(), ifThen(d, turn)])]);
        yield* emit([forever([ifThen(d, turn), forward()])]);
        if (tb.canIfElse) {
          yield* emit([forever([
            ifThen(d, turn),
            ifElse('forward', F, d === 'right' ? [left()] : [right()]),
          ])]);
        }
      }
      if (tb.ifDirs.includes('left') && tb.ifDirs.includes('right')) {
        const leftIf = ifThen('left', [left()]);
        const rightIf = ifThen('right', [right()]);
        const fwdIf = ifThen('forward', F);
        yield* emit([forever([leftIf, rightIf, forward()])]);
        yield* emit([forever([rightIf, leftIf, forward()])]);
        yield* emit([forever([leftIf, fwdIf, rightIf])]);
        yield* emit([forever([rightIf, fwdIf, leftIf])]);
        yield* emit([forever([fwdIf, leftIf, rightIf])]);
        yield* emit([forever([fwdIf, rightIf, leftIf])]);
        yield* emit([forever([leftIf, rightIf, fwdIf])]);
        yield* emit([forever([rightIf, leftIf, fwdIf])]);
      }
    }
    if (tb.canIfElse) {
      yield* emit([forever([
        ifElse('left', [left()], [
          ifElse('forward', F, [right()]),
        ]),
      ])]);
      yield* emit([forever([
        ifElse('right', [right()], [
          ifElse('forward', F, [left()]),
        ]),
      ])]);
      yield* emit([forever([
        ifElse('forward', F, [left()]),
      ])]);
      yield* emit([forever([
        ifElse('forward', F, [right()]),
      ])]);
      yield* emit([forever([
        ifElse('forward', F, [ifElse('left', [left()], [right()])]),
      ])]);
      yield* emit([forever([
        ifElse('forward', F, [ifElse('right', [right()], [left()])]),
      ])]);
      yield* emit([forever([
        ifElse('left', [left()], F),
      ])]);
      yield* emit([forever([
        ifElse('right', [right()], F),
      ])]);
      yield* emit([forever([
        ifThen('left', [left()]),
        ifElse('forward', F, [right()]),
      ])]);
      yield* emit([forever([
        ifThen('right', [right()]),
        ifElse('forward', F, [left()]),
      ])]);
    }
  }
}

/**
 * A program that passes this level using only its toolbox, or null.
 */
function findPass(level) {
  for (const program of candidates(level)) {
    if (passes(level, program)) {
      return program;
    }
  }
  return null;
}

// Expected solutions for stages 1-3, keyed "stage/unit/level".
const SOLUTIONS = {
  // Stage 1: sequencing.
  '1/sequence/1': [forward()],
  '1/sequence/2': [forward(), forward()],
  '1/sequence/3': [forward(), forward(), forward(), forward()],
  '1/sequence/4': [forward(), forward(), forward(), forward()],
  '1/sequence/5': [forward(), forward(), forward(), forward()],

  // Stage 1: turning.
  '1/turns/1': [forward(), right(), forward(), forward()],
  '1/turns/2': [forward(), left(), forward(), forward()],
  '1/turns/3': [forward(), forward(), left(), forward(), forward(), right(),
                forward(), forward()],
  '1/turns/4': [forward(), forward(), forward(), left(), forward(), forward(),
                left(), forward(), forward(), right(), forward(), forward()],
  '1/turns/5': [forward(), forward(), forward(), forward(), left(),
                forward(), forward(), forward(), forward(), left(),
                forward(), forward()],

  // Stage 1: debugging.
  '1/debug/1': [forward(), forward(), forward()],
  '1/debug/2': [forward(), forward()],
  '1/debug/3': [forward(), left(), forward(), forward()],
  '1/debug/4': [forward(), forward(), left(), forward(), forward(), right(),
                forward(), forward()],

  // Stage 2: long sequences.
  '2/sequence-long/1': Array(6).fill(0).map(forward),
  '2/sequence-long/2': [...Array(6).fill(0).map(forward), left(),
                        forward(), forward(), forward()],
  '2/sequence-long/3': [forward(), left(), forward(), right(), forward(),
                        left(), forward(), right(), forward(), left(),
                        forward()],
  '2/sequence-long/4': [...Array(4).fill(0).map(forward), right(),
                        ...Array(4).fill(0).map(forward), right(),
                        ...Array(4).fill(0).map(forward)],

  // Stage 2: repeat loops.
  '2/repeat/1': [loop(6, [forward()])],
  '2/repeat/2': [loop(6, [forward()])],
  '2/repeat/3': [loop(4, [forward()]), right(), loop(4, [forward()]), right(),
                 loop(4, [forward()])],
  '2/repeat/4': [loop(6, [forward()]), left(), loop(4, [forward()])],
  '2/repeat/5': [loop(6, [forward(), left(), forward(), right()])],
  '2/repeat/6': [loop(6, [forward()]), left(), loop(5, [forward()]), left(),
                 loop(5, [forward()])],

  // Stage 2: debugging loops.  Same maps as the repeat unit.
  '2/debug-loops/1': [loop(6, [forward()])],
  '2/debug-loops/2': [loop(4, [forward()])],
  '2/debug-loops/3': [loop(4, [forward()]), right(), loop(4, [forward()]),
                      right(), loop(4, [forward()])],
  '2/debug-loops/4': [loop(6, [forward(), left(), forward(), right()])],

  // Stage 3: collecting.
  '3/repeat-collect/1': [loop(6, [forward()])],
  '3/repeat-collect/2': [loop(4, [forward()]), right(), loop(4, [forward()]),
                         right(), loop(4, [forward()])],
  '3/repeat-collect/3': [loop(6, [forward()]), left(), left(),
                         loop(3, [forward()])],
  '3/repeat-collect/4': [loop(6, [forward(), left(), forward(), right()])],
  '3/repeat-collect/5': [loop(6, [forward()]), left(), loop(5, [forward()]),
                         left(), loop(5, [forward()])],

  // Stage 3: nested loops.
  '3/nested-loops/1': [loop(3, [loop(4, [forward()]), right()])],
  '3/nested-loops/2': [loop(3, [loop(6, [forward()]), right()])],
  '3/nested-loops/3': [loop(2, [loop(4, [forward()]), left(),
                                loop(4, [forward()]), right()])],
  '3/nested-loops/4': [loop(3, [loop(6, [forward()]), right()])],

  // Stage 3: fewer blocks.
  '3/optimise/1': [loop(6, [forward()])],
  '3/optimise/2': [loop(6, [forward(), left(), forward(), right()])],
  '3/optimise/3': [loop(3, [loop(4, [forward()]), right()])],
  '3/optimise/4': [loop(3, [loop(6, [forward()]), right()])],
};

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.log('FAIL  ' + name + '\n      ' + e.message);
  }
}

// Structure and reachability for every authored level in the curriculum.
for (const {stage, unit} of Levels.allUnits()) {
  for (let n = 1; n <= unit.levels.length; n++) {
    const id = `${stage}/${unit.id}/${n}`;
    const level = Levels.resolve(stage, unit.id, n);

    check(id + ' map is well formed', () => {
      assert.ok(level.map.length >= 3, 'map is too small');
      const cols = level.map[0].length;
      let starts = 0;
      let finishes = 0;
      for (const row of level.map) {
        assert.strictEqual(row.length, cols, 'map is not rectangular');
        for (const square of row) {
          assert.ok(square >= 0 && square <= 4, 'unknown square type');
          if (square === START) starts++;
          if (square === FINISH) finishes++;
        }
      }
      assert.strictEqual(starts, 1, `expected 1 start, found ${starts}`);
      assert.strictEqual(finishes, 1, `expected 1 finish, found ${finishes}`);
    });

    check(id + ' budget is sane', () => {
      assert.ok(level.toolbox && level.toolbox.length, 'no toolbox');
      const max = level.maxBlocks === undefined ? Infinity : level.maxBlocks;
      const target =
          level.targetBlocks === undefined ? Infinity : level.targetBlocks;
      assert.ok(target <= max,
          `targetBlocks ${target} exceeds maxBlocks ${max}`);
    });

    check(id + ' is reachable', () => {
      assert.ok(shortestActions(level) < Infinity,
          'no route from the start to the flag');
    });

    check(id + ' gems are consistent', () => {
      const gems = level.map.flat().filter((s) => s === COLLECTIBLE).length;
      if (level.requireAllCollectibles) {
        assert.ok(gems > 0, 'requires gems but the map has none');
      }
    });
  }
}

// Every authored level can be passed with the blocks it offers.
for (const {stage, unit} of Levels.allUnits()) {
  for (let n = 1; n <= unit.levels.length; n++) {
    const id = `${stage}/${unit.id}/${n}`;
    const level = Levels.resolve(stage, unit.id, n);
    check(id + ' can be passed', () => {
      const recorded = SOLUTIONS[id];
      const program = (recorded && passes(level, recorded)) ?
          recorded : findPass(level);
      assert.ok(program,
          'no program using this toolbox reaches the flag' +
          (level.requireAllCollectibles ? ' with every gem' : '') +
          ' inside maxBlocks');
    });
  }
}

// Recorded solutions for stages 1-3 still work when we have one.
for (const {stage, unit} of Levels.allUnits()) {
  if (stage > 3) {
    continue;
  }
  for (let n = 1; n <= unit.levels.length; n++) {
    const id = `${stage}/${unit.id}/${n}`;
    const program = SOLUTIONS[id];
    if (!program) {
      continue;
    }
    const level = Levels.resolve(stage, unit.id, n);
    check(id + ' recorded solution solves it', () => {
      const outcome = run(level, program);
      assert.ok(outcome.solved, 'program did not end on the flag');
      assert.strictEqual(outcome.collected, outcome.gems,
          `collected ${outcome.collected} of ${outcome.gems} gems`);
      const blocks = blockCount(program);
      const max = level.maxBlocks === undefined ? Infinity : level.maxBlocks;
      const target =
          level.targetBlocks === undefined ? Infinity : level.targetBlocks;
      assert.ok(blocks <= max,
          `solution needs ${blocks} blocks, maxBlocks is ${max}`);
      assert.strictEqual(blocks, target,
          `solution is ${blocks} blocks but targetBlocks is ${target}`);
    });
  }
}

// Debugging levels start from code that is genuinely broken.
for (const {stage, unit} of Levels.allUnits()) {
  for (let n = 1; n <= unit.levels.length; n++) {
    const level = Levels.resolve(stage, unit.id, n);
    if (!level.startXml) {
      continue;
    }
    const id = `${stage}/${unit.id}/${n}`;
    check(id + ' starts from broken code', () => {
      assert.ok(level.startXml.startsWith('<xml>'), 'not valid looking XML');
      assert.ok(level.startXml.includes('<block type="maze_'),
          'no maze blocks in the starting code');
    });
  }
}

// Toolboxes only offer blocks that exist, and render to sane XML.
const MazeHtml = loadToolboxRenderer();
const DEFINED_BLOCKS = mazeBlockTypes();
// Core Blockly blocks the later stages borrow for functions and variables.
const CORE_BLOCKS = new Set([
  'controls_repeat_ext', 'logic_compare', 'logic_operation', 'logic_negate',
  'math_number', 'math_arithmetic', 'procedures_defnoreturn',
  'procedures_callnoreturn', 'variables_get', 'variables_set',
]);

for (const {stage, unit} of Levels.allUnits()) {
  for (let n = 1; n <= unit.levels.length; n++) {
    const id = `${stage}/${unit.id}/${n}`;
    const level = Levels.resolve(stage, unit.id, n);

    check(id + ' toolbox names real blocks', () => {
      for (const entry of level.toolbox) {
        const type = entry.split(':')[0];
        assert.ok(DEFINED_BLOCKS.has(type) || CORE_BLOCKS.has(type),
            `unknown block type "${type}"`);
      }
    });

    check(id + ' toolbox renders balanced XML', () => {
      const xml = MazeHtml.toolbox_(level.toolbox);
      const opens = (xml.match(/<block /g) || []).length;
      const closes = (xml.match(/<\/block>/g) || []).length;
      assert.strictEqual(opens, closes, 'unbalanced <block> tags');
      assert.ok(opens >= level.toolbox.length,
          'fewer blocks rendered than the level asked for');
      assert.ok(!xml.includes('undefined'), 'rendered "undefined"');
    });

    check(id + ' hints point at blocks in the toolbox', () => {
      for (const hint of level.hints || []) {
        assert.ok(hint.dialogId, 'hint has no dialog');
        if (hint.blockType) {
          const offered = level.toolbox.some(
              (entry) => entry.split(':')[0] === hint.blockType);
          assert.ok(offered,
              `hint mentions "${hint.blockType}", not in the toolbox`);
        }
        if (hint.toolbarIndex !== undefined) {
          // maze_turn expands to two flyout blocks, so count accordingly.
          let slots = 0;
          for (const entry of level.toolbox) {
            slots += entry === 'maze_turn' ? 2 : 1;
          }
          assert.ok(hint.toolbarIndex < slots,
              `toolbarIndex ${hint.toolbarIndex} is past the flyout's ` +
              `${slots} blocks`);
        }
      }
    });
  }
}

// Blockly only registers the field types that are pulled into the bundle, and
// an unregistered field is dropped from the block with nothing but a console
// warning.  A missing goog.require therefore ships a block whose field has
// silently vanished, so check that every field type blocks.js uses is required.
check('every field type used by blocks.js is required', () => {
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'maze', 'src', 'blocks.js'),
      'utf8');
  const used = new Set();
  for (const m of src.matchAll(/"type":\s*"(field_\w+)"/g)) {
    used.add(m[1]);
  }
  assert.ok(used.size, 'found no fields at all, has blocks.js moved?');
  for (const field of used) {
    // field_number -> Blockly.FieldNumber
    const className = 'Blockly.Field' + field.slice('field_'.length)
        .replace(/(^|_)(\w)/g, (all, sep, chr) => chr.toUpperCase());
    assert.ok(src.includes(`goog.require('${className}')`),
        `blocks.js uses ${field} but never requires ${className}`);
  }
});

// Unit ordering and storage naming.
check('units are ordered and uniquely named', () => {
  const seen = new Set();
  for (const {stage, unit} of Levels.allUnits()) {
    const name = Levels.storageName(stage, unit.id);
    assert.ok(!seen.has(name), 'duplicate storage name ' + name);
    seen.add(name);
  }
});

check('static hub curriculum summary stays in sync', () => {
  const src = fs.readFileSync(
      path.join(__dirname, '..', 'appengine', 'index', 'hub.js'), 'utf8');
  const match = src.match(/var MAZE_STORAGE = (\[[\s\S]*?\n  \]);/);
  assert.ok(match, 'could not find MAZE_STORAGE in index/hub.js');
  const actual = JSON.parse(JSON.stringify(
      vm.runInNewContext('(' + match[1] + ')')));
  const expected = [];
  for (const {stage, unit} of Levels.allUnits()) {
    if (unit.levels.length) {
      expected.push({
        name: Levels.storageName(stage, unit.id),
        levels: unit.levels.length,
      });
    }
  }
  assert.deepStrictEqual(actual, expected,
      'index/hub.js has stale Maze progress metadata');
});

check('next() walks a stage and then stops', () => {
  let walked = 0;
  for (const record of Levels.STAGES) {
    const first = record.units.find((unit) => unit.levels.length);
    if (!first) {
      continue;
    }
    const expected =
        record.units.reduce((n, unit) => n + unit.levels.length, 0);
    let location = {stage: record.stage, unitId: first.id, level: 1};
    let visited = 0;
    while (location) {
      visited++;
      assert.ok(Levels.resolve(location.stage, location.unitId, location.level),
          'next() pointed at a level that does not exist');
      assert.strictEqual(location.stage, record.stage,
          `next() left stage ${record.stage}`);
      location = Levels.next(location.stage, location.unitId, location.level);
      assert.ok(visited <= 500, 'next() is looping');
    }
    assert.strictEqual(visited, expected,
        `walked ${visited} levels of stage ${record.stage}, which has ` +
        expected);
    walked += visited;
  }
  assert.strictEqual(walked, Levels.totalLevels(),
      `walked ${walked} levels but the curriculum has ` + Levels.totalLevels());
});

check('topics run in order inside a stage', () => {
  const before = Levels.previousUnit(2, 'repeat');
  assert.ok(before && before.unit.id === 'sequence-long',
      "stage 2's repeat unit should sit behind sequence-long");
});

check('no stage is locked behind another stage', () => {
  // A student's stage says how hard the topics are, not what they have
  // earned, so the opening topic of every stage has to be reachable cold.
  for (const record of Levels.STAGES) {
    const first = record.units.find((unit) => unit.levels.length);
    if (!first) {
      continue;
    }
    assert.strictEqual(Levels.previousUnit(record.stage, first.id), null,
        `stage ${record.stage} opens behind another unit`);
    assert.ok(
        ThinkaConfig.isUnitPlayable(
            Levels.previousUnit(record.stage, first.id), 0, false),
        `stage ${record.stage} is locked for a new student`);
  }
});

const EXPLAIN_DOODLES = new Set([
  'path-short', 'path-bend', 'blocks-stack', 'blocks-turn', 'blocks-repeat',
  'blocks-nested', 'gems', 'broken', 'until', 'if-path', 'if-else', 'wall',
  'run',
]);

const messages = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'messages.json'), 'utf8'));

check('every authored topic has a picture-book explainer', () => {
  for (const {stage, unit} of Levels.allUnits()) {
    if (!unit.levels.length) {
      assert.ok(!unit.explainer || !unit.explainer.length,
          `${unit.id} is coming soon but has explainer slides`);
      continue;
    }
    assert.ok(unit.explainer, `stage ${stage} ${unit.id} has no explainer`);
    assert.ok(unit.explainer.length >= 3 && unit.explainer.length <= 4,
        `${unit.id} has ${unit.explainer.length} slides, want 3 or 4`);
    for (let i = 0; i < unit.explainer.length; i++) {
      const slide = unit.explainer[i];
      assert.ok(EXPLAIN_DOODLES.has(slide.doodle),
          `${unit.id} slide ${i + 1} uses unknown doodle ${slide.doodle}`);
      assert.ok(messages[slide.text],
          `${unit.id} slide ${i + 1} is missing ${slide.text} in messages.json`);
      assert.ok(messages[slide.text].msg,
          `${slide.text} has no English copy`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
