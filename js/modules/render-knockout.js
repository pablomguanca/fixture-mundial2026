import { TEAMS } from "../data/teams.js";
import { SEED_SLOTS, ROUND_NAMES, ROUND_SIZE } from "../data/groups.js";
import { flagImg } from "./flag.js";
import { groupsComplete, tieTeams, tieWinner, tieLoser } from "./standings.js";

export function koMatchKey(round, m) {
  return `ko:${round}-${m}`;
}

function getKoScore(state, round, m) {
  return state.koScores?.[`${round}-${m}`] || { h: "", a: "" };
}

function scoreWinner(h, a) {
  if (h === "" || a === "") return null;
  const nh = Number(h), na = Number(a);
  if (nh === na) return null;
  return nh > na ? "home" : "away";
}

function tieBlock(state, round, m) {
  const teams = tieTeams(state, round, m);
  const [home, away] = teams;
  const score = getKoScore(state, round, m);
  const winner = tieWinner(state, round, m);
  const isFirstRound = round === 0;

  function teamRow(code, side, idx) {
    if (!code) return `<div class="tie__row tie__row--empty"><span class="tie__name tie__name--tbd">Por definir</span></div>`;
    const isWinner = winner === code;
    const isLoser = winner && winner !== code;
    const seedTag = isFirstRound ? `<span class="tie__seed">#${SEED_SLOTS[2 * m + idx]}</span>` : "";
    const val = side === "h" ? score.h : score.a;
    const filled = val !== "" ? "score--filled" : "";
    return `<div class="tie__row ${isWinner ? "tie__row--winner" : ""} ${isLoser ? "tie__row--loser" : ""}">
      ${flagImg(code, 40)}
      <span class="tie__name">${TEAMS[code].n}</span>
      ${seedTag}
      <input class="score score--ko ${filled}" inputmode="numeric" maxlength="2" placeholder="–"
        value="${val}" data-ko-r="${round}" data-ko-m="${m}" data-ko-s="${side}"
        aria-label="${TEAMS[code].n}" ${!home || !away ? "disabled" : ""}>
    </div>`;
  }

  const needsPens = score.h !== "" && score.a !== "" && Number(score.h) === Number(score.a);
  const pens = state.koPens?.[`${round}-${m}`] || { h: "", a: "" };
  const pensBlock = needsPens ? `<div class="tie__pens">
    <span class="tie__pens-label">Penales</span>
    <input class="score score--ko score--pens" inputmode="numeric" maxlength="2" placeholder="–"
      value="${pens.h}" data-kop-r="${round}" data-kop-m="${m}" data-kop-s="h" aria-label="Penales local">
    <span class="score__sep">:</span>
    <input class="score score--ko score--pens" inputmode="numeric" maxlength="2" placeholder="–"
      value="${pens.a}" data-kop-r="${round}" data-kop-m="${m}" data-kop-s="a" aria-label="Penales visitante">
  </div>` : "";

  return `<div class="tie">
    ${teamRow(home, "h", 0)}
    ${teamRow(away, "a", 1)}
    ${pensBlock}
  </div>`;
}

function thirdPlaceBlock(state) {
  const loserA = tieLoser(state, 3, 0);
  const loserB = tieLoser(state, 3, 1);
  const score = getKoScore(state, 5, 0);
  const winner = state.tp || null;

  function tpRow(code, side) {
    if (!code) return `<div class="tie__row tie__row--empty"><span class="tie__name tie__name--tbd">Por definir</span></div>`;
    const isWinner = winner === code;
    const isLoser = winner && winner !== code;
    const val = side === "h" ? score.h : score.a;
    const filled = val !== "" ? "score--filled" : "";
    return `<div class="tie__row ${isWinner ? "tie__row--winner" : ""} ${isLoser ? "tie__row--loser" : ""}">
      ${flagImg(code, 40)}
      <span class="tie__name">${TEAMS[code].n}</span>
      <input class="score score--ko ${filled}" inputmode="numeric" maxlength="2" placeholder="–"
        value="${val}" data-tp-side="${side}" aria-label="${TEAMS[code].n}"
        ${!loserA || !loserB ? "disabled" : ""}>
    </div>`;
  }

  return `<div class="round">
    <p class="round__title">3.º puesto</p>
    <div class="tie">${tpRow(loserA, "h")}${tpRow(loserB, "a")}</div>
  </div>`;
}

function championBlock(state) {
  const champion = tieWinner(state, 4, 0);
  const won = champion ? "champion--won" : "";
  const content = champion
    ? `${flagImg(champion, 80)}<span class="champion__name">${TEAMS[champion].n}</span>`
    : `<span class="champion__name champion__name--empty">¿?</span>`;
  return `<div class="champion ${won}">
    <p class="champion__kicker">Campeón del mundo</p>
    <div class="champion__team">${content}</div>
  </div>`;
}

export function renderKnockout(state) {
  if (!groupsComplete(state)) {
    return `<div class="lock">
      <svg class="lock__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2"/>
        <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      </svg>
      <p class="lock__title">Faltan partidos de grupos</p>
      <p class="lock__hint">Completá los 72 partidos y las llaves se arman solas.</p>
    </div>`;
  }
  let columns = "";
  for (let round = 0; round < 5; round++) {
    let ties = "";
    for (let m = 0; m < ROUND_SIZE[round]; m++) ties += tieBlock(state, round, m);
    columns += `<div class="round ${round === 4 ? "round--final" : ""}">
      <p class="round__title">${ROUND_NAMES[round]}</p>${ties}
    </div>`;
  }
  return championBlock(state) + `<div class="ko">${columns}${thirdPlaceBlock(state)}</div>`;
}