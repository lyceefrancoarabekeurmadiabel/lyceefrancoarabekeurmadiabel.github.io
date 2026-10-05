/* ============================================================
 *  🏫 LFAKM — Page d'un sujet du forum
 *  Fichier : community/js/thread.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp, increment,
  peutModerer, afficherProfilHeader
} from './community-common.js';

const CATEGORIES = [
  { id: 'general', nom: 'Général', icon: '💬' },
  { id: 'maths', nom: 'Mathématiques', icon: '📐' },
  { id: 'francais', nom: 'Français', icon: '📖' },
  { id: 'anglais', nom: 'Anglais', icon: '🇬🇧' },
  { id: 'arabe', nom: 'Arabe', icon: '🕌' },
  { id: 'svt', nom: 'SVT', icon: '🧬' },
  { id: 'physique', nom: 'Physique-Chimie', icon: '⚗️' },
  { id: 'histoire', nom: 'Histoire-Géo', icon: '🌍' },
  { id: 'orientation', nom: 'Orientation', icon: '🎓' },
  { id: 'autres', nom: 'Autres', icon: '📌' }
];

const CLASSES = [
  { id: '6a', nom: '6ème A' }, { id: '6b', nom: '6ème B' }, { id: '6c', nom: '6ème C' },
  { id: '5a', nom: '5ème A' }, { id: '5b', nom: '5ème B' },
  { id: '4a', nom: '4ème A' }, { id: '4b', nom: '4ème B' },
  { id: '3a', nom: '3ème A' }, { id: '3b', nom: '3ème B' },
  { id: '2s2a', nom: '2nde S2A' }, { id: '1s2a', nom: '1ère S2A' }, { id: 'ts2a', nom: 'Tle S2A' },
  { id: '2la', nom: '2nde LA' }, { id: '1la', nom: '1ère LA' },
  { id: 'tla1', nom: 'Tle LA 1' }, { id: 'tla2', nom: 'Tle LA 2' }
];

const LIMITE_REPONSES = 50;   // Nombre de réponses affichées initialement
const MAX_REPONSES = 100;     // Limite absolue

let currentUser = null;
let currentProfile = null;
let threadId = null;
let threadData = null;
let allReplies = [];          // Toutes les réponses chargées
let displayedCount = LIMITE_REPONSES;
let unsubscribeThread = null;
let unsubscribeReplies = null;

/* ============================================================
 *  INITIALISATION
 * ============================================================ */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../identification.html';
    return;
  }
  currentUser = user;
  currentProfile = await getCurrentProfile(user);
  if (!currentProfile) {
    window.location.href = '../identification.html';
    return;
  }

  afficherProfilHeader(currentProfile);

  // Récupérer l'ID du thread depuis l'URL (?id=xxx)
  const params = new URLSearchParams(window.location.search);
  threadId = params.get('id');

  if (!threadId) {
    document.getElementById('thread-main-container').innerHTML =
      '<div class="empty-state">⚠️ Aucun sujet spécifié.</div>';
    return;
  }

  chargerThread();
  chargerReponses();
  attacherFormulaire();
});

/* ============================================================
 *  CHARGEMENT DU SUJET PRINCIPAL
 * ============================================================ */

function chargerThread() {
  const container = document.getElementById('thread-main-container');

  unsubscribeThread = onSnapshot(doc(db, 'forum_threads', threadId), (snap) => {
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">❌ Ce sujet n\'existe plus ou a été supprimé.</div>';
      document.getElementById('replies-section').style.display = 'none';
      document.getElementById('form-reply-container').style.display = 'none';
      return;
    }

    threadData = snap.data();
    container.innerHTML = '';
    container.appendChild(creerSujetPrincipal(threadId, threadData));

    document.getElementById('replies-section').style.display = 'block';
    document.getElementById('form-reply-container').style.display = 'block';
  });
}

/* ============================================================
 *  AFFICHAGE DU SUJET PRINCIPAL
 * ============================================================ */

