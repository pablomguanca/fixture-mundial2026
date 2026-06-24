import { flagImg } from "./flag.js";

function avatarHtml(miembro) {
  if (miembro.foto) return `<img class="rank__avatar" src="${miembro.foto}" alt="" referrerpolicy="no-referrer">`;
  const letters = (miembro.nombre || "U").trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  return `<span class="rank__avatar rank__avatar--initials">${letters}</span>`;
}

function rankPos(rank) {
  const colors = { 1: "var(--color-gold)", 2: "var(--color-muted)", 3: "#cd7f32" };
  const color = colors[rank] || "var(--color-muted)";
  return `<span class="rank__pos" style="color:${color}">${rank}</span>`;
}

function ligaSelector(ligas, activa) {
  if (!ligas.length) return "";
  if (ligas.length === 1) return `<span class="league__liga-name">${ligas[0].nombre}</span>`;
  const options = ligas.map(l =>
    `<option value="${l.codigo}" ${l.codigo === activa ? "selected" : ""}>${l.nombre} (${l.codigo})</option>`
  ).join("");
  return `<select class="league__selector" id="ligaSelector">${options}</select>`;
}

export function renderLeague(ranking, currentUid, ligaCodigo, ligas) {
  if (!ranking.length) {
    return `<div class="league"><div class="lock"><p class="lock__title">Liga vacía</p><p class="lock__hint">Compartí el código con tus contactos.</p></div></div>`;
  }
  const rows = ranking.map((m, i) => {
    const esVos = m.uid === currentUid;
    return `<div class="rank__row ${esVos ? "rank__row--vos" : ""}">
      ${rankPos(i + 1)}
      ${avatarHtml(m)}
      <span class="rank__name">${m.nombre}${esVos ? ' <span class="rank__badge">vos</span>' : ""}</span>
      <span class="rank__pts">${m.puntos}<span class="rank__label">pts</span></span>
    </div>`;
  }).join("");

  return `<div class="league">
    <header class="league__head">
      <div class="league__head-left">
        ${ligaSelector(ligas || [], ligaCodigo)}
        <span class="league__code">Código: <b>${ligaCodigo}</b></span>
      </div>
      <div class="league__head-right">
        <button class="league__nueva-btn" id="btnNuevaLiga">+ Liga</button>
        <button class="league__salir-btn" id="btnSalirLiga" data-codigo="${ligaCodigo}">Salir</button>
      </div>
    </header>
    <div class="league__list">${rows}</div>
  </div>`;
}

export function renderLeagueGate() {
  return `<div class="league-gate">
    <div class="league-gate__section">
      <h3 class="league-gate__title">Crear liga</h3>
      <p class="league-gate__hint">Invitá a tus contactos con un código único.</p>
      <form class="league-gate__form" id="formCrear">
        <input class="league-gate__input" id="inputNombreLiga" type="text" placeholder="Nombre de la liga" maxlength="32" required>
        <button class="league-gate__btn" type="submit">Crear</button>
      </form>
    </div>
    <div class="league-gate__divider"><span>o</span></div>
    <div class="league-gate__section">
      <h3 class="league-gate__title">Unirse a una liga</h3>
      <form class="league-gate__form" id="formUnirse">
        <input class="league-gate__input league-gate__input--code" id="inputCodigo" type="text" placeholder="Código de 6 letras" maxlength="6" required>
        <button class="league-gate__btn" type="submit">Unirse</button>
      </form>
    </div>
  </div>`;
}