/* =========================
   Prime Blog — YouTube Music style player
   - Continues across page navigation (localStorage + resume)
   - Auto-resumes after navigation when browser allows
   - Fallback: resume on any user gesture if autoplay blocked
   - Lighter progress updates for better FPS
========================= */
(function () {
  function asset(path) {
    var p = window.location.pathname || "";
    if (p.indexOf("/files/package/") !== -1) return "../../" + path;
    if (p.indexOf("/files/post/") !== -1) return "../../" + path;
    return path;
  }

  var PLAYLIST = [
    {
      id: "landing_loop",
      title: "Landing Loop",
      artist: "Prime Blog · BGM",
      src: "sounds/landing_loop.mp3",
    },
    {
      id: "zhujiemian_loop1",
      title: "Zhujiemian Loop",
      artist: "Prime Blog · BGM",
      src: "sounds/zhujiemian_loop1.mp3",
    },
    {
      id: "Unapologetic",
      title: "Chyde - Unapologetic",
      artist: "Chyde · BGM",
      src: "sounds/Chyde_Unapologetic.mp3",
    },
    {
      id: "BGM Track 1",
      title: "BGM Track 1",
      artist: "CFPH Theme · BGM",
      src: "sounds/bgm_track1_loop.mp3",
    },
  ];

  var STORAGE_KEY = "pb_player_v4";
  var index = 0;
  var audio = null;
  var seeking = false;
  var persistTimer = null;
  var progressTimer = null;
  var pendingResume = false;
  var gestureBound = false;

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveState(partial) {
    try {
      var cur = loadState();
      var next = Object.assign({}, cur, partial, { updated: Date.now() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  }

  function currentTrack() {
    return PLAYLIST[index] || PLAYLIST[0];
  }

  function findIndexById(id) {
    for (var i = 0; i < PLAYLIST.length; i++) {
      if (PLAYLIST[i].id === id) return i;
    }
    return 0;
  }

  function persistNow() {
    if (!audio) return;
    var t = currentTrack();
    var bar = document.getElementById("pbPlayer");
    saveState({
      trackId: t.id,
      index: index,
      time: audio.currentTime || 0,
      playing: !audio.paused && !audio.ended,
      volume: audio.muted ? 0 : audio.volume,
      muted: !!audio.muted,
      loop: !!audio.loop,
      hidden: bar ? bar.classList.contains("hidden") : !!loadState().hidden,
    });
  }

  function schedulePersist() {
    if (persistTimer) return;
    persistTimer = setTimeout(function () {
      persistTimer = null;
      persistNow();
    }, 400);
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) return "0:00";
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function setPlayingUI(playing) {
    var btn = document.getElementById("pbPlay");
    if (btn) {
      btn.innerHTML = playing
        ? '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
      btn.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
    var art = document.getElementById("pbArtWrap");
    if (art) art.classList.toggle("is-playing", !!playing);
  }

  function updateProgressUI() {
    if (!audio || seeking) return;
    var seek = document.getElementById("pbSeek");
    var cur = document.getElementById("pbCur");
    var dur = document.getElementById("pbDur");
    var fill = document.getElementById("pbSeekFill");
    if (!seek || !cur || !dur) return;
    var ratio = 0;
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      ratio = audio.currentTime / audio.duration;
      seek.value = String(Math.round(ratio * 1000));
      dur.textContent = fmt(audio.duration);
    }
    cur.textContent = fmt(audio.currentTime || 0);
    if (fill) fill.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
  }

  function startProgressLoop() {
    if (progressTimer) return;
    progressTimer = setInterval(function () {
      if (!audio || audio.paused) return;
      updateProgressUI();
      schedulePersist();
    }, 500);
  }

  function stopProgressLoop() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function tryPlay() {
    if (!audio) return Promise.resolve(false);
    var p = audio.play();
    if (p && typeof p.then === "function") {
      return p
        .then(function () {
          setPlayingUI(true);
          pendingResume = false;
          startProgressLoop();
          persistNow();
          return true;
        })
        .catch(function () {
          setPlayingUI(false);
          pendingResume = true;
          bindGestureResume();
          return false;
        });
    }
    setPlayingUI(!audio.paused);
    if (!audio.paused) {
      pendingResume = false;
      startProgressLoop();
    }
    persistNow();
    return Promise.resolve(!audio.paused);
  }

  function bindGestureResume() {
    if (gestureBound) return;
    gestureBound = true;
    function onGesture() {
      if (!pendingResume || !audio) return;
      tryPlay().then(function (ok) {
        if (ok) {
          document.removeEventListener("pointerdown", onGesture, true);
          document.removeEventListener("keydown", onGesture, true);
          document.removeEventListener("touchstart", onGesture, true);
          gestureBound = false;
        }
      });
    }
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    document.addEventListener("touchstart", onGesture, { capture: true, passive: true });
  }

  function loadTrack(i, autoplay, resumeTime) {
    index = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    var t = currentTrack();
    var titleEl = document.getElementById("pbTitle");
    var artistEl = document.getElementById("pbArtist");
    if (titleEl) titleEl.textContent = t.title;
    if (artistEl) artistEl.textContent = t.artist;

    var nextSrc = asset(t.src);
    var sameFile = false;
    try {
      var absNext = new URL(nextSrc, window.location.href).href;
      sameFile =
        !!audio.src &&
        (audio.src === absNext ||
          audio.src.indexOf(t.src) !== -1 ||
          (audio.currentSrc && audio.currentSrc.indexOf(t.src) !== -1));
    } catch (e) {}

    if (!sameFile) {
      audio.src = nextSrc;
      audio.load();
    }

    function applyTimeAndPlay() {
      if (typeof resumeTime === "number" && resumeTime > 0 && isFinite(resumeTime)) {
        try {
          var max =
            audio.duration && isFinite(audio.duration) ? audio.duration - 0.25 : resumeTime;
          audio.currentTime = Math.max(0, Math.min(resumeTime, max));
        } catch (e) {}
      }
      updateProgressUI();
      if (autoplay) {
        tryPlay();
      } else {
        setPlayingUI(false);
        stopProgressLoop();
      }
      persistNow();
      updateMediaSession();
    }

    if (audio.readyState >= 1) {
      applyTimeAndPlay();
    } else {
      audio.addEventListener("loadedmetadata", applyTimeAndPlay, { once: true });
      setTimeout(function () {
        if (audio.readyState >= 1) applyTimeAndPlay();
      }, 250);
    }
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    try {
      var t = currentTrack();
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: "Prime Blog",
        artwork: [
          { src: asset("images/pt-logo.png"), sizes: "96x96", type: "image/png" },
          { src: asset("images/pt-logo.png"), sizes: "256x256", type: "image/png" },
        ],
      });
      navigator.mediaSession.setActionHandler("play", function () {
        tryPlay();
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        if (audio) {
          audio.pause();
          setPlayingUI(false);
          stopProgressLoop();
          persistNow();
        }
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        loadTrack(index - 1, true, 0);
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        loadTrack(index + 1, true, 0);
      });
    } catch (e) {}
  }

  function icon(name) {
    var icons = {
      prev: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
      next: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
      play: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
      loop: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      vol: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.74 2.5-2.26 2.5-4.02z"/></svg>',
      mute: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
    };
    return icons[name] || "";
  }

  function buildUI() {
    if (document.getElementById("pbPlayer")) return;

    var state = loadState();
    if (typeof state.index === "number") index = state.index;
    if (state.trackId) index = findIndexById(state.trackId);

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pb-player-toggle";
    toggle.id = "pbPlayerToggle";
    toggle.title = "Show / hide music player";
    toggle.setAttribute("aria-label", "Toggle music player");
    toggle.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';
    document.body.appendChild(toggle);

    var bar = document.createElement("div");
    bar.className = "pb-player" + (state.hidden ? " hidden" : "");
    bar.id = "pbPlayer";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Music player");

    var track = currentTrack();
    bar.innerHTML =
      '<div class="pb-seek-track" id="pbSeekTrack">' +
      '<div class="pb-seek-fill" id="pbSeekFill"></div>' +
      '<input type="range" class="pb-seek" id="pbSeek" min="0" max="1000" value="0" step="1" aria-label="Seek" />' +
      "</div>" +
      '<div class="pb-player-inner">' +
      '<div class="pb-player-meta">' +
      '<div class="pb-art-wrap" id="pbArtWrap">' +
      '<img class="pb-player-art" id="pbArt" src="' +
      asset("images/pt-logo.png") +
      '" alt="" loading="lazy" />' +
      "</div>" +
      '<div class="pb-player-info">' +
      '<div class="pb-player-title" id="pbTitle">' +
      track.title +
      "</div>" +
      '<div class="pb-player-artist" id="pbArtist">' +
      track.artist +
      "</div></div></div>" +
      '<div class="pb-player-center">' +
      '<div class="pb-player-controls">' +
      '<button type="button" class="pb-btn" id="pbPrev" title="Previous" aria-label="Previous">' +
      icon("prev") +
      "</button>" +
      '<button type="button" class="pb-btn pb-btn-play" id="pbPlay" title="Play / Pause" aria-label="Play">' +
      icon("play") +
      "</button>" +
      '<button type="button" class="pb-btn" id="pbNext" title="Next" aria-label="Next">' +
      icon("next") +
      "</button>" +
      '<button type="button" class="pb-btn" id="pbLoop" title="Loop" aria-label="Loop">' +
      icon("loop") +
      "</button>" +
      "</div>" +
      '<div class="pb-time-row"><span id="pbCur">0:00</span><span class="pb-time-sep"> / </span><span id="pbDur">0:00</span></div>' +
      "</div>" +
      '<div class="pb-player-right">' +
      '<button type="button" class="pb-btn" id="pbMute" title="Mute" aria-label="Mute">' +
      icon("vol") +
      "</button>" +
      '<input type="range" class="pb-volume" id="pbVol" min="0" max="100" value="70" aria-label="Volume" />' +
      "</div></div>";

    document.body.appendChild(bar);

    audio = new Audio();
    audio.preload = "auto";
    audio.loop = state.loop !== false;
    var vol = typeof state.volume === "number" ? state.volume : 0.7;
    audio.volume = Math.max(0, Math.min(1, vol));
    audio.muted = !!state.muted;

    var volEl = document.getElementById("pbVol");
    var muteBtn = document.getElementById("pbMute");
    var loopBtn = document.getElementById("pbLoop");
    if (volEl) volEl.value = String(Math.round(audio.volume * 100));
    if (muteBtn) muteBtn.innerHTML = audio.muted || audio.volume === 0 ? icon("mute") : icon("vol");
    if (loopBtn && audio.loop) loopBtn.classList.add("active");

    bindEvents();

    var resumeTime = typeof state.time === "number" ? state.time : 0;
    var shouldPlay = !!state.playing;
    loadTrack(index, shouldPlay, resumeTime);

    window.addEventListener("pageshow", function () {
      if (!audio) return;
      var st = loadState();
      if (st.playing && audio.paused) {
        pendingResume = true;
        tryPlay();
      }
    });
  }

  function bindEvents() {
    var playBtn = document.getElementById("pbPlay");
    var prevBtn = document.getElementById("pbPrev");
    var nextBtn = document.getElementById("pbNext");
    var loopBtn = document.getElementById("pbLoop");
    var seek = document.getElementById("pbSeek");
    var vol = document.getElementById("pbVol");
    var muteBtn = document.getElementById("pbMute");
    var toggle = document.getElementById("pbPlayerToggle");
    var bar = document.getElementById("pbPlayer");

    bar.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    playBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (audio.paused) {
        tryPlay();
      } else {
        audio.pause();
        setPlayingUI(false);
        stopProgressLoop();
        persistNow();
      }
    });

    prevBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if ((audio.currentTime || 0) > 3) {
        audio.currentTime = 0;
        persistNow();
      } else {
        loadTrack(index - 1, true, 0);
      }
    });

    nextBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      loadTrack(index + 1, true, 0);
    });

    loopBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      audio.loop = !audio.loop;
      loopBtn.classList.toggle("active", audio.loop);
      persistNow();
    });

    muteBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      audio.muted = !audio.muted;
      muteBtn.innerHTML = audio.muted || audio.volume === 0 ? icon("mute") : icon("vol");
      persistNow();
    });

    if (vol) {
      vol.addEventListener("input", function () {
        var v = Math.max(0, Math.min(100, Number(vol.value) || 0)) / 100;
        audio.volume = v;
        audio.muted = v === 0;
        muteBtn.innerHTML = audio.muted || v === 0 ? icon("mute") : icon("vol");
        schedulePersist();
      });
    }

    function seekFromEvent(e) {
      if (!audio || !audio.duration || !isFinite(audio.duration)) return;
      var trackEl = document.getElementById("pbSeekTrack");
      if (!trackEl) return;
      var rect = trackEl.getBoundingClientRect();
      var x = (e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - rect.left;
      var ratio = Math.max(0, Math.min(1, x / rect.width));
      audio.currentTime = ratio * audio.duration;
      updateProgressUI();
      schedulePersist();
    }

    if (seek) {
      seek.addEventListener("pointerdown", function () {
        seeking = true;
      });
      seek.addEventListener("input", function () {
        if (!audio || !audio.duration) return;
        var ratio = (Number(seek.value) || 0) / 1000;
        var fill = document.getElementById("pbSeekFill");
        if (fill) fill.style.width = ratio * 100 + "%";
        var cur = document.getElementById("pbCur");
        if (cur) cur.textContent = fmt(ratio * audio.duration);
      });
      seek.addEventListener("change", function () {
        if (!audio || !audio.duration) return;
        audio.currentTime = ((Number(seek.value) || 0) / 1000) * audio.duration;
        seeking = false;
        updateProgressUI();
        persistNow();
      });
      seek.addEventListener("pointerup", function () {
        seeking = false;
      });
    }

    var seekTrack = document.getElementById("pbSeekTrack");
    if (seekTrack) {
      seekTrack.addEventListener("click", seekFromEvent);
    }

    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        bar.classList.toggle("hidden");
        persistNow();
      });
    }

    audio.addEventListener("ended", function () {
      if (audio.loop) return;
      loadTrack(index + 1, true, 0);
    });
    audio.addEventListener("play", function () {
      setPlayingUI(true);
      startProgressLoop();
      pendingResume = false;
    });
    audio.addEventListener("pause", function () {
      setPlayingUI(false);
      stopProgressLoop();
      schedulePersist();
    });
    audio.addEventListener("timeupdate", function () {
      if (!progressTimer) updateProgressUI();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Space" && e.key !== " ") return;
      var tag = (e.target && e.target.tagName) || "";
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].indexOf(tag) !== -1) return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      playBtn.click();
    });

    function flush() {
      persistNow();
    }
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
    });

    document.addEventListener(
      "click",
      function (e) {
        var a = e.target && e.target.closest && e.target.closest("a[href]");
        if (!a) return;
        var href = a.getAttribute("href") || "";
        if (!href || href.charAt(0) === "#" || href.indexOf("http") === 0 || href.indexOf("mailto:") === 0)
          return;
        persistNow();
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }

  // APK update notice above player
  (function () {
    var KEY = "pb_apk_notice_v21_dismissed";
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch (e) {}
    if (document.getElementById("pbApkNotice")) {
      var closeBtn = document.getElementById("pbApkNoticeClose");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          var el = document.getElementById("pbApkNotice");
          if (el) el.classList.add("hidden");
          try {
            localStorage.setItem(KEY, "1");
          } catch (e) {}
        });
      }
      return;
    }
    var wrap = document.createElement("div");
    wrap.className = "pb-apk-notice";
    wrap.id = "pbApkNotice";
    wrap.setAttribute("role", "status");
    wrap.innerHTML =
      '<div class="pb-apk-notice-inner">' +
      '<div class="pb-apk-notice-text"><strong>New update:</strong> Primeblog V21 website APK is available for Android.</div>' +
      '<a href="download.html#primeblog-apk" class="pb-apk-notice-btn">Download APK</a>' +
      '<button type="button" class="pb-apk-notice-close" id="pbApkNoticeClose" aria-label="Dismiss">×</button>' +
      "</div>";
    document.body.appendChild(wrap);
    document.getElementById("pbApkNoticeClose").addEventListener("click", function () {
      wrap.classList.add("hidden");
      try {
        localStorage.setItem(KEY, "1");
      } catch (e) {}
    });
  })();
})();