function creerSujetPrincipal(id, data) {
  const div = document.createElement('div');
  div.className = 'thread-main';

  const cat = CATEGORIES.find(c => c.id === data.categorie);
  const classe = CLASSES.find(c => c.id === data.classe);
  const badge = obtenirBadgeRole(data.auteurRole);
  const peutSupprimer = currentUser.uid === data.auteurId || peutModerer(currentProfile);

  // Pièce jointe
  let pieceJointeHtml = '';
  if (data.fichierUrl) {
    const estImage = (data.fichierType || '').startsWith('image/')
                  || /\.(jpg|jpeg|png|gif|webp)$/i.test(data.fichierUrl);
    if (estImage) {
      pieceJointeHtml = `
        <div style="margin-top:16px;">
          <img src="${data.fichierUrl}" alt="Pièce jointe"
               style="max-width:100%; max-height:500px; border-radius:8px; border:1px solid var(--line); cursor:pointer;"
               onclick="window.open('${data.fichierUrl}', '_blank')">
        </div>`;
    } else {
      pieceJointeHtml = `
        <div style="margin-top:16px;">
          <a href="${data.fichierUrl}" target="_blank"
             style="display:inline-flex; align-items:center; gap:8px; padding:10px 16px; background:#f5f5f5; border:1px solid var(--line); border-radius:6px; text-decoration:none; color:var(--ink); font-size:13px; font-weight:600;">
            📎 ${escapeHtml(data.fichierNom || 'Télécharger la pièce jointe')}
          </a>
        </div>`;
    }
  }

  div.innerHTML = `
    <h1>${escapeHtml(data.titre)}</h1>
    <div class="thread-meta">
      <span>👤 <strong>${escapeHtml(data.auteurNom)}</strong></span>
      ${badge}
      ${cat ? `<span class="badge badge-cat">${cat.icon} ${cat.nom}</span>` : ''}
      ${classe ? `<span class="badge badge-cat">🏫 ${classe.nom}</span>` : ''}
      <span>🕐 ${formatDate(data.date)}</span>
    </div>
    <div class="thread-content">${escapeHtml(data.contenu)}</div>
    ${pieceJointeHtml}
    ${peutSupprimer ? `
      <div style="margin-top:16px;">
        <button class="btn-delete" id="delete-thread-btn">🗑 Supprimer le sujet</button>
      </div>` : ''}
  `;

  // Bouton suppression
  const delBtn = div.querySelector('#delete-thread-btn');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce sujet ET toutes ses réponses ?')) return;
      try {
        // Supprimer d'abord toutes les réponses
        const repliesSnap = await getDocs(collection(db, 'forum_threads', threadId, 'replies'));
        for (const r of repliesSnap.docs) {
          await deleteDoc(r.ref);
        }
        // Puis le thread
        await deleteDoc(doc(db, 'forum_threads', threadId));
        window.location.href = 'forum.html';
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return div;
}

/* ============================================================
 *  CHARGEMENT DES RÉPONSES (temps réel)
 * ============================================================ */

function chargerReponses() {
  const list = document.getElementById('replies-list');
  const countEl = document.getElementById('replies-count');

  const repliesRef = collection(db, 'forum_threads', threadId, 'replies');
  const q = query(repliesRef, orderBy('date', 'asc'), limit(MAX_REPONSES));

  unsubscribeReplies = onSnapshot(q, (snap) => {
    allReplies = [];
    snap.forEach(d => {
      allReplies.push({ id: d.id, ...d.data() });
    });

    countEl.textContent = allReplies.length + ' réponse' + (allReplies.length > 1 ? 's' : '');

    afficherReponses();
  }, (err) => {
    console.error('Erreur chargement réponses:', err);
    list.innerHTML = '<div class="empty-state" style="color:var(--danger);">⚠️ Erreur de chargement.</div>';
  });
}

/* ============================================================
 *  AFFICHAGE DES RÉPONSES (avec pagination)
 * ============================================================ */

function afficherReponses() {
  const list = document.getElementById('replies-list');
  const seeMoreBtn = document.getElementById('btn-see-more');
  list.innerHTML = '';

  if (allReplies.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucune réponse pour le moment. Sois le premier ! ✍️</div>';
    seeMoreBtn.style.display = 'none';
    return;
  }

  // On affiche les N dernières réponses (les plus récentes en bas)
  const total = allReplies.length;
  const start = Math.max(0, total - displayedCount);
  const visibles = allReplies.slice(start);

  // Bouton "Voir plus" si on en a caché
  if (start > 0) {
    seeMoreBtn.style.display = 'block';
    seeMoreBtn.textContent = `📜 Voir les ${start} réponse${start > 1 ? 's' : ''} plus ancienne${start > 1 ? 's' : ''}`;
    seeMoreBtn.onclick = () => {
      displayedCount = Math.min(displayedCount + LIMITE_REPONSES, MAX_REPONSES);
      afficherReponses();
    };
  } else {
    seeMoreBtn.style.display = 'none';
  }

  visibles.forEach(r => {
    list.appendChild(creerCarteReponse(r));
  });
}

/* ============================================================
 *  CARTE D'UNE RÉPONSE
 * ============================================================ */

function creerCarteReponse(reply) {
  const card = document.createElement('div');
  card.className = 'reply-card';

  const badge = obtenirBadgeRole(reply.auteurRole);
  const estAuteur = currentUser.uid === reply.auteurId;
  const peutEditer = estAuteur || peutModerer(currentProfile);
  const peutSupprimer = estAuteur || peutModerer(currentProfile);

  card.innerHTML = `
    <div class="reply-header">
      <div class="reply-author">
        <strong>${escapeHtml(reply.auteurNom)}</strong>
        ${badge}
        <span class="reply-date">🕐 ${formatDate(reply.date)}</span>
      </div>
    </div>
    <div class="reply-content" data-role="content">${escapeHtml(reply.contenu)}</div>
    <div class="reply-actions">
      ${peutEditer ? `<button class="btn-edit" data-action="edit">✏️ Modifier</button>` : ''}
      ${peutSupprimer ? `<button class="btn-delete" data-action="delete">🗑 Supprimer</button>` : ''}
    </div>
  `;

  // Bouton MODIFIER
  const editBtn = card.querySelector('[data-action="edit"]');
  if (editBtn) {
    editBtn.onclick = () => activerEdition(card, reply);
  }

  // Bouton SUPPRIMER
  const delBtn = card.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer cette réponse ?')) return;
      try {
        await deleteDoc(doc(db, 'forum_threads', threadId, 'replies', reply.id));
        // Décrémenter le compteur du thread
        await updateDoc(doc(db, 'forum_threads', threadId), {
          nbReponses: increment(-1)
        });
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return card;
}

/* ============================================================
 *  ÉDITION INLINE D'UNE RÉPONSE
 * ============================================================ */

function activerEdition(card, reply) {
  // Cacher les actions et le contenu
  const contentEl = card.querySelector('[data-role="content"]');
  const actionsEl = card.querySelector('.reply-actions');
  contentEl.style.display = 'none';
  actionsEl.style.display = 'none';

  // Créer le formulaire d'édition
  const editForm = document.createElement('div');
  editForm.className = 'edit-form';
  editForm.innerHTML = `
    <textarea data-role="edit-textarea">${escapeHtml(reply.contenu)}</textarea>
    <div style="display:flex; gap:8px;">
      <button class="btn-primary" data-action="save" style="font-size:12px; padding:8px 16px;">💾 Enregistrer</button>
      <button class="btn-edit" data-action="cancel">Annuler</button>
    </div>
    <span data-role="edit-status" style="margin-left:10px; font-size:12px;"></span>
  `;
  card.appendChild(editForm);

  const textarea = editForm.querySelector('[data-role="edit-textarea"]');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);

  // Sauvegarder
  editForm.querySelector('[data-action="save"]').onclick = async () => {
    const nouveau = textarea.value.trim();
    const status = editForm.querySelector('[data-role="edit-status"]');

    if (!nouveau) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Le contenu ne peut pas être vide.';
      return;
    }
    if (nouveau.length > 3000) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Trop long (max 3000).';
      return;
    }

    try {
      await updateDoc(doc(db, 'forum_threads', threadId, 'replies', reply.id), {
        contenu: nouveau,
        dateModif: serverTimestamp()
      });
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ ' + err.message;
    }
  };

  // Annuler
  editForm.querySelector('[data-action="cancel"]').onclick = () => {
    editForm.remove();
    contentEl.style.display = '';
    actionsEl.style.display = '';
  };
}

