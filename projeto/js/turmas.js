"use strict";

function renderTurmas() {
  const el = document.getElementById("section-turmas");
  const canManage = can("manageTurmas");

  const filtradas = state.turmas.filter((t) => {
    const prof = getProfessor(t.professorId);
    return matchesSearch(searchState.turmas, t.nome, t.disciplina, prof ? prof.nome : "");
  });

  const flashIds = consumeFlashIds();

  const rows = filtradas.map((t) => {
    return `
    <tr class="${flashClass(t.id, flashIds).trim()}">
      <td class="cell-strong">${escapeHtml(t.nome)}</td>
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
        <div class="header-actions">
          ${searchBoxHtml("turmas", "Buscar turma…")}
          ${canManage ? `<button class="btn-primary" onclick="openTurmaForm()">+ Nova turma</button>` : ""}
        </div>
      </div>
      ${filtradas.length === 0 ? `<div class="empty-state"><span class="empty-icon">🎓</span>${state.turmas.length === 0 ? "Nenhuma turma cadastrada." : "Nenhuma turma encontrada para essa busca."}</div>` : `
      <div class="table-scroll">
      <table>
        <thead><tr><th>Turma</th><th>Disciplina</th><th>Professor</th><th>Alunos</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>`}
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
    _lastSavedIds = [id];
    toast("Turma atualizada.", "success");
  } else {
    const turma = { id: uid(), nome, disciplina, professorId, numAlunos };
    state.turmas.push(turma);
    _lastSavedIds = [turma.id];
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
