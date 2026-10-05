/* ============================================================
 *  🏫 LFAKM — Page d'un sujet du forum
 *  Fichier : community/js/thread.js
 *  Rôle : affiche le sujet + réponses + pièces jointes
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp, increment,
  peutModerer, afficherProfilHeader
} from './community-common.js';

/* ============================================================
 *  CONFIGURATION
 * ============================================================ */

const CATEGORIES = [
  { id: 'general',     nom: 'Général',          icon: '💬' },
  { id: 'maths',       nom: 'Mathématiques',    icon: '📐' },
  { id: 'francais',    nom: 'Français',         icon: '📖' },
  { id: 'anglais',     nom: 'Anglais',          icon: '🇬🇧' },
  { id: 'arabe',       nom: 'Arabe',            icon: '🕌' },
  { id: 'svt',         nom: 'SVT',              icon: '🧬' },
  { id: 'physique',    nom: 'Physique-Chimie',  icon: '⚗️' },
  { id: 'histoire',    nom: 'Histoire-Géo',     icon: '🌍' },
  { id: 'orientation', nom: 'Orientation',      icon: '🎓' },
  { id: 'autres',      nom: 'Autres',           icon: '📌' }
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

const LIMITE_REPONSES = 50;
const MAX_REPONSES = 100;

const CLOUDINARY_CLOUD = 'kgjydhyi';
const CLOUDINARY_PRESET = 'lfakm_ressources';
const TAILLE_MAX_FICHIER = 15 * 1024 * 1024; // 15 Mo

/* ============================================================
 *  ÉTAT GLOBAL
 * ============================================================ */

let currentUser = null;
let currentProfile = null;
let threadId = null;
let threadData = null;
let allReplies = [];
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

  const delBtn = div.querySelector('#delete-thread-btn');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce sujet ET toutes ses réponses ?')) return;
      try {
        const repliesSnap = await getDoc(doc(db, 'forum_threads', threadId));
        const replies = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
          .then(m => m.getDocs(collection(db, 'forum_threads', threadId, 'replies')));
        for (const r of replies.docs) {
          await deleteDoc(r.ref);
        }
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
 *  CHARGEMENT DES RÉPONSES
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
 *  AFFICHAGE DES RÉPONSES
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

  const total = allReplies.length;
  const start = Math.max(0, total - displayedCount);
  const visibles = allReplies.slice(start);

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
  const peutSupprimer = estAuteur || peutModerer(currentProfile);

  // Pièce jointe
  let pieceJointeHtml = '';
  if (reply.fichierUrl) {
    const estImage = (reply.fichierType || '').startsWith('image/')
                  || /\.(jpg|jpeg|png|gif|webp)$/i.test(reply.fichierUrl);
    if (estImage) {
      pieceJointeHtml = `
        <div style="margin-top:10px;">
          <img src="${reply.fichierUrl}" alt="Pièce jointe"
               style="max-width:100%; max-height:350px; border-radius:8px; border:1px solid var(--line); cursor:pointer;"
               onclick="window.open('${reply.fichierUrl}', '_blank')">
        </div>`;
    } else {
      pieceJointeHtml = `
        <div style="margin-top:10px;">
          <a href="${reply.fichierUrl}" target="_blank"
             style="display:inline-flex; align-items:center; gap:8px; padding:8px 14px; background:#f5f5f5; border:1px solid var(--line); border-radius:6px; text-decoration:none; color:var(--ink); font-size:12px; font-weight:600;">
            📎 ${escapeHtml(reply.fichierNom || 'Télécharger')}
          </a>
        </div>`;
    }
  }

  card.innerHTML = `
    <div class="reply-header">
      <div class="reply-author">
        <strong>${escapeHtml(reply.auteurNom)}</strong>
        ${badge}
        <span class="reply-date">🕐 ${formatDate(reply.date)}</span>
      </div>
    </div>
    <div class="reply-content" data-role="content">${escapeHtml(reply.contenu)}</div>
    ${pieceJointeHtml}
    <div class="reply-actions">
      ${estAuteur ? `<button class="btn-edit" data-action="edit">✏️ Modifier</button>` : ''}
      ${peutSupprimer ? `<button class="btn-delete" data-action="delete">🗑 Supprimer</button>` : ''}
    </div>
  `;

  const editBtn = card.querySelector('[data-action="edit"]');
  if (editBtn) {
    editBtn.onclick = () => activerEdition(card, reply);
  }

  const delBtn = card.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer cette réponse ?')) return;
      try {
        await deleteDoc(doc(db, 'forum_threads', threadId, 'replies', reply.id));
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
 *  ÉDITION INLINE
 * ============================================================ */

function activerEdition(card, reply) {
  const contentEl = card.querySelector('[data-role="content"]');
  const actionsEl = card.querySelector('.reply-actions');
  contentEl.style.display = 'none';
  actionsEl.style.display = 'none';

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
  const fichierInput = document.getElementById('reply-fichier');
  const preview = document.getElementById('reply-fichier-preview');

  // Aperçu du fichier
  if (fichierInput) {
    fichierInput.addEventListener('change', async () => {
      const f = fichierInput.files[0];
      if (!f) { preview.innerHTML = ''; return; }

      const tailleMo = (f.size / 1024 / 1024).toFixed(2);

      if (f.type.startsWith('image/') && f.type !== 'image/gif') {
        preview.innerHTML = `📎 <strong>${f.name}</strong> (${tailleMo} Mo) — <em>compression...</em>`;
        try {
          const compresse = await compresserImage(f);
          const tailleC = (compresse.size / 1024 / 1024).toFixed(2);
          const gain = ((1 - compresse.size / f.size) * 100).toFixed(0);
          preview.innerHTML = `📎 <strong>${f.name}</strong> — 
            <span style="color:#B3402A;text-decoration:line-through;">${tailleMo} Mo</span> → 
            <span style="color:#2e7d32;font-weight:700;">${tailleC} Mo</span> 
            <span style="color:var(--slate);">(−${gain}%)</span>`;
        } catch (err) {
          preview.innerHTML = `📎 <strong>${f.name}</strong> (${tailleMo} Mo)`;
        }
      } else {
        preview.innerHTML = `📎 <strong>${f.name}</strong> (${tailleMo} Mo)`;
      }
    });
  }

  btn.onclick = async () => {
    const contenu = textarea.value.trim();
    const fichier = fichierInput?.files[0];

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
    if (fichier && fichier.size > TAILLE_MAX_FICHIER) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Fichier trop volumineux (max 15 Mo).';
      return;
    }

    btn.disabled = true;
    btn.textContent = '📤 Publication...';
    status.textContent = '';

    try {
      const replyData = {
        contenu,
        auteurId: currentUser.uid,
        auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
        auteurRole: currentProfile.role,
        date: serverTimestamp()
      };

      // Upload fichier si présent
      if (fichier) {
        status.textContent = '🗜️ Compression...';
        let fichierFinal = fichier;
        if (fichier.type.startsWith('image/') && fichier.type !== 'image/gif') {
          fichierFinal = await compresserImage(fichier);
        }

        status.textContent = '📤 Upload du fichier...';
        const fd = new FormData();
        fd.append('file', fichierFinal);
        fd.append('upload_preset', CLOUDINARY_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
          method: 'POST',
          body: fd
        });
        const data = await res.json();

        if (!data.secure_url) throw new Error("Échec de l'upload");

        replyData.fichierUrl = data.secure_url;
        replyData.fichierNom = fichier.name;
        replyData.fichierType = fichierFinal.type;
      }

            await addDoc(collection(db, 'forum_threads', threadId, 'replies'), replyData);

      await updateDoc(doc(db, 'forum_threads', threadId), {
        nbReponses: increment(1)
      });

      // ⬇️ AJOUTER : Notifier l'auteur du thread
      if (threadData && threadData.auteurId && threadData.auteurId !== currentUser.uid) {
        const { creerNotification } = await import('./notifications.js');
        await creerNotification({
          destinataireId: threadData.auteurId,
          type: 'reponse',
          message: `a répondu à ton sujet "${threadData.titre}"`,
          lien: `thread.html?id=${threadId}`,
          auteurId: currentUser.uid,
          auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`
        });
      }

      textarea.value = '';
      if (fichierInput) fichierInput.value = '';
      if (preview) preview.innerHTML = '';

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
 *  COMPRESSION D'IMAGE (Canvas)
 * ============================================================ */

function compresserImage(file, maxWidth = 1600, qualite = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Échec compression')),
          'image/jpeg',
          qualite
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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