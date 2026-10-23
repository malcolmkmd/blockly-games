/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Reusable explainer shell. Scenes draw into #xpRoot and call
 * ctx.done(), ctx.hint(), or ctx.finish(). No audio.
 */
(function(root) {
  var DIRS = {
    right: {dc: 1, dr: 0},
    left: {dc: -1, dr: 0},
    up: {dc: 0, dr: -1},
    down: {dc: 0, dr: 1}
  };
  var SYMBOL = {right: '\u2192', left: '\u2190', up: '\u2191', down: '\u2193'};
  var state = null;
  var inputReady = false;

  function $(id) {
    return document.getElementById(id);
  }

  function robotSvg(id) {
    return '<svg id="' + (id || 'xpRobot') + '" class="xp-robot face-asleep" viewBox="0 0 160 190" width="100%" height="100%" aria-label="Robot">' +
      '<g class="xp-arm xp-arm-l"><rect x="12" y="78" width="28" height="62" rx="14" fill="#FF8A3D"/></g>' +
      '<g class="xp-arm xp-arm-r"><rect x="120" y="78" width="28" height="62" rx="14" fill="#FF8A3D"/></g>' +
      '<rect x="46" y="150" width="24" height="28" rx="10" fill="#1F2937"/>' +
      '<rect x="90" y="150" width="24" height="28" rx="10" fill="#1F2937"/>' +
      '<rect x="38" y="56" width="84" height="100" rx="30" fill="#FF5A1F"/>' +
      '<rect x="52" y="72" width="56" height="50" rx="18" fill="#FFF7ED"/>' +
      '<circle cx="80" cy="128" r="8" fill="#FACC15"/>' +
      '<g class="xp-eyes-open">' +
        '<circle cx="68" cy="92" r="7" fill="#111827"/>' +
        '<circle cx="92" cy="92" r="7" fill="#111827"/>' +
        '<circle cx="70" cy="90" r="2.4" fill="#FFFFFF"/>' +
        '<circle cx="94" cy="90" r="2.4" fill="#FFFFFF"/>' +
      '</g>' +
      '<g class="xp-eyes-shut">' +
        '<path d="M60 94h16M84 94h16" stroke="#111827" stroke-width="4" stroke-linecap="round"/>' +
      '</g>' +
      '<path class="xp-mouth-smile" d="M66 108q14 14 28 0" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse class="xp-mouth-oh" cx="80" cy="112" rx="7" ry="8" fill="#111827"/>' +
      '<path class="xp-mouth-cheer" d="M62 106q18 20 36 0" fill="none" stroke="#111827" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="74" y="40" width="12" height="20" rx="4" fill="#FACC15"/>' +
      '<circle cx="80" cy="32" r="12" fill="#FACC15"/>' +
    '</svg>';
  }

  function setFace(name) {
    var el = $('xpRobot');
    if (!el) {
      return;
    }
    el.setAttribute('class', 'xp-robot face-' + name);
  }

  function stepMs() {
    return state && state.fast ? 30 : 420;
  }

  function match(node, sel) {
    while (node && node !== document) {
      if (node.nodeType === 1 && node.matches && node.matches(sel)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function fillSlot(slot, dir) {
    slot.setAttribute('data-filled', dir);
    slot.textContent = SYMBOL[dir] || '';
    slot.classList.add('is-filled');
  }

  function clearSlot(slot) {
    slot.removeAttribute('data-filled');
    slot.textContent = '';
    slot.classList.remove('is-filled');
  }

  function readSlots(scope) {
    var nodes = (scope || document).querySelectorAll('.xp-slot');
    var out = [];
    var i;
    for (i = 0; i < nodes.length; i++) {
      out.push(nodes[i].getAttribute('data-filled') || '');
    }
    return out;
  }

  function clearSlots(scope) {
    var nodes = (scope || document).querySelectorAll('.xp-slot');
    var i;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-lock') === '1') {
        continue;
      }
      clearSlot(nodes[i]);
    }
  }

  function slotsHtml(values) {
    var html = '<div class="xp-slots">';
    var i;
    var dir;
    for (i = 0; i < values.length; i++) {
      dir = values[i];
      if (dir) {
        html += '<button type="button" class="xp-slot is-filled" data-filled="' + dir +
            '" data-lock="1">' + SYMBOL[dir] + '</button>';
      } else {
        html += '<button type="button" class="xp-slot" aria-label="empty step"></button>';
      }
    }
    html += '</div>';
    return html;
  }

  function paletteHtml(dirs) {
    var html = '<div class="xp-palette">';
    var i;
    for (i = 0; i < dirs.length; i++) {
      html += '<button type="button" class="xp-arrow" data-arrow="' + dirs[i] +
          '" aria-label="' + dirs[i] + '">' + SYMBOL[dirs[i]] + '</button>';
    }
    html += '</div>';
    return html;
  }

  function symbolsHtml(list) {
    var html = '';
    var i;
    for (i = 0; i < list.length; i++) {
      html += '<span class="xp-mini-arrow">' + (SYMBOL[list[i]] || '') + '</span>';
    }
    return html;
  }

  function same(a, b) {
    var i;
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  function installInput(scope) {
    if (inputReady) {
      return;
    }
    inputReady = true;
    var drag = null;
    var skipClick = false;
    var fromPointer = false;

    function begin(ev) {
      var arrow = match(ev.target, '.xp-arrow');
      if (!arrow) {
        return;
      }
      drag = {dir: arrow.getAttribute('data-arrow'), x: ev.clientX, y: ev.clientY};
      arrow.classList.add('is-down');
      if (ev.preventDefault) {
        ev.preventDefault();
      }
    }

    function end(ev) {
      if (!drag) {
        return;
      }
      var dir = drag.dir;
      drag = null;
      var down = scope.querySelector('.xp-arrow.is-down');
      if (down) {
        down.classList.remove('is-down');
      }
      var under = document.elementFromPoint(ev.clientX, ev.clientY);
      var slot = under && match(under, '.xp-slot');
      if (slot && !slot.getAttribute('data-filled') && slot.getAttribute('data-lock') !== '1') {
        fillSlot(slot, dir);
        skipClick = true;
        window.setTimeout(function() {
          skipClick = false;
        }, 0);
        if (scope._xpOnSlots) {
          scope._xpOnSlots();
        }
      }
    }

    scope.addEventListener('pointerdown', function(ev) {
      fromPointer = true;
      begin(ev);
    });
    scope.addEventListener('pointerup', end);
    scope.addEventListener('mousedown', function(ev) {
      if (fromPointer) {
        return;
      }
      begin(ev);
    });
    scope.addEventListener('mouseup', function(ev) {
      if (fromPointer) {
        return;
      }
      end(ev);
    });
    scope.addEventListener('click', function(ev) {
      if (skipClick) {
        skipClick = false;
        return;
      }
      var arrow = match(ev.target, '.xp-arrow');
      if (arrow) {
        var empty = scope.querySelector('.xp-slot:not([data-filled])');
        if (empty && empty.getAttribute('data-lock') !== '1') {
          fillSlot(empty, arrow.getAttribute('data-arrow'));
          if (scope._xpOnSlots) {
            scope._xpOnSlots();
          }
        }
        return;
      }
      var slot = match(ev.target, '.xp-slot');
      if (slot && slot.getAttribute('data-filled') && slot.getAttribute('data-lock') !== '1') {
        clearSlot(slot);
        if (scope._xpOnSlots) {
          scope._xpOnSlots();
        }
      }
    });
  }

  function board(parent, spec) {
    var cols = spec.cols;
    var rows = spec.rows;
    var walls = {};
    var i;
    var r;
    var c;
    for (i = 0; i < (spec.walls || []).length; i++) {
      walls[spec.walls[i].c + ',' + spec.walls[i].r] = true;
    }
    var html = '<div class="xp-grid' + (spec.cell === 'big' ? ' is-big' : '') +
        '" style="grid-template-columns:repeat(' + cols + ',1fr);grid-template-rows:repeat(' +
        rows + ',1fr)">';
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var cls = 'xp-cell';
        var inner = '';
        if (walls[c + ',' + r]) {
          cls += ' is-wall';
        }
        if (spec.charge.c === c && spec.charge.r === r) {
          cls += ' is-charge';
          inner = '<span class="xp-bolt" aria-hidden="true">' +
              '<svg viewBox="0 0 64 64"><rect x="16" y="6" width="32" height="14" rx="4" fill="#1F2937"/>' +
              '<path d="M36 22 L24 40 h10 l-6 18 20-24 H36 z" fill="#FACC15"/></svg></span>';
        }
        html += '<div class="' + cls + '" data-c="' + c + '" data-r="' + r + '">' + inner + '</div>';
      }
    }
    html += '<div class="xp-bot"><div class="xp-bot-bob">' + robotSvg('xpRobot') + '</div></div></div>';
    parent.insertAdjacentHTML('beforeend', html);
    var grid = parent.querySelector('.xp-grid');
    var bot = grid.querySelector('.xp-bot');
    var api = {
      dead: false,
      gen: 0,
      c: spec.start.c,
      r: spec.start.r,
      charge: spec.charge,
      start: spec.start,
      cols: cols,
      rows: rows,
      walls: walls
    };
    if (state) {
      state.api = api;
    }
    function cellAt(col, row) {
      return grid.querySelector('.xp-cell[data-c="' + col + '"][data-r="' + row + '"]');
    }
    function place(jump) {
      var cell = cellAt(api.c, api.r);
      if (!cell) {
        return;
      }
      var gridRect = grid.getBoundingClientRect();
      var cellRect = cell.getBoundingClientRect();
      var w = cellRect.width * 0.86;
      var h = cellRect.height * 0.86;
      bot.style.width = w + 'px';
      bot.style.height = h + 'px';
      var x = (cellRect.left - gridRect.left) + (cellRect.width - w) / 2;
      var y = (cellRect.top - gridRect.top) + (cellRect.height - h) / 2;
      if (jump) {
        bot.classList.add('is-jump');
      }
      bot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      if (jump) {
        void bot.offsetWidth;
        bot.classList.remove('is-jump');
      }
    }
    api.place = function() {
      place(true);
    };
    api.reset = function() {
      api.c = spec.start.c;
      api.r = spec.start.r;
      setFace('happy');
      place(true);
    };
    api.atCharge = function() {
      return api.c === spec.charge.c && api.r === spec.charge.r;
    };
    api.move = function(dir, gen, cb) {
      var d = DIRS[dir];
      var ms = stepMs();
      if (!d) {
        cb(false);
        return;
      }
      var nc = api.c + d.dc;
      var nr = api.r + d.dr;
      var blocked = nc < 0 || nr < 0 || nc >= cols || nr >= rows || walls[nc + ',' + nr];
      if (blocked) {
        setFace('bump');
        var bob = bot.querySelector('.xp-bot-bob');
        bob.classList.remove('is-bump');
        void bob.offsetWidth;
        bob.classList.add('is-bump');
        window.setTimeout(function() {
          if (api.dead || api.gen !== gen) {
            return;
          }
          cb(false);
        }, ms);
        return;
      }
      api.c = nc;
      api.r = nr;
      setFace('happy');
      place(false);
      window.setTimeout(function() {
        if (api.dead || api.gen !== gen) {
          return;
        }
        if (api.atCharge()) {
          setFace('cheer');
        }
        cb(true);
      }, ms);
    };
    setFace('happy');
    place(true);
    return api;
  }

  function play(api, steps, cb) {
    var gen = ++api.gen;
    var i = 0;
    function next() {
      if (api.dead || api.gen !== gen) {
        return;
      }
      if (i >= steps.length) {
        cb(!!api.atCharge());
        return;
      }
      var dir = steps[i];
      i++;
      api.move(dir, gen, function(ok) {
        if (api.dead || api.gen !== gen) {
          return;
        }
        if (!ok) {
          cb(false);
          return;
        }
        next();
      });
    }
    api.reset();
    window.setTimeout(next, state && state.fast ? 16 : 40);
  }

  function renderDots() {
    var wrap = $('xpDots');
    if (!wrap || !state) {
      return;
    }
    wrap.innerHTML = '';
    var i;
    for (i = 0; i < state.scenes.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'xp-dot' + (i === state.index ? ' is-now' : (i < state.index ? ' is-done' : ''));
      wrap.appendChild(dot);
    }
  }

  function runScene() {
    if (state.api) {
      state.api.dead = true;
    }
    state.api = null;
    var scene = state.scenes[state.index];
    var scope = $('xpRoot');
    scope._xpOnSlots = null;
    scope.innerHTML = '';
    scope.setAttribute('data-scene', scene.id);
    $('xpNext').hidden = true;
    $('xpHint').textContent = '';
    $('xpCelebrate').hidden = true;
    $('xpCaption').textContent = scene.caption || '';
    renderDots();
    scene.setup(makeCtx(scope));
  }

  function makeCtx(scope) {
    return {
      root: scope,
      band: state.band,
      fast: state.fast,
      robot: function() {
        return robotSvg('xpRobot');
      },
      setFace: setFace,
      board: function(spec) {
        return board(scope, spec);
      },
      slotsHtml: slotsHtml,
      paletteHtml: paletteHtml,
      symbolsHtml: symbolsHtml,
      readSlots: function() {
        return readSlots(scope);
      },
      clearSlots: function() {
        clearSlots(scope);
      },
      fillSlot: fillSlot,
      same: same,
      play: play,
      onSlots: function(fn) {
        scope._xpOnSlots = fn;
      },
      done: function() {
        $('xpHint').textContent = '';
        $('xpNext').hidden = false;
      },
      hint: function(text) {
        $('xpHint').textContent = text || 'Try again';
      },
      finish: function() {
        try {
          window.localStorage.setItem('thinkaLesson_w1_explainer', '1');
        } catch (err) {
          // Private mode can throw. The celebration still plays.
        }
        $('xpHint').textContent = '';
        $('xpNext').hidden = true;
        $('xpCelebrate').hidden = false;
        var dots = document.querySelectorAll('.xp-dot');
        if (dots.length) {
          dots[dots.length - 1].className = 'xp-dot is-done';
        }
        if (!state.stay) {
          window.setTimeout(function() {
            window.location.href = $('xpMaze').getAttribute('href');
          }, state.fast ? 80 : 1400);
        }
      }
    };
  }

  function esc(text) {
    return String(text).replace(/[&<>"]/g, function(ch) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch];
    });
  }

  function start(opts) {
    state = {
      scenes: opts.scenes,
      band: opts.band || 'foundation',
      fast: !!opts.fast,
      stay: !!opts.stay,
      index: 0,
      api: null
    };
    document.body.setAttribute('data-band', state.band);
    document.body.classList.toggle('is-fast', state.fast);
    var term = $('xpTerm');
    if (term && state.band === 'senior' && opts.terms && opts.terms.length) {
      var html = '';
      var i;
      for (i = 0; i < opts.terms.length; i++) {
        html += '<p><strong>' + esc(opts.terms[i].word) + '</strong> ' +
            esc(opts.terms[i].meaning) + '</p>';
      }
      term.innerHTML = html;
      term.hidden = false;
    }
    var cheer = $('xpCelebrateBot');
    if (cheer) {
      cheer.innerHTML = robotSvg('xpCheer');
      var face = $('xpCheer');
      if (face) {
        face.setAttribute('class', 'xp-robot face-cheer');
      }
    }
    installInput($('xpRoot'));
    $('xpReplay').addEventListener('click', function() {
      runScene();
    });
    $('xpNext').addEventListener('click', function() {
      if (state.index >= state.scenes.length - 1) {
        return;
      }
      state.index++;
      runScene();
    });
    renderDots();
    runScene();
  }

  root.ThinkaPlayer = {
    start: start,
    SYMBOL: SYMBOL,
    stepMs: stepMs
  };
})(typeof window !== 'undefined' ? window : globalThis);
