/* ================================================
   PrimeTactics — Server Lock Protection v20.5.1
   Anti-cheat gate + F12 / dev tools blocker
   - 8 second countdown before enter
   - Password protection (default: "2000")
   - Disables right-click, F12, DevTools hotkeys
================================================ */

(() => {
  const LOCK_PASSWORD = "2000"; // Change to your desired password

  const serverLock = document.getElementById("serverLock");
  const mainContent = document.getElementById("mainContent");
  const enterBtn = document.getElementById("enterBtn");
  const passwordInput = document.getElementById("serverPassword");
  const countdownEl = document.getElementById("lockCountdown");
  const countNum = document.getElementById("countNum");
  const scanStatus = document.getElementById("scanStatus");
  const lockError = document.getElementById("lockError");
  const lockTogglePw = document.getElementById("lockTogglePw");

  let countdown = 8;
  let canEnter = false;

  // ===== COUNTDOWN TIMER =====
  const countdownTimer = setInterval(() => {
    countdown--;
    countNum.textContent = String(countdown);

    if (countdown <= 0) {
      clearInterval(countdownTimer);
      canEnter = true;
      countdownEl.textContent = "Button is now active. Enter password to proceed.";
      enterBtn.disabled = false;
    }
  }, 1000);

  // ===== FAKE SCAN ANIMATION =====
  let dots = 0;
  const scanTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    scanStatus.textContent = "Anti-Cheat Scanning" + ".".repeat(dots);
  }, 500);

  // ===== ENTER BUTTON CLICK =====
  enterBtn?.addEventListener("click", () => {
    if (!canEnter) return;

    const entered = passwordInput.value.trim();

    if (entered !== LOCK_PASSWORD) {
      lockError.style.display = "block";
      passwordInput.focus();
      passwordInput.select();
      setTimeout(() => {
        lockError.style.display = "none";
      }, 3000);
      return;
    }

    // Password correct — unlock
    serverLock.style.display = "none";
    mainContent.style.display = "block";
    clearInterval(scanTimer);
  });

  // ===== TOGGLE PASSWORD VISIBILITY =====
  lockTogglePw?.addEventListener("click", function () {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      this.textContent = "🙈";
    } else {
      passwordInput.type = "password";
      this.textContent = "👁";
    }
  });

  // ===== ENTER KEY IN PASSWORD FIELD =====
  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enterBtn.click();
    }
  });

  // ===== ANTI-CHEAT: DISABLE DEVELOPER TOOLS =====

  // Right-click context menu
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });

  // F12 and common DevTools hotkeys
  document.addEventListener("keydown", (e) => {
    const isFunctional = e.key === "F12";
    const isCtrlShiftI = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i";
    const isCtrlShiftJ = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j";
    const isCtrlShiftC = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c";

    if (isFunctional || isCtrlShiftI || isCtrlShiftJ || isCtrlShiftC) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  });

  // Additional protection: Detect if DevTools is open (basic check)
  let devToolsOpen = false;

  // Check for localStorage access (some tools can't access it when DevTools are open)
  const checkDevTools = () => {
    const start = performance.now();
    debugger; // eslint-disable-line no-debugger
    const end = performance.now();

    if (end - start > 100) {
      devToolsOpen = true;
    }
  };

  // Run check periodically (optional - comment out if too aggressive)
  // setInterval(checkDevTools, 1000);

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(countdownTimer);
    clearInterval(scanTimer);
  });

})();
