/* ============================================================
 *  🏫 LFAKM — Forum Communauté
 *  Fichier : community/js/forum.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, addDoc, deleteDoc, onSnapshot, query, 
  where, orderBy, serverTimestamp, peutModerer, afficherProfilHeader
} from './community-common.js';

/* ============================================================
 *  CONFIGURATION DU FORUM
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

const CLOUDINARY_CLOUD = 'kgjydhyi';
const CLOUDINARY_PRESET = 'lfakm_ressources';
const TAILLE_MAX_FICHIER = 15 * 1024 * 1024; // 15 Mo

/* ============================================================
 *  ÉTAT GLOBAL
 * ============================================================ */

let currentProfile = null;
let currentUser = null;
let activeCategorie = 'all';
let unsubscribeThreads = null;

/* ============================================================
 *  AUTHENTIFICATION
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
  initialiserForum();
});

/* ============================================================
 *  INITIALISATION
 * ============================================================ */

function initialiserForum() {
  afficherCategories();
  remplirSelects();
  chargerThreads();

  document.getElementById('publish-btn').onclick = publierThread;
}

/* ============================================================
 *  CATÉGORIES
 * ============================================================ */

function afficherCategories() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';

  const btnAll = document.createElement('button');
  btnAll.className = 'cat-btn' + (activeCategorie === 'all' ? ' active' : '');
  btnAll.innerHTML = `<span class="cat-icon">📚</span>Tous les sujets`;
  btnAll.onclick = () => {
    activeCategorie = 'all';
    afficherCategories();
    chargerThreads();
  };
  grid.appendChild(btnAll);

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (activeCategorie === cat.id ? ' active' : '');
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span>${cat.nom}`;
    btn.onclick = () => {
      activeCategorie = cat.id;
      afficherCategories();
      chargerThreads();
    };
    grid.appendChild(btn);
  });
}

/* ============================================================
 *  REMPLISSAGE DES SELECTS
 * ============================================================ */

function remplirSelects() {
  // Catégories
  const selCat = document.getElementById('thread-categorie');
  selCat.innerHTML = '<option value="">— Choisir une catégorie —</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.nom}`;
    selCat.appendChild(opt);
  });

  // Classes
  const selClasse = document.getElementById('thread-classe');
  if (currentProfile.role === 'eleve') {
    const saClasse = CLASSES.find(c => c.id === currentProfile.niveau);
    selClasse.innerHTML = `<option value="${currentProfile.niveau}">${saClasse ? saClasse.nom : currentProfile.niveau}</option>`;
    selClasse.disabled = true;
  } else {
    selClasse.innerHTML = '';
    const optToutes = document.createElement('option');
    optToutes.value = 'tous';
    optToutes.textContent = 'Toutes les classes';
    selClasse.appendChild(optToutes);

    CLASSES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nom;
      selClasse.appendChild(opt);
    });
  }
}

/* ============================================================
 *  CHARGEMENT DES THREADS (temps réel)
 * ============================================================ */

function chargerThreads() {
  if (unsubscribeThreads) unsubscribeThreads();

  const list = document.getElementById('threads-list');
  list.innerHTML = '<div class="loader">⏳ Chargement des sujets...</div>';

  const threadsRef = collection(db, 'forum_threads');
  let q;

  if (activeCategorie === 'all') {
    q = query(threadsRef, orderBy('date', 'desc'));
  } else {
    q = query(
      threadsRef,
      where('categorie', '==', activeCategorie),
      orderBy('date', 'desc')
    );
  }

  unsubscribeThreads = onSnapshot(q, (snap) => {
    list.innerHTML = '';

    if (snap.empty) {
      list.innerHTML = '<div class="empty-state">Aucun sujet pour le moment. Sois le premier à en créer un ! ✍️</div>';
      return;
    }

    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.appendChild(creerCarteThread(docSnap.id, data));
    });
  }, (err) => {
    console.error('Erreur Firestore:', err);
    list.innerHTML = `<div class="empty-state" style="color:var(--danger);">
      ⚠️ Erreur : ${escapeHtml(err.message)}<br>
      <small>Vérifie que les règles Firestore pour "forum_threads" sont publiées.</small>
    </div>`;
  });
}

/* ============================================================
 *  CRÉATION D'UNE CARTE THREAD
 * ============================================================ */

