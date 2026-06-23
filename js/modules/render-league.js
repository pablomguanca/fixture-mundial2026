import { flagImg } from "./flag.js";

function medalIcon(rank) {
  const colors = ["var(--color-gold)", "var(--color-muted)", "#cd7f32"];
  const color = rank <= 3 ? colors[rank - 1] : "var(--color-muted)";
  return `<span class="rank__pos" style="color:${color}">${rank}</span>`;
}

function avatarHtml(miembro) {
  if (miembro.foto) return `<img class="rank__avatar" src="${miembro.foto}" alt="" referrerpolicy="no-referrer">`;
  const letters = miembro.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  return `<span class="rank__avatar rank__avatar--initials">${letters}</span>`;
}

export function renderLeague(ranking, currentUid, ligaCodigo) {
  if (!ranking.length) {
    return `<div class="lock"><p class="lock__title">Liga vacía</p><p class="lock__hint">Compartí el código con tus contactos.</p></div>`;
  }
  const rows = ranking.map((m, i) => {
    const esVos = m.uid === currentUid;
    return `<div class="rank__row ${esVos ? "rank__row--vos" : ""}">
      ${medalIcon(i + 1)}
      ${avatarHtml(m)}
      <span class="rank__name">${m.nombre}${esVos ? ' <span class="rank__badge">vos</span>' : ""}</span>
      <span class="rank__pts">${m.puntos}<span class="rank__label">pts</span></span>
    </div>`;
  }).join("");
  return `<div class="league">
    <header class="league__head">
      <h2 class="league__title">Ranking de la liga</h2>
      <span class="league__code">Código: <b>${ligaCodigo}</b></span>
    </header>
    <div class="league__list">${rows}</div>
  </div>`;
}

export function renderLeagueGate(hasLiga) {
  return `<div class="league-gate">
    ${hasLiga ? "" : `
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
        <input class="league-gate__input" id="inputCodigo" type="text" placeholder="Código de 6 letras" maxlength="6" required>
        <button class="league-gate__btn" type="submit">Unirse</button>
      </form>
    </div>`}
  </div>`;
}
