"use strict";

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
