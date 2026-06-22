import { GROUPS, PAIRS, NAME_TO_CODE } from "../data/groups.js";

const LIVE_URLS = [
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
  "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json"
];

function matchKey(g, i) {
  return g + "-" + i;
}

function parseTime(raw) {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d+)?$/);
  if (!m) return null;
  const offset = m[3] ? parseInt(m[3], 10) : 0;
  return { raw, offset };
}

function ingest(data) {
  const live = {};
  (data.matches || []).forEach(m => {
    if (!m.group || !/^Group /.test(m.group)) return;
    const g = m.group.replace("Group ", "").trim();
    const c1 = NAME_TO_CODE[m.team1];
    const c2 = NAME_TO_CODE[m.team2];
    if (!c1 || !c2 || !GROUPS[g]) return;
    const teams = GROUPS[g];
    for (let i = 0; i < PAIRS.length; i++) {
      const [a, b] = PAIRS[i];
      const home = teams[a];
      const away = teams[b];
      const hasScore = m.score && m.score.ft != null;
      const entry = {
        h: hasScore ? (home === c1 ? m.score.ft[0] : m.score.ft[1]) : "",
        a: hasScore ? (home === c1 ? m.score.ft[1] : m.score.ft[0]) : "",
        ht: m.score && m.score.ht ? {
          h: home === c1 ? m.score.ht[0] : m.score.ht[1],
          a: home === c1 ? m.score.ht[1] : m.score.ht[0]
        } : null,
        finished: hasScore,
        live: false,
        status: hasScore ? "FT" : "NS",
        kickoff: m.date && m.time ? m.date + "T" + m.time : null,
        ground: m.ground || null,
        scorers: {
          home: home === c1 ? (m.goals1 || []) : (m.goals2 || []),
          away: home === c1 ? (m.goals2 || []) : (m.goals1 || [])
        }
      };
      if (home === c1 && away === c2) { live[matchKey(g, i)] = entry; break; }
      if (home === c2 && away === c1) { live[matchKey(g, i)] = entry; break; }
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
      return ingest(data);
    } catch (e) { }
  }
  return null;
}

export function buildScorersList(liveData) {
  const map = {};
  Object.values(liveData).forEach(match => {
    if (!match.finished || !match.scorers) return;
    [...match.scorers.home, ...match.scorers.away].forEach(g => {
      if (!g.name) return;
      if (!map[g.name]) map[g.name] = { name: g.name, goals: 0, minutes: [] };
      map[g.name].goals++;
      if (g.minute) map[g.name].minutes.push(g.minute);
    });
  });
  return Object.values(map).sort((a, b) => b.goals - a.goals);
}