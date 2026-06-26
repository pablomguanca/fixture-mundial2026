import { db } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

function pronosticosRef(uid) {
  return doc(db, "usuarios", uid, "datos", "pronosticos");
}

function misLigasRef(uid) {
  return collection(db, "usuarios", uid, "ligas");
}

export async function cargarPronosticos(uid) {
  try {
    const snap = await getDoc(pronosticosRef(uid));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    return {};
  }
}

export async function guardarPronosticos(uid, results) {
  try {
    await setDoc(pronosticosRef(uid), results, { merge: true });
  } catch (e) { }
}

export async function getMisLigas(uid) {
  try {
    const snap = await getDocs(misLigasRef(uid));
    return snap.docs.map(d => d.data());
  } catch (e) {
    return [];
  }
}

export async function crearLiga(uid, nombre, userName) {
  const codigo = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ligaRef = doc(db, "ligas", codigo);
  await setDoc(ligaRef, {
    nombre,
    codigo,
    creadaPor: uid,
    creadaEn: serverTimestamp()
  });
  await registrarMiembro(codigo, uid, userName, null);
  await registrarLigaEnUsuario(uid, codigo, nombre);
  return { codigo, nombre };
}

export async function unirseALiga(codigo, uid, userName, foto) {
  const ligaRef = doc(db, "ligas", codigo);
  const ligaSnap = await getDoc(ligaRef);
  if (!ligaSnap.exists()) throw new Error("Liga no encontrada");
  const data = ligaSnap.data();
  await registrarMiembro(codigo, uid, userName, foto);
  await registrarLigaEnUsuario(uid, codigo, data.nombre);
  return data;
}

async function registrarMiembro(codigo, uid, nombre, foto) {
  const miembroRef = doc(db, "ligas", codigo, "miembros", uid);
  await setDoc(miembroRef, {
    uid,
    nombre: nombre || "Usuario",
    foto: foto || null,
    unidoEn: serverTimestamp(),
    puntos: 0
  }, { merge: true });
}

async function registrarLigaEnUsuario(uid, codigo, nombre) {
  const ref = doc(db, "usuarios", uid, "ligas", codigo);
  await setDoc(ref, { codigo, nombre }, { merge: true });
}

export async function salirDeLiga(uid, codigo) {
  try {
    await deleteDoc(doc(db, "ligas", codigo, "miembros", uid));
    await deleteDoc(doc(db, "usuarios", uid, "ligas", codigo));
  } catch (e) { }
}

export function escucharMiembros(codigo, callback) {
  return onSnapshot(
    collection(db, "ligas", codigo, "miembros"),
    snap => callback(snap.docs.map(d => d.data()))
  );
}

export async function actualizarPuntos(uid, codigo, puntos) {
  try {
    const miembroRef = doc(db, "ligas", codigo, "miembros", uid);
    await updateDoc(miembroRef, { puntos });
  } catch (e) { }
}

function koRef(uid) {
  return doc(db, "usuarios", uid, "datos", "knockout");
}

export async function cargarKnockout(uid) {
  try {
    const snap = await getDoc(koRef(uid));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    return {};
  }
}

export async function guardarKnockout(uid, koState) {
  try {
    await setDoc(koRef(uid), koState, { merge: true });
  } catch (e) { }
}