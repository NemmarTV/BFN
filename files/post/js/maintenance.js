/* =========================================================
   LILOANUNITED - MAINTENANCE MODE v2 (STATIC/GITHUB PAGES)
   - One switch maintenance on/off
   - GitHub Pages subfolder safe
   - Allowlist pages + folders
   - Admin bypass (password + optional secret URL)
   - Bypass expires (hours)
   - Countdown to end (optional)
   ========================================================= */

(() => {
  /* =========================
     CONFIG (EDIT THESE)
     ========================= */

  // ✅ MASTER SWITCH
  const MAINTENANCE_ON = false; // true = ON, false = OFF

  // ✅ Admin password (change this)
  const ADMIN_PASSWORD = "luadmin2026";

  // ✅ How long bypass lasts (hours)
  const BYPASS_EXPIRES_HOURS = 6;

  // ✅ Optional: maintenance end time (for countdown)
  // Set to null to hide countdown
  // Example: "2026-02-20T18:00:00+08:00"
  const MAINTENANCE_END_ISO = null;

  // ✅ Always-allowed routes/pages (even during maintenance)
  // Use leading "/" path fragments for matching
  const ALLOWLIST = [
    "/maintenance.html",
    "/about.html"
  ];

  // ✅ Always-allowed folders/assets (so CSS/JS/images still load)
  // Add other asset folders if you have them.
  const ALLOW_FOLDERS = [
    "/css/",
    "/js/",
    "/images/",
    "/files/"
  ];

  // ✅ Maintenance page filename (must exist)
  const MAINTENANCE_PAGE = "maintenance.html";

  /* =========================
     INTERNALS (DO NOT TOUCH)
     ========================= */
  const KEY = "LU_MAINT_BYPASS_V2";

  const stripQSHash = (s) => (s || "").split("?")[0].split("#")[0];

  // GitHub pages: pathname may include /repo-name/...
  const path = stripQSHash(window.location.pathname);

  // If visiting "/" treat as "/index.html" for allow checks
  const currentPath = path.endsWith("/") ? path + "index.html" : path;

  // Determine base directory for relative redirect:
  // e.g. /repo/any/page.html -> base = /repo/any/
  const baseDir = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);

  const now = Date.now();

  const readBypass = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.until) return null;
      if (now > Number(data.until)) {
        localStorage.removeItem(KEY);
        return null;
      }
      return data;
    } catch {
      localStorage.removeItem(KEY);
      return null;
    }
  };

  const setBypass = () => {
    const until = now + BYPASS_EXPIRES_HOURS * 60 * 60 * 1000;
    localStorage.setItem(KEY, JSON.stringify({ until }));
  };

  const clearBypass = () => localStorage.removeItem(KEY);

  const isAllowedByPage = () =>
    ALLOWLIST.some((p) => currentPath.endsWith(p) || path.endsWith(p));

  const isAllowedByFolder = () =>
    ALLOW_FOLDERS.some((folder) => currentPath.includes(folder) || path.includes(folder));

  const bypassData = readBypass();
  const bypassActive = !!bypassData;

  // Secret URL bypass:
  // example: https://site/contact.html?admin=luadmin2026
  const params = new URLSearchParams(window.location.search);
  const adminParam = params.get("admin");
  if (adminParam && adminParam === ADMIN_PASSWORD) {
    setBypass();
    // clean URL (remove ?admin=)
    params.delete("admin");
    const clean =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "") +
      window.location.hash;
    window.history.replaceState({}, "", clean);
  }

  // Re-evaluate bypass after possible URL bypass
  const bypassActiveNow = !!readBypass();

  const allowed = isAllowedByPage() || isAllowedByFolder();

  // Redirect logic
  if (MAINTENANCE_ON && !allowed && !bypassActiveNow) {
    // redirect to maintenance page relative to current directory
    window.location.replace(baseDir + MAINTENANCE_PAGE);
    return;
  }

  // Expose a tiny API for maintenance.html
  window.LU_MAINT = {
    on: MAINTENANCE_ON,
    endISO: MAINTENANCE_END_ISO,
    expiresHours: BYPASS_EXPIRES_HOURS,
    bypass(password) {
      if (password === ADMIN_PASSWORD) {
        setBypass();
        return true;
      }
      return false;
    },
    logout() {
      clearBypass();
    },
    bypassUntil() {
      const data = readBypass();
      return data ? Number(data.until) : null;
    }
  };
})();
