/**
 * Thinka hub — no Closure compile step.
 * Progress and language work from static index.html so a stale
 * index/generated/compressed.js cannot paint the old SVG path.
 */
'use strict';

(function() {
  var APPS = ['puzzle', 'maze', 'bird', 'turtle', 'movie', 'music',
              'pond-tutor', 'pond-duck'];
  var MAX_LEVEL = 10;
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

  function stored(app, level) {
    try {
      return !!(window.localStorage && window.localStorage[app + level]);
    } catch (e) {
      return false;
    }
  }

  function withLang(href) {
    var lang = window['BlocklyGamesLang'] || 'en';
    var join = href.indexOf('?') === -1 ? '?' : '&';
    if (/[?&]lang=/.test(href)) {
      return href.replace(/([?&]lang=)[^&]*/, '$1' + encodeURIComponent(lang));
    }
    return href + join + 'lang=' + encodeURIComponent(lang);
  }

  function fillLanguageMenu() {
    var menu = $('languageMenu');
    if (!menu) {
      return;
    }
    var langs = window['BlocklyGamesLanguages'] || ['en'];
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

  function paintProgress() {
    var any = false;
    for (var i = 0; i < APPS.length; i++) {
      var app = APPS[i];
      var denom = (i === 0) ? 1 : MAX_LEVEL;
      var done = 0;
      for (var j = 1; j <= MAX_LEVEL; j++) {
        if (stored(app, j)) {
          done++;
          any = true;
        }
      }
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
        label.textContent = done + ' / ' + denom;
      }
      if (card) {
        card.href = withLang(card.getAttribute('href') || (app + '.html'));
      }
    }
    var about = document.querySelector('.thinka-hero-about');
    if (about) {
      about.href = withLang(about.getAttribute('href') || 'about.html');
    }
    var logo = document.querySelector('.thinka-logo');
    if (logo) {
      logo.href = withLang(logo.getAttribute('href') || 'index.html');
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

  function clearData() {
    if (!window.confirm('Delete all your solutions?')) {
      return;
    }
    try {
      for (var i = 0; i < APPS.length; i++) {
        for (var j = 1; j <= MAX_LEVEL; j++) {
          delete window.localStorage[APPS[i] + j];
          delete window.localStorage[APPS[i] + j + '_teacherUnlock'];
        }
      }
    } catch (e) {
      // Ignore quota / SecurityError.
    }
    window.location.reload();
  }

  function init() {
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
