"use strict";

let _lastFocusedElement = null;

function toast(message, type) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast toast-${type || "info"}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null);
}

function focusFirstElement(modalEl) {
  const bodyFocusable = getFocusableElements(document.getElementById("modal-body"));
  if (bodyFocusable.length > 0) {
    bodyFocusable[0].focus();
    return;
  }
  const focusable = getFocusableElements(modalEl);
  if (focusable.length > 0) {
    focusable[0].focus();
  } else {
    modalEl.focus();
  }
}

function trapFocus(e) {
  if (e.key !== "Tab") return;
  const overlay = document.getElementById("modal-overlay");
  if (overlay.classList.contains("hidden")) return;
  const modalEl = overlay.querySelector(".modal");
  const focusable = getFocusableElements(modalEl);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function openModal(title, bodyHtml, onMount) {
  _lastFocusedElement = document.activeElement;
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = bodyHtml;
  document.getElementById("modal-overlay").classList.remove("hidden");
  if (onMount) onMount();
  focusFirstElement(document.querySelector("#modal-overlay .modal"));
}

function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("modal-body").innerHTML = "";
  _confirmCallback = null;
  if (_lastFocusedElement && typeof _lastFocusedElement.focus === "function") {
    _lastFocusedElement.focus();
  }
  _lastFocusedElement = null;
}

function openConfirm(message, onConfirm) {
  _confirmCallback = onConfirm;
  openModal("Confirmar exclusão", `
    <p class="confirm-message">${message}</p>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn-danger" onclick="runConfirm()">Excluir</button>
    </div>
  `);
}

function runConfirm() {
  const fn = _confirmCallback;
  closeModal();
  if (fn) fn();
}
