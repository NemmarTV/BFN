/* =========================
   Prime Blog — main.js v21.0
   Theme, nav, scroll, reveals, FAQ, ripple, stats
========================= */
(function () {
  const root = document.documentElement;

  // Pause decorative CSS animations when tab is hidden (saves FPS/CPU)
  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("pb-hidden", document.visibilityState === "hidden");
  });


  // Theme — always dark (no toggle)
  function initTheme() {
    root.setAttribute("data-theme", "dark");
    try { localStorage.setItem("pb_theme", "dark"); } catch (e) {}
  }
  initTheme();

  // Mobile menu
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector("[data-navlinks]");

  function setMenuOpen(isOpen) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !navLinks.classList.contains("open");
      setMenuOpen(willOpen);
    });
    document.addEventListener("click", (e) => {
      if (!(e.target instanceof Element)) return;
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) closeMenu();
    });
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100) closeMenu();
    });
  }

  // Active nav
  function normalizePath(path) {
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
    "contact.html": "contact", "reels.html": "reels", "donate.html": "donate",
  };
  const activeKey = navMap[currentFile] || "home";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.getAttribute("data-nav") === activeKey) link.classList.add("active");
  });

  // Sticky header shrink
  const header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Scroll reveal
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length > 0 && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  // Animated counters
  function animateValue(el, end, duration) {
    const start = 0;
    const startTime = performance.now();
    const isPlus = String(end).includes("+");
    const num = parseInt(String(end).replace(/\D/g, ""), 10) || 0;
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * num);
      el.textContent = isPlus ? current + "+" : String(current);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = String(end);
    }
    requestAnimationFrame(step);
  }

  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const cObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const target = e.target.getAttribute("data-count");
            animateValue(e.target, target, 1600);
            cObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cObs.observe(el));
  }

  // FAQ accordion
  document.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });

  // Button ripple position
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty("--x", ((e.clientX - rect.left) / rect.width) * 100 + "%");
      btn.style.setProperty("--y", ((e.clientY - rect.top) / rect.height) * 100 + "%");
    });
  });

  // Rebrand banner close
  const banner = document.querySelector(".rebrand-banner");
  const bannerClose = document.querySelector(".rebrand-banner .banner-close");
  if (bannerClose && banner) {
    if (sessionStorage.getItem("pb_banner_closed") === "1") banner.classList.add("hidden");
    bannerClose.addEventListener("click", () => {
      banner.classList.add("hidden");
      sessionStorage.setItem("pb_banner_closed", "1");
    });
  }

  // Simple countdown (tournament)
  const countdownEl = document.getElementById("tournamentCountdown");
  if (countdownEl) {
    const end = new Date(countdownEl.getAttribute("data-end") || "2026-12-31T20:00:00+08:00").getTime();
    function tick() {
      const now = Date.now();
      let diff = Math.max(0, end - now);
      const d = Math.floor(diff / 86400000);
      diff %= 86400000;
      const h = Math.floor(diff / 3600000);
      diff %= 3600000;
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const set = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(v).padStart(2, "0");
      };
      set("cdDays", d);
      set("cdHours", h);
      set("cdMins", m);
      set("cdSecs", s);
    }
    tick();
    setInterval(tick, 1000);
  }
})();
