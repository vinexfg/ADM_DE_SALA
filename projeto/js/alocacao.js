"use strict";

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function periodsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function findRoomConflict({ salaId, dia, inicio, fim, excludeId }) {
  const novoInicio = timeToMinutes(inicio);
  const novoFim = timeToMinutes(fim);

  return state.alocacoes.find((a) => {
    if (a.id === excludeId) return false;
    if (a.salaId !== salaId || a.dia !== dia) return false;
    return periodsOverlap(novoInicio, novoFim, timeToMinutes(a.inicio), timeToMinutes(a.fim));
  }) || null;
}

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
