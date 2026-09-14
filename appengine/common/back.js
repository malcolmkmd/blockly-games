/**
 * @license
 * Copyright 2014 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview JavaScript for correctly linking the title link.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

(function() {
  // Offline-first: always use the HTML filename (file:// and static hosts).
  document.getElementById('back').href = 'index.html' + location.search;
})();
