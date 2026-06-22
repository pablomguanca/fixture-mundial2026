import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBe_Vha1klMazBHGEb2bpBRMxpILMmKXp8",
  authDomain: "fixture-mundial-wc2026.firebaseapp.com",
  projectId: "fixture-mundial-wc2026",
  storageBucket: "fixture-mundial-wc2026.firebasestorage.app",
  messagingSenderId: "334140254771",
  appId: "1:334140254771:web:e7e27df57bf04919659146"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export function onAuthChanged(callback) {
  return onAuthStateChanged(auth, callback);
}
