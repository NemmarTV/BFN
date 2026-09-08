/* =========================
   LiloanUnited - main.js
   - Mobile menu toggle
   - Active nav highlight
   - Theme toggle with localStorage
========================= */

(function () {
  const root = document.documentElement;

    // ---------- Theme — always dark (no toggle) ----------
  function initTheme() {
    root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("lu_theme", "dark"); } catch (e) {}
  }
  initTheme();


  // ---------- Mobile Menu ----------
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector("[data-navlinks]");

  function closeMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const clickedInside =
        navLinks.contains(target) ||
        navToggle.contains(target) ||
        target.closest(".nav-links") ||
        target.closest(".nav-toggle");

      if (!clickedInside) closeMenu();
    });

    // Close on link click (mobile)
    navLinks.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => closeMenu());
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // ---------- Active Nav Highlight ----------
  function normalizePath(path) {
    // handle /folder/index.html and plain /
    if (!path) return "index.html";
    const p = path.split("?")[0].split("#")[0];
    const file = p.endsWith("/") ? "index.html" : p.substring(p.lastIndexOf("/") + 1);
    return file || "index.html";
  }

  const currentFile = normalizePath(window.location.pathname);

  const navMap = {
    "index.html": "home",
    "about.html": "about",
    "blog.html": "blog",
    "event.html": "events",
    "download.html": "downloads",
    "contact.html": "contact",
  };

  const activeKey = navMap[currentFile] || "home";

  document.querySelectorAll("[data-nav]").forEach((link) => {
    const key = link.getAttribute("data-nav");
    if (key === activeKey) link.classList.add("active");
  });
})();
