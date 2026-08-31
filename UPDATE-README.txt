Prime Blog — APK Update FIX
===========================

WHY UPDATE DID NOT SHOW (common causes)
---------------------------------------
1. CURRENT_VERSION_CODE in APK was EQUAL to version.json (215 == 215)
   → No popup. Fixed: APK code = 214, server = 216

2. WebView detection was too strict
   → Fixed: works with most HTML-to-APK tools on any Android

3. If your APK loads the ONLINE website (URL mode):
   You MUST upload js/update-checker.js to GitHub Pages
   https://nemmartv.github.io/main1/js/update-checker.js
   (Previously this file was MISSING online — 404)

4. Cooldown / cache
   → Cooldown reduced to 5 minutes

WHAT TO DO NOW
--------------
A) OFFLINE APK (ZIP packaged into APK)
   1. Use this full ZIP to rebuild APK
   2. Upload version.json to GitHub (see content below)
   3. Install new APK over old one for testing

B) ONLINE URL APK (APK opens https://nemmartv.github.io/main1/)
   1. Upload js/update-checker.js to GitHub repo js/ folder
   2. Upload version.json to repo root
   3. Make sure every page includes:
      <script src="js/update-checker.js"></script>
   4. Rebuild APK only when you change CURRENT_VERSION_CODE

version.json (upload to GitHub root)
------------------------------------
{
  "version": "21.6",
  "versionCode": 216,
  "apkUrl": "https://www.mediafire.com/file/9jxpqwqsohpnida/PrimeblogV25.apk/file",
  "title": "New Update Available!",
  "message": "Prime Blog V21.6 is ready.",
  "forceUpdate": false,
  "changelog": ["Update opens browser", "Bug fixes"]
}

NUMBERS
-------
Inside this ZIP script:  CURRENT_VERSION_CODE = 214
Online version.json:     versionCode = 216
→ Popup WILL show (216 > 214)

When this build is your "latest" release, set BOTH to the same number
so users who already updated stop seeing the popup.

TEST ON PHONE
-------------
1. Install APK built from this ZIP
2. Open app (needs internet)
3. Popup should appear within a few seconds
4. Tap Download Update → Chrome/browser opens MediaFire

DEBUG (if remote debugging enabled)
-----------------------------------
PrimeBlogUpdate.check()
PrimeBlogUpdate.isApp()
PrimeBlogUpdate.currentVersionCode
PrimeBlogUpdate.clearCooldown()
