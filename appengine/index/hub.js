/**
 * Thinka hub — no Closure compile step.
 * Progress and language work from static index.html so a stale
 * index/generated/compressed.js cannot paint the old SVG path.
 */
'use strict';

(function() {
  var APPS = ['puzzle', 'maze', 'bird', 'turtle', 'movie', 'music',
              'pond-tutor', 'pond-duck'];
  var START_ORDER = ['maze', 'puzzle', 'bird', 'turtle', 'movie', 'music',
                     'pond-tutor', 'pond-duck'];
  var MAX_LEVEL = 10;
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
    return (APPS.indexOf(app) === 0) ? 1 : MAX_LEVEL;
  }

  function renderStars(containerId, done, total) {
    var el = $(containerId);
    if (!el) {
      return;
    }
    el.innerHTML = '';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', done + ' / ' + total);
    for (var i = 0; i < total; i++) {
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
      for (var j = 1; j <= MAX_LEVEL; j++) {
        if (stored(app, j)) {
          done++;
          any = true;
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
        label.textContent = done ? (done + ' / ' + denom) : 'New';
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
