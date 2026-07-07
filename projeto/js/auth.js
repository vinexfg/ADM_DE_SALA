"use strict";

function can(permission) {
  return !!(PERMISSIONS[currentRole] && PERMISSIONS[currentRole][permission]);
}

function initAuth() {
  const savedRole = localStorage.getItem(AUTH_KEY);
  if (savedRole && ROLE_LABELS[savedRole]) {
    currentRole = savedRole;
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("login-password").value = "";
  document.getElementById("login-error").classList.add("hidden");
}

function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("role-badge").textContent = ROLE_LABELS[currentRole];
  document.getElementById("reset-data-btn").classList.toggle("hidden", currentRole !== "admin");
  document.getElementById("import-data-btn").classList.toggle("hidden", currentRole !== "admin");
  navigateTo("dashboard");
}

function resetToSeedData() {
  if (currentRole !== "admin") { toast("Apenas a Administração pode restaurar os dados.", "error"); return; }
  openConfirm("Restaurar os dados de exemplo? Todas as salas, professores, turmas e horários cadastrados serão substituídos.", () => {
    seedData();
    saveState();
    searchState = { salas: "", professores: "", turmas: "", alocacao: "" };
    weekFilter = { salaId: "", professorId: "" };
    renderAll();
    toast("Dados de exemplo restaurados.", "success");
  });
}

function handleLogin(e) {
  e.preventDefault();
  const value = document.getElementById("login-password").value.trim();
  const role = PASSWORDS[value];
  if (!role) {
    document.getElementById("login-error").classList.remove("hidden");
    return;
  }
  currentRole = role;
  localStorage.setItem(AUTH_KEY, role);
  showApp();
}

function handleLogout() {
  currentRole = null;
  localStorage.removeItem(AUTH_KEY);
  showLogin();
}
