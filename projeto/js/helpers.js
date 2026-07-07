"use strict";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function salaColorVar(salaId) {
  const idx = state.salas.findIndex((s) => s.id === salaId);
  const slot = idx < 0 ? 0 : idx % 8;
  return `var(--cat-${slot + 1})`;
}

function salaDotHtml(salaId) {
  const sala = getSala(salaId);
  if (!sala) return `<span class="muted-cell">sala removida</span>`;
  return `<span class="name-with-dot"><span class="color-dot" style="--dot-color:${salaColorVar(salaId)};"></span>${escapeHtml(sala.nome)}</span>`;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function professorAvatarHtml(profId) {
  const prof = getProfessor(profId);
  if (!prof) return `<span class="chip">sem professor</span>`;
  const idx = state.professores.findIndex((p) => p.id === profId);
  const color = `var(--cat-${(idx < 0 ? 0 : idx % 8) + 1})`;
  return `
    <span class="name-with-avatar">
      <span class="avatar" style="--avatar-color:${color}">${initials(prof.nome)}</span>
      ${escapeHtml(prof.nome)}
    </span>`;
}

function matchesSearch(term, ...fields) {
  if (!term) return true;
  const t = term.trim().toLowerCase();
  return fields.some((f) => String(f || "").toLowerCase().includes(t));
}

function searchBoxHtml(section, placeholder) {
  return `<input type="search" class="search-input" id="search-${section}" placeholder="${placeholder}" value="${escapeHtml(searchState[section])}" oninput="onSearchInput('${section}', this.value)">`;
}

function onSearchInput(section, value) {
  searchState[section] = value;
  renderSection(section);
  const input = document.getElementById(`search-${section}`);
  if (input) {
    input.focus();
    const pos = input.value.length;
    input.setSelectionRange(pos, pos);
  }
}
