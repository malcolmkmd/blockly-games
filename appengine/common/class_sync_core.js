/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Pure helpers for class progress sync. No DOM. Safe on file:// and in node.
 */
(function(exp) {
  var PRIVATE = {
    'thinkaTeacherPassword': 1,
    'thinkaStudentSession': 1,
    'thinkaSyncQueue': 1
  };

  exp.PRIVATE_KEYS = PRIVATE;

  exp.isPrivateKey = function(key) {
    return !!PRIVATE[String(key)];
  };

  exp.readQueue = function(raw) {
    if (!raw) {
      return {};
    }
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // A broken queue is dropped. The next write starts a fresh one.
    }
    return {};
  };

  exp.noteChange = function(queue, key, value) {
    var next = {};
    var name;
    if (!queue || typeof queue !== 'object') {
      queue = {};
    }
    for (name in queue) {
      if (Object.prototype.hasOwnProperty.call(queue, name)) {
        next[name] = queue[name];
      }
    }
    if (exp.isPrivateKey(key)) {
      return next;
    }
    next[String(key)] = value === null ? null : String(value);
    return next;
  };

  exp.overlay = function(remote, queue) {
    var out = {};
    var name;
    remote = remote || {};
    queue = queue || {};
    for (name in remote) {
      if (Object.prototype.hasOwnProperty.call(remote, name) &&
          !exp.isPrivateKey(name) && remote[name] != null) {
        out[name] = String(remote[name]);
      }
    }
    for (name in queue) {
      if (!Object.prototype.hasOwnProperty.call(queue, name) || exp.isPrivateKey(name)) {
        continue;
      }
      if (queue[name] === null) {
        delete out[name];
      } else {
        out[name] = String(queue[name]);
      }
    }
    return out;
  };

  exp.ackQueue = function(queue, sent) {
    var next = {};
    var name;
    queue = queue || {};
    sent = sent || {};
    for (name in queue) {
      if (!Object.prototype.hasOwnProperty.call(queue, name)) {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(sent, name) && queue[name] === sent[name]) {
        continue;
      }
      next[name] = queue[name];
    }
    return next;
  };

  exp.progressKeys = function(keys) {
    var out = [];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (keys[i] && !exp.isPrivateKey(keys[i])) {
        out.push(keys[i]);
      }
    }
    return out;
  };
})(typeof module !== 'undefined' && module.exports ?
    module.exports :
    (this.ThinkaSyncCore = {}));
