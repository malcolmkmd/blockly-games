/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Ten-week term. Only week 1 has a player. Add a later week by setting
 * ready: true and pointing player at a scene module.
 *
 * ThinkaLessons is the shared band and exercise-link helper. The explainer
 * player, the lessons page, and the hub all use it so a later week inherits
 * the same hand-off into its exercise.
 */
(function(root) {
  var BANDS = ['foundation', 'intermediate', 'senior'];
  var BAND_KEY = 'thinkaLessonBand';
  var PARTS = [
    {id: 'hook', minutes: 2, label: 'Hook'},
    {id: 'explainer', minutes: 5, label: 'Explainer'},
    {id: 'exercise', minutes: 10, label: 'Exercise'},
    {id: 'share', minutes: 3, label: 'Share'}
  ];

  function soon(week, concept) {
    return {
      week: week,
      concept: concept,
      ready: false,
      minutes: 20,
      parts: PARTS
    };
  }

  root.THINKA_LESSONS = [
    {
      week: 1,
      concept: 'Sequencing',
      ready: true,
      player: 'sequence',
      minutes: 20,
      parts: PARTS,
      bands: {
        foundation: {
          label: 'Foundation',
          grades: 'Gr 1–3',
          exerciseHref: 'maze.html?stage=1&unit=sequence&level=1',
          exerciseLabel: 'Maze 1',
          exerciseNote: 'In pairs',
          earlyHref: 'maze.html?stage=1&unit=sequence&level=2',
          earlyLabel: 'Next mazes',
          levels: 1
        },
        intermediate: {
          label: 'Intermediate',
          grades: 'Gr 4–6',
          exerciseHref: 'maze.html?stage=1&unit=sequence&level=1',
          exerciseLabel: 'Maze 1–2',
          earlyHref: 'maze.html?stage=1&unit=sequence&level=3',
          earlyLabel: 'Next mazes',
          levels: 2
        },
        senior: {
          label: 'Senior',
          grades: 'Gr 7–9',
          exerciseHref: 'maze.html?stage=1&unit=sequence&level=1',
          exerciseLabel: 'Maze 1–3',
          earlyHref: 'maze.html?stage=1&unit=sequence&level=4',
          earlyLabel: 'Next mazes',
          levels: 3,
          terms: [
            {word: 'sequence', meaning: 'Steps in order'},
            {word: 'algorithm', meaning: 'Steps that solve it'}
          ]
        }
      },
      teacherNotes: [
        'Hook (2 min): Show the robot unplugged. Ask who tells it what to do.',
        'Explainer (5 min): Play the five scenes. The last scene opens the maze on its own. Foundation uses fewer, bigger steps. Senior pauses on the words sequence and algorithm.',
        'Exercise (10 min): Foundation pairs play Maze level 1. Intermediate plays levels 1–2. Senior plays levels 1–3.',
        'Share (3 min): One pair shows their steps. Ask what happens if the order changes.',
        'Early finishers continue to the next Maze levels in Sequencing.'
      ]
    },
    soon(2, 'Algorithms'),
    soon(3, 'Loops'),
    soon(4, 'Events'),
    soon(5, 'Conditionals'),
    soon(6, 'Debugging'),
    soon(7, 'Variables'),
    soon(8, 'Functions'),
    soon(9, 'Sensors and robots'),
    soon(10, 'How computers work and internet safety')
  ];

  function memory(kind) {
    try {
      var store = root[kind];
      if (store && store.getItem && store.setItem) {
        return store;
      }
    } catch (err) {
      // Private mode and some locked browsers throw on storage.
    }
    return null;
  }

  function normalizeBand(value) {
    if (BANDS.indexOf(value) !== -1) {
      return value;
    }
    return '';
  }

  function bandForGrade(grade) {
    var number = Number(grade);
    if (!(number >= 1)) {
      return '';
    }
    if (number >= 7) {
      return 'senior';
    }
    if (number >= 4) {
      return 'intermediate';
    }
    return 'foundation';
  }

  function readBand() {
    var local = memory('localStorage');
    var saved = local && normalizeBand(local.getItem(BAND_KEY));
    if (saved) {
      return saved;
    }
    var session = memory('sessionStorage');
    return (session && normalizeBand(session.getItem(BAND_KEY))) || '';
  }

  function rememberBand(band) {
    var name = normalizeBand(band);
    var local;
    var session;
    if (!name) {
      return;
    }
    local = memory('localStorage');
    if (local) {
      try {
        local.setItem(BAND_KEY, name);
      } catch (err) {
        // Ignore quota errors. The page still uses the band for this visit.
      }
    }
    session = memory('sessionStorage');
    if (session) {
      try {
        session.setItem(BAND_KEY, name);
      } catch (err2) {
        // sessionStorage is optional. localStorage is the returning copy.
      }
    }
  }

  function resolveBand() {
    var session = root.ThinkaClass && root.ThinkaClass.session;
    var fromGrade = bandForGrade(session && session.grade);
    var saved;
    if (fromGrade) {
      return {band: fromGrade, source: 'grade'};
    }
    saved = readBand();
    if (saved) {
      return {band: saved, source: 'saved'};
    }
    return {band: 'foundation', source: 'default'};
  }

  function exerciseUrl(href, week, band, levels) {
    var weekNum;
    var count;
    var name;
    var extra;
    href = String(href || '');
    if (!href || href.indexOf('lesson=') !== -1) {
      return href;
    }
    weekNum = Number(week);
    if (!(weekNum >= 1)) {
      weekNum = 1;
    }
    count = Number(levels);
    if (!(count >= 1)) {
      count = 1;
    }
    name = normalizeBand(band) || 'foundation';
    extra = 'lesson=' + weekNum + '&band=' + encodeURIComponent(name) +
        '&lessonLevels=' + count;
    return href + (href.indexOf('?') === -1 ? '?' : '&') + extra;
  }

  function progressKey(week, part) {
    var weekNum = Number(week);
    if (!(weekNum >= 1)) {
      weekNum = 1;
    }
    return 'thinkaLesson_w' + weekNum + '_' + (part || 'explainer');
  }

  root.ThinkaLessons = {
    bandForGrade: bandForGrade,
    resolveBand: resolveBand,
    rememberBand: rememberBand,
    exerciseUrl: exerciseUrl,
    progressKey: progressKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
