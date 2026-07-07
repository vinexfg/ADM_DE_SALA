"use strict";

/* =========================================================
   CONSTANTES E ESTADO
   ========================================================= */
const STORAGE_KEY = "adm_sala_data_v1";
const THEME_KEY = "adm_sala_theme";
const AUTH_KEY = "adm_sala_auth_role";

const PASSWORDS = {
  "123": "admin",
  "356": "pedagogico",
};

const ROLE_LABELS = {
  admin: "Administração",
  pedagogico: "Pedagógico",
};

// Permissões por papel. "pedagogico" só visualiza salas/professores/turmas
// e pode editar a alocação (horários), mas nunca cria turmas.
const PERMISSIONS = {
  admin: {
    manageSalas: true,
    manageProfessores: true,
    manageTurmas: true,
    manageAlocacoes: true,
  },
  pedagogico: {
    manageSalas: false,
    manageProfessores: false,
    manageTurmas: false,
    manageAlocacoes: true,
  },
};

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Períodos padrão de aula (podem ser trocados por um horário personalizado no formulário).
const PERIODOS = [
  { label: "1º horário", inicio: "07:00", fim: "07:50" },
  { label: "2º horário", inicio: "07:50", fim: "08:40" },
  { label: "3º horário", inicio: "08:40", fim: "09:30" },
  { label: "4º horário", inicio: "09:50", fim: "10:40" },
  { label: "5º horário", inicio: "10:40", fim: "11:30" },
  { label: "6º horário", inicio: "13:00", fim: "13:50" },
  { label: "7º horário", inicio: "13:50", fim: "14:40" },
  { label: "8º horário", inicio: "14:40", fim: "15:30" },
];

let state = {
  salas: [],
  professores: [],
  turmas: [],
  alocacoes: [],
};

let currentRole = null;
let currentSection = "dashboard";

// Termos de busca por seção (mantidos entre re-renders para não perder o filtro digitado).
let searchState = { salas: "", professores: "", turmas: "", alocacao: "" };

// Filtro da visão semanal (seção Alocação).
let weekFilter = { salaId: "", professorId: "" };

// Callback pendente do modal de confirmação genérico.
let _confirmCallback = null;

/* =========================================================
   PERSISTÊNCIA (localStorage)
   ========================================================= */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      return;
    } catch (e) {
      /* dados corrompidos: recria a partir do zero */
    }
  }
  seedData();
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function seedData() {
  const salaA = { id: uid(), nome: "Sala 101", capacidade: 40 };
  const salaB = { id: uid(), nome: "Sala 102", capacidade: 35 };
  const salaC = { id: uid(), nome: "Laboratório de Informática", capacidade: 25 };
  const salaD = { id: uid(), nome: "Auditório", capacidade: 90 };

  const profA = { id: uid(), nome: "Ana Paula Ribeiro", disciplina: "Matemática" };
  const profB = { id: uid(), nome: "Carlos Eduardo Souza", disciplina: "História" };
  const profC = { id: uid(), nome: "Fernanda Lima", disciplina: "Informática" };

  const turmaA = { id: uid(), nome: "1º Ano A", disciplina: "Matemática", professorId: profA.id, numAlunos: 35 };
  const turmaB = { id: uid(), nome: "2º Ano B", disciplina: "História", professorId: profB.id, numAlunos: 30 };
  const turmaC = { id: uid(), nome: "3º Ano C", disciplina: "Informática", professorId: profC.id, numAlunos: 30 };

  state.salas = [salaA, salaB, salaC, salaD];
  state.professores = [profA, profB, profC];
  state.turmas = [turmaA, turmaB, turmaC];
  state.alocacoes = [
    { id: uid(), turmaId: turmaA.id, salaId: salaA.id, dia: "Segunda", inicio: "07:00", fim: "07:50" },
    { id: uid(), turmaId: turmaB.id, salaId: salaB.id, dia: "Segunda", inicio: "07:50", fim: "08:40" },
    { id: uid(), turmaId: turmaC.id, salaId: salaC.id, dia: "Terça", inicio: "07:00", fim: "07:50" },
  ];
}

/* =========================================================
   TEMA (claro / escuro)
   ========================================================= */
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

/* =========================================================
   TOASTS
   ========================================================= */
function toast(message, type) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast toast-${type || "info"}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* =========================================================
   MODAL GENÉRICO
   ========================================================= */
