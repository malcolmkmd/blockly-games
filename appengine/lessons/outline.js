/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Ten-week term. Only week 1 has a player. Add a later week by setting
 * ready: true and pointing player at a scene module.
 */
(function(root) {
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
        'Explainer (5 min): Play the five scenes. Foundation uses fewer, bigger steps. Senior pauses on the words sequence and algorithm.',
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
})(typeof window !== 'undefined' ? window : globalThis);
