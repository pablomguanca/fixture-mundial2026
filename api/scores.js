const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;
const LIVE_STATUSES = "1H-HT-2H-ET-BT-P-SUSP-INT-LIVE";

const cache = { live: { data: null, at: 0 }, all: { data: null, at: 0 } };
const TTL = { live: 60 * 1000, all: 60 * 60 * 1000 };

async function callApi(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY }
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return res.json();
}

function normalize(payload) {
  return (payload.response || []).map(item => ({
    id: item.fixture.id,
    date: item.fixture.date,
    status: item.fixture.status.short,
    elapsed: item.fixture.status.elapsed,
    round: item.league.round,
    venue: item.fixture.venue ? item.fixture.venue.name : null,
    city: item.fixture.venue ? item.fixture.venue.city : null,
    home: item.teams.home.name,
    away: item.teams.away.name,
    homeId: item.teams.home.id,
    awayId: item.teams.away.id,
    goalsHome: item.goals.home,
    goalsAway: item.goals.away
  }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  if (!process.env.API_FOOTBALL_KEY) {
    return res.status(500).json({ error: "missing_key" });
  }

  const scope = req.query.scope === "all" ? "all" : "live";
  const now = Date.now();
  const slot = cache[scope];

  if (slot.data && now - slot.at < TTL[scope]) {
    return res.status(200).json({ source: "cache", updatedAt: slot.at, matches: slot.data });
  }

  try {
    const path = scope === "all"
      ? `/fixtures?league=${LEAGUE}&season=${SEASON}`
      : `/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`;
    const payload = await callApi(path);
    const matches = normalize(payload);
    slot.data = matches;
    slot.at = now;
    return res.status(200).json({ source: "api", updatedAt: now, matches });
  } catch (e) {
    if (slot.data) {
      return res.status(200).json({ source: "stale", updatedAt: slot.at, matches: slot.data });
    }
    return res.status(502).json({ error: "upstream_failed" });
  }
}
