import { readKey, writeKey, debounce } from "./modules/storage.js";
import { initTheme, toggleTheme, getTheme } from "./modules/theme.js";
import { initials } from "./modules/auth.js";
import { fetchLive } from "./modules/live.js";
import { matchKey, filledCount, groupsComplete, invalidateDownstream, tieLoser, tieWinner } from "./modules/standings.js";
import { isLocked, totalPoints } from "./modules/scoring.js";
import { renderGroups } from "./modules/render-groups.js";
import { renderKnockout } from "./modules/render-knockout.js";
import { renderScorers } from "./modules/render-scorers.js";
import { renderLeague, renderLeagueGate } from "./modules/render-league.js";
import { signInWithGoogle, signOutUser, onAuthChanged } from "./modules/firebase.js";
import { cargarPronosticos, guardarPronosticos } from "./modules/firestore.js";
import { handleCrearLiga, handleUnirse, handleSalir, getLigaActiva, getMisLigasLocal, cargarMisLigas, suscribirRanking, cambiarLigaActiva, sincronizarPuntos, desuscribirRanking } from "./modules/leagues.js";

const defaultState = () => ({ results: {}, ko: {}, tp: null, tab: "groups", useLive: true, live: {}, liveAt: 0 });

let state = defaultState();
let currentUser = null;
let pollTimer = null;
let fetching = false;

const $ = (selector) => document.querySelector(selector);
const board = $("#board");
const viewGroups = $("#view-groups");
const viewKo = $("#view-ko");
const viewScorers = $("#view-scorers");
const viewLeague = $("#view-league");

const persistFirestore = debounce(async () => {
  if (!currentUser || currentUser.uid.startsWith("guest:")) return;
  await guardarPronosticos(currentUser.uid, state.results);
  const pts = totalPoints(state);
  const liga = getLigaActiva();
  if (liga) await sincronizarPuntos(currentUser.uid, liga, pts);
}, 800);

const persistLocal = debounce(() => {
  if (!currentUser) return;
  writeKey(`wc2026:guest:${currentUser.uid}`, state);
}, 250);

function persist() {
  if (currentUser && !currentUser.uid.startsWith("guest:")) persistFirestore();
  else persistLocal();
}

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
  if (!el) return;
  if (!state.useLive) { el.innerHTML = '<span class="live__dot live__dot--off"></span>modo manual'; return; }
  if (forced === "loading") { el.innerHTML = '<span class="live__dot"></span>buscando…'; return; }
  if (forced === "error") { el.innerHTML = '<span class="live__dot live__dot--off"></span>sin conexión'; return; }
  const n = Object.keys(state.live).length;
  const pts = totalPoints(state);
  el.innerHTML = `<span class="live__dot"></span>${n} oficiales · ${relTime(state.liveAt) || "—"} · <b>${pts} pts</b>`;
}

function renderProgress() {
  const n = filledCount(state);
  const bar = $("#bar");
  if (bar) bar.style.width = (n / 72 * 100) + "%";
  const prog = $("#prog");
  if (prog) prog.textContent = `${n} / 72`;
  document.querySelectorAll(".tab").forEach(tab => {
    if (tab.dataset.tab === "ko") tab.innerHTML = groupsComplete(state)
      ? "Llaves"
      : '<span class="tab__count"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>Llaves';
  });
  updateLiveStatus();
}

function renderNote() {
  const pts = totalPoints(state);
  const ptsLabel = pts > 0 ? ` · <b>${pts} puntos</b> hasta ahora` : "";
  const note = $("#note");
  if (!note) return;
  note.innerHTML = groupsComplete(state)
    ? `<b>Listo:</b> grupos completos${ptsLabel}. Pasá a las Llaves y armá tu camino al título.`
    : `Los partidos en juego o finalizados se bloquean automáticamente. Resultado oficial arriba, tu pronóstico abajo con puntaje${ptsLabel}. El bracket se desbloquea con los 72 partidos.`;
}

