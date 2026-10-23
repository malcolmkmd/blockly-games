/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Teacher roster. The page is behind the same teacher password as
 * teacher.html. The roster itself is stored by Start Class.
 */
'use strict';

(function() {
  var gate = document.getElementById('classGate');
  var app = document.getElementById('classApp');
  var classes = [];
  var selected = null;
  var students = [];

  function esc(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
  }

  function request(method, url, body, done) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (body != null && !(body instanceof ArrayBuffer)) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.onreadystatechange = function() {
      var data = null;
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status === 0) {
        done(0, null, '');
        return;
      }
      var type = xhr.getResponseHeader('Content-Type') || '';
      if (type.indexOf('application/json') === 0) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = null;
        }
        done(xhr.status, data, xhr.responseText);
        return;
      }
      done(xhr.status, null, xhr.responseText);
    };
    xhr.onerror = function() {
      done(0, null, '');
    };
    if (body == null) {
      xhr.send(null);
    } else if (typeof body === 'string') {
      xhr.send(body);
    } else {
      xhr.send(JSON.stringify(body));
    }
  }

  function offline(isOff) {
    document.getElementById('classOffline').hidden = !isOff;
    document.getElementById('createCard').hidden = !!isOff;
  }

  function loadClasses(then) {
    request('GET', '/class/api/classes', null, function(status, data) {
      if (!status) {
        offline(true);
        return;
      }
      offline(false);
      classes = data && data.classes ? data.classes : [];
      paintClasses();
      if (then) then();
    });
  }

  function paintClasses() {
    var host = document.getElementById('classList');
    host.innerHTML = '';
    classes.forEach(function(record) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'class-pick' + (selected && selected.id === record.id ? ' is-on' : '');
      button.textContent = record.name + ' · Gr ' + record.grade;
      button.addEventListener('click', function() {
        selected = record;
        paintClasses();
        loadStudents();
        loadReport();
      });
      host.appendChild(button);
    });
    document.getElementById('rosterCard').hidden = !selected;
    document.getElementById('progressCard').hidden = !selected;
    if (selected) {
      document.getElementById('rosterTitle').textContent = selected.name;
    }
  }

  function loadStudents() {
    if (!selected) return;
    request('GET', '/class/api/classes/' + encodeURIComponent(selected.id) + '/students', null, function(status, data) {
      students = data && data.students ? data.students : [];
      paintStudents();
    });
  }

  function paintStudents() {
    var body = document.querySelector('#studentTable tbody');
    body.innerHTML = '';
    students.forEach(function(student) {
      var tr = document.createElement('tr');
      var secret = 'Tap name';
      if (student.secretKind === 'picture') {
        secret = student.hasSecret ? 'Animals set' : 'Animals not set';
      } else if (student.secretKind === 'pin') {
        secret = student.hasSecret ? 'PIN set' : 'PIN not set';
      }
      tr.innerHTML = '<td></td><td>' + esc(secret) + '</td><td></td>';
      tr.children[0].textContent = student.displayName;
      var actions = tr.children[2];
      actions.className = 'class-actions';
      var move = document.createElement('select');
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Move to…';
      move.appendChild(blank);
      classes.forEach(function(record) {
        if (record.id === selected.id) return;
        var opt = document.createElement('option');
        opt.value = record.id;
        opt.textContent = record.name;
        move.appendChild(opt);
      });
      move.addEventListener('change', function() {
        if (!move.value) return;
        request('POST', '/class/api/students/' + student.id + '/move', {classId: move.value}, function() {
          loadClasses(function() {
            loadStudents();
            loadReport();
          });
        });
      });
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'secondary';
      reset.textContent = 'Reset secret';
      reset.addEventListener('click', function() {
        if (!window.confirm('Let ' + student.displayName + ' choose a new password?')) return;
        request('POST', '/class/api/students/' + student.id + '/reset-secret', {}, function() {
          loadStudents();
        });
      });
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = 'Remove';
      remove.addEventListener('click', function() {
        if (!window.confirm('Remove ' + student.displayName + ' from this class?')) return;
        request('POST', '/class/api/students/' + student.id + '/remove', {}, function() {
          loadStudents();
          loadReport();
          loadClasses();
        });
      });
      actions.appendChild(move);
      actions.appendChild(reset);
      actions.appendChild(remove);
      body.appendChild(tr);
    });
  }

  function loadReport() {
    if (!selected) return;
    request('GET', '/class/api/classes/' + encodeURIComponent(selected.id) + '/report', null, function(status, data) {
      var table = document.getElementById('progressTable');
      if (!data || !data.games) {
        table.innerHTML = '';
        return;
      }
      var html = '<thead><tr><th>Student</th>';
      data.games.forEach(function(game) {
        html += '<th>' + esc(game.label) + '</th>';
      });
      html += '<th>Week 1 explainer</th><th>Week 1 exercise</th></tr></thead><tbody>';
      (data.students || []).forEach(function(student) {
        html += '<tr><td>' + esc(student.displayName) + '</td>';
        data.games.forEach(function(game) {
          var done = student.games[game.id] || 0;
          html += '<td>' + done + '/' + game.total + '</td>';
        });
        var lessons = student.lessons || {};
        html += '<td>' + (lessons.w1_explainer ? 'Yes' : '') + '</td>';
        html += '<td>' + (lessons.w1_exercise ? 'Yes' : '') + '</td></tr>';
      });
      html += '</tbody>';
      table.innerHTML = html;
    });
  }

  function saveBlob(filename, text, type) {
    var blob = new Blob([text], {type: type});
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('gateForm').addEventListener('submit', function(event) {
    event.preventDefault();
    var input = document.getElementById('currentPassword');
    var error = document.getElementById('gateError');
    if (ThinkaConfig.checkTeacherPassword(input.value)) {
      error.textContent = '';
      showApp();
      return;
    }
    error.textContent = 'That password is not correct. Try again.';
    input.value = '';
    input.focus();
  });

  function showApp() {
    gate.hidden = true;
    app.hidden = false;
    loadClasses();
  }

  document.getElementById('createForm').addEventListener('submit', function(event) {
    event.preventDefault();
    var error = document.getElementById('createError');
    request('POST', '/class/api/classes', {
      name: document.getElementById('className').value,
      grade: document.getElementById('classGrade').value,
      pinRequired: document.getElementById('classPin').checked
    }, function(status, data) {
      if (!data || !data.ok) {
        error.textContent = data && data.error ? data.error : 'Could not save the class.';
        return;
      }
      error.textContent = '';
      document.getElementById('className').value = '';
      selected = data['class'];
      loadClasses(function() {
        loadStudents();
        loadReport();
      });
    });
  });

  document.getElementById('addForm').addEventListener('submit', function(event) {
    event.preventDefault();
    if (!selected) return;
    var error = document.getElementById('addError');
    request('POST', '/class/api/classes/' + selected.id + '/students', {
      firstName: document.getElementById('firstName').value,
      surnameInitial: document.getElementById('surnameInitial').value
    }, function(status, data) {
      if (!data || !data.ok) {
        error.textContent = data && data.error ? data.error : 'Could not add that student.';
        return;
      }
      error.textContent = '';
      document.getElementById('firstName').value = '';
      document.getElementById('surnameInitial').value = '';
      loadStudents();
      loadClasses();
    });
  });

  document.getElementById('importForm').addEventListener('submit', function(event) {
    event.preventDefault();
    if (!selected) return;
    var note = document.getElementById('importNote');
    request('POST', '/class/api/classes/' + selected.id + '/students/import', {
      csv: document.getElementById('csvText').value
    }, function(status, data) {
      if (!data || !data.ok) {
        note.textContent = data && data.error ? data.error : 'Could not import.';
        return;
      }
      note.textContent = 'Added ' + data.added.length + (data.errors.length ? '. Some lines were skipped.' : '.');
      document.getElementById('csvText').value = '';
      loadStudents();
      loadClasses();
    });
  });

  document.getElementById('csvFile').addEventListener('change', function(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      document.getElementById('csvText').value = String(reader.result || '');
    };
    reader.readAsText(file);
  });

  document.getElementById('exportCsv').addEventListener('click', function() {
    if (!selected) return;
    request('GET', '/class/api/export.csv?classId=' + encodeURIComponent(selected.id), null, function(status, data, text) {
      if (!status) return;
      saveBlob('thinka-progress.csv', text, 'text/csv');
    });
  });

  document.getElementById('downloadBackup').addEventListener('click', function() {
    request('GET', '/class/api/backup', null, function(status, data, text) {
      if (!status) return;
      saveBlob('thinka-class-backup.json', text, 'application/json');
      document.getElementById('fileNote').textContent = 'Backup downloaded. Copy it to a USB stick.';
    });
  });

  document.getElementById('restoreFile').addEventListener('change', function(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!window.confirm('Replace the class roster on this laptop with this backup?')) {
      event.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      request('POST', '/class/api/restore', String(reader.result || ''), function(status, data) {
        var note = document.getElementById('fileNote');
        if (!data || !data.ok) {
          note.textContent = data && data.error ? data.error : 'Could not restore that file.';
          return;
        }
        note.textContent = 'Restored ' + data.classes + ' classes and ' + data.students + ' students.';
        selected = null;
        loadClasses();
      });
    };
    reader.readAsText(file);
  });

  if (ThinkaConfig.isTeacherPasswordOn()) {
    gate.hidden = false;
    app.hidden = true;
  } else {
    showApp();
  }
})();
