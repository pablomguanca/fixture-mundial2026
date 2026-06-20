import { TEAMS } from "../data/teams.js";

export function flagImg(code, size) {
  const team = TEAMS[code];
  return `<img class="flag" src="https://flagcdn.com/w${size}/${team.f}.png" srcset="https://flagcdn.com/w${size * 2}/${team.f}.png 2x" alt="${team.n}" loading="lazy" onerror="this.style.visibility='hidden'">`;
}
