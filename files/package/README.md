# Prime Blog CF-PH Package v20.5.1

## Overview
Upgraded download page for Prime Blog (formerly LiloanUnited) CF-PH exclusive package.

### Features
✅ **Prime Blog v20.5.1 Design System**
- Matches global site branding (dual red/blue theme)
- Orbitron + Exo 2 fonts
- Glassmorphism cards, gradient buttons
- Animated logo ring on server lock screen

✅ **Server Lock Protection**
- Fixed countdown (8 seconds) before enter button activates
- Password gate: **2000** (change in f12.js)
- Anti-cheat scanning animation
- F12 & DevTools blocker

✅ **Download Modal**
- Progress bar simulation
- Password confirmation: **cfphlu2026** (change in main.js)
- Show/hide password toggle
- File download trigger

✅ **Responsive Design**
- Mobile-friendly lock screen & modal
- Sticky header with nav links
- Mini footer with footer links

## File Structure
```
/package
  ├── package.html          (Main page)
  ├── CF-PH.rar             (Download file)
  ├── css/
  │   └── style.css         (v20.5.1 styles)
  ├── js/
  │   ├── main.js           (Modal + download logic)
  │   └── f12.js            (Lock screen + anti-cheat)
  └── README.md             (This file)
```

## Passwords
| Gate | Password | Location |
|------|----------|----------|
| Server Lock | `2000` | `js/f12.js` line ~14 |
| Download Modal | `cfphlu2026` | `js/main.js` line ~5 |

## Integration
This page lives in the Prime Blog download folder:
```
prime-blog/
  ├── files/
  │   └── package/
  │       ├── package.html  ← Download folder page
  │       ├── css/style.css
  │       ├── js/main.js
  │       ├── js/f12.js
  │       └── CF-PH.rar
```

The package.html links back to:
- `../../index.html` (home)
- `../../blog.html` (updates)
- `../../download.html` (all downloads)
- `../../contact.html` (contact)
- `../../images/pt-logo.png` (logo)

## Customization

### Change Server Lock Password
Edit `js/f12.js` line ~14:
```javascript
const LOCK_PASSWORD = "2000"; // ← Change this
```

### Change Download Password
Edit `js/main.js` line ~5:
```javascript
const PASSWORD = "cfphlu2026"; // ← Change this
```

### Change File Path
Edit `package.html` line ~111:
```html
<div class="card-inner" data-file="CF-PH.rar"> <!-- ← Path to your file -->
```

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Known Limitations
- DevTools blocker may not work on all browsers
- Password-protected downloads are NOT truly secure — use server-side authentication for real protection
- This is a UX gate, not a security measure

## Deployment
1. Copy all files to `prime-blog/files/package/`
2. Ensure `images/pt-logo.png` exists in `prime-blog/images/`
3. Update download links on main `download.html` if needed
4. Test on mobile & desktop browsers

---

**Version:** v20.5.1  
**Updated:** May 2026  
**Brand:** Prime Blog (Formerly LiloanUnited CFPH)