function render() {
  board.innerHTML = renderGroups(state);
  if (state.tab === "ko") viewKo.innerHTML = renderKnockout(state);
  if (state.tab === "scorers") viewScorers.innerHTML = renderScorers(state);
  if (state.tab === "league") renderLeagueView();
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
  if (value.length > 1) value = value.slice(0, 1);
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
    if (next) { next.value = value; next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
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

function updateTieVisuals(round, m) {
  const winner = tieWinner(state, round, m);
  const rows = viewKo.querySelectorAll(`.tie__row[data-tie-r="${round}"][data-tie-m="${m}"]`);
  rows.forEach(row => {
    const code = row.dataset.tieC;
    row.classList.toggle("tie__row--winner", winner === code);
    row.classList.toggle("tie__row--loser", !!winner && winner !== code);
  });
}

function onKoScoreInput(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length > 2) value = value.slice(0, 2);
  input.value = value;

  if (input.dataset.koR !== undefined) {
    const round = Number(input.dataset.koR);
    const m = Number(input.dataset.koM);
    const side = input.dataset.koS;
    const key = `${round}-${m}`;
    state.koScores = state.koScores || {};
    state.koScores[key] = state.koScores[key] || { h: "", a: "" };
    state.koScores[key][side] = value;
    const prevWinner = state.ko[key];
    invalidateDownstream(state);
    updateTieVisuals(round, m);
    const newWinner = tieWinner(state, round, m);
    if (newWinner !== prevWinner) {
      const ko = viewKo.querySelector(".ko");
      const scrollLeft = ko ? ko.scrollLeft : 0;
      viewKo.innerHTML = renderKnockout(state);
      if (ko) viewKo.querySelector(".ko").scrollLeft = scrollLeft;
    }
    persist();
    return;
  }

  if (input.dataset.kopR !== undefined) {
    const round = Number(input.dataset.kopR);
    const m = Number(input.dataset.kopM);
    const side = input.dataset.kopS;
    const key = `${round}-${m}`;
    state.koPens = state.koPens || {};
    state.koPens[key] = state.koPens[key] || { h: "", a: "" };
    state.koPens[key][side] = value;
    invalidateDownstream(state);
    updateTieVisuals(round, m);
    persist();
    return;
  }

  if (input.dataset.tpSide !== undefined) {
    const side = input.dataset.tpSide;
    state.koScores = state.koScores || {};
    state.koScores["3p"] = state.koScores["3p"] || { h: "", a: "" };
    state.koScores["3p"][side] = value;
    const s = state.koScores["3p"];
    if (s.h !== "" && s.a !== "") {
      const loserA = tieLoser(state, 3, 0);
      const loserB = tieLoser(state, 3, 1);
      if (Number(s.h) > Number(s.a)) state.tp = loserA;
      else if (Number(s.a) > Number(s.h)) state.tp = loserB;
      else state.tp = null;
    }
    persist();
  }
}

function onDocumentInput(event) {
  if (event.target.id === "scorersSearch") { onScorersSearch(event); return; }
  if (!event.target.closest) return;
  const koInput = event.target.closest(".score--ko");
  if (koInput) { onKoScoreInput(koInput); return; }
  onScoreInput(event);
}

function onBoardClick(event) {
  const tieBtn = event.target.closest(".tie__team[data-c]");
  if (tieBtn) {
    const round = Number(tieBtn.dataset.r), m = Number(tieBtn.dataset.m);
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
  }
}

function onTabClick(tab) {
  state.tab = tab.dataset.tab;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("tab--active", t === tab));
  viewGroups.hidden = state.tab !== "groups";
  viewKo.hidden = state.tab !== "ko";
  viewScorers.hidden = state.tab !== "scorers";
  if (viewLeague) viewLeague.hidden = state.tab !== "league";
  if (state.tab === "ko") viewKo.innerHTML = renderKnockout(state);
  if (state.tab === "scorers") viewScorers.innerHTML = renderScorers(state);
  if (state.tab === "league") renderLeagueView();
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

function renderProfileChip(user) {
  const chip = $("#profileChip");
  if (!chip) return;
  const name = user.displayName || user.name || "Usuario";
  const photo = user.photoURL || user.picture || null;
  const avatar = photo
    ? `<img class="profile__avatar" src="${photo}" alt="" referrerpolicy="no-referrer">`
    : `<span class="profile__avatar profile__avatar--initials">${initials(name)}</span>`;
  chip.innerHTML = `${avatar}<span class="profile__name">${name}</span>`;
}

function renderLeagueView() {
  if (!viewLeague) return;
  const liga = getLigaActiva();
  viewLeague.innerHTML = liga
    ? '<div class="lock"><p class="lock__title">Cargando ranking…</p></div>'
    : renderLeagueGate();
  if (!liga) bindLeagueGate();
}

function onRanking(ranking, uid) {
  if (!viewLeague || viewLeague.hidden) return;
  const liga = getLigaActiva();
  const ligas = getMisLigasLocal();
  viewLeague.innerHTML = renderLeague(ranking, uid, liga, ligas);
  bindLeagueEvents(uid);
}

function bindLeagueEvents(uid) {
  const selector = document.querySelector("#ligaSelector");
  if (selector) selector.addEventListener("change", (e) => {
    cambiarLigaActiva(e.target.value, uid, onRanking);
  });

  const btnSalir = document.querySelector("#btnSalirLiga");
  if (btnSalir) btnSalir.addEventListener("click", async () => {
    const codigo = btnSalir.dataset.codigo;
    const confirm = await window.Swal?.fire({
      title: "¿Salir de la liga?",
      text: "Tu historial de pronósticos se mantiene, solo salís del ranking.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Salir",
      cancelButtonText: "Cancelar",
      background: "var(--color-surface)",
      color: "var(--color-text)",
      confirmButtonColor: "var(--color-flare)"
    });
    if (!confirm?.isConfirmed) return;
    await handleSalir(uid, codigo);
    const nuevaLiga = getLigaActiva();
    if (nuevaLiga) suscribirRanking(nuevaLiga, uid, onRanking);
    else renderLeagueView();
  });

  const btnNueva = document.querySelector("#btnNuevaLiga");
  if (btnNueva) btnNueva.addEventListener("click", () => {
    viewLeague.innerHTML = renderLeagueGate();
    bindLeagueGate();
  });
}

function bindLeagueGate() {
  const formCrear = $("#formCrear");
  const formUnirse = $("#formUnirse");
  if (formCrear) formCrear.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const nombre = $("#inputNombreLiga").value.trim();
    if (!nombre) return;
    const { codigo } = await handleCrearLiga(currentUser.uid, nombre, currentUser.displayName || currentUser.name, currentUser.photoURL || null, onRanking);
    if (window.Swal) window.Swal.fire({
      title: "¡Liga creada!",
      html: `Compartí este código con tus contactos:<br><br><b style="font-size:1.4em;letter-spacing:.1em">${codigo}</b>`,
      icon: "success",
      background: "var(--color-surface)",
      color: "var(--color-text)"
    });
  });
  if (formUnirse) formUnirse.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const codigo = $("#inputCodigo").value.trim().toUpperCase();
    try {
      await handleUnirse(codigo, currentUser.uid, currentUser.displayName || currentUser.name, currentUser.photoURL || null, onRanking);
    } catch (err) {
      if (window.Swal) window.Swal.fire({
        title: "Liga no encontrada",
        text: "Verificá el código e intentá de nuevo.",
        icon: "error",
        background: "var(--color-surface)",
        color: "var(--color-text)"
      });
    }
  });
}

