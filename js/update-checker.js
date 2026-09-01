/**
 * Prime Blog — APK Update Checker
 * - Shows update every time app opens (if newer version exists)
 * - "Later" only hides for current session
 * - Red (i) button to view update again anytime
 * - Download uses https only (no intent:// errors)
 */
(function () {
  // ========== EDIT EVERY TIME YOU BUILD A NEW APK ==========
  var CURRENT_VERSION_CODE = 214;
  var VERSION_URL = 'https://nemmartv.github.io/main1/version.json';
  // =========================================================

  var STORAGE_PENDING = 'pb_pending_update';
  var STORAGE_LAST_FETCH = 'pb_last_update_fetch';
  var SESSION_DISMISS = 'pb_update_dismissed_session';
  var FETCH_COOLDOWN_MS = 2 * 60 * 1000; // only limits network, not showing popup
  var DEBUG = true;

  var pendingData = null;

  function log() {
    if (!DEBUG) return;
    try {
      console.log.apply(console, ['[PrimeBlog Update]'].concat([].slice.call(arguments)));
    } catch (e) {}
  }

  function isLikelyApp() {
    var ua = navigator.userAgent || '';
    try {
      if (localStorage.getItem('pb_force_apk_check') === '1') return true;
    } catch (e) {}
    if (!/Android/i.test(ua)) return false;
    if (/; wv\)/i.test(ua) || /WebView/i.test(ua)) return true;
    if (location.protocol === 'file:' || location.protocol === 'content:') return true;
    if (window.cordova || window.PhoneGap || window.Capacitor) return true;
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {}
    // HTML-to-APK fallback: any Android
    return true;
  }

  function loadPending() {
    try {
      var raw = localStorage.getItem(STORAGE_PENDING);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.versionCode && Number(data.versionCode) > CURRENT_VERSION_CODE) {
        return data;
      }
      localStorage.removeItem(STORAGE_PENDING);
      return null;
    } catch (e) {
      return null;
    }
  }

  function savePending(data) {
    try {
      localStorage.setItem(STORAGE_PENDING, JSON.stringify(data));
    } catch (e) {}
  }

  function clearPending() {
    try {
      localStorage.removeItem(STORAGE_PENDING);
    } catch (e) {}
  }

  function isSessionDismissed() {
    try {
      return sessionStorage.getItem(SESSION_DISMISS) === '1';
    } catch (e) {
      return false;
    }
  }

  function setSessionDismissed() {
    try {
      sessionStorage.setItem(SESSION_DISMISS, '1');
    } catch (e) {}
  }

  function clearSessionDismissed() {
    try {
      sessionStorage.removeItem(SESSION_DISMISS);
    } catch (e) {}
  }

  function shouldFetchNetwork() {
    try {
      var last = localStorage.getItem(STORAGE_LAST_FETCH);
      if (!last) return true;
      return Date.now() - parseInt(last, 10) > FETCH_COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function markFetched() {
    try {
      localStorage.setItem(STORAGE_LAST_FETCH, String(Date.now()));
    } catch (e) {}
  }


  function tryNativeOpen(url) {
    if (!url) return false;
    url = String(url).trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/\//, '');
    log('tryNativeOpen', url);
    try {
      if (window.Android) {
        if (typeof Android.openBrowser === 'function') { Android.openBrowser(url); return true; }
        if (typeof Android.openExternal === 'function') { Android.openExternal(url); return true; }
        if (typeof Android.openURL === 'function') { Android.openURL(url); return true; }
        if (typeof Android.openUrl === 'function') { Android.openUrl(url); return true; }
      }
    } catch (e) {}
    try {
      if (window.JSBridge && typeof JSBridge.openBrowser === 'function') { JSBridge.openBrowser(url); return true; }
    } catch (e) {}
    try {
      if (typeof window.openBrowser === 'function') { window.openBrowser(url); return true; }
    } catch (e) {}
    try {
      if (typeof window.openExternal === 'function') { window.openExternal(url); return true; }
    } catch (e) {}
    try {
      if (window.cordova && cordova.InAppBrowser) { cordova.InAppBrowser.open(url, '_system'); return true; }
    } catch (e) {}
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) {
        Capacitor.Plugins.Browser.open({ url: url }); return true;
      }
    } catch (e) {}
    // Chrome scheme via iframe (no location.href)
    try {
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'display:none;width:0;height:0;border:0;';
      iframe.src = 'googlechrome://navigate?url=' + encodeURIComponent(url);
      document.body.appendChild(iframe);
      setTimeout(function () { try { iframe.remove(); } catch (e) {} }, 1200);
    } catch (e) {}
    return false; // let <a href> handle it
  }

  function openExternalDownload(url) {
    if (!url) return;
    url = String(url).trim();
    if (url.indexOf('intent:') === 0) {
      // extract fallback https if present
      var m = url.match(/S\.browser_fallback_url=([^;]+)/);
      if (m) {
        try { url = decodeURIComponent(m[1]); } catch (e) {}
      } else {
        return;
      }
    }
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url.replace(/^\/\//, '');
    }
    log('open external browser:', url);

    // --- Native bridges used by many HTML-to-APK tools ---
    var nativeTried = false;
    try {
      if (window.Android) {
        if (typeof Android.openBrowser === 'function') { Android.openBrowser(url); nativeTried = true; }
        else if (typeof Android.openExternal === 'function') { Android.openExternal(url); nativeTried = true; }
        else if (typeof Android.openURL === 'function') { Android.openURL(url); nativeTried = true; }
        else if (typeof Android.openUrl === 'function') { Android.openUrl(url); nativeTried = true; }
        else if (typeof Android.open === 'function') { Android.open(url); nativeTried = true; }
      }
    } catch (e) {}
    try {
      if (window.JSBridge && typeof JSBridge.openBrowser === 'function') {
        JSBridge.openBrowser(url); nativeTried = true;
      }
    } catch (e) {}
    try {
      if (typeof window.openBrowser === 'function') { window.openBrowser(url); nativeTried = true; }
    } catch (e) {}
    try {
      if (typeof window.openExternal === 'function') { window.openExternal(url); nativeTried = true; }
    } catch (e) {}
    try {
      if (window.webView && typeof window.webView.openBrowser === 'function') {
        window.webView.openBrowser(url); nativeTried = true;
      }
    } catch (e) {}
    try {
      if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system'); nativeTried = true;
      }
    } catch (e) {}
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) {
        Capacitor.Plugins.Browser.open({ url: url }); nativeTried = true;
      }
    } catch (e) {}

    if (nativeTried) {
      log('used native bridge');
      return;
    }

    // --- Chrome custom scheme (opens Chrome app if installed) ---
    try {
      var chromeUrl = 'googlechrome://navigate?url=' + encodeURIComponent(url);
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'display:none;width:0;height:0;border:0;';
      iframe.src = chromeUrl;
      document.body.appendChild(iframe);
      setTimeout(function () { try { iframe.remove(); } catch (e) {} }, 1500);
    } catch (e) {}

    // --- Intent via hidden iframe (system may intercept; does NOT set location.href) ---
    try {
      var stripped = url.replace(/^https?:\/\//i, '');
      var intentUrl =
        'intent://' + stripped +
        '#Intent;scheme=https;action=android.intent.action.VIEW;' +
        'category=android.intent.category.BROWSABLE;' +
        'package=com.android.chrome;' +
        'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
      var iframe2 = document.createElement('iframe');
      iframe2.style.cssText = 'display:none;width:0;height:0;border:0;';
      iframe2.src = intentUrl;
      document.body.appendChild(iframe2);
      setTimeout(function () { try { iframe2.remove(); } catch (e) {} }, 1500);
    } catch (e) {}

    // --- <a target=_blank> ---
    try {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('download', '');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { a.remove(); } catch (e) {} }, 200);
    } catch (e) {}

    // --- window.open _system / _blank ---
    try { window.open(url, '_system'); } catch (e) {}
    try { window.open(url, '_blank'); } catch (e) {}

    // NOTE: we do NOT set window.location to intent:// (causes ERR_UNKNOWN_URL_SCHEME)
    // Last resort stays in WebView only if nothing else worked after delay
    setTimeout(function () {
      // If still here, show helper message inside modal area
      try {
        var tip = document.getElementById('pb-upd-browser-tip');
        if (!tip) {
          var card = document.querySelector('.pb-upd-card');
          if (card) {
            tip = document.createElement('p');
            tip.id = 'pb-upd-browser-tip';
            tip.style.cssText = 'margin:12px 0 0;font-size:12px;line-height:1.4;color:#ffb4b4;';
            tip.innerHTML = 'If download did not open Chrome: long-press the link below → Open in browser.<br><a href="' + url + '" target="_blank" rel="noopener" style="color:#6af;word-break:break-all;">' + url + '</a>';
            card.appendChild(tip);
          }
        }
      } catch (e) {}
    }, 800);
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
      '@media(max-width:400px){.pb-upd-actions{flex-direction:column}}',
      /* Red (i) info button */
      '#pb-update-info-btn{position:fixed;right:14px;bottom:18px;z-index:99990;width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff4444,#c81e1e);color:#fff;font-size:20px;font-weight:700;font-style:italic;font-family:Georgia,serif;box-shadow:0 6px 18px rgba(255,68,68,.45);cursor:pointer;-webkit-tap-highlight-color:transparent;display:none;align-items:center;justify-content:center;line-height:1;}',
      '#pb-update-info-btn.show{display:flex;}',
      '#pb-update-info-btn:active{transform:scale(.94);}',
      '#pb-update-info-btn .pb-i-dot{position:absolute;top:6px;right:6px;width:9px;height:9px;background:#fff;border-radius:50%;box-shadow:0 0 0 2px #ff4444;}'
    ].join('');
    document.head.appendChild(css);
  }

  function ensureInfoButton() {
    injectStyles();
    var btn = document.getElementById('pb-update-info-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pb-update-info-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Update info');
      btn.innerHTML = 'i<span class="pb-i-dot"></span>';
      btn.addEventListener('click', function () {
        clearSessionDismissed();
        if (pendingData) {
          showModal(pendingData, true);
        } else {
          check(true, true);
        }
      });
      document.body.appendChild(btn);
    }
    // Show red (i) only when an update is pending
    if (pendingData && Number(pendingData.versionCode) > CURRENT_VERSION_CODE) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  }

  function showModal(data, forceShow) {
    if (!data) return;
    if (!forceShow && isSessionDismissed()) {
      log('session dismissed — skip auto modal (use red i button)');
      ensureInfoButton();
      return;
    }
    if (document.getElementById('pb-update-modal')) return;

    injectStyles();
    pendingData = data;
    savePending(data);
    ensureInfoButton();
    log('showing modal', data.version, data.versionCode);

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
            '<a class="pb-upd-btn pb-upd-primary" id="pb-upd-download" href="' + (data.apkUrl || '#') + '" target="_blank" rel="noopener noreferrer">Download Update</a>' +
            later +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    var dlBtn = document.getElementById('pb-upd-download');
    if (dlBtn) {
      dlBtn.addEventListener('click', function (e) {
        // Try native / chrome open first; if none work, allow normal <a> navigation
        // (external domain → HTML-to-APK "open external links in browser" setting)
        var handled = tryNativeOpen(data.apkUrl);
        if (handled) {
          e.preventDefault();
        }
        // else: default <a target=_blank href=https://mediafire...> 
      });
    }

    var btn = document.getElementById('pb-upd-later');
    if (btn) {
      btn.addEventListener('click', function () {
        // Only hide for THIS session — next app open shows again
        setSessionDismissed();
        modal.remove();
        document.body.style.overflow = '';
        ensureInfoButton(); // keep red (i) visible
        log('dismissed for this session only');
      });
    }
  }

  function applyServerData(data) {
    if (!data || !data.versionCode) return;
    if (Number(data.versionCode) > CURRENT_VERSION_CODE) {
      pendingData = data;
      savePending(data);
      showModal(data, false);
      ensureInfoButton();
    } else {
      pendingData = null;
      clearPending();
      ensureInfoButton();
      log('up to date');
    }
  }

  function check(forceNetwork, forceShow) {
    log('check forceNetwork=', !!forceNetwork, 'forceShow=', !!forceShow);

    if (!isLikelyApp()) {
      log('not app — exit');
      return;
    }

    // Always try to show cached pending update on open (unless session-dismissed)
    var cached = loadPending();
    if (cached) {
      pendingData = cached;
      ensureInfoButton();
      showModal(cached, !!forceShow);
    }

    if (!forceNetwork && !shouldFetchNetwork()) {
      log('skip network (cooldown)');
      return;
    }

    log('fetching', VERSION_URL);
    fetch(VERSION_URL + '?t=' + Date.now(), {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })
      .then(function (r) {
        log('status', r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        markFetched();
        log('server=', data.versionCode, 'local=', CURRENT_VERSION_CODE);
        applyServerData(data);
        if (forceShow && pendingData) showModal(pendingData, true);
      })
      .catch(function (e) {
        log('fetch failed:', e && e.message ? e.message : e);
        // Still show cached update offline
        if (forceShow && pendingData) showModal(pendingData, true);
      });
  }

  function init() {
    log('init CURRENT=', CURRENT_VERSION_CODE);
    if (!isLikelyApp()) return;

    // New app open = new session → clear session dismiss so popup can show again
    // sessionStorage already clears when process dies; this helps some WebViews
    // that keep session oddly. On real cold start sessionStorage is empty.
    check(true, false);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        // Coming back to app: show again if update pending and not dismissed this session
        check(false, false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.PrimeBlogUpdate = {
    check: function () { check(true, true); },
    forceEnable: function () {
      try { localStorage.setItem('pb_force_apk_check', '1'); } catch (e) {}
      clearSessionDismissed();
      check(true, true);
    },
    openDownload: openExternalDownload,
    showAgain: function () {
      clearSessionDismissed();
      if (pendingData) showModal(pendingData, true);
      else check(true, true);
    },
    currentVersionCode: CURRENT_VERSION_CODE,
    isApp: isLikelyApp,
    clearCooldown: function () {
      try {
        localStorage.removeItem(STORAGE_LAST_FETCH);
        clearSessionDismissed();
      } catch (e) {}
    }
  };
})();