function openModal(title, bodyHtml, onMount) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-overlay").classList.remove("hidden");
  if (onMount) onMount();
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("modal-body").innerHTML = "";
  _confirmCallback = null;
}

// Modal genérico de confirmação (usado antes de qualquer exclusão).
function openConfirm(message, onConfirm) {
  _confirmCallback = onConfirm;
  openModal("Confirmar exclusão", `
    <p style="margin:0 0 4px;color:var(--text-secondary);font-size:14px;line-height:1.5;">${message}</p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-danger" onclick="runConfirm()">Excluir</button>
    </div>
  `);
}

function runConfirm() {
  const fn = _confirmCallback;
  _confirmCallback = null;
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("modal-body").innerHTML = "";
  if (fn) fn();
}

/* =========================================================
   AUTENTICAÇÃO
   ========================================================= */
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

function can(permission) {
  return !!(PERMISSIONS[currentRole] && PERMISSIONS[currentRole][permission]);
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
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

/* =========================================================
   HELPERS DE BUSCA
   ========================================================= */
function getSala(id) { return state.salas.find((s) => s.id === id); }
function getProfessor(id) { return state.professores.find((p) => p.id === id); }
function getTurma(id) { return state.turmas.find((t) => t.id === id); }

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Cor fixa por sala (posição na lista -> uma das 8 cores categóricas), para que
// a mesma sala tenha sempre a mesma cor no dashboard, na lista e na visão semanal.
function salaColorVar(salaId) {
  const idx = state.salas.findIndex((s) => s.id === salaId);
  const slot = idx < 0 ? 0 : idx % 8;
  return `var(--cat-${slot + 1})`;
}

function salaDotHtml(salaId) {
  const sala = getSala(salaId);
  if (!sala) return `<span class="muted-cell">sala removida</span>`;
  return `<span class="name-with-dot"><span class="color-dot" style="--dot-color:${salaColorVar(salaId)};background:${salaColorVar(salaId)};"></span>${escapeHtml(sala.nome)}</span>`;
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

// Caixa de busca reutilizada nas listas (Salas, Professores, Turmas, Alocação).
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

function matchesSearch(term, ...fields) {
  if (!term) return true;
  const t = term.trim().toLowerCase();
  return fields.some((f) => String(f || "").toLowerCase().includes(t));
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderDashboard() {
  const el = document.getElementById("section-dashboard");
  const totalHoras = state.alocacoes.length;

  el.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:22px;">
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

/* =========================================================
   SALAS
   ========================================================= */
function renderSalas() {
  const el = document.getElementById("section-salas");
  const canManage = can("manageSalas");

  const filtradas = state.salas.filter((s) => matchesSearch(searchState.salas, s.nome));

  const rows = filtradas.map((s) => `
    <tr>
      <td><span class="name-with-dot"><span class="color-dot" style="--dot-color:${salaColorVar(s.id)};background:${salaColorVar(s.id)};"></span>${escapeHtml(s.nome)}</span></td>
      <td class="muted-cell time-cell">${s.capacidade ?? "-"}</td>
      <td class="actions-cell">
        ${canManage ? `
          <button class="btn-ghost btn-sm" onclick="openSalaForm('${s.id}')">Editar</button>
          <button class="btn-ghost btn-sm" onclick="deleteSala('${s.id}')">Excluir</button>
        ` : ""}
      </td>
    </tr>
  `).join("");

  el.innerHTML = `
    ${!canManage ? `<div class="readonly-banner">Modo pedagógico: visualização de salas somente leitura.</div>` : ""}
    <div class="card">
      <div class="section-header">
        <h2>${state.salas.length} sala(s) cadastrada(s)</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          ${searchBoxHtml("salas", "Buscar sala…")}
          ${canManage ? `<button class="btn-primary" onclick="openSalaForm()">+ Nova sala</button>` : ""}
        </div>
      </div>
      ${filtradas.length === 0 ? `<div class="empty-state"><span class="empty-icon">🏫</span>${state.salas.length === 0 ? "Nenhuma sala cadastrada." : "Nenhuma sala encontrada para essa busca."}</div>` : `
      <table>
        <thead><tr><th>Nome</th><th>Capacidade</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `;
}

function openSalaForm(id) {
  if (!can("manageSalas")) { toast("Você não tem permissão para gerenciar salas.", "error"); return; }
  const sala = id ? getSala(id) : null;

  openModal(sala ? "Editar sala" : "Nova sala", `
    <div class="field">
      <label>Nome da sala</label>
      <input id="f-nome" value="${sala ? escapeHtml(sala.nome) : ""}" placeholder="Ex: Sala 103">
    </div>
    <div class="field">
      <label>Capacidade (nº de alunos)</label>
      <input id="f-capacidade" type="number" min="1" value="${sala ? sala.capacidade : ""}" placeholder="Ex: 40">
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="saveSala('${sala ? sala.id : ""}')">Salvar</button>
    </div>
  `);
}

function saveSala(id) {
  const nome = document.getElementById("f-nome").value.trim();
  const capacidade = parseInt(document.getElementById("f-capacidade").value, 10);

  if (!nome) { toast("Informe o nome da sala.", "error"); return; }

  if (id) {
    const sala = getSala(id);
    sala.nome = nome;
    sala.capacidade = isNaN(capacidade) ? null : capacidade;
    toast("Sala atualizada.", "success");
  } else {
    state.salas.push({ id: uid(), nome, capacidade: isNaN(capacidade) ? null : capacidade });
    toast("Sala cadastrada.", "success");
  }
  saveState();
  closeModal();
  renderAll();
}

function deleteSala(id) {
  if (!can("manageSalas")) { toast("Você não tem permissão para gerenciar salas.", "error"); return; }
  const emUso = state.alocacoes.some((a) => a.salaId === id);
  if (emUso) {
    toast("Não é possível excluir: a sala possui horários alocados.", "error");
    return;
  }
  const sala = getSala(id);
  openConfirm(`Excluir a sala <strong>${escapeHtml(sala ? sala.nome : "")}</strong>? Essa ação não pode ser desfeita.`, () => {
    state.salas = state.salas.filter((s) => s.id !== id);
    saveState();
    renderAll();
    toast("Sala removida.", "success");
  });
}

/* =========================================================
   PROFESSORES
   ========================================================= */
function renderProfessores() {
  const el = document.getElementById("section-professores");
  const canManage = can("manageProfessores");

  const filtrados = state.professores.filter((p) => matchesSearch(searchState.professores, p.nome, p.disciplina));

  const rows = filtrados.map((p) => `
    <tr>
      <td>${professorAvatarHtml(p.id)}</td>
      <td class="muted-cell">${escapeHtml(p.disciplina || "-")}</td>
      <td class="actions-cell">
        ${canManage ? `
          <button class="btn-ghost btn-sm" onclick="openProfessorForm('${p.id}')">Editar</button>
          <button class="btn-ghost btn-sm" onclick="deleteProfessor('${p.id}')">Excluir</button>
        ` : ""}
      </td>
    </tr>
  `).join("");

  el.innerHTML = `
    ${!canManage ? `<div class="readonly-banner">Modo pedagógico: visualização de professores somente leitura.</div>` : ""}
    <div class="card">
      <div class="section-header">
        <h2>${state.professores.length} professor(es) cadastrado(s)</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          ${searchBoxHtml("professores", "Buscar professor…")}
          ${canManage ? `<button class="btn-primary" onclick="openProfessorForm()">+ Novo professor</button>` : ""}
        </div>
      </div>
      ${filtrados.length === 0 ? `<div class="empty-state"><span class="empty-icon">👨‍🏫</span>${state.professores.length === 0 ? "Nenhum professor cadastrado." : "Nenhum professor encontrado para essa busca."}</div>` : `
      <table>
        <thead><tr><th>Nome</th><th>Disciplina</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `;
}

function openProfessorForm(id) {
  if (!can("manageProfessores")) { toast("Você não tem permissão para gerenciar professores.", "error"); return; }
  const prof = id ? getProfessor(id) : null;

  openModal(prof ? "Editar professor" : "Novo professor", `
    <div class="field">
      <label>Nome do professor</label>
      <input id="f-nome" value="${prof ? escapeHtml(prof.nome) : ""}" placeholder="Ex: João da Silva">
    </div>
    <div class="field">
      <label>Disciplina</label>
      <input id="f-disciplina" value="${prof ? escapeHtml(prof.disciplina || "") : ""}" placeholder="Ex: Matemática">
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="saveProfessor('${prof ? prof.id : ""}')">Salvar</button>
    </div>
  `);
}

function saveProfessor(id) {
  const nome = document.getElementById("f-nome").value.trim();
  const disciplina = document.getElementById("f-disciplina").value.trim();

  if (!nome) { toast("Informe o nome do professor.", "error"); return; }

  if (id) {
    const prof = getProfessor(id);
    prof.nome = nome;
    prof.disciplina = disciplina;
    toast("Professor atualizado.", "success");
  } else {
    state.professores.push({ id: uid(), nome, disciplina });
    toast("Professor cadastrado.", "success");
  }
  saveState();
  closeModal();
  renderAll();
}

function deleteProfessor(id) {
  if (!can("manageProfessores")) { toast("Você não tem permissão para gerenciar professores.", "error"); return; }
  const emUso = state.turmas.some((t) => t.professorId === id);
  if (emUso) {
    toast("Não é possível excluir: o professor está vinculado a uma turma.", "error");
    return;
  }
  const prof = getProfessor(id);
  openConfirm(`Excluir o professor <strong>${escapeHtml(prof ? prof.nome : "")}</strong>? Essa ação não pode ser desfeita.`, () => {
    state.professores = state.professores.filter((p) => p.id !== id);
    saveState();
    renderAll();
    toast("Professor removido.", "success");
  });
}

/* =========================================================
   TURMAS
   ========================================================= */
function renderTurmas() {
  const el = document.getElementById("section-turmas");
  const canManage = can("manageTurmas");

  const filtradas = state.turmas.filter((t) => {
    const prof = getProfessor(t.professorId);
    return matchesSearch(searchState.turmas, t.nome, t.disciplina, prof ? prof.nome : "");
  });

  const rows = filtradas.map((t) => {
    return `
    <tr>
      <td style="font-weight:600;">${escapeHtml(t.nome)}</td>
      <td class="muted-cell">${escapeHtml(t.disciplina || "-")}</td>
      <td>${professorAvatarHtml(t.professorId)}</td>
      <td class="muted-cell time-cell">${t.numAlunos ?? "-"}</td>
      <td class="actions-cell">
        ${canManage ? `
          <button class="btn-ghost btn-sm" onclick="openTurmaForm('${t.id}')">Editar</button>
          <button class="btn-ghost btn-sm" onclick="deleteTurma('${t.id}')">Excluir</button>
        ` : ""}
      </td>
    </tr>`;
  }).join("");

  el.innerHTML = `
    ${!canManage ? `<div class="readonly-banner">Modo pedagógico: visualização de turmas somente leitura. A criação de turmas é restrita à Administração.</div>` : ""}
    <div class="card">
      <div class="section-header">
        <h2>${state.turmas.length} turma(s) cadastrada(s)</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          ${searchBoxHtml("turmas", "Buscar turma…")}
          ${canManage ? `<button class="btn-primary" onclick="openTurmaForm()">+ Nova turma</button>` : ""}
        </div>
      </div>
      ${filtradas.length === 0 ? `<div class="empty-state"><span class="empty-icon">🎓</span>${state.turmas.length === 0 ? "Nenhuma turma cadastrada." : "Nenhuma turma encontrada para essa busca."}</div>` : `
      <table>
        <thead><tr><th>Turma</th><th>Disciplina</th><th>Professor</th><th>Alunos</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
  `;
}

function openTurmaForm(id) {
  if (!can("manageTurmas")) { toast("Apenas a Administração pode criar ou editar turmas.", "error"); return; }
  const turma = id ? getTurma(id) : null;

  const profOptions = state.professores.map((p) =>
    `<option value="${p.id}" ${turma && turma.professorId === p.id ? "selected" : ""}>${escapeHtml(p.nome)}</option>`
  ).join("");

  openModal(turma ? "Editar turma" : "Nova turma", `
    <div class="field">
      <label>Nome da turma</label>
      <input id="f-nome" value="${turma ? escapeHtml(turma.nome) : ""}" placeholder="Ex: 1º Ano A">
    </div>
    <div class="field-row">
      <div class="field">
        <label>Disciplina</label>
        <input id="f-disciplina" value="${turma ? escapeHtml(turma.disciplina || "") : ""}" placeholder="Ex: Matemática">
      </div>
      <div class="field">
        <label>Nº de alunos</label>
        <input id="f-numalunos" type="number" min="1" value="${turma && turma.numAlunos ? turma.numAlunos : ""}" placeholder="Ex: 30">
      </div>
    </div>
    <div class="field">
      <label>Professor responsável</label>
      <select id="f-professor">
        <option value="">Nenhum</option>
        ${profOptions}
      </select>
    </div>
    ${state.professores.length === 0 ? `<p class="hint-msg">Cadastre um professor antes, se quiser vincular um agora.</p>` : ""}
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="saveTurma('${turma ? turma.id : ""}')">Salvar</button>
    </div>
  `);
}

function saveTurma(id) {
  const nome = document.getElementById("f-nome").value.trim();
  const disciplina = document.getElementById("f-disciplina").value.trim();
  const professorId = document.getElementById("f-professor").value || null;
  const numAlunosRaw = parseInt(document.getElementById("f-numalunos").value, 10);
  const numAlunos = isNaN(numAlunosRaw) ? null : numAlunosRaw;

  if (!nome) { toast("Informe o nome da turma.", "error"); return; }

  if (id) {
    const turma = getTurma(id);
    turma.nome = nome;
    turma.disciplina = disciplina;
    turma.professorId = professorId;
    turma.numAlunos = numAlunos;
    toast("Turma atualizada.", "success");
  } else {
    state.turmas.push({ id: uid(), nome, disciplina, professorId, numAlunos });
    toast("Turma cadastrada.", "success");
  }
  saveState();
  closeModal();
  renderAll();
}

function deleteTurma(id) {
  if (!can("manageTurmas")) { toast("Apenas a Administração pode excluir turmas.", "error"); return; }
  const emUso = state.alocacoes.some((a) => a.turmaId === id);
  if (emUso) {
    toast("Não é possível excluir: a turma possui horários alocados.", "error");
    return;
  }
  const turma = getTurma(id);
  openConfirm(`Excluir a turma <strong>${escapeHtml(turma ? turma.nome : "")}</strong>? Essa ação não pode ser desfeita.`, () => {
    state.turmas = state.turmas.filter((t) => t.id !== id);
    saveState();
    renderAll();
    toast("Turma removida.", "success");
  });
}

/* =========================================================
   ALOCAÇÃO DE HORÁRIOS (com verificação de conflitos)
   ========================================================= */
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function periodsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// Retorna a alocação conflitante (mesma sala, mesmo dia, horário sobreposto) ou null.
function findRoomConflict({ salaId, dia, inicio, fim, excludeId }) {
  const novoInicio = timeToMinutes(inicio);
  const novoFim = timeToMinutes(fim);

  return state.alocacoes.find((a) => {
    if (a.id === excludeId) return false;
    if (a.salaId !== salaId || a.dia !== dia) return false;
    return periodsOverlap(novoInicio, novoFim, timeToMinutes(a.inicio), timeToMinutes(a.fim));
  }) || null;
}

// Retorna a alocação conflitante do mesmo professor em outra turma no mesmo horário.
function findProfessorConflict({ turmaId, dia, inicio, fim, excludeId }) {
  const turma = getTurma(turmaId);
  if (!turma || !turma.professorId) return null;
  const novoInicio = timeToMinutes(inicio);
  const novoFim = timeToMinutes(fim);

  return state.alocacoes.find((a) => {
    if (a.id === excludeId) return false;
    if (a.dia !== dia) return false;
    const outraTurma = getTurma(a.turmaId);
    if (!outraTurma || outraTurma.professorId !== turma.professorId) return false;
    if (a.turmaId === turmaId) return false;
    return periodsOverlap(novoInicio, novoFim, timeToMinutes(a.inicio), timeToMinutes(a.fim));
  }) || null;
}

function renderAlocacao() {
  const el = document.getElementById("section-alocacao");
  const canManage = can("manageAlocacoes");

  const filtradas = state.alocacoes.filter((a) => {
    const turma = getTurma(a.turmaId);
    const sala = getSala(a.salaId);
    const prof = turma ? getProfessor(turma.professorId) : null;
    return matchesSearch(searchState.alocacao, turma ? turma.nome : "", sala ? sala.nome : "", prof ? prof.nome : "", a.dia);
  });

  const rows = filtradas
    .slice()
    .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || timeToMinutes(a.inicio) - timeToMinutes(b.inicio))
    .map((a) => {
      const turma = getTurma(a.turmaId);
      return `
      <tr>
        <td style="font-weight:600;">${turma ? escapeHtml(turma.nome) : "<em>turma removida</em>"}</td>
        <td>${turma ? professorAvatarHtml(turma.professorId) : "-"}</td>
        <td>${salaDotHtml(a.salaId)}</td>
        <td><span class="chip chip-accent">${a.dia}</span></td>
        <td class="time-cell">${a.inicio} &ndash; ${a.fim}</td>
        <td class="actions-cell">
          ${canManage ? `
            <button class="btn-ghost btn-sm" onclick="openAlocacaoForm('${a.id}')">Editar</button>
            <button class="btn-ghost btn-sm" onclick="deleteAlocacao('${a.id}')">Excluir</button>
          ` : ""}
        </td>
      </tr>`;
    }).join("");

  const salaFilterOptions = state.salas.map((s) =>
    `<option value="${s.id}" ${weekFilter.salaId === s.id ? "selected" : ""}>${escapeHtml(s.nome)}</option>`
  ).join("");
  const profFilterOptions = state.professores.map((p) =>
    `<option value="${p.id}" ${weekFilter.professorId === p.id ? "selected" : ""}>${escapeHtml(p.nome)}</option>`
  ).join("");

  el.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="section-header">
        <h2>${state.alocacoes.length} horário(s) alocado(s)</h2>
        <div style="display:flex;gap:10px;align-items:center;">
          ${searchBoxHtml("alocacao", "Buscar turma, sala, professor…")}
          ${canManage ? `<button class="btn-primary" onclick="openAlocacaoForm()">+ Nova alocação</button>` : ""}
        </div>
      </div>
      ${filtradas.length === 0 ? `<div class="empty-state"><span class="empty-icon">🗓️</span>${state.alocacoes.length === 0 ? "Nenhum horário alocado ainda." : "Nenhuma alocação encontrada para essa busca."}</div>` : `
      <table>
        <thead><tr><th>Turma</th><th>Professor</th><th>Sala</th><th>Dia</th><th>Horário</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
    <div class="card">
      <div class="section-header">
        <h2>Visão semanal</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="week-filter-sala" onchange="setWeekFilter('salaId', this.value)">
            <option value="">Todas as salas</option>
            ${salaFilterOptions}
          </select>
          <select id="week-filter-prof" onchange="setWeekFilter('professorId', this.value)">
            <option value="">Todos os professores</option>
            ${profFilterOptions}
          </select>
          <button class="btn-secondary btn-sm" onclick="window.print()">🖨️ Imprimir</button>
        </div>
      </div>
      ${weeklyGridHtml(weekFilter)}
    </div>
  `;
}

function setWeekFilter(key, value) {
  weekFilter[key] = value;
  renderSection("alocacao");
}

function weeklyLegendHtml(list) {
  const salasEmUso = state.salas.filter((s) => list.some((a) => a.salaId === s.id));
  if (salasEmUso.length === 0) return "";
  const items = salasEmUso.map((s) => `
    <span class="legend-item">
      <span class="color-dot" style="--dot-color:${salaColorVar(s.id)};background:${salaColorVar(s.id)};"></span>
      ${escapeHtml(s.nome)}
    </span>`).join("");
  return `<div class="legend">${items}</div>`;
}

function weeklyGridHtml(filter) {
  if (state.alocacoes.length === 0) {
    return `<div class="empty-state"><span class="empty-icon">🗓️</span>Nenhum horário alocado ainda.</div>`;
  }

  filter = filter || {};
  let lista = state.alocacoes;
  if (filter.salaId) lista = lista.filter((a) => a.salaId === filter.salaId);
  if (filter.professorId) {
    lista = lista.filter((a) => {
      const t = getTurma(a.turmaId);
      return t && t.professorId === filter.professorId;
    });
  }
  if (lista.length === 0) {
    return `<div class="empty-state"><span class="empty-icon">🔍</span>Nenhum horário para esse filtro.</div>`;
  }

  const legend = weeklyLegendHtml(lista);
  const cols = DIAS.map((dia) => {
    const itens = lista
      .filter((a) => a.dia === dia)
      .sort((a, b) => timeToMinutes(a.inicio) - timeToMinutes(b.inicio))
      .map((a) => {
        const turma = getTurma(a.turmaId);
        const sala = getSala(a.salaId);
        return `
        <div class="slot-chip" style="--slot-color:${salaColorVar(a.salaId)}">
          <div class="slot-time">${a.inicio}&ndash;${a.fim}</div>
          <div class="slot-turma">${turma ? escapeHtml(turma.nome) : "-"}</div>
          <div class="slot-room">${sala ? escapeHtml(sala.nome) : "-"}</div>
        </div>`;
      }).join("");
    return `<div class="week-col"><h3>${dia}</h3>${itens || `<p class="hint-msg">Sem aulas</p>`}</div>`;
  }).join("");

  return `${legend}<div class="week-grid">${cols}</div>`;
}

// Retorna o período pré-definido que corresponde exatamente a este horário, se houver.
function findPeriodoForTimes(inicio, fim) {
  return PERIODOS.find((p) => p.inicio === inicio && p.fim === fim) || null;
}

function handlePeriodoChange() {
  const sel = document.getElementById("f-periodo");
  const wrap = document.getElementById("f-custom-time-wrap");
  if (sel.value === "custom") {
    wrap.classList.remove("hidden");
  } else {
    const p = PERIODOS.find((per) => per.label === sel.value);
    if (p) {
      document.getElementById("f-inicio").value = p.inicio;
      document.getElementById("f-fim").value = p.fim;
    }
    wrap.classList.add("hidden");
  }
}

// Aviso não-bloqueante quando a turma selecionada tem mais alunos do que a sala comporta.
function updateCapacityWarning() {
  const warnEl = document.getElementById("f-capacity-warning");
  if (!warnEl) return;
  const turma = getTurma(document.getElementById("f-turma").value);
  const sala = getSala(document.getElementById("f-sala").value);
  if (turma && sala && turma.numAlunos && sala.capacidade && turma.numAlunos > sala.capacidade) {
    warnEl.textContent = `Atenção: "${turma.nome}" tem ${turma.numAlunos} aluno(s), acima da capacidade de "${sala.nome}" (${sala.capacidade}).`;
    warnEl.classList.remove("hidden");
  } else {
    warnEl.classList.add("hidden");
  }
}

function openAlocacaoForm(id) {
  if (!can("manageAlocacoes")) { toast("Você não tem permissão para gerenciar horários.", "error"); return; }
  if (state.turmas.length === 0) { toast("Cadastre uma turma antes de criar uma alocação.", "error"); return; }
  if (state.salas.length === 0) { toast("Cadastre uma sala antes de criar uma alocação.", "error"); return; }

  const aloc = id ? state.alocacoes.find((a) => a.id === id) : null;

  const turmaOptions = state.turmas.map((t) =>
    `<option value="${t.id}" ${aloc && aloc.turmaId === t.id ? "selected" : ""}>${escapeHtml(t.nome)}</option>`
  ).join("");
  const salaOptions = state.salas.map((s) =>
    `<option value="${s.id}" ${aloc && aloc.salaId === s.id ? "selected" : ""}>${escapeHtml(s.nome)}</option>`
  ).join("");

  const matchedPeriodo = aloc ? findPeriodoForTimes(aloc.inicio, aloc.fim) : PERIODOS[0];
  const periodoOptions = PERIODOS.map((p) =>
    `<option value="${p.label}" ${matchedPeriodo && matchedPeriodo.label === p.label ? "selected" : ""}>${p.label} (${p.inicio}–${p.fim})</option>`
  ).join("") + `<option value="custom" ${!matchedPeriodo ? "selected" : ""}>Personalizado…</option>`;

  const diaField = aloc
    ? `<div class="field">
        <label>Dia da semana</label>
        <select id="f-dia">${DIAS.map((d) => `<option value="${d}" ${aloc.dia === d ? "selected" : ""}>${d}</option>`).join("")}</select>
      </div>`
    : `<div class="field">
        <label>Dias da semana</label>
        <div class="day-checkboxes">
          ${DIAS.map((d) => `<label class="day-check-item"><input type="checkbox" class="day-check" value="${d}"> ${d}</label>`).join("")}
        </div>
        <p class="hint-msg">Selecione um ou mais dias para criar a mesma alocação de uma vez.</p>
      </div>`;

  openModal(aloc ? "Editar alocação" : "Nova alocação", `
    <div class="field">
      <label>Turma</label>
      <select id="f-turma" onchange="updateCapacityWarning()">${turmaOptions}</select>
    </div>
    <div class="field">
      <label>Sala</label>
      <select id="f-sala" onchange="updateCapacityWarning()">${salaOptions}</select>
    </div>
    <p id="f-capacity-warning" class="warning-msg hidden"></p>
    ${diaField}
    <div class="field">
      <label>Horário</label>
      <select id="f-periodo" onchange="handlePeriodoChange()">${periodoOptions}</select>
    </div>
    <div class="field-row ${matchedPeriodo ? "hidden" : ""}" id="f-custom-time-wrap">
      <div class="field">
        <label>Início</label>
        <input id="f-inicio" type="time" value="${aloc ? aloc.inicio : PERIODOS[0].inicio}">
      </div>
      <div class="field">
        <label>Fim</label>
        <input id="f-fim" type="time" value="${aloc ? aloc.fim : PERIODOS[0].fim}">
      </div>
    </div>
    <p id="f-conflict" class="error-msg hidden"></p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="saveAlocacao('${aloc ? aloc.id : ""}')">Salvar</button>
    </div>
  `, () => updateCapacityWarning());
}

function saveAlocacao(id) {
  const turmaId = document.getElementById("f-turma").value;
  const salaId = document.getElementById("f-sala").value;
  const inicio = document.getElementById("f-inicio").value;
  const fim = document.getElementById("f-fim").value;
  const conflictEl = document.getElementById("f-conflict");

  const dias = id
    ? [document.getElementById("f-dia").value]
    : Array.from(document.querySelectorAll(".day-check:checked")).map((c) => c.value);

  if (!turmaId || !salaId || dias.length === 0 || !inicio || !fim) {
    conflictEl.textContent = id ? "Preencha todos os campos." : "Preencha todos os campos e selecione ao menos um dia.";
    conflictEl.classList.remove("hidden");
    return;
  }
  if (timeToMinutes(inicio) >= timeToMinutes(fim)) {
    conflictEl.textContent = "O horário de início deve ser antes do horário de fim.";
    conflictEl.classList.remove("hidden");
    return;
  }

  // Valida conflitos em todos os dias selecionados antes de gravar qualquer um (tudo ou nada).
  for (const dia of dias) {
    const roomConflict = findRoomConflict({ salaId, dia, inicio, fim, excludeId: id || null });
    if (roomConflict) {
      const turmaConf = getTurma(roomConflict.turmaId);
      const salaConf = getSala(salaId);
      conflictEl.textContent = `Conflito de sala em ${dia}: "${salaConf ? salaConf.nome : "sala"}" já está ocupada por "${turmaConf ? turmaConf.nome : "outra turma"}" nesse horário (${roomConflict.inicio}–${roomConflict.fim}).`;
      conflictEl.classList.remove("hidden");
      return;
    }

    const profConflict = findProfessorConflict({ turmaId, dia, inicio, fim, excludeId: id || null });
    if (profConflict) {
      const turmaConf = getTurma(profConflict.turmaId);
      conflictEl.textContent = `Conflito de professor em ${dia}: já está alocado na turma "${turmaConf ? turmaConf.nome : "outra turma"}" nesse horário (${profConflict.inicio}–${profConflict.fim}).`;
      conflictEl.classList.remove("hidden");
      return;
    }
  }

  if (id) {
    const aloc = state.alocacoes.find((a) => a.id === id);
    Object.assign(aloc, { turmaId, salaId, dia: dias[0], inicio, fim });
    toast("Alocação atualizada.", "success");
  } else {
    dias.forEach((dia) => state.alocacoes.push({ id: uid(), turmaId, salaId, dia, inicio, fim }));
    toast(dias.length > 1 ? `Alocação criada em ${dias.length} dias, sem conflitos.` : "Alocação criada sem conflitos.", "success");
  }
  saveState();
  closeModal();
  renderAll();
}

function deleteAlocacao(id) {
  if (!can("manageAlocacoes")) { toast("Você não tem permissão para excluir horários.", "error"); return; }
  openConfirm("Excluir esta alocação de horário? Essa ação não pode ser desfeita.", () => {
    state.alocacoes = state.alocacoes.filter((a) => a.id !== id);
    saveState();
    renderAll();
    toast("Alocação removida.", "success");
  });
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadState();
  initAuth();

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("reset-data-btn").addEventListener("click", resetToSeedData);
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
    }
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.section));
  });
});
