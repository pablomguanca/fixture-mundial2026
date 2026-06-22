import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

function pronosticosRef(uid) {
  return doc(db, "usuarios", uid, "datos", "pronosticos");
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
  } catch (e) {}
}

export async function crearLiga(uid, nombre, userName) {
  const codigo = Math.random().toString(36).slice(2, 8).toUpperCase();
  const ligaRef = doc(collection(db, "ligas"), codigo);
  await setDoc(ligaRef, {
    nombre,
    codigo,
    creadaPor: uid,
    creadaEn: serverTimestamp()
  });
  await unirseALiga(codigo, uid, userName);
  return codigo;
}

export async function unirseALiga(codigo, uid, userName, foto) {
  const ligaRef = doc(db, "ligas", codigo);
  const ligaSnap = await getDoc(ligaRef);
  if (!ligaSnap.exists()) throw new Error("Liga no encontrada");
  const miembroRef = doc(db, "ligas", codigo, "miembros", uid);
  await setDoc(miembroRef, {
    uid,
    nombre: userName,
    foto: foto || null,
    unidoEn: serverTimestamp(),
    puntos: 0
  }, { merge: true });
  return ligaSnap.data();
}

export async function getMiembrosDeLiga(codigo) {
  const snap = await getDocs(collection(db, "ligas", codigo, "miembros"));
  return snap.docs.map(d => d.data());
}

export async function getLigasDeLUsuario(uid) {
  const snap = await getDocs(query(
    collection(db, "ligas"),
    where("miembros", "array-contains", uid)
  ));
  return snap.docs.map(d => d.data());
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
  } catch (e) {}
}
