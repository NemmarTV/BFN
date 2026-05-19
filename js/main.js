/* =========================
   PrimeTactics — main.js v20.5.1
   - Mobile menu toggle
   - Active nav highlight
   - Theme toggle with localStorage
========================= */

(function () {
  const root = document.documentElement;

  // ---------- Theme ----------
  const THEME_KEY = "pt_theme";
  const themeToggle = document.querySelector("[data-theme-toggle]");

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggle) {
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) icon.textContent = theme === "light" ? "☀" : "☾";
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") { setTheme(saved); return; }
    setTheme("dark");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
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
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const inside = navLinks.contains(target) || navToggle.contains(target);
      if (!inside) closeMenu();
    });
    navLinks.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  // ---------- Active Nav ----------
  function normalizePath(path) {
    if (!path) return "index.html";
    const p = path.split("?")[0].split("#")[0];
    const file = p.endsWith("/") ? "index.html" : p.substring(p.lastIndexOf("/") + 1);
    return file || "index.html";
  }
  const currentFile = normalizePath(window.location.pathname);
  const navMap = {
    "index.html": "home", "about.html": "about", "blog.html": "blog",
    "event.html": "events", "download.html": "downloads", "contact.html": "contact",
  };
  const activeKey = navMap[currentFile] || "home";
  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.getAttribute("data-nav") === activeKey) link.classList.add("active");
  });

  // ---------- Scroll reveal ----------
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));
  }
})();
