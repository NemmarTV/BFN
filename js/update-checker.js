/**
 * Prime Blog — APK Update Checker (Android only)
 * Runs ONLY inside Android WebView / APK.
 *
 * WHEN YOU RELEASE A NEW APK:
 * 1. Increase versionCode in version.json (on GitHub Pages)
 * 2. Change CURRENT_VERSION_CODE below to the SAME number
 * 3. Rebuild APK with this updated file
 * 4. Upload new APK + update version.json apkUrl
 */
(function () {
  // ========== EDIT THIS EVERY NEW APK BUILD ==========
  var CURRENT_VERSION_CODE = 215; // match the APK you are building NOW
  var VERSION_URL = 'https://nemmartv.github.io/main1/version.json';
  // ==================================================

  var STORAGE_KEY = 'pb_last_update_check';
  var COOLDOWN_MS = 30 * 60 * 1000; // 30 min

  function isLikelyWebView() {
    var ua = navigator.userAgent || '';
    if (!/Android/i.test(ua)) return false;
    if (/; wv\)/i.test(ua) || /WebView/i.test(ua)) return true;
    if (location.protocol === 'file:' || location.protocol === 'content:') return true;
    if (window.Capacitor || window.cordova || window.PhoneGap) return true;
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

  /**
   * Open URL in EXTERNAL browser so Android can download the APK.
   * WebView cannot install APKs reliably — must leave the app.
   */
  function openExternalDownload(url) {
    if (!url) return;

    // 1) Cordova / PhoneGap
    try {
      if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
        return;
      }
    } catch (e) {}

    // 2) Capacitor Browser plugin
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Browser) {
        Capacitor.Plugins.Browser.open({ url: url });
        return;
      }
    } catch (e) {}

    // 3) Android Intent → default browser (Chrome, etc.)
    try {
      var stripped = url.replace(/^https?:\/\//i, '');
      var intentUrl =
        'intent://' + stripped +
        '#Intent;scheme=https;action=android.intent.action.VIEW;' +
        'category=android.intent.category.BROWSABLE;end';
      window.location.href = intentUrl;
      // Fallback if intent is blocked
      setTimeout(function () {
        window.open(url, '_blank');
      }, 400);
      return;
    } catch (e) {}

    // 4) Last resort
    try {
      window.open(url, '_blank');
    } catch (e2) {
      window.location.href = url;
    }
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
            '<button type="button" class="pb-upd-btn pb-upd-primary" id="pb-upd-download">Download Update</button>' +
            later +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Download → open external browser (not WebView)
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

  window.PrimeBlogUpdate = {
    check: function () { check(true); },
    forceEnable: function () {
      try { localStorage.setItem('pb_force_apk_check', '1'); } catch (e) {}
      check(true);
    },
    openDownload: openExternalDownload,
    currentVersionCode: CURRENT_VERSION_CODE,
    isApp: shouldRun
  };
})();
