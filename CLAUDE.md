# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

`ADM_DE_SALA` é um protótipo de sistema de gestão de salas, turmas e horários escolares. Todo o código vive em `projeto/`. É uma aplicação client-side pura (HTML/CSS/JavaScript vanilla) sem framework, sem bundler e sem backend — os dados persistem apenas no `localStorage` do navegador.

## Comandos

Não há `package.json`, build step, linter ou suíte de testes configurados neste repositório.

- **Rodar o app**: abrir `projeto/index.html` diretamente no navegador, ou servir a pasta com um servidor estático simples (ex.: `python -m http.server` dentro de `projeto/`) se precisar testar via `http://` em vez de `file://`.
- **Verificar sintaxe de um arquivo JS**: `node --check projeto/js/<arquivo>.js` (não há suíte de testes; isso só pega erros de sintaxe).
- Não existe processo de lint, teste automatizado ou build a rodar antes de commitar.

## Arquitetura

### Carregamento de scripts (ordem importa)

`index.html` carrega 12 arquivos de `projeto/js/` como `<script>` clássicos (sem `type="module"`), todos compartilhando o mesmo escopo global `window`. A ordem em `index.html` é:

```
state.js → theme.js → helpers.js → ui.js → data-io.js → auth.js → nav.js →
dashboard.js → salas.js → professores.js → turmas.js → alocacao.js → main.js
```

Não há `import`/`export`: toda função e variável top-level declarada em qualquer arquivo é global e visível para todos os outros. Nomes precisam continuar únicos entre os arquivos. `main.js` é sempre o último a carregar porque é ele quem registra o listener de `DOMContentLoaded` e inicializa a aplicação.

### Estado e persistência (`js/state.js`)

Todo o estado da aplicação vive num único objeto global `state` (`{ salas, professores, turmas, alocacoes }`), mais algumas variáveis globais auxiliares (`currentRole`, `currentSection`, `searchState`, `weekFilter`). Não há store/reducer — qualquer função pode mutar `state` diretamente.

- `loadState()` / `saveState()` leem e gravam `state` inteiro em `localStorage` (`adm_sala_data_v1`) como JSON.
- `seedData()` recria os dados de exemplo (usado no primeiro load e pelo botão "Restaurar dados de exemplo").
- Padrão de mutação usado em todo o código: alterar `state` → `saveState()` → `closeModal()`/`renderAll()`.

### Renderização

Não há virtual DOM nem diffing. Cada seção (`Dashboard`, `Salas`, `Professores`, `Turmas`, `Alocação`) tem uma função `renderX()` que reconstrói o `innerHTML` do container inteiro a partir de `state`, usando template strings. `renderSection(section)` (em `nav.js`) despacha para a função de render correta; `navigateTo(section)` troca a seção visível e chama `renderSection`. Depois de qualquer mutação de dados, o padrão é chamar `renderAll()` (que re-renderiza a seção atualmente visível).

Formulários e confirmações usam um modal genérico (`js/ui.js`: `openModal`/`closeModal`/`openConfirm`) que injeta HTML no `#modal-body` e usa `onclick` inline apontando para funções globais (ex.: `onclick="saveTurma('${id}')"`) — por isso essas funções precisam estar no escopo global.

### Autenticação e permissões (`js/auth.js`, `js/state.js`)

Login é só por senha (sem usuário), mapeada para um papel em `PASSWORDS` (`state.js`): `"123"` → `admin`, `"456"` → `pedagogico`. O objeto `PERMISSIONS` define o que cada papel pode fazer (`manageSalas`, `manageProfessores`, `manageTurmas`, `manageAlocacoes`). A função `can(permission)` (em `auth.js`) é checada tanto na renderização (para esconder botões) quanto no início de cada função de escrita (`openXForm`, `saveX`, `deleteX`) como segunda camada de proteção. `pedagogico` pode gerenciar alocações mas nunca criar/editar/excluir turmas.

### Exportar/Importar dados (`js/data-io.js`)

`exportData()` baixa o `state` inteiro como `.json`. `handleImportFile()` valida a estrutura do arquivo (precisa ter `salas`/`professores`/`turmas`/`alocacoes` como arrays) antes de pedir confirmação e substituir `state` por completo — mesmo padrão de "tudo ou nada" usado na alocação multi-dia.

### Núcleo de negócio: detecção de conflitos (`js/alocacao.js`)

A regra central do sistema é impedir alocações conflitantes. `findRoomConflict()` e `findProfessorConflict()` verificam sobreposição de horário (`periodsOverlap`, em minutos via `timeToMinutes`) contra todas as alocações existentes — a primeira por sala, a segunda pelo professor da turma. `saveAlocacao()`:

1. Aceita um ou mais dias da semana de uma vez (checkboxes na criação; um único dia na edição).
2. Valida conflitos de **todos** os dias selecionados antes de gravar qualquer um (tudo ou nada).
3. Só então grava (uma alocação por dia selecionado) e persiste.

`PERIODOS` (em `state.js`) define horários fixos pré-definidos (1º ao 8º horário); o formulário permite cair para um horário "Personalizado" quando o horário não bate com nenhum período fixo (`findPeriodoForTimes`).

### Estilo (`projeto/css/`)

Assim como o JS, o CSS é dividido em 11 arquivos por assunto, carregados via `<link>` em `index.html` nesta ordem: `tokens.css` (custom properties) → `base.css` (reset + keyframes compartilhados) → `buttons.css` → `forms.css` → `login.css` → `layout.css` (app shell: sidebar/topbar/main) → `components.css` (card, tabela, chips, avatar, `.color-dot`) → `weekly.css` (grade semanal) → `modal.css` → `toast.css` → `print.css`. A ordem só importa porque `tokens.css` define as custom properties que todo o resto consome — não há conflito de especificidade relevante entre os arquivos.

Tema claro/escuro via atributo `data-theme` na tag `<html>` (alternado por `js/theme.js`, persistido em `localStorage`), com fallback para `prefers-color-scheme` quando não há preferência salva. Todas as cores são custom properties CSS redefinidas por tema (`tokens.css`). Existe uma paleta categórica fixa (`--cat-1` a `--cat-8`) usada para colorir salas de forma consistente em toda a UI (lista de salas, tabela de alocação, grade semanal) — a cor de cada sala é derivada da sua posição no array `state.salas` (`salaColorVar()` em `js/helpers.js`) e passada via a custom property `--dot-color`/`--slot-color`/`--tile-color` inline no HTML gerado; a cor em si nunca é armazenada no dado. Todas as unidades de tamanho usam `rem` (base 16px), não `px`.

Classes utilitárias para evitar `style="..."` inline nos arquivos JS: `.header-actions` / `.header-actions--wrap` (agrupar busca + botão no cabeçalho de seção), `.section-gap` (espaçamento entre cards), `.cell-strong` (célula de tabela em negrito), `.confirm-message` (texto do modal de confirmação). Inline `style="--dot-color:...;"` etc. só é usado para valores realmente dinâmicos (cor calculada por item); qualquer outro estilo repetido deve virar classe em `components.css` em vez de inline no JS.
