import { GROUPS, PAIRS } from "../data/groups.js";

const ENDPOINTS = {
  live: "/api/scores?scope=live",
  all: "/api/scores?scope=all",
  scorers: "/api/scorers"
};

const API_NAME_TO_CODE = {
  "Algeria": "ALG", "Argentina": "ARG", "Australia": "AUS", "Austria": "AUT", "Belgium": "BEL",
  "Bosnia and Herzegovina": "BIH", "Brazil": "BRA", "Canada": "CAN", "Cabo Verde": "CPV",
  "Cape Verde": "CPV", "Colombia": "COL", "Croatia": "CRO", "Curacao": "CUW", "Curaçao": "CUW",
  "Czech Republic": "CZE", "Czechia": "CZE", "DR Congo": "COD", "Congo DR": "COD", "Ecuador": "ECU",
  "Egypt": "EGY", "England": "ENG", "France": "FRA", "Germany": "GER", "Ghana": "GHA", "Haiti": "HAI",
  "Iran": "IRN", "Iraq": "IRQ", "Ivory Coast": "CIV", "Cote d'Ivoire": "CIV", "Japan": "JPN",
  "Jordan": "JOR", "Mexico": "MEX", "Morocco": "MAR", "Netherlands": "NED", "New Zealand": "NZL",
  "Norway": "NOR", "Panama": "PAN", "Paraguay": "PAR", "Portugal": "POR", "Qatar": "QAT",
  "Saudi Arabia": "KSA", "Scotland": "SCO", "Senegal": "SEN", "South Africa": "RSA",
  "South Korea": "KOR", "Korea Republic": "KOR", "Spain": "ESP", "Sweden": "SWE", "Switzerland": "SUI",
  "Tunisia": "TUN", "Turkey": "TUR", "Turkiye": "TUR", "Türkiye": "TUR", "USA": "USA",
  "United States": "USA", "Uruguay": "URU", "Uzbekistan": "UZB"
};

const FINISHED = new Set(["FT", "AET", "PEN"]);
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);

export function codeFromApiName(name) {
  return API_NAME_TO_CODE[name] || null;
}

function matchKey(g, i) {
  return g + "-" + i;
}

function locateMatch(homeCode, awayCode) {
  for (const g of Object.keys(GROUPS)) {
    const teams = GROUPS[g];
    for (let i = 0; i < PAIRS.length; i++) {
      const [a, b] = PAIRS[i];
      if (teams[a] === homeCode && teams[b] === awayCode) return { key: matchKey(g, i), swap: false };
      if (teams[a] === awayCode && teams[b] === homeCode) return { key: matchKey(g, i), swap: true };
    }
  }
  return null;
}

export function mapFixtures(matches) {
  const byKey = {};
  (matches || []).forEach(m => {
    const homeCode = codeFromApiName(m.home);
    const awayCode = codeFromApiName(m.away);
    if (!homeCode || !awayCode) return;
    const located = locateMatch(homeCode, awayCode);
    if (!located) return;
    const finished = FINISHED.has(m.status);
    const live = LIVE.has(m.status);
    const goalsHome = m.goalsHome == null ? "" : m.goalsHome;
    const goalsAway = m.goalsAway == null ? "" : m.goalsAway;
    byKey[located.key] = {
      h: located.swap ? goalsAway : goalsHome,
      a: located.swap ? goalsHome : goalsAway,
      status: m.status,
      elapsed: m.elapsed,
      finished,
      live,
      kickoff: m.date,
      venue: m.venue,
      city: m.city
    };
  });
  return byKey;
}

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  return res.json();
}

export async function fetchScores(scope = "live") {
  try {
    const data = await getJson(scope === "all" ? ENDPOINTS.all : ENDPOINTS.live);
    return { matches: mapFixtures(data.matches), updatedAt: data.updatedAt, source: data.source };
  } catch (e) {
    return null;
  }
}

export async function fetchScorers() {
  try {
    const data = await getJson(ENDPOINTS.scorers);
    return { scorers: data.scorers || [], updatedAt: data.updatedAt };
  } catch (e) {
    return null;
  }
}
