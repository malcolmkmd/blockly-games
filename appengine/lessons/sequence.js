/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Week 1 — Sequencing. Five scenes. The robot walks to its charger.
 * Foundation uses fewer, bigger steps. Senior adds the words.
 */
(function(root) {
  var PREDICT = {
    cols: 3,
    rows: 2,
    start: {c: 0, r: 1},
    charge: {c: 2, r: 1},
    walls: [{c: 0, r: 0}, {c: 1, r: 0}, {c: 2, r: 0}],
    bad: ['up', 'right'],
    good: ['right', 'right']
  };

  var PLANS = {
    foundation: {
      cell: 'big',
      arrows: ['right', 'up'],
      scene2: {cols: 2, rows: 1, start: {c: 0, r: 0}, charge: {c: 1, r: 0}, walls: []},
      predict: PREDICT,
      program: {
        cols: 3,
        rows: 1,
        start: {c: 0, r: 0},
        charge: {c: 2, r: 0},
        walls: [],
        steps: ['right', 'right']
      },
      bug: {shown: ['right', 'up'], fixIndex: 1, fixTo: 'right'}
    },
    intermediate: {
      cell: 'mid',
      arrows: ['left', 'up', 'right', 'down'],
      scene2: {cols: 2, rows: 1, start: {c: 0, r: 0}, charge: {c: 1, r: 0}, walls: []},
      predict: PREDICT,
      program: {
        cols: 3,
        rows: 2,
        start: {c: 0, r: 1},
        charge: {c: 2, r: 0},
        walls: [{c: 0, r: 0}],
        steps: ['right', 'right', 'up']
      },
      bug: {shown: ['right', 'up', 'up'], fixIndex: 1, fixTo: 'right'}
    },
    senior: {
      cell: 'mid',
      arrows: ['left', 'up', 'right', 'down'],
      scene2: {cols: 2, rows: 1, start: {c: 0, r: 0}, charge: {c: 1, r: 0}, walls: []},
      predict: PREDICT,
      program: {
        cols: 4,
        rows: 2,
        start: {c: 0, r: 1},
        charge: {c: 3, r: 0},
        walls: [{c: 0, r: 0}, {c: 1, r: 0}],
        steps: ['right', 'right', 'up', 'right']
      },
      bug: {shown: ['right', 'right', 'right', 'right'], fixIndex: 2, fixTo: 'up'}
    }
  };

  function planFor(band) {
    return PLANS[band] || PLANS.foundation;
  }

  function cap(band, young, mid, older) {
    if (band === 'senior') {
      return older;
    }
    if (band === 'intermediate') {
      return mid;
    }
    return young;
  }

  function mapOf(spec, cell) {
    return {
      cols: spec.cols,
      rows: spec.rows,
      start: spec.start,
      charge: spec.charge,
      walls: spec.walls || [],
      cell: cell
    };
  }

  function scenes(band) {
    var plan = planFor(band);
    return [
      {
        id: 'meet',
        caption: cap(band, 'Tap', 'Tap the robot', 'Wake the robot. A sequence starts with you.'),
        setup: function(ctx) {
          ctx.root.innerHTML = '<div class="xp-meet"><button type="button" class="xp-meet-hit" id="xpWake">' +
              ctx.robot() + '</button></div>';
          ctx.setFace('asleep');
          var woke = false;
          document.getElementById('xpWake').addEventListener('click', function() {
            if (woke) {
              return;
            }
            woke = true;
            ctx.setFace('wave');
            window.setTimeout(function() {
              ctx.setFace('happy');
              ctx.done();
            }, ctx.fast ? 40 : 700);
          });
        }
      },
      {
        id: 'arrows',
        caption: cap(band, 'Drag', 'Drag one arrow', 'Each arrow is one step in the sequence.'),
        setup: function(ctx) {
          var api = ctx.board(mapOf(plan.scene2, plan.cell));
          var controls = document.createElement('div');
          controls.className = 'xp-controls';
          controls.innerHTML = ctx.slotsHtml([null]) + ctx.paletteHtml(plan.arrows);
          ctx.root.appendChild(controls);
          var running = false;
          ctx.onSlots(function() {
            if (running || api.dead) {
              return;
            }
            var got = ctx.readSlots();
            if (!got[0]) {
              return;
            }
            running = true;
            ctx.play(api, [got[0]], function(ok) {
              running = false;
              if (api.dead) {
                return;
              }
              if (ok) {
                ctx.done();
              } else {
                ctx.clearSlots();
                ctx.hint('Try again');
              }
            });
          });
        }
      },
      {
        id: 'order',
        caption: cap(band, 'Which?', 'Which way works?', 'Order matters. The wrong sequence bumps.'),
        setup: function(ctx) {
          var api = ctx.board(mapOf(plan.predict, plan.cell));
          var choices = document.createElement('div');
          choices.className = 'xp-choices';
          choices.innerHTML =
              '<button type="button" id="xpChoiceBad" class="xp-choice" aria-label="first path">' +
              ctx.symbolsHtml(plan.predict.bad) + '</button>' +
              '<button type="button" id="xpChoiceGood" class="xp-choice" aria-label="second path">' +
              ctx.symbolsHtml(plan.predict.good) + '</button>';
          ctx.root.appendChild(choices);
          var running = false;
          function pick(steps, good) {
            if (running || api.dead) {
              return;
            }
            running = true;
            ctx.play(api, steps, function(ok) {
              running = false;
              if (api.dead) {
                return;
              }
              if (good && ok) {
                ctx.done();
              } else {
                ctx.hint('Try again');
              }
            });
          }
          document.getElementById('xpChoiceBad').addEventListener('click', function() {
            pick(plan.predict.bad, false);
          });
          document.getElementById('xpChoiceGood').addEventListener('click', function() {
            pick(plan.predict.good, true);
          });
        }
      },
      {
        id: 'program',
        caption: cap(band, 'Go', 'Build the steps', 'Write an algorithm: the sequence that reaches the charger.'),
        setup: function(ctx) {
          var steps = plan.program.steps;
          var blanks = [];
          var i;
          for (i = 0; i < steps.length; i++) {
            blanks.push(null);
          }
          var api = ctx.board(mapOf(plan.program, plan.cell));
          var controls = document.createElement('div');
          controls.className = 'xp-controls';
          controls.innerHTML = ctx.slotsHtml(blanks) + ctx.paletteHtml(plan.arrows) +
              '<button type="button" id="xpRun" class="xp-run">Go</button>';
          ctx.root.appendChild(controls);
          var running = false;
          document.getElementById('xpRun').addEventListener('click', function() {
            if (running || api.dead) {
              return;
            }
            var got = ctx.readSlots();
            var seq = [];
            for (i = 0; i < got.length; i++) {
              if (got[i]) {
                seq.push(got[i]);
              }
            }
            if (!seq.length) {
              ctx.hint('Try again');
              return;
            }
            running = true;
            ctx.play(api, seq, function(ok) {
              running = false;
              if (api.dead) {
                return;
              }
              if (ok && ctx.same(got, steps)) {
                ctx.done();
              } else {
                ctx.hint('Try again');
              }
            });
          });
        }
      },
      {
        id: 'bug',
        caption: cap(band, 'Fix', 'Tap the wrong arrow', 'Debug: one step is swapped. Tap it to fix the sequence.'),
        setup: function(ctx) {
          var bugPlan = plan.bug;
          var api = ctx.board(mapOf(plan.program, plan.cell));
          var controls = document.createElement('div');
          controls.className = 'xp-controls';
          controls.innerHTML = ctx.slotsHtml(bugPlan.shown);
          ctx.root.appendChild(controls);
          var slots = ctx.root.querySelectorAll('.xp-slot');
          var bug = slots[bugPlan.fixIndex];
          bug.id = 'xpBug';
          bug.classList.add('is-bug');
          bug.setAttribute('data-fix', bugPlan.fixTo);
          ctx.play(api, bugPlan.shown, function() {
            if (api.dead) {
              return;
            }
            ctx.hint('Try again');
          });
          bug.addEventListener('click', function() {
            if (bug.getAttribute('data-fixed') === '1' || api.dead) {
              return;
            }
            bug.setAttribute('data-fixed', '1');
            bug.classList.remove('is-bug');
            bug.classList.add('is-fixed');
            ctx.fillSlot(bug, bugPlan.fixTo);
            var fixed = ctx.readSlots();
            ctx.play(api, fixed, function(ok) {
              if (api.dead) {
                return;
              }
              if (ok) {
                ctx.finish();
              } else {
                ctx.hint('Try again');
              }
            });
          });
        }
      }
    ];
  }

  function query(name) {
    var match = String(root.location && root.location.search || '').match(
        new RegExp('[?&]' + name + '=([^&]*)'));
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  }

  function boot() {
    if (!root.document || !root.document.getElementById('xpRoot') || !root.ThinkaPlayer) {
      return;
    }
    var band = query('band');
    if (band !== 'intermediate' && band !== 'senior') {
      band = 'foundation';
    }
    var week = root.THINKA_LESSONS && root.THINKA_LESSONS[0];
    var terms = week && week.bands && week.bands.senior && week.bands.senior.terms;
    root.ThinkaPlayer.start({
      scenes: scenes(band),
      band: band,
      fast: query('fast') === '1',
      stay: query('stay') === '1',
      terms: terms || []
    });
  }

  root.ThinkaSequence = {
    plans: PLANS,
    scenes: scenes
  };

  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
