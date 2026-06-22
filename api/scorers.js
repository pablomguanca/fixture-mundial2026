const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

const cache = { data: null, at: 0 };
const TTL = 30 * 60 * 1000;

async function callApi(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY }
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

function normalize(payload) {
  return (payload.response || []).map(item => {
    const stat = item.statistics && item.statistics[0] ? item.statistics[0] : {};
    return {
      player: item.player.name,
      photo: item.player.photo,
      team: stat.team ? stat.team.name : null,
      goals: stat.goals ? stat.goals.total : 0,
      assists: stat.goals ? stat.goals.assists : null,
      penalties: stat.penalty ? stat.penalty.scored : 0
    };
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  if (!process.env.API_FOOTBALL_KEY) {
    return res.status(500).json({ error: "missing_key" });
  }

  const now = Date.now();
  if (cache.data && now - cache.at < TTL) {
    return res.status(200).json({ source: "cache", updatedAt: cache.at, scorers: cache.data });
  }

  try {
    const payload = await callApi(`/players/topscorers?league=${LEAGUE}&season=${SEASON}`);
    const scorers = normalize(payload);
    cache.data = scorers;
    cache.at = now;
    return res.status(200).json({ source: "api", updatedAt: now, scorers });
  } catch (e) {
    if (cache.data) {
      return res.status(200).json({ source: "stale", updatedAt: cache.at, scorers: cache.data });
    }
    return res.status(502).json({ error: "upstream_failed" });
  }
}
