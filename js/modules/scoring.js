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

export function isLocked(state, key) {
    if (!state.useLive) return false;
    const live = state.live[key];
    if (!live) return false;
    return live.live || live.finished;
}

export function statusLabel(liveData) {
    if (!liveData) return null;
    if (liveData.finished) return "Final";
    if (liveData.status === "HT") return "Entretiempo";
    if (liveData.live) return liveData.elapsed ? `${liveData.elapsed}'` : "En juego";
    return null;
}