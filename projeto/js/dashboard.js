"use strict";

function renderDashboard() {
  const el = document.getElementById("section-dashboard");
  const totalHoras = state.alocacoes.length;

  el.innerHTML = `
    <div class="grid grid-4 section-gap">
      <div class="card stat-card">
        <span class="stat-icon-badge" style="--tile-color:var(--cat-1)">🏫</span>
        <span class="stat-value">${state.salas.length}</span>
        <span class="stat-label">Salas cadastradas</span>
      </div>
      <div class="card stat-card">
        <span class="stat-icon-badge" style="--tile-color:var(--cat-2)">👨‍🏫</span>
        <span class="stat-value">${state.professores.length}</span>
        <span class="stat-label">Professores</span>
      </div>
      <div class="card stat-card">
        <span class="stat-icon-badge" style="--tile-color:var(--cat-5)">🎓</span>
        <span class="stat-value">${state.turmas.length}</span>
        <span class="stat-label">Turmas</span>
      </div>
      <div class="card stat-card">
        <span class="stat-icon-badge" style="--tile-color:var(--cat-8)">🗓️</span>
        <span class="stat-value">${totalHoras}</span>
        <span class="stat-label">Horários alocados</span>
      </div>
    </div>
    <div class="card">
      <div class="section-header"><h2>Visão semanal das alocações</h2></div>
      ${weeklyGridHtml()}
    </div>
  `;
}
