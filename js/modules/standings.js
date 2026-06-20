import { GROUPS, LETTERS, PAIRS, SEED_SLOTS } from "../data/groups.js";

export function matchKey(g, i) {
  return g + "-" + i;
}

export function effectiveResult(state, key) {
  if (state.useLive && state.live[key]) return state.live[key];
  return state.results[key] || { h: "", a: "" };
}

export function isOfficial(state, key) {
  return state.useLive && !!state.live[key];
}

function compareStandings(a, b) {
  const dgA = a.g - a.gc;
  const dgB = b.g - b.gc;
  return b.pts - a.pts || dgB - dgA || b.g - a.g || a.gc - b.gc || a.c.localeCompare(b.c);
}

export function computeGroup(state, g) {
  const teams = GROUPS[g];
  const table = {};
  teams.forEach(c => { table[c] = { c, pj: 0, g: 0, gc: 0, pts: 0 }; });
  PAIRS.forEach((pair, i) => {
    const r = effectiveResult(state, matchKey(g, i));
    if (r.h === "" || r.a === "") return;
    const home = teams[pair[0]];
    const away = teams[pair[1]];
    const hg = Number(r.h);
    const ag = Number(r.a);
    table[home].pj++; table[away].pj++;
    table[home].g += hg; table[home].gc += ag;
    table[away].g += ag; table[away].gc += hg;
    if (hg > ag) table[home].pts += 3;
    else if (hg < ag) table[away].pts += 3;
    else { table[home].pts++; table[away].pts++; }
  });
  return Object.values(table).sort(compareStandings);
}

export function filledCount(state) {
  let n = 0;
  LETTERS.forEach(g => PAIRS.forEach((pair, i) => {
    const r = effectiveResult(state, matchKey(g, i));
    if (r.h !== "" && r.a !== "") n++;
  }));
  return n;
}

export function groupsComplete(state) {
  return filledCount(state) === 72;
}

export function seedPool(state) {
  const winners = [];
  const seconds = [];
  const thirds = [];
  LETTERS.forEach(g => {
    const table = computeGroup(state, g);
    winners.push({ ...table[0], g });
    seconds.push({ ...table[1], g });
    thirds.push({ ...table[2], g });
  });
  thirds.sort(compareStandings);
  const best8 = thirds.slice(0, 8);
  const pool = [...winners, ...seconds, ...best8];
  pool.sort((a, b) => {
    const rankOf = (x) => winners.includes(x) ? 0 : seconds.includes(x) ? 1 : 2;
    return rankOf(a) - rankOf(b) || compareStandings(a, b);
  });
  return pool.map(x => x.c);
}

export function tieTeams(state, round, m) {
  if (round === 0) {
    const pool = seedPool(state);
    return [pool[SEED_SLOTS[2 * m] - 1], pool[SEED_SLOTS[2 * m + 1] - 1]];
  }
  return [tieWinner(state, round - 1, 2 * m), tieWinner(state, round - 1, 2 * m + 1)];
}

export function tieWinner(state, round, m) {
  const teams = tieTeams(state, round, m);
  const pick = state.ko[round + "-" + m];
  return teams.includes(pick) ? pick : null;
}

export function tieLoser(state, round, m) {
  const teams = tieTeams(state, round, m);
  const winner = tieWinner(state, round, m);
  if (!winner || !teams[0] || !teams[1]) return null;
  return teams[0] === winner ? teams[1] : teams[0];
}

export function invalidateDownstream(state) {
  for (let round = 1; round < 5; round++) {
    for (let m = 0; m < (16 >> round); m++) {
      const teams = tieTeams(state, round, m);
      const pick = state.ko[round + "-" + m];
      if (pick && !teams.includes(pick)) delete state.ko[round + "-" + m];
    }
  }
  const losers = [tieLoser(state, 3, 0), tieLoser(state, 3, 1)];
  if (state.tp && !losers.includes(state.tp)) state.tp = null;
}
