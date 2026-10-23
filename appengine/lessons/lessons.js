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

  function savedBand() {
    try {
      var saved = sessionStorage.getItem('thinkaLessonBand');
      if (BANDS.indexOf(saved) !== -1) {
        return saved;
      }
    } catch (err) {
      // sessionStorage can throw in a locked browser.
    }
    var session = window.ThinkaClass && ThinkaClass.session;
    var grade = session && Number(session.grade);
    if (grade >= 7) {
      return 'senior';
    }
    if (grade >= 4) {
      return 'intermediate';
    }
    return 'foundation';
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

  function renderReady(lesson, band) {
    var info = lesson.bands[band];
    var buttons = '';
    var name;
    for (name in lesson.bands) {
      if (!Object.prototype.hasOwnProperty.call(lesson.bands, name)) {
        continue;
      }
      var item = lesson.bands[name];
      buttons += '<button type="button" class="band-pick' + (name === band ? ' is-on' : '') +
          '" data-band="' + name + '">' + item.label + '<small>' + item.grades + '</small></button>';
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
          '<div class="lesson-bands" id="bandPicker">' + buttons + '</div>' +
          '<div class="lesson-actions">' +
            '<a class="lesson-go" id="startExplainer" href="lesson-play.html?week=1&amp;band=' + band + '">Start explainer</a>' +
            '<a class="lesson-go" id="startExercise" href="' + esc(info.exerciseHref) + '">Start exercise</a>' +
            '<a class="lesson-soft" id="startEarly" href="' + esc(info.earlyHref) + '">Early finishers</a>' +
            '<button type="button" class="lesson-soft" id="teacherNotes">Teacher notes</button>' +
          '</div>' +
          '<p class="lesson-note" id="exerciseLabel">' + info.exerciseLabel + '</p>' +
          note +
        '</article>';
    var picks = document.querySelectorAll('.band-pick');
    var i;
    for (i = 0; i < picks.length; i++) {
      picks[i].addEventListener('click', function(ev) {
        var next = ev.currentTarget.getAttribute('data-band');
        try {
          sessionStorage.setItem('thinkaLessonBand', next);
        } catch (err) {}
        renderReady(lesson, next);
      });
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
    var band = savedBand();
    markExercise(band);
    if (ready) {
      renderReady(ready, band);
    }
    renderSoon(soon);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
