"use strict";

function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `adm-sala-dados-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Dados exportados.", "success");
}

function triggerImport() {
  if (currentRole !== "admin") { toast("Apenas a Administração pode importar dados.", "error"); return; }
  document.getElementById("import-file-input").click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (err) {
      toast("Arquivo inválido: não é um JSON válido.", "error");
      return;
    }

    const estruturaValida = ["salas", "professores", "turmas", "alocacoes"].every(
      (chave) => Array.isArray(parsed[chave])
    );
    if (!estruturaValida) {
      toast("Arquivo inválido: estrutura de dados não reconhecida.", "error");
      return;
    }

    openConfirm("Importar este arquivo? Todos os dados atuais (salas, professores, turmas e horários) serão substituídos.", () => {
      state = parsed;
      saveState();
      searchState = { salas: "", professores: "", turmas: "", alocacao: "" };
      weekFilter = { salaId: "", professorId: "" };
      renderAll();
      toast("Dados importados com sucesso.", "success");
    });
  };
  reader.readAsText(file);
}
