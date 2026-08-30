/**
 * Prime Blog — APK Update Checker (Android only)
 * Runs ONLY inside Android WebView / APK.
 * Does NOT show on desktop browsers or mobile Chrome/Safari.
 *
 * WHEN YOU RELEASE A NEW APK:
 * 1. Increase versionCode in version.json (on GitHub Pages)
 * 2. Change CURRENT_VERSION_CODE below to the SAME number
 * 3. Rebuild APK with this updated file
 * 4. Upload new APK to MediaFire and put link in version.json
 */
(function () {
  // ========== EDIT THIS EVERY NEW APK BUILD ==========
  var CURRENT_VERSION_CODE = 213;
  var VERSION_URL = 'https://nemmartv.github.io/main1/version.json';
  // ==================================================

  var STORAGE_KEY = 'pb_last_update_check';
  var COOLDOWN_MS = 30 * 60 * 1000; // 30 min

  function isAndroidApp() {
    var ua = (navigator.userAgent || '').toLowerCase();
    // Must be Android
    if (ua.indexOf('android') === -1) return false;
    // Exclude normal mobile browsers (Chrome, Firefox, Samsung, Opera, Edge)
    if (/chrome\/|crios|fxios|firefox\/|edg\/|edga|samsungbrowser|opr\//.test(ua)) {
      // Many HTML-to-APK tools use a WebView UA that still contains "Chrome"
      // Extra signals that we are inside a WebView / standalone app:
      var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      var noBrowserUI = !window.chrome || !window.chrome.webstore; // weak signal
      // Most reliable for packaged APKs: absence of typical browser-only objects
      // + Android + (often) wv in UA (Android WebView)
      if (ua.indexOf('; wv') !== -1 || ua.indexOf('webview') !== -1) return true;
      // Fallback: if opened as file:// or custom scheme (common in offline APK)
      if (location.protocol === 'file:' || location.protocol === 'content:') return true;
      // Some packers keep http(s) but remove browser chrome — treat Android + no "Mobile Safari" as app
      // Safer approach: require "; wv" OR file/content protocol OR a query flag
      return false;
    }
    // Android UA without Chrome/Firefox etc. → very likely WebView
    return true;
  }

  // Stronger Android WebView detection
  function isLikelyWebView() {
    var ua = navigator.userAgent || '';
    if (!/Android/i.test(ua)) return false;
    // Classic WebView marker
    if (/; wv\)/i.test(ua) || /WebView/i.test(ua)) return true;
    // Offline packaged APK (file://)
    if (location.protocol === 'file:' || location.protocol === 'content:') return true;
    // Capacitor / Cordova / many HTML-to-APK tools
    if (window.Capacitor || window.cordova || window.PhoneGap) return true;
    // Custom: allow force via localStorage for testing
    try {
      if (localStorage.getItem('pb_force_apk_check') === '1') return true;
    } catch (e) {}
    return false;
  }

  function shouldRun() {
    return isLikelyWebView();
  }

  function shouldCheckNow() {
    try {
      var last = localStorage.getItem(STORAGE_KEY);
      if (!last) return true;
      return Date.now() - parseInt(last, 10) > COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function markChecked() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('pb-update-css')) return;
    var css = document.createElement('style');
    css.id = 'pb-update-css';
    css.textContent = [
      '#pb-update-modal{position:fixed;inset:0;z-index:99999;font-family:system-ui,-apple-system,sans-serif;}',
      '.pb-upd-overlay{position:absolute;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}',
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
          '<p class="pb-upd-msg">' + (data.message || 'A new version is available.').replace(/\n/g, '<br>') + '</p>' +
          list +
          '<div class="pb-upd-actions">' +
            '<a class="pb-upd-btn pb-upd-primary" href="' + (data.apkUrl || '#') + '" target="_blank" rel="noopener">Download Update</a>' +
            later +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    var btn = document.getElementById('pb-upd-later');
    if (btn) {
      btn.addEventListener('click', function () {
        modal.remove();
        document.body.style.overflow = '';
      });
    }
  }

  function check(force) {
    if (!shouldRun()) return;
    if (!force && !shouldCheckNow()) return;

    fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        markChecked();
        if (data.versionCode && Number(data.versionCode) > CURRENT_VERSION_CODE) {
          showModal(data);
        }
      })
      .catch(function (e) {
        console.log('[Prime Blog] Update check skipped:', e.message || e);
      });
  }

  function init() {
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

  // Manual test (only works when already detected as APK, or set localStorage)
  window.PrimeBlogUpdate = {
    check: function () { check(true); },
    forceEnable: function () {
      try { localStorage.setItem('pb_force_apk_check', '1'); } catch (e) {}
      check(true);
    },
    currentVersionCode: CURRENT_VERSION_CODE,
    isApp: shouldRun
  };
})();
