import { readKey, writeKey, debounce } from "./modules/storage.js";
import { initTheme, toggleTheme, getTheme } from "./modules/theme.js";
import { getProfile, initials, renderGoogleButton, signInAsGuest, googleConfigured } from "./modules/auth.js";
import { fetchLive } from "./modules/live.js";
import { matchKey, filledCount, groupsComplete, invalidateDownstream } from "./modules/standings.js";
import { isLocked, totalPoints } from "./modules/scoring.js";
import { renderGroups } from "./modules/render-groups.js";
import { renderKnockout } from "./modules/render-knockout.js";
import { renderScorers } from "./modules/render-scorers.js";

const defaultState = () => ({ results: {}, ko: {}, tp: null, tab: "groups", useLive: true, live: {}, liveAt: 0 });

let state = defaultState();
let storageKey = null;
let pollTimer = null;
let fetching = false;

const $ = (selector) => document.querySelector(selector);
const board = $("#board");
const viewGroups = $("#view-groups");
const viewKo = $("#view-ko");
const viewScorers = $("#view-scorers");

const persist = debounce(() => { if (storageKey) writeKey(storageKey, state); }, 250);

function relTime(ts) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "recién";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function updateLiveStatus(forced) {
  const el = $("#liveStatus");
  if (!state.useLive) { el.innerHTML = '<span class="live__dot live__dot--off"></span>modo manual'; return; }
  if (forced === "loading") { el.innerHTML = '<span class="live__dot"></span>buscando…'; return; }
  if (forced === "error") { el.innerHTML = '<span class="live__dot live__dot--off"></span>sin conexión'; return; }
  const n = Object.keys(state.live).length;
  const pts = totalPoints(state);
  el.innerHTML = `<span class="live__dot"></span>${n} oficiales · ${relTime(state.liveAt) || "—"} · <b>${pts} pts</b>`;
}

function renderProgress() {
  const n = filledCount(state);
  $("#bar").style.width = (n / 72 * 100) + "%";
  $("#prog").textContent = `${n} / 72`;
  document.querySelectorAll(".tab").forEach(tab => {
    if (tab.dataset.tab === "ko") tab.innerHTML = groupsComplete(state) ? "Llaves" : '<span class="tab__count"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>Llaves';
  });
  updateLiveStatus();
}

function renderNote() {
  const pts = totalPoints(state);
  const ptsLabel = pts > 0 ? ` · <b>${pts} puntos</b> hasta ahora` : "";
  $("#note").innerHTML = groupsComplete(state)
    ? `<b>Listo:</b> grupos completos${ptsLabel}. Pasá a las Llaves y armá tu camino al título.`
    : `Los partidos en juego o finalizados se bloquean automáticamente. Resultado oficial arriba, tu pronóstico abajo con puntaje${ptsLabel}. El bracket se desbloquea con los 72 partidos.`;
}

function render() {
  board.innerHTML = renderGroups(state);
  if (state.tab === "ko") viewKo.innerHTML = renderKnockout(state);
  if (state.tab === "scorers") viewScorers.innerHTML = renderScorers(state);
  renderProgress();
  renderNote();
}

async function refreshLive() {
  if (fetching || !state.useLive) return;
  fetching = true;
  updateLiveStatus("loading");
  const result = await fetchLive();
  fetching = false;
  if (result) {
    state.live = result;
    state.liveAt = Date.now();
    render();
    persist();
  } else {
    updateLiveStatus("error");
  }
}

function startPoll() {
  clearInterval(pollTimer);
  if (state.useLive) pollTimer = setInterval(refreshLive, 5 * 60 * 1000);
}

