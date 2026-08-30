# Prime Blog – APK Auto Update Checker

Ready-to-use package so your HTML → APK app can detect new versions automatically.

## Files included

| File | Purpose |
|------|---------|
| `version.json` | Server-side version info (upload to GitHub Pages root) |
| `js/update-checker.js` | Main checker script |
| `css/update-checker.css` | Nice dark modal that matches esports style |
| `snippet-to-add.html` | Exact code you copy into your pages |
| `README.md` | This guide |

## Quick Setup (3 steps)

### 1. Upload `version.json`

Put `version.json` in the same folder as your main site files  
(so it is available at `https://nemmartv.github.io/main1/version.json`).

### 2. Add the CSS + JS to your site

**Option A – separate files (recommended)**  
- Copy the `js/` and `css/` folders into your project  
- Add these two lines before `</body>` on **every page**:

```html
<link rel="stylesheet" href="css/update-checker.css">
<script src="js/update-checker.js"></script>
```

**Option B – inline**  
Copy the content of `update-checker.css` into a `<style>` tag  
and the content of `update-checker.js` into a `<script>` tag.

### 3. Set the current version

Open `js/update-checker.js` and change this line:

```js
const CURRENT_VERSION_CODE = 213;
```

This number must match the version that is **inside the APK you just built**.

---

## How to release a new APK update

Every time you create a new APK:

1. **Edit `version.json`**
   ```json
   {
     "version": "21.4",
     "versionCode": 214,
     "apkUrl": "https://www.mediafire.com/file/YOUR_NEW_LINK/Primeblog.apk/file",
     "title": "Prime Blog V21.4 is here!",
     "message": "New features and improvements.",
     "forceUpdate": false,
     "changelog": [
       "Faster loading",
       "Bug fixes",
       "New UI polish"
     ]
   }
   ```

2. **Edit `js/update-checker.js`**  
   Change `CURRENT_VERSION_CODE` to `214` (same number).

3. **Upload the new `version.json`** to GitHub Pages.

4. **Rebuild the APK** with the updated `update-checker.js` (the one that has `CURRENT_VERSION_CODE = 214`).

5. Upload the new APK to MediaFire (or any host) and put that link in `version.json`.

Users who still have the old APK will see the update popup the next time they open the app.

---

## Options

| Setting | Description |
|---------|-------------|
| `forceUpdate: true` | User cannot close the popup (must update) |
| `forceUpdate: false` | Shows a "Later" button |
| `CHECK_COOLDOWN_MS` | How often to check (default 30 minutes) |

## Test it

After adding the script, open the browser console and run:

```js
PrimeBlogUpdate.check()
```

This forces an update check immediately.

## Notes

- Works with any HTML-to-APK tool (WebView based).
- Uses `localStorage` so it doesn’t spam the server.
- Automatically re-checks when the user returns to the app.
- Modal is mobile-friendly and dark-themed.
