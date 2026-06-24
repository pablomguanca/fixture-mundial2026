import { crearLiga, unirseALiga, escucharMiembros, actualizarPuntos, getMisLigas, salirDeLiga } from "./firestore.js";

const LIGAS_KEY = "wc2026:ligas";
const LIGA_ACTIVA_KEY = "wc2026:ligaActiva";

let ligaActiva = localStorage.getItem(LIGA_ACTIVA_KEY) || null;
let misLigas = JSON.parse(localStorage.getItem(LIGAS_KEY) || "[]");
let unsubscribeLiga = null;

export function getLigaActiva() { return ligaActiva; }
export function getMisLigasLocal() { return misLigas; }

function setLigaActiva(codigo) {
  ligaActiva = codigo;
  if (codigo) localStorage.setItem(LIGA_ACTIVA_KEY, codigo);
  else localStorage.removeItem(LIGA_ACTIVA_KEY);
}

function addLigaLocal(codigo, nombre) {
  if (!misLigas.find(l => l.codigo === codigo)) {
    misLigas.push({ codigo, nombre });
    localStorage.setItem(LIGAS_KEY, JSON.stringify(misLigas));
  }
}

function removeLigaLocal(codigo) {
  misLigas = misLigas.filter(l => l.codigo !== codigo);
  localStorage.setItem(LIGAS_KEY, JSON.stringify(misLigas));
}

export async function cargarMisLigas(uid) {
  try {
    const ligas = await getMisLigas(uid);
    misLigas = ligas;
    localStorage.setItem(LIGAS_KEY, JSON.stringify(ligas));
    return ligas;
  } catch (e) {
    return misLigas;
  }
}

export async function handleCrearLiga(uid, nombre, userName, foto, onRanking) {
  const { codigo } = await crearLiga(uid, nombre, userName);
  addLigaLocal(codigo, nombre);
  setLigaActiva(codigo);
  suscribirRanking(codigo, uid, onRanking);
  return { codigo, nombre };
}

export async function handleUnirse(codigo, uid, userName, foto, onRanking) {
  const limpio = codigo.trim().toUpperCase();
  const data = await unirseALiga(limpio, uid, userName, foto);
  addLigaLocal(limpio, data.nombre);
  setLigaActiva(limpio);
  suscribirRanking(limpio, uid, onRanking);
  return { codigo: limpio, nombre: data.nombre };
}

export async function handleSalir(uid, codigo) {
  await salirDeLiga(uid, codigo);
  removeLigaLocal(codigo);
  if (ligaActiva === codigo) {
    const siguiente = misLigas[0];
    setLigaActiva(siguiente ? siguiente.codigo : null);
  }
  if (unsubscribeLiga) { unsubscribeLiga(); unsubscribeLiga = null; }
}

export function cambiarLigaActiva(codigo, uid, onRanking) {
  setLigaActiva(codigo);
  suscribirRanking(codigo, uid, onRanking);
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
  misLigas = [];
  localStorage.removeItem(LIGAS_KEY);
  localStorage.removeItem(LIGA_ACTIVA_KEY);
}

export async function sincronizarPuntos(uid, codigo, puntos) {
  await actualizarPuntos(uid, codigo, puntos);
}