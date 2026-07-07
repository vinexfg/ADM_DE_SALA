"use strict";

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
