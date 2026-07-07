"use strict";

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  }
  updateThemeIcons();
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcons();
}

function updateThemeIcons() {
  const current =
    document.documentElement.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const icon = current === "dark" ? "☀️" : "🌙";
  const a = document.getElementById("theme-toggle");
  const b = document.getElementById("login-theme-toggle");
  if (a) a.textContent = icon;
  if (b) b.textContent = icon;
}
