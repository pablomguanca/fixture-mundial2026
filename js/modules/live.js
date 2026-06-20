import { GROUPS, PAIRS, LIVE_URLS, NAME_TO_CODE } from "../data/groups.js";

function matchKey(g, i) {
  return g + "-" + i;
}

export function ingestLive(data) {
  const live = {};
  (data.matches || []).forEach(m => {
    if (!m.group || !/^Group /.test(m.group) || !m.score || !m.score.ft) return;
    const g = m.group.replace("Group ", "").trim();
    const c1 = NAME_TO_CODE[m.team1];
    const c2 = NAME_TO_CODE[m.team2];
    if (!c1 || !c2 || !GROUPS[g]) return;
    const teams = GROUPS[g];
    for (let i = 0; i < PAIRS.length; i++) {
      const [a, b] = PAIRS[i];
      const home = teams[a];
      const away = teams[b];
      if (home === c1 && away === c2) { live[matchKey(g, i)] = { h: m.score.ft[0], a: m.score.ft[1] }; break; }
      if (home === c2 && away === c1) { live[matchKey(g, i)] = { h: m.score.ft[1], a: m.score.ft[0] }; break; }
    }
  });
  return live;
}

export async function fetchLive() {
  for (const url of LIVE_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      return ingestLive(data);
    } catch (e) {}
  }
  return null;
}
