"use strict";

const SECTION_TITLES = {
  dashboard: "Dashboard",
  salas: "Salas",
  professores: "Professores",
  turmas: "Turmas",
  alocacao: "Alocação de Horários",
};

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });
  document.querySelectorAll(".section").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`section-${section}`).classList.remove("hidden");
  document.getElementById("section-title").textContent = SECTION_TITLES[section];
  renderSection(section);
}

function renderSection(section) {
  if (section === "dashboard") renderDashboard();
  if (section === "salas") renderSalas();
  if (section === "professores") renderProfessores();
  if (section === "turmas") renderTurmas();
  if (section === "alocacao") renderAlocacao();
}

function renderAll() {
  renderSection(currentSection);
}
