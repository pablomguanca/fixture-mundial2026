import { TEAMS } from "../data/teams.js";
import { GROUPS, LETTERS, PAIRS, DAYS } from "../data/groups.js";
import { flagImg } from "./flag.js";
import { computeGroup, effectiveResult, isOfficial, matchKey, groupsComplete, seedPool } from "./standings.js";

function standingsRow(row, index, qualifiedThirds) {
  let cls = "row";
  if (index === 0) cls += " row--q1";
  else if (index === 1) cls += " row--q2";
  else if (index === 2 && qualifiedThirds && qualifiedThirds.includes(row.c)) cls += " row--q3";
  const diff = row.g - row.gc;
  return `<div class="${cls}">
    <span class="row__pos">${index + 1}</span>
    <span class="row__team">${flagImg(row.c, 40)}<span class="row__name" title="${TEAMS[row.c].n}">${TEAMS[row.c].n}</span></span>
    <span class="row__stat">${row.pj}</span>
    <span class="row__stat">${row.g}</span>
    <span class="row__stat">${row.gc}</span>
    <span class="row__stat">${diff > 0 ? "+" : ""}${diff}</span>
    <span class="row__stat row__stat--pts">${row.pts}</span>
  </div>`;
}

function fixtureRow(state, g, pairIndex) {
  const teams = GROUPS[g];
  const [hi, ai] = PAIRS[pairIndex];
  const home = teams[hi];
  const away = teams[ai];
  const key = matchKey(g, pairIndex);
  const result = effectiveResult(state, key);
  const official = isOfficial(state, key);
  const dayHeading = pairIndex === 0 || DAYS[pairIndex] !== DAYS[pairIndex - 1]
    ? `<p class="fixtures__day">Fecha ${DAYS[pairIndex]}</p>` : "";
  const officialClass = official ? "score--official" : "";
  const homeFilled = !official && result.h !== "" ? "score--filled" : "";
  const awayFilled = !official && result.a !== "" ? "score--filled" : "";
  const disabled = official ? "disabled" : "";
  return `${dayHeading}<div class="match">
    <span class="match__team match__team--home"><span class="match__name" title="${TEAMS[home].n}">${TEAMS[home].n}</span>${flagImg(home, 40)}</span>
    <span class="match__score"><span class="match__row">
      <input class="score ${officialClass} ${homeFilled}" inputmode="numeric" maxlength="2" placeholder="–" value="${result.h}" data-g="${g}" data-m="${pairIndex}" data-s="h" ${disabled} aria-label="${TEAMS[home].n}">
      <span class="score__sep">:</span>
      <input class="score ${officialClass} ${awayFilled}" inputmode="numeric" maxlength="2" placeholder="–" value="${result.a}" data-g="${g}" data-m="${pairIndex}" data-s="a" ${disabled} aria-label="${TEAMS[away].n}">
    </span>${official ? '<span class="match__tag">Final</span>' : ""}</span>
    <span class="match__team">${flagImg(away, 40)}<span class="match__name" title="${TEAMS[away].n}">${TEAMS[away].n}</span></span>
  </div>`;
}

function groupCard(state, g, qualifiedThirds) {
  const standings = computeGroup(state, g);
  const rows = standings.map((row, i) => standingsRow(row, i, qualifiedThirds)).join("");
  const fixtures = PAIRS.map((_, i) => fixtureRow(state, g, i)).join("");
  return `<article class="group">
    <header class="group__head"><span class="group__letter">${g}</span><span class="group__name">Grupo ${g}</span></header>
    <div class="table">
      <div class="table__head"><span></span><span></span><span>PJ</span><span>GF</span><span>GC</span><span>DG</span><span>Pts</span></div>
      ${rows}
    </div>
    <div class="fixtures">${fixtures}</div>
  </article>`;
}

export function renderGroups(state) {
  const qualifiedThirds = groupsComplete(state) ? seedPool(state) : null;
  return LETTERS.map(g => groupCard(state, g, qualifiedThirds)).join("");
}
