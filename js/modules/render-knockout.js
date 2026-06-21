import { TEAMS } from "../data/teams.js";
import { SEED_SLOTS, ROUND_NAMES, ROUND_SIZE } from "../data/groups.js";
import { flagImg } from "./flag.js";
import { groupsComplete, tieTeams, tieWinner, tieLoser } from "./standings.js";

function teamSlot(code, options) {
  if (!code) return `<button class="tie__team tie__team--dim" disabled><span class="tie__name">Por definir</span></button>`;
  const { pick, dim, seedTag, attrs } = options;
  const classes = ["tie__team"];
  if (pick) classes.push("tie__team--pick");
  if (dim) classes.push("tie__team--dim");
  return `<button class="${classes.join(" ")}" ${attrs}>${flagImg(code, 40)}<span class="tie__name">${TEAMS[code].n}</span>${seedTag || ""}</button>`;
}

function tieBlock(state, round, m, extraClass) {
  const teams = tieTeams(state, round, m);
  const winner = tieWinner(state, round, m);
  const isFirstRound = round === 0;
  const slots = teams.map((code, idx) => {
    const seedTag = isFirstRound ? `<span class="tie__seed">#${SEED_SLOTS[2 * m + idx]}</span>` : "";
    return teamSlot(code, {
      pick: winner === code,
      dim: winner && winner !== code,
      seedTag,
      attrs: `data-r="${round}" data-m="${m}" data-c="${code}"`
    });
  }).join("");
  return `<div class="tie ${extraClass || ""}">${slots}</div>`;
}

function thirdPlaceBlock(state) {
  const loserA = tieLoser(state, 3, 0);
  const loserB = tieLoser(state, 3, 1);
  const pick = [loserA, loserB].includes(state.tp) ? state.tp : null;
  const slot = (code) => code ? teamSlot(code, { pick: pick === code, dim: pick && pick !== code, attrs: `data-tp="${code}"` }) : teamSlot(null, {});
  return `<div class="round"><p class="round__title">3.º puesto</p><div class="tie tie--centered">${slot(loserA)}${slot(loserB)}</div></div>`;
}

function championBlock(state) {
  const champion = tieWinner(state, 4, 0);
  const won = champion ? "champion--won" : "";
  const content = champion
    ? `${flagImg(champion, 80)}<span class="champion__name">${TEAMS[champion].n}</span>`
    : `<span class="champion__name champion__name--empty">¿?</span>`;
  return `<div class="champion ${won}"><p class="champion__kicker">Campeón del mundo</p><div class="champion__team">${content}</div></div>`;
}

export function renderKnockout(state) {
  if (!groupsComplete(state)) {
    return `<div class="lock">
      <div class="lock__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2"/>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </div>
      <p class="lock__title">Faltan partidos de grupos</p>
      <p class="lock__hint">Completá los 72 partidos (resultados oficiales + tus pronósticos) y las llaves se arman solas: 12 primeros, 12 segundos y los 8 mejores terceros.</p>
    </div>`;
  }
  let columns = "";
  for (let round = 0; round < 5; round++) {
    let ties = "";
    for (let m = 0; m < ROUND_SIZE[round]; m++) ties += tieBlock(state, round, m, round === 4 ? "tie--centered" : "");
    columns += `<div class="round ${round === 4 ? "round--final" : ""}"><p class="round__title">${ROUND_NAMES[round]}</p>${ties}</div>`;
  }
  return championBlock(state) + `<div class="ko">${columns}${thirdPlaceBlock(state)}</div>`;
}
