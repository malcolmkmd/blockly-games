/**
 * @license
 * Copyright 2026 Thinka
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Classroom config for Thinka's Blockly Games fork.
 *
 * To change the shared teacher password, edit TEACHER_PASSWORD below.
 * One password unlocks any locked level in any game. This is a classroom
 * soft gate (kids can still view-source) — not real authentication.
 *
 * After changing the password, rebuild the games (`make games`) so the
 * compiled bundles pick up the new value. In debug mode (sessionStorage
 * `debug` = 1), a reload is enough after the uncompressed bundle exists.
 */
'use strict';

goog.provide('ThinkaConfig');


/**
 * Shared teacher password for every locked level across all games.
 * @type {string}
 */
ThinkaConfig.TEACHER_PASSWORD = 'thinka';

/**
 * localStorage suffix stored next to normal progress keys
 * (e.g. maze5_teacherUnlock). Cleared by the index "Clear data" button.
 * @type {string}
 */
ThinkaConfig.UNLOCK_KEY_SUFFIX = '_teacherUnlock';

/**
 * localStorage suffix for a level's mastery star count.
 * @type {string}
 */
ThinkaConfig.STARS_KEY_SUFFIX = '_stars';

/**
 * localStorage suffix for a maze topic whose picture-book explainer has
 * already been shown (or skipped) on this browser.
 * @type {string}
 */
ThinkaConfig.EXPLAINED_KEY_SUFFIX = '_explained';

/**
 * localStorage key for a teacher-unlocked level.
 * @param {string} name Game storage name (maze, bird, ...).
 * @param {number} level Level number.
 * @returns {string} Storage key.
 */
ThinkaConfig.unlockKey = function(name, level) {
  return name + level + ThinkaConfig.UNLOCK_KEY_SUFFIX;
};

/**
 * localStorage key for a level's mastery star count.
 * @param {string} name Game storage name (maze_g2_repeat, bird, ...).
 * @param {number} level Level number.
 * @returns {string} Storage key.
 */
ThinkaConfig.starsKey = function(name, level) {
  return name + level + ThinkaConfig.STARS_KEY_SUFFIX;
};

/**
 * localStorage key for a maze topic whose explainer has been seen.
 * @param {string} name Game storage name (maze_g2_repeat, ...).
 * @returns {string} Storage key.
 */
ThinkaConfig.explainedKey = function(name) {
  return name + ThinkaConfig.EXPLAINED_KEY_SUFFIX;
};

/**
 * Compare entered text to the shared teacher password.
 * Leading/trailing spaces are ignored.
 * @param {string} entered Text from the password field.
 * @returns {boolean} True if the password matches.
 */
ThinkaConfig.checkPassword = function(entered) {
  return String(entered || '').trim() === ThinkaConfig.TEACHER_PASSWORD;
};

/**
 * Whether a level may be played without the password prompt.
 *
 * Level 1 is always open. Later levels open when:
 * - this level already has saved progress, or
 * - the previous level has saved progress (normal sequential unlock), or
 * - a teacher unlocked this specific level with the password.
 *
 * @param {number} level Level number (1-based).
 * @param {function(number): boolean} hasSavedLevel True if that level
 *     has completed-progress data in localStorage.
 * @param {function(number): boolean} hasTeacherUnlock True if a teacher
 *     already unlocked that level on this browser.
 * @returns {boolean} True if the level is playable.
 */
ThinkaConfig.isLevelPlayable = function(level, hasSavedLevel, hasTeacherUnlock) {
  if (level <= 1) {
    return true;
  }
  if (hasSavedLevel(level)) {
    return true;
  }
  if (hasSavedLevel(level - 1)) {
    return true;
  }
  if (hasTeacherUnlock(level)) {
    return true;
  }
  return false;
};

/**
 * Whether a concept unit may be entered.
 *
 * Units run in order, so a unit opens once the one before it is finished.
 * The first unit is always open, and a unit the student has already started
 * stays open.  A teacher unlock on the unit's first level opens it too, which
 * is how a class can jump straight to the topic they are working on.
 *
 * @param {Object} previous The preceding unit's progress summary, or null if
 *     this is the first unit.  Shape: {total, done}.
 * @param {number} startedLevels How many levels of this unit have progress.
 * @param {boolean} hasTeacherUnlock True if a teacher unlocked this unit.
 * @returns {boolean} True if the unit is playable.
 */
ThinkaConfig.isUnitPlayable = function(previous, startedLevels,
    hasTeacherUnlock) {
  if (!previous) {
    return true;
  }
  if (startedLevels > 0 || hasTeacherUnlock) {
    return true;
  }
  return previous.total > 0 && previous.done >= previous.total;
};
