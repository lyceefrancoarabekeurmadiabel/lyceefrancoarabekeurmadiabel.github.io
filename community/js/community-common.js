/* ============================================================
 *  🏫 LFAKM — Module Communauté
 *  Fichier : community-common.js
 *  Rôle : centraliser Firebase + helpers partagés
 *  Auteur : Djiby Tall - LFAKM
 * ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, collection, doc, getDoc, getDocs, 
  addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAFsr_yfl_T5CrxfgD7Xe5bIw3zN6rIdag",
  authDomain: "lfakm-87dec.firebaseapp.com",
  projectId: "lfakm-87dec",
  storageBucket: "lfakm-87dec.firebasestorage.app",
  messagingSenderId: "739517262614",
  appId: "1:739517262614:web:14abd3538427960c527e37"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ============================================================
 *  HELPERS PARTAGÉS
 * ============================================================ */

/** Échappe le HTML pour éviter les injections XSS */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/** Formate une date Firestore en français lisible */
export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('fr-FR', { 
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit' 
  });
}

/** Récupère le profil utilisateur connecté (ou null) */
export async function getCurrentProfile(user) {
  if (!user) return null;
  const snap = await getDoc(doc(db, 'utilisateurs', user.uid));
  return snap.exists() ? { uid: user.uid, ...snap.data() } : null;
}

/** Vérifie si l'utilisateur peut modérer (admin, proviseur, censeur) */
export function peutModerer(profile) {
  return profile && ['admin', 'proviseur', 'censeur'].includes(profile.role);
}

/** Vérifie si l'utilisateur est personnel (prof ou admin) */
export function estPersonnel(profile) {
  return profile && ['professeur', 'intendant', 'censeur', 'proviseur', 'admin'].includes(profile.role);
}

/** Vérifie si l'utilisateur est élève */
export function estEleve(profile) {
  return profile && profile.role === 'eleve';
}

/** Met à jour l'en-tête (header) avec le profil connecté */
export function afficherProfilHeader(profile) {
  const profileSpan = document.getElementById('user-profile');
  const link = document.getElementById('auth-link');
  if (!profileSpan || !link) return;

  if (profile) {
    profileSpan.innerHTML = `
      <span class="profile-name">👤 ${escapeHtml(profile.prenom)} ${escapeHtml(profile.nom)}</span>
      <span class="profile-role">${escapeHtml(profile.role)}</span>
    `;
    profileSpan.style.display = 'flex';
    link.textContent = "Déconnexion";
    link.href = "#";
    link.onclick = (e) => { 
      e.preventDefault(); 
      signOut(auth).then(() => window.location.href = '../identification.html');
    };
  } else {
    profileSpan.style.display = 'none';
    link.textContent = "Connexion";
    link.href = "../identification.html";
  }
}

// Ré-exports Firestore pour simplifier les imports
export { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, increment,
  onAuthStateChanged, signOut
};