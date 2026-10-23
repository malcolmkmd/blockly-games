/**
 * Thinka Race client. The teacher server owns positions; this page
 * draws them and sends keystrokes.
 */
'use strict';

(function() {
  var app = document.getElementById('app');
  var socket = null;
  var state = null;
  var errorText = '';
  var nameDraft = '';
  var urls = [];
  var offline = false;
  var seenLine = null;
  var lineFlashUntil = 0;

  var pending = null;

  function wants(name) {
    return new RegExp('[?&]' + name + '=1(?:&|$)').test(location.search);
  }

  function isLocalHost() {
    var host = String(location.hostname || '').replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  // The launcher opens this laptop as the host. A join address is any other
  // computer, or this one with ?join=1.
  var teacherSeat = location.protocol !== 'file:' &&
      (wants('host') || (isLocalHost() && !wants('join')));

  function esc(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
  }

  function send(message) {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
      pending = null;
    } else {
      pending = message;
    }
  }

  function connect() {
    var proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    try {
      socket = new WebSocket(proto + location.host + '/race/ws');
    } catch (err) {
      offline = true;
      render();
      return;
    }
    socket.addEventListener('open', function() {
      offline = false;
      if (teacherSeat) {
        send({type: 'host'});
      } else if (pending) {
        send(pending);
      }
      render();
    });
    socket.addEventListener('message', function(event) {
      var message = JSON.parse(event.data);
      if (message.type === 'error') {
        errorText = message.message;
      } else if (message.type === 'state') {
        state = message;
        if (message.you) {
          errorText = '';
        }
      }
      render();
    });
    socket.addEventListener('close', function() {
      offline = true;
      render();
    });
  }

  function loadUrls() {
    fetch('/race/info').then(function(response) {
      return response.json();
    }).then(function(info) {
      urls = info.urls || [];
      render();
    }).catch(function() {
      urls = [];
    });
  }

  function me() {
    if (!state || !state.yourId) {
      return null;
    }
    var players = state.players || [];
    for (var i = 0; i < players.length; i++) {
      if (players[i].id === state.yourId) {
        return players[i];
      }
    }
    return null;
  }

  function promptHtml(line, pos) {
    var unit = line.charAt(line.length - 1) === ' ' ? line : line + ' ';
    var at = pos % unit.length;
    var shown = '';
    for (var i = 0; i < 22; i++) {
      var ch = unit.charAt((at + i) % unit.length);
      if (ch === ' ') {
        ch = '\u00a0';
      }
      shown += i === 0 ? '<b>' + esc(ch) + '</b>' : esc(ch);
    }
    return shown;
  }

  function carSvg(color, left) {
    var paint = esc(color);
    return '<svg class="race-car" style="left:' + left +
        '%" viewBox="0 0 72 40" aria-hidden="true">' +
        '<rect x="6" y="16" width="58" height="14" rx="4" fill="' + paint + '"/>' +
        '<path d="M18 16 L28 6 H48 L56 16 Z" fill="' + paint + '"/>' +
        '<path d="M30 8 H46 L52 15 H26 Z" fill="#F8FAFC"/>' +
        '<circle cx="62" cy="20" r="2.5" fill="#FACC15"/>' +
        '<circle cx="20" cy="30" r="6" fill="#030A03"/>' +
        '<circle cx="52" cy="30" r="6" fill="#030A03"/>' +
        '<circle cx="20" cy="30" r="2.5" fill="#94A3B8"/>' +
        '<circle cx="52" cy="30" r="2.5" fill="#94A3B8"/>' +
        '</svg>';
  }

  function lanes(players) {
    var leader = 1;
    players.forEach(function(player) {
      if (player.pos > leader) {
        leader = player.pos;
      }
    });
    var scale = Math.max(leader, 24);
    return '<div class="race-lanes">' + players.map(function(player) {
      var left = Math.max(6, Math.min(94, (player.pos / scale) * 88 + 6));
      var badges = player.bot ? 'computer' : '';
      if (player.speed) {
        badges += (badges ? ' · ' : '') + 'x2';
      }
      if (player.shield) {
        badges += (badges ? ' · ' : '') + 'shield';
      }
      var mine = state && player.id === state.yourId;
      return '<div class="race-lane' + (player.connected ? '' : ' race-gone') +
          (mine ? ' race-lane--me' : '') + '">' +
          '<div class="race-who"><i class="race-swatch" style="background:' +
          esc(player.color) + '"></i> ' + esc(player.name) + '</div>' +
          '<div class="race-track">' + carSvg(player.color, left) + '</div>' +
          '<div class="race-meta">' + player.pos +
          (badges ? '<span>' + esc(badges) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function podium(players) {
    var top = players.slice(0, 3);
    var order = [top[1], top[0], top[2]];
    var html = '<div class="race-podium">';
    order.forEach(function(player) {
      if (!player) {
        return;
      }
      html += '<div class="race-place race-place--' + player.place + '">' +
          '<span>' + player.place + '</span><strong>' + esc(player.name) +
          '</strong><span>' + player.pos + '</span></div>';
    });
    html += '</div>';
    if (players.length > 3) {
      html += '<ol class="race-rest">';
      players.slice(3).forEach(function(player) {
        html += '<li>' + player.place + '. ' + esc(player.name) + ' · ' +
            player.pos + '</li>';
      });
      html += '</ol>';
    }
    return html;
  }

  function rulesLine() {
    var rules = (state && state.rules) || {};
    return 'Five correct letters in a row count double. Ten earn a shield. ' +
        'Three wrong letters in a row move you back ' + (rules.knockBy || 3) + '.';
  }

  function osIcon(kind) {
    if (kind === 'mac') {
      return '<svg class="race-os" viewBox="0 0 48 48" aria-hidden="true">' +
          '<rect x="8" y="10" width="32" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
          '<path d="M16 38h16M24 32v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
          '</svg>';
    }
    return '<svg class="race-os" viewBox="0 0 48 48" aria-hidden="true">' +
        '<rect x="6" y="8" width="36" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.4"/>' +
        '<path d="M18 40h12M24 34v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M24 14v10M19 19h10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
        '</svg>';
  }

  function stepCard(kind, title, steps) {
    var items = steps.map(function(step) {
      return '<li>' + step + '</li>';
    }).join('');
    return '<section class="race-step"><h2>' + osIcon(kind) + esc(title) +
        '</h2><ol>' + items + '</ol></section>';
  }

  function setupHtml() {
    return '<div class="race-gate race-setup" id="raceSetup">' +
        '<a class="race-logo" href="index.html">thinka<span>.</span></a>' +
        '<h1>Host a class race</h1>' +
        '<p class="race-lead">To host a class, close this page and double-click <strong>Start Class</strong> in the Thinka folder.</p>' +
        '<div class="race-steps">' +
        stepCard('mac', 'Mac', [
          'Open the Thinka Coding Games folder.',
          'Double-click <strong>Start Class (Mac)</strong>.',
          'The first time, if the Mac says it cannot open the file: right-click it, choose <strong>Open</strong>, then <strong>Open</strong>.',
          'Leave that window open. Close it when the class is finished.'
        ]) +
        stepCard('win', 'Windows', [
          'Open the Thinka Coding Games folder.',
          'Double-click <strong>Start Class (Windows)</strong>.',
          'If Windows asks, choose <strong>More info</strong>, then <strong>Run anyway</strong>.',
          'Leave that window open. Close it when the class is finished.'
        ]) +
        '</div>' +
        '<p class="race-rules">Students on the same Wi-Fi join from the address on the teacher screen. Solo games do not need Start Class. Double-click <strong>START HERE</strong>.</p>' +
        '</div>';
  }

  function joinAddress() {
    if (urls.length) {
      return urls[0];
    }
    if (!isLocalHost() && location.protocol !== 'file:' && location.origin) {
      return location.origin + '/race.html';
    }
    return '';
  }

  function qrMarkup(address) {
    if (!address || !window.ThinkaQr) {
      return '';
    }
    try {
      return '<div class="race-qr" id="joinQr">' + ThinkaQr.svg(address) + '</div>';
    } catch (err) {
      return '';
    }
  }

  function render() {
    if (location.protocol === 'file:' || (offline && !state)) {
      app.innerHTML = setupHtml();
      return;
    }
    if (!state || !state.you) {
      if (teacherSeat) {
        app.innerHTML = '<div class="race-gate" id="raceOpening"><a class="race-logo" href="index.html">thinka<span>.</span></a>' +
            '<h1>Opening the class</h1>' +
            '<p class="race-lead">The teacher page is connecting. Students will use the address that appears next.</p>' +
            '<p class="race-error">' + esc(errorText) + '</p></div>';
        return;
      }
      app.innerHTML = '<div class="race-gate" id="raceJoin"><a class="race-logo" href="index.html">thinka<span>.</span></a>' +
          '<h1>Join the race</h1>' +
          '<p class="race-lead">Type your name. The teacher starts the race.</p>' +
          '<label>Your name<input id="nameInput" type="text" maxlength="16" autocomplete="off" value="' +
          esc(nameDraft) + '"></label>' +
          '<div class="race-actions"><button type="button" id="joinBtn">Join</button></div>' +
          '<p class="race-error">' + esc(errorText) + '</p></div>';
      bindJoin();
      return;
    }
    if (state.phase === 'lobby') {
      renderLobby();
      return;
    }
    if (state.phase === 'countdown') {
      app.innerHTML = '<div class="race-board"><div class="race-count">' +
          esc(state.countdown) + '</div>' + lineBanner() + lanes(state.players) + '</div>';
      return;
    }
    if (state.phase === 'race') {
      renderRace();
      return;
    }
    renderPodium();
  }

  function bindJoin() {
    var nameInput = document.getElementById('nameInput');
    nameInput.addEventListener('input', function() {
      nameDraft = nameInput.value;
    });
    document.getElementById('joinBtn').addEventListener('click', function() {
      send({type: 'join', name: nameInput.value});
    });
    nameInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        send({type: 'join', name: nameInput.value});
      }
    });
    nameInput.focus();
  }

  function renderLobby() {
    var teacher = state.you === 'teacher';
    var address = joinAddress();
    var extras = urls.slice(1).map(function(url) {
      return '<div class="race-url race-url--extra">' + esc(url) + '</div>';
    }).join('');
    var roster = (state.players || []).map(function(player) {
      return '<div><i class="race-swatch" style="background:' + esc(player.color) +
          '"></i>' + esc(player.name) + '</div>';
    }).join('') || '<p class="race-lead">Waiting for students.</p>';
    var humans = (state.players || []).filter(function(player) {
      return !player.bot;
    }).length;
    var fill = humans > 0 && humans < 4 ?
        '<p class="race-lead">Computer racers join at the start so the track has 4 cars.</p>' : '';
    var levels = [
      ['easy', 'Easy'],
      ['medium', 'Medium'],
      ['hard', 'Hard']
    ].map(function(level) {
      var on = state.difficulty === level[0] ? ' is-on' : '';
      return '<button type="button" class="race-line race-diff' + on +
          '" data-diff="' + level[0] + '"' + (teacher ? '' : ' disabled') + '>' +
          level[1] + '</button>';
    }).join('');
    var start = teacher ?
        '<button type="button" id="startBtn"' +
        ((state.players && state.players.length) ? '' : ' disabled') +
        '>Start</button>' : '';
    app.innerHTML = '<div class="race-lobby"><div class="race-top"><a class="race-logo" href="index.html">thinka<span>.</span></a></div>' +
        '<h1>' + (teacher ? 'Host the class' : 'You are in') + '</h1>' +
        (teacher ? '<p class="race-lead">Students on this Wi-Fi open this address, or scan the code:</p>' +
            '<div class="race-joinbox"><div class="race-url" id="joinAddress">' +
            esc(address || 'No Wi-Fi address yet. Connect this laptop to the classroom Wi-Fi and start the class again.') +
            '</div>' + qrMarkup(address) + '</div>' + extras :
            '<p class="race-lead">Wait for the teacher to start. The line changes by itself during the race.</p>') +
        '<h2>Computer speed</h2><div class="race-lines race-diffs">' + levels +
        '</div><p class="race-rules">Same setting, different speeds. One computer is slower, one is quicker.</p>' +
        '<h2>Racers</h2><div class="race-roster">' + roster + '</div>' + fill +
        '<p class="race-rules">' + esc(rulesLine()) + '</p>' +
        '<div class="race-actions">' + start +
        (teacher ? '<a class="race-line" href="class.html">Class roster</a>' : '') +
        '</div>' +
        '<p class="race-error">' + esc(errorText) + '</p></div>';
    if (teacher) {
      document.getElementById('startBtn').addEventListener('click', function() {
        send({type: 'start'});
      });
      app.querySelectorAll('[data-diff]').forEach(function(button) {
        button.addEventListener('click', function() {
          send({type: 'difficulty', difficulty: button.getAttribute('data-diff')});
        });
      });
    }
  }

  function lineBanner() {
    if (state.lineId !== seenLine) {
      if (seenLine && state.phase === 'race') {
        lineFlashUntil = Date.now() + 700;
      }
      seenLine = state.lineId;
    }
    var flash = Date.now() < lineFlashUntil ? ' race-now--flash' : '';
    return '<p class="race-now' + flash + '">' + esc(state.line) + '</p>';
  }

  function renderRace() {
    var player = me();
    var seconds = Math.ceil((state.msLeft || 0) / 1000);
    var typing = '';
    if (player) {
      typing = '<div class="race-prompt" aria-live="polite">' +
          promptHtml(state.line, player.pos) + '</div><p class="race-rules">' +
          esc(rulesLine()) + '</p>';
    }
    app.innerHTML = '<div class="race-board"><div class="race-top"><a class="race-logo" href="index.html">thinka<span>.</span></a>' +
        '<div class="race-clock">' + seconds + '</div></div>' +
        lineBanner() + lanes(state.players) + typing + '</div>';
  }

  function renderPodium() {
    var teacher = state.you === 'teacher';
    var winner = (state.players || [])[0];
    app.innerHTML = '<div class="race-board"><h1>' +
        (winner ? esc(winner.name) + ' wins' : 'Race over') + '</h1>' +
        podium(state.players || []) +
        (teacher ? '<button type="button" id="againBtn">New race</button>' :
            '<p class="race-lead">Wait for the teacher to start a new race.</p>') +
        '</div>';
    if (teacher) {
      document.getElementById('againBtn').addEventListener('click', function() {
        send({type: 'again'});
      });
    }
  }

  document.addEventListener('keydown', function(event) {
    if (!state || state.phase !== 'race' || state.you !== 'player') {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
      return;
    }
    if (event.key !== ' ' && event.key.length !== 1) {
      return;
    }
    event.preventDefault();
    send({type: 'key', key: event.key});
  });

  if (location.protocol === 'file:') {
    offline = true;
    render();
  } else {
    connect();
    loadUrls();
    render();
  }
})();
