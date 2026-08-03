/* ================================================
   Prime Blog — Package Download Modal v20.5.1
   Password-protected download system
   - Progress simulation
   - Password validation
   - File download trigger
================================================ */

(() => {
  const PASSWORD = "cfph2026";

  // DOM elements
  const btnDownload = document.getElementById("btnDownload");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const btnClose = document.getElementById("btnClose");

  const pctText = document.getElementById("pctText");
  const barFill = document.getElementById("barFill");
  const statusText = document.getElementById("statusText");
  const btnProceed = document.getElementById("btnProceed");

  const passwordWrap = document.getElementById("passwordWrap");
  const pwInput = document.getElementById("pwInput");
  const btnConfirm = document.getElementById("btnConfirm");
  const pwError = document.getElementById("pwError");

  const cardInner = document.querySelector("#dlCard .card-inner");

  let progress = 0;
  let timer = null;

  // ===== MODAL CONTROL =====
  function openModal() {
    modalBackdrop.style.display = "flex";
    modalBackdrop.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modalBackdrop.style.display = "none";
    modalBackdrop.setAttribute("aria-hidden", "true");
    stopProgress();
    resetUI();
  }

  function resetUI() {
    progress = 0;
    pctText.textContent = "0";
    barFill.style.width = "0%";
    statusText.textContent = "Starting…";
    btnProceed.disabled = true;

    passwordWrap.style.display = "none";
    pwInput.value = "";
    pwError.style.display = "none";
  }

  function stopProgress() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // ===== PROGRESS SIMULATION =====
  function simulateProgress() {
    stopProgress();
    timer = setInterval(() => {
      progress += 1;
      if (progress > 100) progress = 100;

      pctText.textContent = String(progress);
      barFill.style.width = progress + "%";

      if (progress < 30) statusText.textContent = "Verifying authorization…";
      else if (progress < 60) statusText.textContent = "Loading package files…";
      else if (progress < 90) statusText.textContent = "Finalizing download…";
      else if (progress < 100) statusText.textContent = "Almost ready…";

      if (progress >= 100) {
        stopProgress();
        statusText.textContent = "✓ Ready to proceed";
        btnProceed.disabled = false;
      }
    }, 20);
  }

  // ===== PASSWORD FLOW =====
  function proceedToPassword() {
    passwordWrap.style.display = "block";
    pwInput.focus();
  }

  function startDownload(filePath) {
    if (!filePath) {
      statusText.textContent = "❌ Error: File path missing.";
      return;
    }

    // Create hidden <a> to trigger download
    const a = document.createElement("a");
    a.href = filePath;
    a.download = ""; // Let browser decide filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    closeModal();
  }

  function getFilePath() {
    const file = cardInner?.dataset?.file || "";
    return file.trim();
  }

  // ===== EVENT LISTENERS =====

  // Download button
  btnDownload?.addEventListener("click", () => {
    resetUI();
    openModal();
    simulateProgress();
  });

  // Close modal
  btnClose?.addEventListener("click", closeModal);

  // Close on backdrop click
  modalBackdrop?.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  // Proceed to password
  btnProceed?.addEventListener("click", proceedToPassword);

  // Confirm password
  btnConfirm?.addEventListener("click", () => {
    const entered = pwInput.value.trim();

    if (entered !== PASSWORD) {
      pwError.style.display = "block";
      pwInput.focus();
      pwInput.select();
      return;
    }

    pwError.style.display = "none";
    const filePath = getFilePath();
    startDownload(filePath);
  });

  // Enter key in password field
  pwInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnConfirm.click();
    }
  });

  // ===== SHOW/HIDE PASSWORD =====
  const togglePassword = document.getElementById("togglePassword");
  togglePassword?.addEventListener("click", function () {
    if (pwInput.type === "password") {
      pwInput.type = "text";
      this.textContent = "🙈";
    } else {
      pwInput.type = "password";
      this.textContent = "👁";
    }
  });

  // ===== UNLOCK MAIN CONTENT AFTER SERVER LOCK =====
  // (handled in f12.js, but this sets up modal after unlock)

})();