function focusScore(g, m, side) {
  const input = document.querySelector(`.score[data-g="${g}"][data-m="${m}"][data-s="${side}"]`);
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function onScoreInput(event) {
  const input = event.target.closest(".score");
  if (!input || input.disabled) return;
  let value = input.value.replace(/\D/g, "");
  if (value.length > 2) value = value.slice(0, 2);
  const g = input.dataset.g, m = input.dataset.m, s = input.dataset.s;
  const key = matchKey(g, m);
  state.results[key] = state.results[key] || { h: "", a: "" };
  state.results[key][s] = value;
  if (groupsComplete(state)) { state.ko = {}; state.tp = null; }
  board.innerHTML = renderGroups(state);
  renderProgress();
  renderNote();
  requestAnimationFrame(() => {
    const next = document.querySelector(`.score[data-g="${g}"][data-m="${m}"][data-s="${s}"]`);
    if (next) {
      next.value = value;
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });
  const r = state.results[key];
  if (r && r.h !== "" && r.a !== "" && window.Swal) {
    setTimeout(() => confirmScore(g, m), 300);
  }
  persist();
}

async function confirmScore(g, m) {
  const key = matchKey(g, m);
  const r = state.results[key];
  if (!r || r.h === "" || r.a === "") return;
  const { GROUPS, PAIRS } = await import("./data/groups.js");
  const { TEAMS } = await import("./data/teams.js");
  const teams = GROUPS[g];
  const [hi, ai] = PAIRS[Number(m)];
  const home = TEAMS[teams[hi]].n;
  const away = TEAMS[teams[ai]].n;
  const result = await window.Swal.fire({
    title: "¿Confirmás tu pronóstico?",
    html: `<b>${home} ${r.h} – ${r.a} ${away}</b>`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    confirmButtonColor: "var(--color-accent)",
    cancelButtonColor: "var(--color-flare)"
  });
  if (result.isConfirmed) {
    window.Swal.fire({
      title: "¡Pronóstico guardado!",
      html: `<b>${home} ${r.h} – ${r.a} ${away}</b>`,
      icon: "success",
      timer: 1800,
      showConfirmButton: false,
      background: "var(--color-surface)",
      color: "var(--color-text)"
    });
  }
}

function onBoardClick(event) {
  const tieBtn = event.target.closest(".tie__team[data-c]");
  if (tieBtn) {
    const round = Number(tieBtn.dataset.r);
    const m = Number(tieBtn.dataset.m);
    const key = `${round}-${m}`;
    state.ko[key] = state.ko[key] === tieBtn.dataset.c ? undefined : tieBtn.dataset.c;
    invalidateDownstream(state);
    viewKo.innerHTML = renderKnockout(state);
    persist();
    return;
  }
  const tpBtn = event.target.closest(".tie__team[data-tp]");
  if (tpBtn) {
    state.tp = state.tp === tpBtn.dataset.tp ? null : tpBtn.dataset.tp;
    viewKo.innerHTML = renderKnockout(state);
    persist();
    return;
  }
  const confirmBtn = event.target.closest(".match__confirm");
  if (confirmBtn) {
    confirmScore(confirmBtn.dataset.g, confirmBtn.dataset.m);
  }
}

function onTabClick(tab) {
  state.tab = tab.dataset.tab;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("tab--active", t === tab));
  viewGroups.hidden = state.tab !== "groups";
  viewKo.hidden = state.tab !== "ko";
  viewScorers.hidden = state.tab !== "scorers";
  if (state.tab === "ko") viewKo.innerHTML = renderKnockout(state);
  if (state.tab === "scorers") viewScorers.innerHTML = renderScorers(state);
  persist();
}

function onLiveToggle(event) {
  state.useLive = event.target.checked;
  if (groupsComplete(state)) { state.ko = {}; state.tp = null; }
  startPoll();
  render();
  persist();
  if (state.useLive) refreshLive();
}

function onReset() {
  window.Swal
    ? window.Swal.fire({
      title: "¿Reiniciar pronósticos?",
      text: "Se borran todos tus resultados. Los datos oficiales se mantienen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
      background: "var(--color-surface)",
      color: "var(--color-text)",
      confirmButtonColor: "var(--color-flare)",
      cancelButtonColor: "var(--color-muted)"
    }).then(r => { if (r.isConfirmed) { state.results = {}; state.ko = {}; state.tp = null; render(); persist(); } })
    : (confirm("¿Borrar tus pronósticos?") && (state.results = {}, state.ko = {}, state.tp = null, render(), persist()));
}

function onScorersSearch(event) {
  const q = event.target.value.toLowerCase().trim();
  const rows = document.querySelectorAll("#scorersList .scorer");

  let visible = 0;

  rows.forEach(row => {
    const match = !q || row.dataset.search.includes(q);

    row.style.display = match ? "" : "none";

    if (match) visible++;
  });

  const empty = document.querySelector("#scorersEmpty");
  if (empty) empty.hidden = visible > 0;
}

function onDocumentInput(event) {
  if (event.target.id === "scorersSearch") { onScorersSearch(event); return; }
  if (!event.target.closest) return;
  onScoreInput(event);
}

function bindEvents() {
  document.addEventListener("change", onDocumentInput);
  document.addEventListener("click", onBoardClick);
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => onTabClick(tab)));
  $("#liveToggle").addEventListener("change", onLiveToggle);
  $("#refresh").addEventListener("click", refreshLive);
  $("#reset").addEventListener("click", onReset);
  $("#themeToggle").addEventListener("click", onThemeToggle);
  $("#switchUser").addEventListener("click", openGate);
}

function onThemeToggle() {
  const next = toggleTheme();
  $("#themeToggle").setAttribute("aria-pressed", next === "light");
}

function renderProfileChip(profile) {
  const chip = $("#profileChip");
  const avatar = profile.picture
    ? `<img class="profile__avatar" src="${profile.picture}" alt="" referrerpolicy="no-referrer">`
    : `<span class="profile__avatar profile__avatar--initials">${initials(profile.name)}</span>`;
  chip.innerHTML = `${avatar}<span class="profile__name">${profile.name}</span>`;
}

function openGate() { $("#authGate").hidden = false; }
function closeGate() { $("#authGate").hidden = true; }

async function activateProfile(profile) {
  renderProfileChip(profile);
  closeGate();
  storageKey = `wc2026:data:${profile.id}`;
  const saved = await readKey(storageKey);
  state = Object.assign(defaultState(), saved || {});
  $("#liveToggle").checked = state.useLive;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("tab--active", t.dataset.tab === state.tab));
  viewGroups.hidden = state.tab !== "groups";
  viewKo.hidden = state.tab !== "ko";
  viewScorers.hidden = state.tab !== "scorers";
  render();
  if (state.useLive) refreshLive();
  startPoll();
}

function initGate() {
  const googleBtn = $("#googleBtn");
  const googleWrap = $("#googleAuth");
  if (!googleConfigured()) {
    googleWrap.hidden = true;
  } else {
    renderGoogleButton(googleBtn, (profile) => activateProfile(profile));
  }
  $("#guestForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#guestName").value;
    const profile = signInAsGuest(name);
    activateProfile(profile);
  });
}

function loadSweetAlert() {
  return new Promise(resolve => {
    if (window.Swal) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js";
    s.onload = resolve;
    document.head.appendChild(s);
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css";
    document.head.appendChild(l);
  });
}

async function init() {
  initTheme();
  $("#themeToggle").setAttribute("aria-pressed", getTheme() === "light");
  bindEvents();
  initGate();
  const profile = getProfile();
  if (profile) activateProfile(profile);
  else openGate();
  loadSweetAlert();
}

init();