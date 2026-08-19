/* =========================
   Prime Blog — Intro loading splash
   Logo: images/logo-prime.png
========================= */
(function () {
  var MIN_MS = 1800;
  var FADE_MS = 700;
  var STORAGE_KEY = "pb_intro_seen_session";

  function asset(path) {
    var p = window.location.pathname || "";
    if (p.indexOf("/files/package/") !== -1) return "../../" + path;
    if (p.indexOf("/files/post/") !== -1) return "../../" + path;
    return path;
  }

  // Show once per browser session (every new tab session gets intro)
  // Change to localStorage + long TTL if you want once-ever
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
  } catch (_) {}

  function build() {
    document.body.classList.add("pb-intro-lock");

    var el = document.createElement("div");
    el.className = "pb-intro";
    el.id = "pbIntro";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Loading Prime Blog");

    el.innerHTML =
      '<div class="pb-intro-ring">' +
      '<img class="pb-intro-logo" src="' +
      asset("images/logo-prime.png") +
      '" alt="Prime Blog" onerror="this.src=\'' +
      asset("images/pt-logo.png") +
      "'\" />" +
      "</div>" +
      '<div class="pb-intro-brand">PRIME BLOG</div>' +
      '<div class="pb-intro-bar"><span></span></div>' +
      '<div class="pb-intro-sub">Loading experience…</div>';

    document.body.appendChild(el);

    var start = Date.now();

    function finish() {
      var waited = Date.now() - start;
      var left = Math.max(0, MIN_MS - waited);
      setTimeout(function () {
        el.classList.add("is-done");
        document.body.classList.remove("pb-intro-lock");
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch (_) {}
        setTimeout(function () {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, FADE_MS + 50);
      }, left);
    }

    // Wait for logo image (or fail) then finish
    var img = el.querySelector(".pb-intro-logo");
    if (img && !img.complete) {
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      // Safety timeout
      setTimeout(finish, MIN_MS + 800);
    } else {
      finish();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
