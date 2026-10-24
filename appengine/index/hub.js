/**
 * Thinka hub — no Closure compile step.
 * Progress and language work from static index.html so a stale
 * index/generated/compressed.js cannot paint the old SVG path.
 */
'use strict';

(function() {
  var APPS = ['race', 'arcade', 'reboot', 'keys', 'puzzle', 'maze', 'bird', 'turtle',
              'movie', 'music', 'pond-tutor', 'pond-duck'];
  var START_ORDER = ['maze', 'arcade', 'keys', 'reboot', 'puzzle', 'bird',
                     'turtle', 'movie', 'music', 'pond-tutor', 'pond-duck'];
  var MAX_LEVEL = 10;
  // Arcade keeps the class leaderboard and the current player outside the
  // per-level keys, so "Clear data" has to remove them by name.
  var ARCADE_EXTRA_KEYS = ['arcade_scores', 'arcade_player', 'arcade_curriculum'];
  // Reboot does the same with the ending the student chose, the part they
  // reached, and the music on/off choice (so the next student hears it).
  var REBOOT_EXTRA_KEYS = ['reboot_ending', 'reboot_part', 'reboot_name', 'reboot_music'];
  var ARCADE_STORAGE = [
    {name: 'arcade_pop', levels: 6},
    {name: 'arcade_drag', levels: 6},
    {name: 'arcade_catch', levels: 6},
    {name: 'arcade_zap', levels: 6},
    {name: 'arcade_combo', levels: 6}
  ];
  var KEYS_STORAGE = [
    {name: 'keys_lessons', levels: 8},
    {name: 'keys_race', levels: 5},
    {name: 'keys_code', levels: 6}
  ];
  var MAZE_STORAGE = [
    {name: 'maze_g1_sequence', levels: 10},
    {name: 'maze_g1_turns', levels: 10},
    {name: 'maze_g1_debug', levels: 9},
    {name: 'maze_g2_sequence-long', levels: 10},
    {name: 'maze_g2_repeat', levels: 10},
    {name: 'maze_g2_debug-loops', levels: 4},
    {name: 'maze_g3_repeat-collect', levels: 5},
    {name: 'maze_g3_nested-loops', levels: 4},
    {name: 'maze_g3_optimise', levels: 4},
    {name: 'maze_g4_until', levels: 3},
    {name: 'maze_g4_if-path', levels: 3},
    {name: 'maze_g5_if-else', levels: 1},
    {name: 'maze_g8_wall-follow', levels: 1}
  ];
  var LANGS = [
    'am', 'ar', 'be', 'be-tarask', 'bg', 'bn', 'br', 'ca', 'cs', 'da', 'de',
    'el', 'en', 'eo', 'es', 'eu', 'fa', 'fi', 'fo', 'fr', 'gl', 'ha', 'he',
    'hi', 'hr', 'hu', 'hy', 'ia', 'id', 'ig', 'is', 'it', 'ja', 'kab', 'kn',
    'ko', 'lt', 'lv', 'ms', 'my', 'nb', 'nl', 'pl', 'pms', 'pt', 'pt-br',
    'ro', 'ru', 'sc', 'sk', 'sl', 'sq', 'sr', 'sr-latn', 'sv', 'th', 'ti',
    'tr', 'uk', 'ur', 'vi', 'yo', 'zh-hans', 'zh-hant'
  ];
  var LANG_NAMES = {
    'am': 'አማርኛ', 'ar': 'العربية', 'be': 'беларускі',
    'be-tarask': 'Taraškievica', 'bg': 'български език', 'bn': 'বাংলা',
    'br': 'Brezhoneg', 'ca': 'Català', 'cs': 'Česky', 'da': 'Dansk',
    'de': 'Deutsch', 'el': 'Ελληνικά', 'en': 'English', 'eo': 'Esperanto',
    'es': 'Español', 'eu': 'Euskara', 'fa': 'فارسی', 'fi': 'Suomi',
    'fo': 'Føroyskt', 'fr': 'Français', 'gl': 'Galego', 'ha': 'Hausa',
    'he': 'עברית', 'hi': 'हिन्दी', 'hr': 'Hrvatski', 'hu': 'Magyar',
    'hy': 'հայերէն', 'ia': 'Interlingua', 'id': 'Bahasa Indonesia',
    'ig': 'Asụsụ Igbo', 'is': 'Íslenska', 'it': 'Italiano', 'ja': '日本語',
    'kab': 'Taqbaylit', 'kn': 'ಕನ್ನಡ', 'ko': '한국어', 'lt': 'Lietuvių',
    'lv': 'Latviešu', 'ms': 'Bahasa Melayu', 'my': 'မြန်မာစာ',
    'nb': 'Norsk (bokmål)', 'nl': 'Nederlands, Vlaams', 'pl': 'Polski',
    'pms': 'Piemontèis', 'pt': 'Português', 'pt-br': 'Português Brasileiro',
    'ro': 'Română', 'ru': 'Русский', 'sc': 'Sardu', 'sk': 'Slovenčina',
    'sl': 'Slovenščina', 'sq': 'Shqip', 'sr': 'Српски', 'sr-latn': 'Srpski',
    'sv': 'Svenska', 'th': 'ภาษาไทย', 'ti': 'ትግርኛ', 'tr': 'Türkçe',
    'uk': 'Українська', 'ur': 'اُردُو', 'vi': 'Tiếng Việt',
    'yo': 'Èdè Yorùbá', 'zh-hans': '简体中文', 'zh-hant': '正體中文'
  };

  function $(id) {
    return document.getElementById(id);
  }

  function stored(name, level) {
    try {
      return !!(window.localStorage && window.localStorage[name + level]);
    } catch (e) {
      return false;
    }
  }

  function storageNames(app) {
    if (app === 'puzzle') {
      return [{name: app, levels: 1}];
    }
    // Reboot records one key per act across its two parts, so a student who
    // stops halfway still sees how far they got.
    if (app === 'reboot') {
      return [{name: app, levels: 10}];
    }
    if (app === 'maze') {
      return MAZE_STORAGE;
    }
    if (app === 'keys') {
      return KEYS_STORAGE;
    }
    if (app === 'arcade') {
      return ARCADE_STORAGE;
    }
    if (app === 'race') {
      return [{name: 'race', levels: 0}];
    }
    return [{name: app, levels: MAX_LEVEL}];
  }

  function withLang(href) {
    var lang = window['BlocklyGamesLang'] || 'en';
    var join = href.indexOf('?') === -1 ? '?' : '&';
    if (/[?&]lang=/.test(href)) {
      return href.replace(/([?&]lang=)[^&]*/, '$1' + encodeURIComponent(lang));
    }
    return href + join + 'lang=' + encodeURIComponent(lang);
  }

  function detectLanguage() {
    window['BlocklyGamesLanguages'] = LANGS;
    var param = location.search.match(/[?&]lang=([^&]+)/);
    var lang = param ? decodeURIComponent(param[1].replace(/\+/g, ' ')) : null;
    if (LANGS.indexOf(lang) !== -1) {
      var exp = (new Date(Date.now() + 2 * 31536000000)).toUTCString();
      document.cookie = 'lang=' + encodeURIComponent(lang) +
          '; expires=' + exp + '; path=/';
    } else {
      var cookie = document.cookie.match(/(^|;)\s*lang=([\w\-]+)/);
      lang = cookie ? decodeURIComponent(cookie[2]) : null;
      if (LANGS.indexOf(lang) === -1) {
        lang = navigator.language;
        if (LANGS.indexOf(lang) === -1) {
          lang = 'en';
        }
      }
    }
    window['BlocklyGamesLang'] = lang;
    return lang;
  }

  function fillLanguageMenu() {
    var menu = $('languageMenu');
    if (!menu) {
      return;
    }
    var langs = window['BlocklyGamesLanguages'] || LANGS;
    var current = window['BlocklyGamesLang'] || 'en';
    menu.innerHTML = '';
    for (var i = 0; i < langs.length; i++) {
      var opt = document.createElement('option');
      opt.value = langs[i];
      opt.textContent = LANG_NAMES[langs[i]] || langs[i];
      if (langs[i] === current) {
        opt.selected = true;
      }
      menu.appendChild(opt);
    }
    menu.addEventListener('change', function() {
      var lang = encodeURIComponent(menu.value);
      var search = window.location.search;
      if (search.length <= 1) {
        search = '?lang=' + lang;
      } else if (/[?&]lang=[^&]*/.test(search)) {
        search = search.replace(/([?&]lang=)[^&]*/, '$1' + lang);
      } else {
        search = search.replace(/\?/, '?lang=' + lang + '&');
      }
      window.location = window.location.pathname + search;
    });
  }

  function denomFor(app) {
    var total = 0;
    var names = storageNames(app);
    for (var i = 0; i < names.length; i++) {
      total += names[i].levels;
    }
    return total;
  }

  function renderStars(containerId, done, total) {
    var el = $(containerId);
    if (!el) {
      return;
    }
    el.innerHTML = '';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', done + ' / ' + total);
    var slots = Math.min(total, MAX_LEVEL);
    var lit = done ? Math.max(1, Math.floor(done / total * slots)) : 0;
    for (var i = 0; i < slots; i++) {
      var star = document.createElement('i');
      if (i < done) {
        star.className = 'is-lit';
      }
      el.appendChild(star);
    }
  }

  function pickStartApp(levelsDone) {
    for (var o = 0; o < START_ORDER.length; o++) {
      var app = START_ORDER[o];
      var i = APPS.indexOf(app);
      if (levelsDone[i] < denomFor(app)) {
        return app;
      }
    }
    return 'maze';
  }

  function decorateFeatured(levelsDone) {
    var startApp = pickStartApp(levelsDone);
    var startCard = $('card-' + startApp);
    var featured = $('thinkaFeatured');
    var playNow = $('thinkaPlayNow');
    if (!featured || !startCard || !playNow) {
      return;
    }
    featured.className = 'thinka-featured thinka-featured--' + startApp;
    var art = $('featuredArt');
    if (art) {
      art.src = 'index/art/' + startApp + '.svg';
    }
    var name = $('featuredName');
    var blurb = $('featuredBlurb');
    var nameEl = startCard.querySelector('.thinka-card-name');
    if (name && nameEl) {
      name.textContent = nameEl.textContent;
    }
    if (blurb) {
      blurb.textContent = startCard.getAttribute('data-blurb') || '';
    }
    playNow.href = startCard.href;

    var i = APPS.indexOf(startApp);
    var denom = denomFor(startApp);
    var done = levelsDone[i];
    renderStars('stars-featured', done, denom);
    var featLabel = $('progress-label-featured');
    if (featLabel) {
      featLabel.textContent = done ? (done + ' / ' + denom) : 'New';
    }

    var kicker = $('featuredKicker');
    var playLabel = $('thinkaPlayNowLabel');
    var allDone = true;
    for (var a = 0; a < APPS.length; a++) {
      if (levelsDone[a] < denomFor(APPS[a])) {
        allDone = false;
        break;
      }
    }
    if (allDone) {
      if (kicker) {
        kicker.textContent = 'Play again';
      }
      if (playLabel) {
        playLabel.textContent = 'Play again';
      }
    } else if (done > 0) {
      if (kicker) {
        kicker.textContent = 'Keep going';
      }
      if (playLabel) {
        playLabel.textContent = 'Keep playing';
      }
    } else {
      if (kicker) {
        kicker.textContent = "Let's play";
      }
      if (playLabel) {
        playLabel.textContent = 'Start playing';
      }
    }
  }

  function paintProgress() {
    var any = false;
    var levelsDone = [];
    for (var i = 0; i < APPS.length; i++) {
      var app = APPS[i];
      var denom = denomFor(app);
      var done = 0;
      var names = storageNames(app);
      for (var n = 0; n < names.length; n++) {
        for (var j = 1; j <= names[n].levels; j++) {
          if (stored(names[n].name, j)) {
            done++;
            any = true;
          }
        }
      }
      levelsDone[i] = done;
      var bar = $('progress-' + app);
      var label = $('progress-label-' + app);
      var card = $('card-' + app);
      if (bar) {
        bar.style.width = (denom ? (done / denom) * 100 : 0) + '%';
        if (done >= denom && done > 0) {
          bar.classList.add('is-complete');
          if (card) {
            card.classList.add('thinka-card--done');
          }
        }
      }
      if (label) {
        label.textContent = app === 'race' ? 'Start Class' :
            (done ? (done + ' / ' + denom) : 'New');
      }
      if (card) {
        card.href = withLang(card.getAttribute('href') || (app + '.html'));
        if (done === 0) {
          card.classList.add('thinka-card--fresh');
        }
      }
      renderStars('stars-' + app, done, denom);
    }
    var about = document.querySelector('.thinka-bar-about, .thinka-hero-about');
    if (about) {
      about.href = withLang(about.getAttribute('href') || 'about.html');
    }
    var logo = document.querySelector('.thinka-logo');
    if (logo) {
      logo.href = withLang(logo.getAttribute('href') || 'index.html');
    }
    decorateFeatured(levelsDone);
    if (paintLessons()) {
      any = true;
    }
    if (any) {
      var para = $('clearDataPara');
      if (para) {
        para.style.visibility = 'visible';
      }
      var btn = $('clearData');
      if (btn) {
        btn.addEventListener('click', clearData);
      }
    }
  }

  function lessonBand() {
    // Same order as ThinkaLessons.resolveBand: signed-in grade, else last chosen.
    if (window.ThinkaLessons) {
      return ThinkaLessons.resolveBand().band;
    }
    return 'foundation';
  }

  function paintLessons() {
    var card = $('card-lessons');
    if (!card) {
      return false;
    }
    var band = lessonBand();
    var need = band === 'senior' ? 3 : (band === 'intermediate' ? 2 : 1);
    var level;
    var exerciseReady = true;
    for (level = 1; level <= need; level++) {
      if (!stored('maze_g1_sequence', level)) {
        exerciseReady = false;
        break;
      }
    }
    try {
      if (exerciseReady &&
          window.localStorage.getItem('thinkaLesson_w1_exercise') !== '1') {
        window.localStorage.setItem('thinkaLesson_w1_exercise', '1');
      }
    } catch (e) {
      exerciseReady = false;
    }
    var explainer = false;
    var exercise = false;
    try {
      explainer = window.localStorage.getItem('thinkaLesson_w1_explainer') === '1';
      exercise = window.localStorage.getItem('thinkaLesson_w1_exercise') === '1';
    } catch (e2) {
      explainer = false;
      exercise = false;
    }
    var done = (explainer ? 1 : 0) + (exercise ? 1 : 0);
    card.href = withLang('lessons.html');
    var label = $('progress-label-lessons');
    if (label) {
      label.textContent = done ? (done + ' / 2') : 'Week 1';
    }
    var bar = $('progress-lessons');
    if (bar) {
      bar.style.width = (done / 2 * 100) + '%';
      if (done >= 2) {
        bar.classList.add('is-complete');
        card.classList.add('thinka-card--done');
      }
    }
    if (done === 0) {
      card.classList.add('thinka-card--fresh');
    }
    renderStars('stars-lessons', done, 2);
    return done > 0;
  }

  function clearData() {
    if (!window.confirm('Delete all your solutions?')) {
      return;
    }
    // Student solutions only. thinkaTeacherPassword (set on teacher.html)
    // is a different key and must survive this button.
    try {
      for (var i = 0; i < APPS.length; i++) {
        var names = storageNames(APPS[i]);
        for (var n = 0; n < names.length; n++) {
          for (var j = 1; j <= names[n].levels; j++) {
            delete window.localStorage[names[n].name + j];
            delete window.localStorage[
                names[n].name + j + '_teacherUnlock'];
            delete window.localStorage[names[n].name + j + '_stars'];
          }
          delete window.localStorage[names[n].name + '_explained'];
        }
      }
      var extras = ARCADE_EXTRA_KEYS.concat(REBOOT_EXTRA_KEYS).concat([
        'thinkaLesson_w1_explainer', 'thinkaLesson_w1_exercise'
      ]);
      for (var k = 0; k < extras.length; k++) {
        delete window.localStorage[extras[k]];
      }
    } catch (e) {
      // Ignore quota / SecurityError.
    }
    window.location.reload();
  }

  function init() {
    detectLanguage();
    document.body.classList.add('thinka-hub');
    fillLanguageMenu();
    paintProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
