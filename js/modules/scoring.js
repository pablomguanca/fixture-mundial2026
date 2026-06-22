export const SCORING = { exact: 3, winner: 1, miss: 0 };

export function calcPoints(prediction, official) {
    if (!prediction || prediction.h === "" || prediction.a === "") return null;
    if (!official || official.h === "" || official.a === "") return null;
    const ph = Number(prediction.h), pa = Number(prediction.a);
    const oh = Number(official.h), oa = Number(official.a);
    if (ph === oh && pa === oa) return SCORING.exact;
    const predSign = Math.sign(ph - pa);
    const offSign = Math.sign(oh - oa);
    return predSign === offSign ? SCORING.winner : SCORING.miss;
}

export function totalPoints(state) {
    let pts = 0;
    Object.keys(state.live).forEach(key => {
        const official = state.live[key];
        if (!official.finished) return;
        const prediction = state.results[key];
        const p = calcPoints(prediction, official);
        if (p !== null) pts += p;
    });
    return pts;
}

function parseKickoff(raw) {
    if (!raw) return null;
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})\s*UTC([+-]\d+)$/);
    if (!m) return null;
    const offsetHours = parseInt(m[4], 10);
    const utcMs = Date.UTC(
        parseInt(m[1]),
        parseInt(m[1].split("-")[1]) - 1,
        parseInt(m[1].split("-")[2]),
        parseInt(m[2]) - offsetHours,
        parseInt(m[3])
    );
    return utcMs;
}

export function isLocked(state, key) {
    if (!state.useLive) return false;
    const live = state.live[key];
    if (!live) return false;
    if (live.finished || live.live) return true;
    if (live.kickoff) {
        const ko = parseKickoff(live.kickoff);
        if (ko && Date.now() >= ko) return true;
    }
    return false;
}

export function statusLabel(liveData) {
    if (!liveData) return null;
    if (liveData.finished) return "Final";
    if (liveData.status === "HT") return "Entretiempo";
    if (liveData.live) return liveData.elapsed ? `${liveData.elapsed}'` : "En juego";
    return null;
}