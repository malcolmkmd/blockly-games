/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Class tiles, name tiles, two animal pictures, or a 4-digit PIN.
 * Only runs when Start Class is serving the page.
 */
(function() {
  if (window.__thinkaSigninStarted) {
    return;
  }
  window.__thinkaSigninStarted = true;
  if (!window.ThinkaClass || !ThinkaClass.server) {
    return;
  }

  var ANIMALS = [
    {id: 'lion', label: 'Lion', bg: '#F59E0B', fg: '#FDE68A', shape: 'mane'},
    {id: 'elephant', label: 'Elephant', bg: '#94A3B8', fg: '#E2E8F0', shape: 'trunk'},
    {id: 'zebra', label: 'Zebra', bg: '#F8FAFC', fg: '#111827', shape: 'stripe'},
    {id: 'giraffe', label: 'Giraffe', bg: '#FBBF24', fg: '#B45309', shape: 'spots'},
    {id: 'hippo', label: 'Hippo', bg: '#7DD3FC', fg: '#0369A1', shape: 'wide'},
    {id: 'monkey', label: 'Monkey', bg: '#D97706', fg: '#FDE68A', shape: 'ears'},
    {id: 'penguin', label: 'Penguin', bg: '#1E293B', fg: '#F8FAFC', shape: 'tux'},
    {id: 'frog', label: 'Frog', bg: '#4ADE80', fg: '#14532D', shape: 'eyes'},
    {id: 'owl', label: 'Owl', bg: '#C084FC', fg: '#F8FAFC', shape: 'eyes'},
    {id: 'butterfly', label: 'Butterfly', bg: '#F472B6', fg: '#7C3AED', shape: 'wings'},
    {id: 'fish', label: 'Fish', bg: '#60A5FA', fg: '#1D4ED8', shape: 'fish'},
    {id: 'bee', label: 'Bee', bg: '#FACC15', fg: '#111827', shape: 'bee'}
  ];

  var classes = [];
  var currentClass = null;
  var students = [];
  var student = null;
  var picks = [];
  var pin = '';
  var pending = null;
  var root = null;

  function animalById(id) {
    var i;
    for (i = 0; i < ANIMALS.length; i++) {
      if (ANIMALS[i].id === id) {
        return ANIMALS[i];
      }
    }
    return null;
  }

  function esc(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
  }

  function icon(animal) {
    if (!animal) {
      return '';
    }
    var bg = animal.bg;
    var fg = animal.fg;
    var extra = '';
    if (animal.shape === 'trunk') {
      extra = '<path d="M34 36c6 2 8 10 4 16" fill="none" stroke="' + fg + '" stroke-width="4" stroke-linecap="round"/>';
    } else if (animal.shape === 'stripe') {
      extra = '<path d="M16 20h32M16 32h32M16 44h32" stroke="' + fg + '" stroke-width="3"/>';
    } else if (animal.shape === 'spots') {
      extra = '<circle cx="24" cy="28" r="3" fill="' + fg + '"/><circle cx="38" cy="26" r="3" fill="' + fg + '"/><circle cx="30" cy="40" r="3" fill="' + fg + '"/>';
    } else if (animal.shape === 'ears') {
      extra = '<circle cx="14" cy="22" r="7" fill="' + fg + '"/><circle cx="50" cy="22" r="7" fill="' + fg + '"/>';
    } else if (animal.shape === 'tux') {
      extra = '<ellipse cx="32" cy="40" rx="10" ry="12" fill="' + fg + '"/>';
    } else if (animal.shape === 'eyes') {
      extra = '<circle cx="24" cy="30" r="7" fill="' + fg + '"/><circle cx="40" cy="30" r="7" fill="' + fg + '"/><circle cx="24" cy="30" r="3" fill="#030A03"/><circle cx="40" cy="30" r="3" fill="#030A03"/>';
    } else if (animal.shape === 'wings') {
      extra = '<ellipse cx="16" cy="32" rx="12" ry="8" fill="' + fg + '"/><ellipse cx="48" cy="32" rx="12" ry="8" fill="' + fg + '"/>';
    } else if (animal.shape === 'fish') {
      extra = '<polygon points="48,32 60,22 60,42" fill="' + fg + '"/>';
    } else if (animal.shape === 'bee') {
      extra = '<path d="M22 26h20M22 34h20M22 42h20" stroke="' + fg + '" stroke-width="3"/>';
    } else {
      extra = '<circle cx="32" cy="32" r="16" fill="none" stroke="' + fg + '" stroke-width="4"/>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="' + bg + '"/>' +
        extra + '<circle cx="26" cy="30" r="2.2" fill="#030A03"/><circle cx="38" cy="30" r="2.2" fill="#030A03"/></svg>';
  }

  function request(method, url, body, done) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      var data = null;
      if (xhr.readyState !== 4) {
        return;
      }
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = null;
      }
      done(xhr.status, data);
    };
    xhr.onerror = function() {
      done(0, null);
    };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  function ensureRoot() {
    root = document.getElementById('thinkaWho');
    if (root) {
      return root;
    }
    root = document.createElement('div');
    root.id = 'thinkaWho';
    document.body.appendChild(root);
    return root;
  }

  function showChip() {
    var session = ThinkaClass.session;
    var host = document.querySelector('.thinka-bar-tools') || document.querySelector('.thinka-bar');
    var bar = document.getElementById('thinkaStudentBar');
    document.documentElement.classList.remove('thinka-maybe-gate');
    if (!session) {
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'thinkaStudentBar';
      bar.className = 'who-bar';
      if (host) {
        host.appendChild(bar);
      } else {
        document.body.appendChild(bar);
      }
    }
    bar.innerHTML = '<span class="who-bar-name"></span>' +
        '<button type="button" class="who-switch" id="thinkaSwitch">Switch student</button>';
    bar.querySelector('.who-bar-name').textContent = session.displayName || session.firstName || '';
    document.getElementById('thinkaSwitch').addEventListener('click', function() {
      ThinkaClass.signOut();
    });
  }

  function paint() {
    var html = '';
    ensureRoot();
    if (!classes.length && !currentClass) {
      root.innerHTML = '<div class="who-top"><a class="who-logo" href="index.html">thinka<span>.</span></a></div>' +
          '<div class="who-empty"><strong>Ask your teacher</strong>Your class is not on this laptop yet.</div>';
      return;
    }
    html = '<div class="who-top"><a class="who-logo" href="index.html">thinka<span>.</span></a>';
    if (currentClass) {
      html += '<button type="button" class="who-back" id="whoBack">Back</button>';
    }
    html += '</div>';
    if (!currentClass) {
      html += '<h1 class="who-title">Your class</h1><div class="who-grid" id="whoClasses">';
      classes.forEach(function(record) {
        html += '<button type="button" class="who-tile" data-class="' + esc(record.id) + '">' +
            '<span class="who-grade">' + esc(record.grade) + '</span>' +
            esc(record.name) + '</button>';
      });
      html += '</div>';
    } else if (!student) {
      html += '<h1 class="who-title">' + esc(currentClass.name) + '</h1><div class="who-grid" id="whoNames">';
      students.forEach(function(person) {
        html += '<button type="button" class="who-tile" data-student="' + esc(person.id) + '">' +
            esc(person.firstName) +
            (person.surnameInitial ? '<small>' + esc(person.surnameInitial) + '</small>' : '') +
            '</button>';
      });
      if (!students.length) {
        html += '<p class="who-empty">No names yet.</p>';
      }
      html += '</div>';
    } else if (student.secretKind === 'pin') {
      html += '<h1 class="who-title">' + esc(pending && !student.hasSecret ? 'Again' : student.firstName) + '</h1>';
      html += '<div class="who-dots" id="whoDots">' + dots() + '</div>';
      html += '<div class="who-keys" id="whoKeys">';
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function(digit, index) {
        if (index === 9) {
          html += '<button type="button" class="who-key" data-key="back">⌫</button>';
        }
        html += '<button type="button" class="who-key" data-key="' + digit + '">' + digit + '</button>';
      });
      html += '</div><p class="who-error" id="whoError"></p>';
    } else {
      html += '<h1 class="who-title">' + esc(pending && !student.hasSecret ? 'Again' : student.firstName) + '</h1>';
      html += '<div class="who-picks">' + slot(0) + slot(1) + '</div>';
      html += '<div class="who-grid" id="whoAnimals">';
      ANIMALS.forEach(function(animal) {
        var on = picks.indexOf(animal.id) !== -1 && picks.length ? '' : '';
        if (picks[0] === animal.id || picks[1] === animal.id) {
          on = ' is-on';
        }
        html += '<button type="button" class="who-animal' + on + '" data-animal="' + animal.id + '">' +
            icon(animal) + '<small>' + esc(animal.label) + '</small></button>';
      });
      html += '</div><button type="button" class="who-ok" id="whoOk"' +
          (picks.length === 2 ? '' : ' disabled') + '>OK</button>';
      html += '<p class="who-error" id="whoError"></p>';
    }
    root.innerHTML = html;
    bind();
  }

  function slot(index) {
    var animal = picks[index] ? animalById(picks[index]) : null;
    return '<div class="who-slot">' + (animal ? icon(animal) : '') + '</div>';
  }

  function dots() {
    var text = '';
    var i;
    for (i = 0; i < 4; i++) {
      text += i < pin.length ? '●' : '○';
    }
    return text;
  }

  function bind() {
    var back = document.getElementById('whoBack');
    if (back) {
      back.addEventListener('click', function() {
        if (student) {
          student = null;
          picks = [];
          pin = '';
          pending = null;
          paint();
          return;
        }
        currentClass = null;
        paint();
      });
    }
    root.querySelectorAll('[data-class]').forEach(function(button) {
      button.addEventListener('click', function() {
        openClass(button.getAttribute('data-class'));
      });
    });
    root.querySelectorAll('[data-student]').forEach(function(button) {
      button.addEventListener('click', function() {
        chooseStudent(button.getAttribute('data-student'));
      });
    });
    root.querySelectorAll('[data-animal]').forEach(function(button) {
      button.addEventListener('click', function() {
        tapAnimal(button.getAttribute('data-animal'));
      });
    });
    var ok = document.getElementById('whoOk');
    if (ok) {
      ok.addEventListener('click', submitPicture);
    }
    root.querySelectorAll('[data-key]').forEach(function(button) {
      button.addEventListener('click', function() {
        tapKey(button.getAttribute('data-key'));
      });
    });
  }

  function openClass(id) {
    var i;
    for (i = 0; i < classes.length; i++) {
      if (classes[i].id === id) {
        currentClass = classes[i];
      }
    }
    request('GET', '/class/api/classes/' + encodeURIComponent(id) + '/students', null, function(status, data) {
      students = data && data.students ? data.students : [];
      student = null;
      paint();
    });
  }

  function chooseStudent(id) {
    var i;
    student = null;
    for (i = 0; i < students.length; i++) {
      if (students[i].id === id) {
        student = students[i];
      }
    }
    picks = [];
    pin = '';
    pending = null;
    if (!student) {
      return;
    }
    if (!student.secretKind) {
      submitSecret({});
      return;
    }
    paint();
  }

  function tapAnimal(id) {
    var error = document.getElementById('whoError');
    if (error) {
      error.textContent = '';
    }
    if (picks.length >= 2) {
      picks = [id];
    } else {
      picks.push(id);
    }
    paint();
  }

  function samePicks(a, b) {
    return a && b && a.length === 2 && b.length === 2 && a[0] === b[0] && a[1] === b[1];
  }

  function submitPicture() {
    if (picks.length !== 2 || !student) {
      return;
    }
    if (!student.hasSecret) {
      if (!pending) {
        pending = picks.slice();
        picks = [];
        paint();
        return;
      }
      if (!samePicks(pending, picks)) {
        pending = null;
        picks = [];
        paint();
        var error = document.getElementById('whoError');
        if (error) {
          error.textContent = 'Try again';
          root.classList.add('who-shake');
        }
        return;
      }
    }
    submitSecret({picture: (pending || picks).slice()});
  }

  function tapKey(key) {
    if (key === 'back') {
      pin = pin.slice(0, -1);
      paint();
      return;
    }
    if (pin.length >= 4) {
      return;
    }
    pin += key;
    paint();
    if (pin.length === 4) {
      submitPin();
    }
  }

  function submitPin() {
    if (pin.length !== 4 || !student) {
      return;
    }
    if (!student.hasSecret) {
      if (!pending) {
        pending = pin;
        pin = '';
        paint();
        return;
      }
      if (pending !== pin) {
        pending = null;
        pin = '';
        paint();
        var error = document.getElementById('whoError');
        if (error) {
          error.textContent = 'Try again';
        }
        return;
      }
    }
    submitSecret({pin: pending || pin});
  }

  function submitSecret(extra) {
    var body = {
      classId: currentClass.id,
      studentId: student.id
    };
    if (extra.picture) {
      body.picture = extra.picture;
    }
    if (extra.pin) {
      body.pin = extra.pin;
    }
    request('POST', '/class/api/signin', body, function(status, data) {
      var error;
      if (!data) {
        paint();
        error = document.getElementById('whoError');
        if (error) {
          error.textContent = 'Try again';
        }
        return;
      }
      if (data.needsSecret) {
        student.hasSecret = false;
        student.secretKind = data.secretKind;
        pending = null;
        picks = [];
        pin = '';
        paint();
        return;
      }
      if (!data.ok) {
        picks = [];
        pin = '';
        pending = null;
        paint();
        error = document.getElementById('whoError');
        if (error) {
          error.textContent = 'Try again';
        }
        root.classList.add('who-shake');
        return;
      }
      try {
        localStorage.setItem('thinkaStudentSession', JSON.stringify({
          token: data.token,
          studentId: data.student.id,
          classId: data.student.classId,
          className: data.student.className,
          grade: data.student.grade,
          displayName: data.student.displayName,
          firstName: data.student.firstName
        }));
      } catch (e) {
        return;
      }
      location.reload();
    });
  }

  function loadClasses() {
    request('GET', '/class/api/classes', null, function(status, data) {
      classes = data && data.classes ? data.classes : [];
      if (classes.length === 1) {
        openClass(classes[0].id);
        return;
      }
      paint();
    });
  }

  function start() {
    if (ThinkaClass.session) {
      showChip();
      return;
    }
    loadClasses();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