/* ============================================================
 *  FORMULAIRE DE RÉPONSE
 * ============================================================ */

function attacherFormulaire() {
  const btn = document.getElementById('publish-reply-btn');
  const textarea = document.getElementById('reply-content');
  const status = document.getElementById('reply-status');

  btn.onclick = async () => {
    const contenu = textarea.value.trim();

    if (!contenu) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Écris quelque chose avant de publier.';
      return;
    }
    if (contenu.length > 3000) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Trop long (max 3000 caractères).';
      return;
    }

    btn.disabled = true;
    btn.textContent = '📤 Publication...';
    status.textContent = '';

    try {
      await addDoc(collection(db, 'forum_threads', threadId, 'replies'), {
        contenu,
        auteurId: currentUser.uid,
        auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
        auteurRole: currentProfile.role,
        date: serverTimestamp()
      });

      // Incrémenter le compteur sur le thread
      await updateDoc(doc(db, 'forum_threads', threadId), {
        nbReponses: increment(1)
      });

      textarea.value = '';
      status.style.color = 'var(--success)';
      status.textContent = '✅ Réponse publiée !';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      console.error(err);
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
    }

    btn.disabled = false;
    btn.textContent = '📤 Publier la réponse';
  };
}

/* ============================================================
 *  BADGE DE RÔLE
 * ============================================================ */

function obtenirBadgeRole(role) {
  if (['admin', 'proviseur', 'censeur'].includes(role)) {
    return '<span class="badge badge-admin">Admin</span>';
  }
  if (['professeur', 'intendant'].includes(role)) {
    return '<span class="badge badge-prof">Prof</span>';
  }
  if (role === 'eleve') {
    return '<span class="badge badge-eleve">Élève</span>';
  }
  return '';
}

console.log('✅ Page sujet LFAKM chargée');