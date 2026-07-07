"use strict";

function weekdayBarChartHtml() {
  if (state.alocacoes.length === 0) {
    return `<div class="empty-state"><span class="empty-icon">📊</span>Nenhum horário alocado ainda.</div>`;
  }

  const abbrev = { "Segunda": "SEG", "Terça": "TER", "Quarta": "QUA", "Quinta": "QUI", "Sexta": "SEX", "Sábado": "SÁB" };
  const counts = DIAS.map((dia) => state.alocacoes.filter((a) => a.dia === dia).length);
  const max = Math.max(...counts, 1);

  const cols = DIAS.map((dia, i) => {
    const count = counts[i];
    const pct = Math.round((count / max) * 100);
    return `
      <div class="bar-col">
        <span class="bar-value">${count}</span>
        <div class="bar-track">
          <div class="bar" style="height:${pct}%" title="${dia}: ${count} aula(s)"></div>
        </div>
        <span class="bar-label">${abbrev[dia]}</span>
      </div>`;
  }).join("");

  return `<div class="bar-chart-wrap">${cols}</div>`;
}

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
    <div class="card section-gap">
      <div class="section-header"><h2>Aulas por dia da semana</h2></div>
      ${weekdayBarChartHtml()}
    </div>
    <div class="card">
      <div class="section-header"><h2>Visão semanal das alocações</h2></div>
      ${weeklyGridHtml()}
    </div>
  `;
}
