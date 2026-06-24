import { crearLiga, unirseALiga, escucharMiembros, actualizarPuntos } from "./firestore.js";

const LIGA_KEY = "wc2026:liga";

let ligaActiva = localStorage.getItem(LIGA_KEY) || null;
let unsubscribeLiga = null;

export function getLigaActiva() {
  return ligaActiva;
}

function setLigaActiva(codigo) {
  ligaActiva = codigo;
  if (codigo) localStorage.setItem(LIGA_KEY, codigo);
  else localStorage.removeItem(LIGA_KEY);
}

export async function handleCrearLiga(uid, nombre, userName, foto, onRanking) {
  const codigo = await crearLiga(uid, nombre, userName);
  setLigaActiva(codigo);
  suscribirRanking(codigo, uid, onRanking);
  return codigo;
}

export async function handleUnirse(codigo, uid, userName, foto, onRanking) {
  const limpio = codigo.trim().toUpperCase();
  await unirseALiga(limpio, uid, userName, foto);
  setLigaActiva(limpio);
  suscribirRanking(limpio, uid, onRanking);
  return limpio;
}

export function suscribirRanking(codigo, uid, callback) {
  if (unsubscribeLiga) unsubscribeLiga();
  unsubscribeLiga = escucharMiembros(codigo, miembros => {
    const ranking = [...miembros].sort((a, b) => b.puntos - a.puntos);
    callback(ranking, uid);
  });
}

export function desuscribirRanking() {
  if (unsubscribeLiga) { unsubscribeLiga(); unsubscribeLiga = null; }
  setLigaActiva(null);
}

export async function sincronizarPuntos(uid, codigo, puntos) {
  await actualizarPuntos(uid, codigo, puntos);
}