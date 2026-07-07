"use strict";

const STORAGE_KEY = "adm_sala_data_v1";
const THEME_KEY = "adm_sala_theme";
const AUTH_KEY = "adm_sala_auth_role";

const PASSWORDS = {
  "123": "admin",
  "456": "pedagogico",
};

const ROLE_LABELS = {
  admin: "Administração",
  pedagogico: "Pedagógico",
};

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

let searchState = { salas: "", professores: "", turmas: "", alocacao: "" };

let weekFilter = { salaId: "", professorId: "" };

let _confirmCallback = null;

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      return;
    } catch (e) {
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

function getSala(id) { return state.salas.find((s) => s.id === id); }
function getProfessor(id) { return state.professores.find((p) => p.id === id); }
function getTurma(id) { return state.turmas.find((t) => t.id === id); }
