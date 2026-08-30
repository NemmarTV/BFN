/**
 * Prime Blog APK Update Checker
 * Place this file in your site and include it on every page.
 *
 * HOW TO USE WHEN YOU RELEASE A NEW APK:
 * 1. Increase versionCode in version.json (e.g. 214)
 * 2. Update version, message, apkUrl, changelog
 * 3. Change CURRENT_VERSION_CODE below to the SAME number
 * 4. Rebuild / re-package your APK with the new script
 * 5. Upload the new version.json to GitHub Pages
 */

(function () {
  // ========== CONFIG (EDIT THIS EVERY NEW APK) ==========
  const CURRENT_VERSION_CODE = 213; // ← must match the versionCode you put in the APK
  const VERSION_URL = 'https://nemmartv.github.io/main1/version.json';
  // ======================================================

  const STORAGE_KEY = 'primeblog_last_update_check';
  const CHECK_COOLDOWN_MS = 1000 * 60 * 30; // 30 minutes between checks

  function shouldCheck() {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (!last) return true;
      return Date.now() - parseInt(last, 10) > CHECK_COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function markChecked() {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch (e) {}
  }

  function showUpdateModal(data) {
    const old = document.getElementById('apk-update-modal');
    if (old) old.remove();

    const changelogHtml = (data.changelog && data.changelog.length)
      ? `<ul class="apk-changelog">${data.changelog.map(item => `<li>${item}</li>`).join('')}</ul>`
      : '';

    const modal = document.createElement('div');
    modal.id = 'apk-update-modal';
    modal.innerHTML = `
      <div class="apk-overlay">
        <div class="apk-card">
          <div class="apk-badge">UPDATE</div>
          <h2 class="apk-title">${data.title || 'Update Available'}</h2>
          <p class="apk-version">Version ${data.version || ''}</p>
          <p class="apk-message">${(data.message || 'A new version is available.').replace(/\n/g, '<br>')}</p>
          ${changelogHtml}
          <div class="apk-actions">
            <a href="${data.apkUrl}" class="apk-btn apk-btn-primary" target="_blank" rel="noopener">
              Download Update
            </a>
            ${data.forceUpdate ? '' : `
              <button type="button" class="apk-btn apk-btn-secondary" id="apk-later-btn">
                Later
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const laterBtn = document.getElementById('apk-later-btn');
    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        modal.remove();
      });
    }

    // Prevent background scroll while modal is open
    document.body.style.overflow = 'hidden';
    modal.addEventListener('remove', () => {
      document.body.style.overflow = '';
    }, { once: true });

    // Also restore overflow when modal is removed via later button
    const observer = new MutationObserver(() => {
      if (!document.getElementById('apk-update-modal')) {
        document.body.style.overflow = '';
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  async function checkForUpdate(force = false) {
    if (!force && !shouldCheck()) return;

    try {
      const res = await fetch(VERSION_URL + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return;

      const data = await res.json();
      markChecked();

      if (data.versionCode && Number(data.versionCode) > CURRENT_VERSION_CODE) {
        showUpdateModal(data);
      }
    } catch (e) {
      console.log('[Prime Blog] Update check failed:', e);
    }
  }

  // Run when DOM is ready
  function init() {
    checkForUpdate();

    // Re-check when user returns to the app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Optional: expose for manual test
  window.PrimeBlogUpdate = {
    check: () => checkForUpdate(true),
    currentVersionCode: CURRENT_VERSION_CODE
  };
})();
