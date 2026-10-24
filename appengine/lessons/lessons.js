/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
(function() {
  var BANDS = ['foundation', 'intermediate', 'senior'];

  function $(id) {
    return document.getElementById(id);
  }

  function resolvedBand() {
    if (window.ThinkaLessons) {
      return ThinkaLessons.resolveBand();
    }
    return {band: 'foundation', source: 'default'};
  }

  function levelsFor(band) {
    if (band === 'senior') {
      return 3;
    }
    if (band === 'intermediate') {
      return 2;
    }
    return 1;
  }

  function markExercise(band) {
    var need = levelsFor(band);
    var i;
    try {
      for (i = 1; i <= need; i++) {
        if (!window.localStorage.getItem('maze_g1_sequence' + i)) {
          return;
        }
      }
      if (window.localStorage.getItem('thinkaLesson_w1_exercise') !== '1') {
        window.localStorage.setItem('thinkaLesson_w1_exercise', '1');
      }
    } catch (err) {
      // Ignore storage failures. The page still lists the lesson.
    }
  }

  function flag(key) {
    try {
      return window.localStorage.getItem(key) === '1';
    } catch (err) {
      return false;
    }
  }

  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function partChips(parts) {
    var html = '<ul class="lesson-parts">';
    var i;
    for (i = 0; i < parts.length; i++) {
      html += '<li>' + parts[i].label + ' ' + parts[i].minutes + '</li>';
    }
    html += '</ul>';
    return html;
  }

  function renderSoon(list) {
    var html = '';
    var i;
    for (i = 0; i < list.length; i++) {
      var lesson = list[i];
      html += '<article class="lesson-card is-soon">' +
          '<div class="lesson-week"><h2>Week ' + lesson.week + '</h2>' +
          '<span class="lesson-badge">Coming soon</span></div>' +
          '<p>' + lesson.concept + '</p>' +
          partChips(lesson.parts) +
          '</article>';
    }
    $('lessonSoon').innerHTML = html;
  }

  function exerciseLink(href, lesson, band, levels) {
    if (window.ThinkaLessons) {
      return ThinkaLessons.exerciseUrl(href, lesson.week, band, levels);
    }
    return href;
  }

  function renderReady(lesson, band, compact) {
    var info = lesson.bands[band];
    var bandControl = '';
    var name;
    var exerciseHref = exerciseLink(info.exerciseHref, lesson, band, info.levels);
    var earlyHref = exerciseLink(info.earlyHref, lesson, band, info.levels);
    if (compact) {
      bandControl = '<label class="lesson-band-chip">Band <select id="bandSelect" aria-label="Age band">';
      for (name = 0; name < BANDS.length; name++) {
        var id = BANDS[name];
        var item = lesson.bands[id];
        if (!item) {
          continue;
        }
        bandControl += '<option value="' + id + '"' + (id === band ? ' selected' : '') + '>' +
            item.label + '</option>';
      }
      bandControl += '</select></label>';
    } else {
      bandControl = '<div class="lesson-bands" id="bandPicker">';
      for (name = 0; name < BANDS.length; name++) {
        var pick = BANDS[name];
        var choice = lesson.bands[pick];
        if (!choice) {
          continue;
        }
        bandControl += '<button type="button" class="band-pick' + (pick === band ? ' is-on' : '') +
            '" data-band="' + pick + '">' + choice.label + '<small>' + choice.grades + '</small></button>';
      }
      bandControl += '</div>';
    }
    var note = info.exerciseNote ? '<p class="lesson-note" id="exerciseNote">' + info.exerciseNote + '</p>' : '<p class="lesson-note" id="exerciseNote"></p>';
    $('lessonReady').innerHTML =
        '<article class="lesson-card is-ready" id="week1">' +
          '<div class="lesson-week"><h2>Week ' + lesson.week + ' · ' + lesson.concept + '</h2>' +
          '<span class="lesson-badge">' + lesson.minutes + ' min</span></div>' +
          '<div class="lesson-status">' +
            '<span id="statusExplainer"' + (flag('thinkaLesson_w1_explainer') ? ' class="is-on"' : '') + '>Explainer</span>' +
            '<span id="statusExercise"' + (flag('thinkaLesson_w1_exercise') ? ' class="is-on"' : '') + '>Exercise</span>' +
          '</div>' +
          partChips(lesson.parts) +
          bandControl +
          '<div class="lesson-actions">' +
            '<a class="lesson-go" id="startExplainer" href="lesson-play.html?week=' + lesson.week + '&amp;band=' + band + '">Start</a>' +
            '<a class="lesson-go" id="startExercise" href="' + esc(exerciseHref) + '">Start exercise</a>' +
            '<a class="lesson-soft" id="startEarly" href="' + esc(earlyHref) + '">Early finishers</a>' +
            '<button type="button" class="lesson-soft" id="teacherNotes">Teacher notes</button>' +
          '</div>' +
          '<p class="lesson-note" id="exerciseLabel">' + info.exerciseLabel + '</p>' +
          note +
        '</article>';
    if (compact) {
      $('bandSelect').addEventListener('change', function() {
        var next = $('bandSelect').value;
        if (window.ThinkaLessons) {
          ThinkaLessons.rememberBand(next);
        }
        renderReady(lesson, next, true);
      });
    } else {
      var picks = document.querySelectorAll('.band-pick');
      var i;
      for (i = 0; i < picks.length; i++) {
        picks[i].addEventListener('click', function(ev) {
          var next = ev.currentTarget.getAttribute('data-band');
          if (window.ThinkaLessons) {
            ThinkaLessons.rememberBand(next);
          }
          renderReady(lesson, next, true);
        });
      }
    }
    $('teacherNotes').addEventListener('click', function() {
      openNotes(lesson.teacherNotes || []);
    });
  }

  function showNotes(notes) {
    var list = $('notesList');
    list.innerHTML = '';
    var i;
    for (i = 0; i < notes.length; i++) {
      var li = document.createElement('li');
      li.textContent = notes[i];
      list.appendChild(li);
    }
    $('notesGate').hidden = true;
    list.hidden = false;
  }

  function openNotes(notes) {
    var panel = $('teacherNotesPanel');
    panel.hidden = false;
    if (!window.ThinkaConfig || !ThinkaConfig.isTeacherPasswordOn()) {
      showNotes(notes);
      return;
    }
    $('notesGate').hidden = false;
    $('notesList').hidden = true;
    $('notesGate').onsubmit = function(ev) {
      ev.preventDefault();
      var value = $('notesPassword').value;
      if (ThinkaConfig.checkTeacherPassword(value)) {
        $('notesError').textContent = '';
        showNotes(notes);
      } else {
        $('notesError').textContent = 'Try again';
      }
    };
  }

  function render() {
    var lessons = window.THINKA_LESSONS || [];
    var ready = null;
    var soon = [];
    var i;
    for (i = 0; i < lessons.length; i++) {
      if (lessons[i].ready) {
        ready = lessons[i];
      } else {
        soon.push(lessons[i]);
      }
    }
    var resolved = resolvedBand();
    markExercise(resolved.band);
    if (ready) {
      renderReady(ready, resolved.band, resolved.source !== 'default');
    }
    renderSoon(soon);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
