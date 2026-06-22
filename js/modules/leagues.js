import { crearLiga, unirseALiga, escucharMiembros, actualizarPuntos } from "./firestore.js";

let ligaActiva = null;
let unsubscribeLiga = null;

export function getLigaActiva() {
  return ligaActiva;
}

export async function handleCrearLiga(uid, nombre, userName, foto, onRanking) {
  const codigo = await crearLiga(uid, nombre, userName);
  ligaActiva = codigo;
  suscribirRanking(codigo, uid, onRanking);
  return codigo;
}

export async function handleUnirse(codigo, uid, userName, foto, onRanking) {
  const limpio = codigo.trim().toUpperCase();
  await unirseALiga(limpio, uid, userName, foto);
  ligaActiva = limpio;
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
  ligaActiva = null;
}

export async function sincronizarPuntos(uid, codigo, puntos) {
  await actualizarPuntos(uid, codigo, puntos);
}