async function onUserSignedIn(user) {
  currentUser = user;
  renderProfileChip(user);
  $("#authGate").hidden = true;
  const [saved] = await Promise.all([
    cargarPronosticos(user.uid),
    cargarMisLigas(user.uid)
  ]);
  state = Object.assign(defaultState(), {
    results: saved || {},
    useLive: true,
    live: state.live,
    liveAt: state.liveAt
  });
  const liveToggle = $("#liveToggle");
  if (liveToggle) liveToggle.checked = true;
  render();
  if (Object.keys(state.live).length === 0) refreshLive();
  startPoll();
  const ligaGuardada = getLigaActiva();
  if (ligaGuardada) suscribirRanking(ligaGuardada, user.uid, onRanking);
}

function onUserSignedOut() {
  currentUser = null;
  desuscribirRanking();
  state = defaultState();
  $("#authGate").hidden = false;
}

function bindEvents() {
  document.addEventListener("input", onDocumentInput);
  document.addEventListener("click", onBoardClick);
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => onTabClick(tab)));
  const liveToggle = $("#liveToggle");
  if (liveToggle) liveToggle.addEventListener("change", onLiveToggle);
  const refresh = $("#refresh");
  if (refresh) refresh.addEventListener("click", refreshLive);
  const reset = $("#reset");
  if (reset) reset.addEventListener("click", onReset);
  const themeToggle = $("#themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", () => {
    const next = toggleTheme();
    themeToggle.setAttribute("aria-pressed", next === "light");
  });
  const switchUser = $("#switchUser");
  if (switchUser) switchUser.addEventListener("click", () => { $("#authGate").hidden = false; });
  const signoutBtn = $("#signout");
  if (signoutBtn) signoutBtn.addEventListener("click", async () => {
    desuscribirRanking();
    await signOutUser();
  });
}

function initAuthGate() {
  const btnGoogle = $("#btnGoogle");
  if (btnGoogle) btnGoogle.addEventListener("click", async () => {
    try {
      const user = await signInWithGoogle();
      await onUserSignedIn(user);
    } catch (e) {
      if (window.Swal) window.Swal.fire({
        title: "Error al iniciar sesión",
        text: e.message,
        icon: "error",
        background: "var(--color-surface)",
        color: "var(--color-text)"
      });
    }
  });
  const guestForm = $("#guestForm");
  if (guestForm) guestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#guestName").value.trim() || "Invitado";
    const fakeUser = {
      uid: `guest:${name.toLowerCase().replace(/\s+/g, "-")}`,
      displayName: name,
      photoURL: null,
      email: null
    };
    currentUser = fakeUser;
    renderProfileChip(fakeUser);
    $("#authGate").hidden = true;
    const saved = await readKey(`wc2026:guest:${fakeUser.uid}`);
    state = Object.assign(defaultState(), saved || {});
    render();
    if (state.useLive) refreshLive();
    startPoll();
  });
}

async function init() {
  initTheme();
  const themeToggle = $("#themeToggle");
  if (themeToggle) themeToggle.setAttribute("aria-pressed", getTheme() === "light");
  bindEvents();
  initAuthGate();
  onAuthChanged(async (user) => {
    if (user) await onUserSignedIn(user);
    else onUserSignedOut();
  });
}

init();