/**
 * Prime Blog — APK Update Checker
 * Fixed: works in most HTML-to-APK WebViews + online URL mode
 *
 * SETUP:
 * 1. Upload this file to: js/update-checker.js (GitHub Pages + offline ZIP)
 * 2. Upload version.json to site root
 * 3. Set CURRENT_VERSION_CODE = version of THIS APK build
 * 4. Put higher versionCode in online version.json when you release next APK
 */
(function () {
  // ========== EDIT EVERY TIME YOU BUILD A NEW APK ==========
  // This number = the version INSIDE the APK you are building now.
  // Online version.json versionCode must be HIGHER to show the popup.
  var CURRENT_VERSION_CODE = 214;
  var VERSION_URL = 'https://nemmartv.github.io/main1/version.json';
  // =========================================================

  var STORAGE_KEY = 'pb_last_update_check';
  var COOLDOWN_MS = 5 * 60 * 1000; // 5 min (was 30 — easier to test)
  var DEBUG = true; // set false later to hide console logs

  function log() {
    if (!DEBUG) return;
    try {
      var args = ['[PrimeBlog Update]'].concat(Array.prototype.slice.call(arguments));
      console.log.apply(console, args);
    } catch (e) {}
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function isLikelyApp() {
    var ua = navigator.userAgent || '';

    // Force test from console
    try {
      if (localStorage.getItem('pb_force_apk_check') === '1') {
        log('force flag ON');
        return true;
      }
    } catch (e) {}

    // Must be Android for normal use
    if (!/Android/i.test(ua)) {
      log('not Android — skip');
      return false;
    }

    // Most HTML-to-APK / WebView cases:
    // 1) Classic WebView marker
    if (/; wv\)/i.test(ua) || /WebView/i.test(ua)) {
      log('detected: WebView (; wv)');
      return true;
    }

    // 2) Offline packaged (file:// or content://)
    if (location.protocol === 'file:' || location.protocol === 'content:') {
      log('detected: file/content protocol');
      return true;
    }

    // 3) Cordova / Capacitor / PhoneGap
    if (window.cordova || window.PhoneGap || window.Capacitor) {
      log('detected: cordova/capacitor');
      return true;
    }

    // 4) Standalone display mode
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        log('detected: standalone');
        return true;
      }
    } catch (e) {}

    // 5) FALLBACK: any Android
    // Many HTML-to-APK tools use a normal Chrome UA without "; wv"
    // So we treat all Android as eligible. (Safe for your use case.)
    log('detected: Android fallback (HTML-to-APK compatible)');
    return true;
  }

  function shouldCheckNow() {
    try {
      var last = localStorage.getItem(STORAGE_KEY);
      if (!last) return true;
      var ok = Date.now() - parseInt(last, 10) > COOLDOWN_MS;
      if (!ok) log('cooldown active — skip network check');
      return ok;
    } catch (e) {
      return true;
    }
  }

  function markChecked() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (e) {}
  }

  function openExternalDownload(url) {
    if (!url) {
      log('no apkUrl');
      return;
    }
    // Always use normal https — never intent:// (WebView shows ERR_UNKNOWN_URL_SCHEME)
    url = String(url).trim();
    if (url.indexOf('intent:') === 0) {
      log('blocked intent url');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url.replace(/^\/\//, '');
    }
    log('open download:', url);

    // 1) Cordova / PhoneGap
    try {
      if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
        return;
      }
    } catch (e) {}

    // 2) Capacitor
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) {
        Capacitor.Plugins.Browser.open({ url: url });
        return;
      }
    } catch (e) {}

    // 3) <a target="_blank"> — many HTML-to-APK tools open this in external browser
    try {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { a.remove(); } catch (e) {}
      }, 100);
    } catch (e) {}

    // 4) window.open fallback
    try {
      var w = window.open(url, '_blank');
      if (w) return;
    } catch (e) {}

    // 5) Same-window navigation (last resort — stays in WebView but at least loads MediaFire)
    try {
      window.top.location.href = url;
    } catch (e) {
      window.location.href = url;
    }
  }

  function injectStyles() {
    if (document.getElementById('pb-update-css')) return;
    var css = document.createElement('style');
    css.id = 'pb-update-css';
    css.textContent = [
      '#pb-update-modal{position:fixed;inset:0;z-index:99999;font-family:system-ui,-apple-system,sans-serif;}',
      '.pb-upd-overlay{position:absolute;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
      '.pb-upd-card{background:linear-gradient(160deg,#1a1a22 0%,#0e0e14 100%);color:#f0f0f0;border-radius:18px;padding:28px 22px 22px;max-width:360px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,.6),0 0 0 1px rgba(255,68,68,.3);border:1px solid rgba(255,255,255,.08);animation:pbUpdIn .35s ease-out;}',
      '@keyframes pbUpdIn{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}',
      '.pb-upd-badge{display:inline-block;background:#ff4444;color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;padding:4px 10px;border-radius:999px;margin-bottom:12px;}',
      '.pb-upd-title{margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;}',
      '.pb-upd-ver{margin:0 0 12px;font-size:13px;color:#ff6b6b;font-weight:600;}',
      '.pb-upd-msg{margin:0 0 14px;font-size:14px;line-height:1.55;color:#c8c8d0;}',
      '.pb-upd-list{margin:0 0 18px;padding:10px 10px 10px 26px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.06);font-size:13px;color:#b8b8c0;line-height:1.5;}',
      '.pb-upd-list li{margin-bottom:3px;}',
      '.pb-upd-actions{display:flex;gap:10px;}',
      '.pb-upd-btn{flex:1;text-align:center;padding:13px 10px;border-radius:11px;font-size:14px;font-weight:600;text-decoration:none;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
      '.pb-upd-primary{background:linear-gradient(135deg,#ff4444,#c81e1e);color:#fff;box-shadow:0 4px 14px rgba(255,68,68,.35);}',
      '.pb-upd-secondary{background:rgba(255,255,255,.08);color:#ddd;border:1px solid rgba(255,255,255,.12);}',
      '@media(max-width:400px){.pb-upd-actions{flex-direction:column}}'
    ].join('');
    document.head.appendChild(css);
  }

  function showModal(data) {
    if (document.getElementById('pb-update-modal')) return;
    injectStyles();
    log('showing update modal', data.version, data.versionCode);

    var list = '';
    if (data.changelog && data.changelog.length) {
      list = '<ul class="pb-upd-list">' +
        data.changelog.map(function (i) { return '<li>' + i + '</li>'; }).join('') +
        '</ul>';
    }

    var later = data.forceUpdate
      ? ''
      : '<button type="button" class="pb-upd-btn pb-upd-secondary" id="pb-upd-later">Later</button>';

    var modal = document.createElement('div');
    modal.id = 'pb-update-modal';
    modal.innerHTML =
      '<div class="pb-upd-overlay">' +
        '<div class="pb-upd-card">' +
          '<div class="pb-upd-badge">UPDATE</div>' +
          '<h2 class="pb-upd-title">' + (data.title || 'Update Available') + '</h2>' +
          '<p class="pb-upd-ver">Version ' + (data.version || '') + '</p>' +
          '<p class="pb-upd-msg">' + String(data.message || 'A new version is available.').replace(/\n/g, '<br>') + '</p>' +
          list +
          '<div class="pb-upd-actions">' +
            '<button type="button" class="pb-upd-btn pb-upd-primary" id="pb-upd-download">Download Update</button>' +
            later +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    var dlBtn = document.getElementById('pb-upd-download');
    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        openExternalDownload(data.apkUrl);
      });
    }

    var btn = document.getElementById('pb-upd-later');
    if (btn) {
      btn.addEventListener('click', function () {
        modal.remove();
        document.body.style.overflow = '';
      });
    }
  }

  function check(force) {
    log('check() called, force=', !!force);
    log('UA=', navigator.userAgent);
    log('protocol=', location.protocol);
    log('CURRENT_VERSION_CODE=', CURRENT_VERSION_CODE);

    if (!isLikelyApp()) {
      log('not running as app — exit');
      return;
    }

    if (!force && !shouldCheckNow()) return;

    log('fetching', VERSION_URL);

    fetch(VERSION_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (r) {
        log('fetch status', r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        markChecked();
        log('server versionCode=', data.versionCode, 'local=', CURRENT_VERSION_CODE);
        if (data.versionCode && Number(data.versionCode) > Number(CURRENT_VERSION_CODE)) {
          showModal(data);
        } else {
          log('already up to date (or server version not higher)');
        }
      })
      .catch(function (e) {
        log('fetch failed:', e && e.message ? e.message : e);
      });
  }

  function init() {
    log('init');
    check(false);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') check(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PrimeBlogUpdate = {
    check: function () { check(true); },
    forceEnable: function () {
      try { localStorage.setItem('pb_force_apk_check', '1'); } catch (e) {}
      check(true);
    },
    openDownload: openExternalDownload,
    currentVersionCode: CURRENT_VERSION_CODE,
    isApp: isLikelyApp,
    clearCooldown: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      log('cooldown cleared');
    }
  };
})();