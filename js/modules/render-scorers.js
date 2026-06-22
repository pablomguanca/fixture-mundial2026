import { TEAMS } from "../data/teams.js";
import { GROUPS, PAIRS } from "../data/groups.js";
import { flagImg } from "./flag.js";
import { buildScorersList } from "./live.js";

function buildIndex(liveData) {
    const index = {};
    Object.entries(liveData).forEach(([key, match]) => {
        if (!match.finished || !match.scorers) return;
        const parts = key.split("-");
        const g = parts[0];
        const i = parseInt(parts[1], 10);
        const teams = GROUPS[g];
        if (!teams) return;
        const [hi, ai] = PAIRS[i];
        match.scorers.home.forEach(s => { if (s.name) index[s.name] = teams[hi]; });
        match.scorers.away.forEach(s => { if (s.name) index[s.name] = teams[ai]; });
    });
    return index;
}

function scorerRow(scorer, rank, teamIndex) {
    const code = teamIndex[scorer.name];
    const flag = code ? flagImg(code, 40) : `<span class="scorer__flag-placeholder"></span>`;
    const teamName = code && TEAMS[code] ? TEAMS[code].n : "";
    const minutes = scorer.minutes.length
        ? `<span class="scorer__minutes">${scorer.minutes.map(m => m + "'").join(" · ")}</span>`
        : "";
    const podium = rank <= 3 ? " scorer--podium" : "";
    const searchData = `${scorer.name} ${teamName}`.toLowerCase();
    return `<div class="scorer${podium}" data-search="${searchData}">
    <span class="scorer__rank">${rank}</span>
    <span class="scorer__flag">${flag}</span>
    <span class="scorer__info">
        <span class="scorer__name">${scorer.name}</span>
        <span class="scorer__team">${teamName}${minutes}</span>
    </span>
    <span class="scorer__goals">${scorer.goals}<span class="scorer__label">gol${scorer.goals !== 1 ? "es" : ""}</span></span>
    </div>`;
}

export function renderScorers(state) {
    const scorers = buildScorersList(state.live);
    if (!scorers.length) {
        return `<div class="lock">
        <svg class="lock__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
        </svg>
        <p class="lock__title">Sin goles aún</p>
        <p class="lock__hint">Los goleadores aparecen automáticamente a medida que se registran los resultados oficiales.</p>
    </div>`;
    }
    const teamIndex = buildIndex(state.live);
    const totalGoals = scorers.reduce((acc, s) => acc + s.goals, 0);
    const rows = scorers.map((s, i) => scorerRow(s, i + 1, teamIndex)).join("");
    return `<div class="scorers">
    <header class="scorers__head">
        <h2 class="scorers__title">Goleadores</h2>
        <span class="scorers__count">${scorers.length} jugadores · ${totalGoals} goles</span>
    </header>
    <div class="scorers__search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input class="scorers__input" id="scorersSearch" type="search" placeholder="Buscar jugador o selección…" autocomplete="off" spellcheck="false">
    </div>
    <div class="scorers__list" id="scorersList">${rows}</div>
    <p class="scorers__empty" id="scorersEmpty" hidden>No se encontraron resultados.</p>
    </div>`;
}