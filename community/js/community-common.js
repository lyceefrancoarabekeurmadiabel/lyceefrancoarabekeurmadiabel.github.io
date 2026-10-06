/* ============================================================
 *  🏫 LFAKM — Module Communauté
 *  Fichier : community-common.js
 *  Rôle : centraliser Firebase + helpers partagés
 *  Auteur : Djiby Tall - LFAKM
 * ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, collection, doc, getDoc, getDocs, 
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================================================
 *  CONFIGURATION FIREBASE
 * ============================================================ */

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

/* ============================================================
 *  RÉ-EXPORTS FIRESTORE
 *  Permet aux autres fichiers d'importer tout depuis community-common.js
 * ============================================================ */

/* ============================================================
 *  ÉDITEUR RICHE PARTAGÉ (Quill + Emoji Picker)
 * ============================================================ */

/** Liste des emojis par catégorie */
export const EMOJIS = {
  'Visages': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  'Gestes': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','👂','👃','🧠','👀','👁️','👅','👄'],
  'Coeurs': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💯','💢','💥','💫','💦','💨','💬','💭'],
  'École': ['📚','📖','📝','✏️','🖊️','🖋️','📕','📗','📘','📙','📓','📔','📒','📄','📃','📑','📊','📈','📉','🗒️','🗓️','📅','📆','📋','📁','📂','🗂️','📌','📍','📎','🖇️','📏','📐','✂️','🎓','🎒','🖍️','🖌️'],
  'Sciences': ['🔬','🔭','🧪','🧬','⚗️','🔍','🔎','💡','🔦','📡','🧠','🫀','🫁','🦷','🦴','🦠','🧫','🧯','🔋','🔌','💻','🖥️','⌨️','🖱️','💾','💿','📀','🎥','📷','📸'],
  'Symboles': ['✅','❌','❓','❗','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','⭐','🌟','✨','⚡','🔥','💧','🌊','🎉','🎊','🎈','🎁','🏁','🚩','🏴','⚠️','🚨','⛔','🚫','♻️','🔄','🔙','🔚','🔛','🔜','🔝','💤','💭','💬']
};

/** Affiche un picker d'emojis dans un container, insère dans Quill */
export function afficherEmojis(container, quillInstance) {
  // En-tête avec titre + bouton fermer
  let html = `
    <div class="emoji-header">
      <span class="emoji-title">😀 Emojis</span>
      <button type="button" class="emoji-close" title="Fermer">×</button>
    </div>
    <div class="emoji-scroll">
  `;

  // Grille d'emojis avec scroll
  for (const [categorie, emojis] of Object.entries(EMOJIS)) {
    html += `<div class="emoji-category">${categorie}</div>`;
    html += '<div class="emoji-grid">';
    emojis.forEach(e => {
      html += `<button type="button" class="emoji-btn" data-emoji="${e}">${e}</button>`;
    });
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;

  // Événements emojis
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.onclick = (ev) => {
      ev.preventDefault();
      const emoji = btn.dataset.emoji;
      const range = quillInstance.getSelection(true);
      quillInstance.insertText(range.index, emoji);
      quillInstance.setSelection(range.index + emoji.length);
    };
  });

  // Bouton fermer
  const closeBtn = container.querySelector('.emoji-close');
  if (closeBtn) {
    closeBtn.onclick = (ev) => {
      ev.preventDefault();
      container.style.display = 'none';
    };
  }

  // Focus sur le scroll pour navigation clavier
  const scrollEl = container.querySelector('.emoji-scroll');
  if (scrollEl) {
    // Empêcher la fermeture du picker lors du scroll
    scrollEl.addEventListener('wheel', (ev) => {
      ev.stopPropagation();
    }, { passive: true });
  }
}

/** Initialise un éditeur Quill avec la config standard LFAKM */
export function creerEditeurRiche(selector, options = {}) {
  if (typeof Quill === 'undefined') {
    console.warn('Quill non disponible');
    return null;
  }

  const {
    placeholder = 'Écris ici...',
    toolbar = [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'link'],
      ['clean']
    ],
    minHeight = 100
  } = options;

  const editorEl = document.querySelector(selector);
  if (!editorEl) return null;

  const quill = new Quill(selector, {
    theme: 'snow',
    placeholder,
    modules: { toolbar }
  });

  return quill;
}

/** Crée une barre d'outils standard (Quill + bouton emoji) */
export function creerBarreOutilsQuill(idQuill, idEmojiBtn, idEmojiPicker) {
  const emojiBtn = document.getElementById(idEmojiBtn);
  const emojiPicker = document.getElementById(idEmojiPicker);
  const quillEl = document.getElementById(idQuill);

  if (!emojiBtn || !emojiPicker) return;

  emojiBtn.onclick = (e) => {
    e.preventDefault();
    if (emojiPicker.style.display === 'none' || !emojiPicker.style.display) {
      // Récupérer l'instance Quill depuis l'élément DOM
      const quillInstance = quillEl && quillEl.__quill;
      if (quillInstance) {
        afficherEmojis(emojiPicker, quillInstance);
        emojiPicker.style.display = 'block';
      }
    } else {
      emojiPicker.style.display = 'none';
    }
  };
}

export { 
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, increment,
  onAuthStateChanged, signOut
};