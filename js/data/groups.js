export const GROUPS = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URU"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COD", "UZB", "COL"],
  L: ["ENG", "CRO", "GHA", "PAN"]
};

export const LETTERS = Object.keys(GROUPS);
export const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
export const DAYS = [1, 1, 2, 2, 3, 3];
export const SEED_SLOTS = [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22];
export const ROUND_NAMES = ["16avos", "Octavos", "Cuartos", "Semis", "Final"];
export const ROUND_SIZE = [16, 8, 4, 2, 1];

export const LIVE_URLS = [
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
  "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json"
];

export const NAME_TO_CODE = {
  "Algeria": "ALG", "Argentina": "ARG", "Australia": "AUS", "Austria": "AUT", "Belgium": "BEL",
  "Bosnia & Herzegovina": "BIH", "Brazil": "BRA", "Canada": "CAN", "Cape Verde": "CPV", "Colombia": "COL",
  "Croatia": "CRO", "Curaçao": "CUW", "Czech Republic": "CZE", "DR Congo": "COD", "Ecuador": "ECU",
  "Egypt": "EGY", "England": "ENG", "France": "FRA", "Germany": "GER", "Ghana": "GHA", "Haiti": "HAI",
  "Iran": "IRN", "Iraq": "IRQ", "Ivory Coast": "CIV", "Japan": "JPN", "Jordan": "JOR", "Mexico": "MEX",
  "Morocco": "MAR", "Netherlands": "NED", "New Zealand": "NZL", "Norway": "NOR", "Panama": "PAN",
  "Paraguay": "PAR", "Portugal": "POR", "Qatar": "QAT", "Saudi Arabia": "KSA", "Scotland": "SCO",
  "Senegal": "SEN", "South Africa": "RSA", "South Korea": "KOR", "Spain": "ESP", "Sweden": "SWE",
  "Switzerland": "SUI", "Tunisia": "TUN", "Turkey": "TUR", "USA": "USA", "Uruguay": "URU", "Uzbekistan": "UZB"
};
