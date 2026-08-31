Prime Blog — APK Auto Update (Android only)
==========================================

WHAT WAS ADDED
--------------
- js/update-checker.js   → checks for new APK version (Android WebView only)
- version.json           → remote version info (also upload this to GitHub Pages)

HOW IT WORKS
------------
1. User opens the APK (Android WebView).
2. Script detects it is running inside the app (not a normal browser).
3. It fetches: https://nemmartv.github.io/main1/version.json
4. If versionCode on server is higher than the one inside the APK → show update popup.

Desktop / Chrome / Safari = NO popup (by design).

IMPORTANT — UPLOAD version.json ONLINE
--------------------------------------
Even if the APK is offline-packaged, version.json must be online so you can
change the version without rebuilding the APK every time for the *server side*.

Upload version.json to:
  https://nemmartv.github.io/main1/version.json

(same folder as your live site)

WHEN YOU RELEASE A NEW APK
--------------------------
1. Edit version.json (online + inside this project):
   - increase "versionCode" (e.g. 214)
   - update "version", "message", "apkUrl", "changelog"

2. Edit js/update-checker.js:
   - change CURRENT_VERSION_CODE to the same number (214)

3. Rebuild / re-package the APK with this full offline folder.

4. Upload the new APK to MediaFire and put that link in version.json.

TEST ON PC (optional)
---------------------
In browser console:
  localStorage.setItem('pb_force_apk_check', '1')
  PrimeBlogUpdate.check()

To disable force:
  localStorage.removeItem('pb_force_apk_check')
