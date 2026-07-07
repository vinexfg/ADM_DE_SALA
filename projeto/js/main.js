"use strict";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadState();
  initAuth();

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("reset-data-btn").addEventListener("click", resetToSeedData);
  document.getElementById("export-data-btn").addEventListener("click", exportData);
  document.getElementById("import-data-btn").addEventListener("click", triggerImport);
  document.getElementById("import-file-input").addEventListener("change", handleImportFile);
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("login-theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("modal-overlay");
    if (overlay.classList.contains("hidden")) return;
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.closest("#modal-body")) {
      const primaryBtn = document.querySelector("#modal-body .btn-primary");
      if (primaryBtn) { e.preventDefault(); primaryBtn.click(); }
    } else if (e.key === "Tab") {
      trapFocus(e);
    }
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigateTo(btn.dataset.section);
      closeSidebar();
    });
  });

  document.getElementById("menu-toggle-btn").addEventListener("click", openSidebar);
  document.getElementById("sidebar-backdrop").addEventListener("click", closeSidebar);
});

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-backdrop").classList.remove("hidden");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-backdrop").classList.add("hidden");
}
