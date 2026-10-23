/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * When Start Class is serving this page, load the signed-in student's
 * progress before games read localStorage, and push later writes back.
 * file:// and a plain static server leave storage completely alone.
 */
(function() {
  var core = window.ThinkaSyncCore;
  var SESSION_KEY = 'thinkaStudentSession';
  var QUEUE_KEY = 'thinkaSyncQueue';
  var suppressing = false;
  var originals = null;
  var session = null;
  var flushTimer = null;
  var flushing = false;

  window.ThinkaClass = {
    server: false,
    mode: 'file',
    session: null,
    animals: [],
    signOut: function() {},
    flushNow: function(done) { if (done) done(false); }
  };

  if (!core) {
    return;
  }
  if (location.protocol === 'file:') {
    return;
  }

  function storage() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function syncRequest(method, url, body) {
    var xhr = new XMLHttpRequest();
    try {
      xhr.open(method, url, false);
      if (body != null) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      xhr.send(body == null ? null : JSON.stringify(body));
    } catch (e) {
      return {status: 0, data: null};
    }
    var data = null;
    try {
      data = JSON.parse(xhr.responseText);
    } catch (err) {
      data = null;
    }
    return {status: xhr.status, data: data};
  }

  var store = storage();
  if (!store) {
    window.ThinkaClass.mode = 'local';
    return;
  }

  var ping = syncRequest('GET', '/class/api/ping', null);
  if (!ping.data || !ping.data.ok || ping.status !== 200) {
    window.ThinkaClass.mode = 'local';
    return;
  }

  window.ThinkaClass.server = true;
  window.ThinkaClass.mode = 'class';
  window.ThinkaClass.animals = ping.data.animals || [];

  function readSession() {
    var raw;
    try {
      raw = store.getItem(SESSION_KEY);
    } catch (e) {
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.token && parsed.studentId) {
        return parsed;
      }
    } catch (e2) {
      // Ignore a broken session and ask who is playing.
    }
    return null;
  }

  function snapshotKeys() {
    var keys = [];
    var i;
    try {
      for (i = 0; i < store.length; i++) {
        keys.push(store.key(i));
      }
    } catch (e) {
      return keys;
    }
    return keys;
  }

  function forgetLocalProgress() {
    var keys = snapshotKeys();
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] && !core.isPrivateKey(keys[i])) {
        try {
          store.removeItem(keys[i]);
        } catch (e) {
          // Keep going.
        }
      }
    }
  }

  function applyMap(map) {
    var keys = snapshotKeys();
    var name;
    var i;
    suppressing = true;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] && !core.isPrivateKey(keys[i])) {
        try {
          store.removeItem(keys[i]);
        } catch (e) {
          // Keep going.
        }
      }
    }
    for (name in map) {
      if (Object.prototype.hasOwnProperty.call(map, name) && !core.isPrivateKey(name)) {
        try {
          store.setItem(name, String(map[name]));
        } catch (e2) {
          // Quota. The queue still holds the value for a later try.
        }
      }
    }
    suppressing = false;
  }

  function readQueue() {
    try {
      return core.readQueue(store.getItem(QUEUE_KEY));
    } catch (e) {
      return {};
    }
  }

  function writeQueue(queue) {
    suppressing = true;
    try {
      if (!queue || !Object.keys(queue).length) {
        store.removeItem(QUEUE_KEY);
      } else {
        store.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (e) {
      // The in-memory queue is still flushed from the last copy we send.
    }
    suppressing = false;
  }

  function installWrapper() {
    if (originals) {
      return;
    }
    var proto = Object.getPrototypeOf(store);
    originals = {
      setItem: proto.setItem,
      removeItem: proto.removeItem,
      clear: proto.clear
    };
    proto.setItem = function(key, value) {
      originals.setItem.call(this, key, String(value));
      if (this === window.localStorage) {
        onWrite(String(key), String(value));
      }
    };
    proto.removeItem = function(key) {
      originals.removeItem.call(this, key);
      if (this === window.localStorage) {
        onWrite(String(key), null);
      }
    };
    proto.clear = function() {
      var keep = {};
      var keys = [];
      var i;
      var key;
      if (this === window.localStorage) {
        for (i = 0; i < this.length; i++) {
          key = this.key(i);
          keys.push(key);
          if (core.isPrivateKey(key)) {
            keep[key] = this.getItem(key);
          }
        }
      }
      originals.clear.call(this);
      if (this !== window.localStorage) {
        return;
      }
      suppressing = true;
      for (key in keep) {
        if (Object.prototype.hasOwnProperty.call(keep, key) && keep[key] != null) {
          originals.setItem.call(this, key, keep[key]);
        }
      }
      suppressing = false;
      for (i = 0; i < keys.length; i++) {
        if (keys[i] && !core.isPrivateKey(keys[i])) {
          onWrite(keys[i], null);
        }
      }
    };
  }

  function onWrite(key, value) {
    var queue;
    if (suppressing || !session || core.isPrivateKey(key)) {
      return;
    }
    queue = core.noteChange(readQueue(), key, value);
    writeQueue(queue);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(function() {
      flushTimer = null;
      flushNow(null);
    }, 250);
  }

  function flushNow(done) {
    var queue;
    var sent;
    var xhr;
    if (!session) {
      if (done) done(false);
      return;
    }
    queue = readQueue();
    if (!Object.keys(queue).length) {
      if (done) done(true);
      return;
    }
    if (flushing) {
      if (done) done(false);
      return;
    }
    flushing = true;
    sent = {};
    Object.keys(queue).forEach(function(key) {
      sent[key] = queue[key];
    });
    xhr = new XMLHttpRequest();
    xhr.open('PUT', '/class/api/progress', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      var current;
      if (xhr.readyState !== 4) {
        return;
      }
      flushing = false;
      if (xhr.status === 200) {
        current = readQueue();
        writeQueue(core.ackQueue(current, sent));
        if (done) done(true);
        return;
      }
      if (xhr.status === 401) {
        forgetSession(true);
      }
      if (done) done(false);
    };
    xhr.onerror = function() {
      flushing = false;
      if (done) done(false);
    };
    try {
      xhr.send(JSON.stringify({token: session.token, changes: sent}));
    } catch (e) {
      flushing = false;
      if (done) done(false);
    }
  }

  function forgetSession(reload) {
    suppressing = true;
    try {
      store.removeItem(SESSION_KEY);
      store.removeItem(QUEUE_KEY);
    } catch (e) {
      // Ignore.
    }
    forgetLocalProgress();
    suppressing = false;
    session = null;
    window.ThinkaClass.session = null;
    if (reload) {
      location.reload();
    }
  }

  function signOut() {
    var token = session && session.token;
    if (token) {
      syncRequest('POST', '/class/api/signout', {token: token});
    }
    forgetSession(true);
  }

  session = readSession();
  if (session) {
    var remote = syncRequest(
        'GET', '/class/api/progress?token=' + encodeURIComponent(session.token), null);
    if (remote.status === 401) {
      forgetSession(false);
    } else if (remote.data && remote.data.ok) {
      var merged = core.overlay(remote.data.progress || {}, readQueue());
      applyMap(merged);
    }
  }

  installWrapper();
  window.ThinkaClass.session = session;
  window.ThinkaClass.signOut = signOut;
  window.ThinkaClass.flushNow = flushNow;

  if (session) {
    flushNow(null);
    setInterval(function() {
      flushNow(null);
    }, 3000);
    window.addEventListener('online', function() {
      flushNow(null);
    });
  }

  var gateOff = document.documentElement.getAttribute('data-thinka-gate') === 'off';
  if (!session && !gateOff) {
    var style = document.createElement('style');
    style.textContent = 'html.thinka-maybe-gate body > *:not(#thinkaWho){visibility:hidden !important}' +
        'html.thinka-maybe-gate #thinkaWho{visibility:visible !important}';
    document.head.appendChild(style);
    document.documentElement.classList.add('thinka-maybe-gate');
  }

  function loadSignin() {
    if (document.getElementById('thinkaSigninScript')) {
      return;
    }
    var prefix = (location.pathname || '').indexOf('/lessons/') !== -1 ? '../' : '';
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = prefix + 'common/class_signin.css';
    document.head.appendChild(css);
    var script = document.createElement('script');
    script.id = 'thinkaSigninScript';
    script.src = prefix + 'common/class_signin.js';
    document.head.appendChild(script);
  }

  function bootUi() {
    var off = document.documentElement.getAttribute('data-thinka-gate') === 'off' ||
        (document.body && document.body.getAttribute('data-thinka-gate') === 'off');
    if (off && !session) {
      document.documentElement.classList.remove('thinka-maybe-gate');
      return;
    }
    loadSignin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootUi);
  } else {
    bootUi();
  }
})();