function creerCarteThread(threadId, data) {
  const card = document.createElement('div');
  card.className = 'thread-card';

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
        <div style="margin-top:12px;">
          <img src="${data.fichierUrl}" alt="Pièce jointe"
               style="max-width:100%; max-height:400px; border-radius:8px; border:1px solid var(--line); cursor:pointer;"
               onclick="window.open('${data.fichierUrl}', '_blank')">
        </div>`;
    } else {
      pieceJointeHtml = `
        <div style="margin-top:12px;">
          <a href="${data.fichierUrl}" target="_blank"
             style="display:inline-flex; align-items:center; gap:8px; padding:10px 16px; background:#f5f5f5; border:1px solid var(--line); border-radius:6px; text-decoration:none; color:var(--ink); font-size:13px; font-weight:600;">
            📎 ${escapeHtml(data.fichierNom || 'Télécharger la pièce jointe')}
          </a>
        </div>`;
    }
  }

    card.innerHTML = `
    <h3>
      <a href="thread.html?id=${threadId}" 
         style="color:inherit; text-decoration:none; display:inline-block;"
         onmouseover="this.style.color='var(--brass)'"
         onmouseout="this.style.color='inherit'">
        ${escapeHtml(data.titre)}
      </a>
    </h3>
    <div class="thread-meta">
      <span>👤 <strong>${escapeHtml(data.auteurNom)}</strong></span>
      ${badge}
      ${cat ? `<span class="badge badge-cat">${cat.icon} ${cat.nom}</span>` : ''}
      ${classe ? `<span class="badge badge-cat">🏫 ${classe.nom}</span>` : ''}
      <span>🕐 ${formatDate(data.date)}</span>
    </div>
    <div class="thread-content">${escapeHtml(data.contenu)}</div>
    ${pieceJointeHtml}
    <div style="margin-top:8px; font-size:12px; color:var(--slate);">
      💬 ${data.nbReponses || 0} réponse${(data.nbReponses || 0) > 1 ? 's' : ''}
    </div>
    <div class="thread-actions" style="margin-top:12px;">
      <a href="thread.html?id=${threadId}" 
         class="btn-primary" 
         style="text-decoration:none; padding:8px 16px; font-size:12px; display:inline-block;">
        💬 Voir & Répondre
      </a>
      ${peutSupprimer ? `<button class="btn-danger" data-action="delete">🗑 Supprimer</button>` : ''}
    </div>
  `;

  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce sujet ?')) return;
      try {
        await deleteDoc(doc(db, 'forum_threads', threadId));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return card;
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

/* ============================================================
 *  PUBLICATION D'UN NOUVEAU THREAD
 * ============================================================ */

async function publierThread() {
  const btn = document.getElementById('publish-btn');
  const status = document.getElementById('form-status');
  const titre = document.getElementById('thread-titre').value.trim();
  const categorie = document.getElementById('thread-categorie').value;
  const classe = document.getElementById('thread-classe').value;
  const contenu = document.getElementById('thread-contenu').value.trim();
  const fichierInput = document.getElementById('thread-fichier');
  let fichier = fichierInput.files[0];

  if (!titre)         { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le titre est obligatoire.'; return; }
  if (!categorie)     { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis une catégorie.'; return; }
  if (!contenu)       { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le contenu est obligatoire.'; return; }
  if (titre.length > 200)   { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Titre trop long (max 200).'; return; }
  if (contenu.length > 5000){ status.style.color = 'var(--danger)'; status.textContent = '⚠️ Contenu trop long (max 5000).'; return; }
  if (fichier && fichier.size > TAILLE_MAX_FICHIER) {
    status.style.color = 'var(--danger)';
    status.textContent = '⚠️ Fichier trop volumineux (max 15 Mo).';
    return;
  }

  btn.disabled = true;
  btn.textContent = '📤 Préparation...';
  status.textContent = '';

  try {
    // ✅ Compression des images avant upload
    if (fichier && fichier.type.startsWith('image/') && fichier.type !== 'image/gif') {
      status.textContent = '🗜️ Compression de l\'image...';
      const original = fichier.size;
      const compresse = await compresserImage(fichier);
      if (compresse && compresse.size < original) {
        fichier = compresse;
        const gain = ((1 - compresse.size / original) * 100).toFixed(0);
        console.log(`🗜️ Image compressée : ${(original/1024).toFixed(0)} Ko → ${(compresse.size/1024).toFixed(0)} Ko (−${gain}%)`);
      }
    }

    const threadData = {
      titre,
      contenu,
      categorie,
      classe,
      auteurId: currentUser.uid,
      auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
      auteurRole: currentProfile.role,
      date: serverTimestamp()
    };

    // Upload Cloudinary
    if (fichier) {
      status.textContent = '📤 Envoi du fichier...';
      const fd = new FormData();
      fd.append('file', fichier);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (!data.secure_url) throw new Error("Échec de l'upload du fichier");

      threadData.fichierUrl = data.secure_url;
      threadData.fichierNom = fichier.name;
      threadData.fichierType = fichier.type;
      threadData.fichierTaille = fichier.size;
    }

    await addDoc(collection(db, 'forum_threads'), threadData);

    // Reset
    document.getElementById('thread-titre').value = '';
    document.getElementById('thread-categorie').value = '';
    document.getElementById('thread-contenu').value = '';
    if (fichierInput) fichierInput.value = '';
    const preview = document.getElementById('fichier-preview');
    if (preview) preview.innerHTML = '';

    status.style.color = 'var(--success)';
    status.textContent = '✅ Sujet publié !';
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) {
    console.error(err);
    status.style.color = 'var(--danger)';
    status.textContent = '❌ Erreur : ' + err.message;
  }

  btn.disabled = false;
  btn.textContent = '📤 Publier le sujet';
}

/* ============================================================
 *  COMPRESSION D'IMAGE (Canvas natif)
 * ============================================================ */

/**
 * Compresse une image côté navigateur avant upload.
 * @param {File} file — le fichier image original
 * @param {number} maxWidth — largeur max en pixels (défaut : 1600)
 * @param {number} qualite — qualité JPEG entre 0 et 1 (défaut : 0.75)
 * @returns {Promise<File>} — un nouveau File compressé en JPEG
 */
function compresserImage(file, maxWidth = 1600, qualite = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calcul des nouvelles dimensions en gardant les proportions
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }

        // Création du canvas et dessin de l'image redimensionnée
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export en JPEG compressé
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            // Renommer en .jpg pour cohérence
            const nouveauNom = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const fichierCompresse = new File([blob], nouveauNom, { type: 'image/jpeg' });
            resolve(fichierCompresse);
          },
          'image/jpeg',
          qualite
        );
      };

      img.onerror = () => resolve(file);  // En cas d'erreur, on garde l'original
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

console.log('✅ Forum LFAKM chargé');