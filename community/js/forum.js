/* ============================================================
 *  🏫 LFAKM — Forum Communauté
 *  Fichier : community/js/forum.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, serverTimestamp, increment, 
  peutModerer, afficherProfilHeader
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
let activeTri = 'recent';        // recent | populaires | repondus
let filtreMesSujets = false;
let searchTerm = '';

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
  afficherBarreOutils();   // ⬅️ NOUVEAU
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
 *  BARRE D'OUTILS (tri + recherche + mes sujets)
 * ============================================================ */

function afficherBarreOutils() {
  const container = document.querySelector('.forum-container');
  const formCard = document.getElementById('new-thread-card');

  if (!container || !formCard) return;

  // Chercher si la barre existe déjà
  if (document.getElementById('toolbar-forum')) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar-forum';
  toolbar.style.cssText = `
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    margin-bottom: 20px; padding: 14px; background: #fff;
    border: 1px solid var(--line); border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  `;

  toolbar.innerHTML = `
    <input type="text" id="forum-search" placeholder="🔍 Rechercher un sujet..." 
           style="flex: 1; min-width: 180px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--sans); font-size: 13px;">
    
    <select id="forum-tri" style="padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--sans); font-size: 13px; background: #fff;">
      <option value="recent">🕐 Plus récents</option>
      <option value="populaires">👍 Plus likés</option>
      <option value="repondus">💬 Plus répondus</option>
    </select>
    
    <button id="forum-mes-sujets" style="padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--sans); font-size: 13px; background: #fff; cursor: pointer; font-weight: 600; color: var(--ink);">
      👤 Mes sujets
    </button>
  `;

  // Insérer avant le formulaire de création
  formCard.parentNode.insertBefore(toolbar, formCard);

  // Événements
  document.getElementById('forum-search').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    chargerThreads();
  });

  document.getElementById('forum-tri').addEventListener('change', (e) => {
    activeTri = e.target.value;
    chargerThreads();
  });

  document.getElementById('forum-mes-sujets').addEventListener('click', (e) => {
    filtreMesSujets = !filtreMesSujets;
    e.target.style.background = filtreMesSujets ? 'var(--ink)' : '#fff';
    e.target.style.color = filtreMesSujets ? '#fff' : 'var(--ink)';
    chargerThreads();
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
    q = query(threadsRef, where('categorie', '==', activeCategorie), orderBy('date', 'desc'));
  }

  unsubscribeThreads = onSnapshot(q, (snap) => {
    list.innerHTML = '';

    let threads = [];
    snap.forEach(d => threads.push({ id: d.id, ...d.data() }));

    // Filtre "Mes sujets"
    if (filtreMesSujets) {
      threads = threads.filter(t => t.auteurId === currentUser.uid);
    }

    // Filtre recherche
    if (searchTerm) {
      threads = threads.filter(t => 
        (t.titre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.contenu || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tri
    if (activeTri === 'populaires') {
      threads.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (activeTri === 'repondus') {
      threads.sort((a, b) => (b.nbReponses || 0) - (a.nbReponses || 0));
    } else {
      threads.sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : new Date(0);
        const dbb = b.date?.toDate ? b.date.toDate() : new Date(0);
        return dbb - da;
      });
    }

    // Épinglés en haut (sauf si filtre actif)
    if (activeTri === 'recent' && !searchTerm) {
      const epingles = threads.filter(t => t.epingle === true);
      const autres = threads.filter(t => t.epingle !== true);
      threads = [...epingles, ...autres];
    }

    if (threads.length === 0) {
      list.innerHTML = '<div class="empty-state">Aucun sujet trouvé.</div>';
      return;
    }

    threads.forEach(t => list.appendChild(creerCarteThread(t.id, t)));
  }, (err) => {
    console.error('Erreur Firestore:', err);
    list.innerHTML = `<div class="empty-state" style="color:var(--danger);">
      ⚠️ Erreur : ${escapeHtml(err.message)}
    </div>`;
  });
}

/* ============================================================
 *  CRÉATION D'UNE CARTE THREAD
 * ============================================================ */

function creerCarteThread(threadId, data) {
  const card = document.createElement('div');
  card.className = 'thread-card';
  if (data.epingle) card.style.borderLeft = '4px solid var(--brass)';

  const cat = CATEGORIES.find(c => c.id === data.categorie);
  const classe = CLASSES.find(c => c.id === data.classe);
  const badge = obtenirBadgeRole(data.auteurRole);
  const peutSupprimer = currentUser.uid === data.auteurId || peutModerer(currentProfile);
  const peutEpingler = peutModerer(currentProfile);

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
      ${data.epingle ? '<span style="color:var(--brass);">📌</span> ' : ''}
      <a href="thread.html?id=${threadId}" 
         style="color:inherit; text-decoration:none;"
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
    <div class="thread-actions" style="margin-top:12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
      <button class="btn-like" data-action="like" style="background: transparent; border: 1px solid var(--line); color: var(--ink); padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
        👍 <span data-role="likes-count">${data.likesCount || 0}</span>
      </button>
      <a href="thread.html?id=${threadId}" 
         class="btn-primary" 
         style="text-decoration:none; padding:8px 16px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
        💬 ${data.nbReponses || 0} réponse${(data.nbReponses || 0) > 1 ? 's' : ''}
      </a>
      ${peutEpingler ? `<button class="btn-ghost" data-action="epingle" style="padding:6px 12px; font-size:12px; border:1px solid var(--line); border-radius:4px; cursor:pointer; background:transparent; color:var(--slate);">${data.epingle ? '📌 Désépingler' : '📌 Épingler'}</button>` : ''}
      ${peutSupprimer ? `<button class="btn-danger" data-action="delete" style="padding:6px 12px; font-size:12px;">🗑 Supprimer</button>` : ''}
    </div>
  `;

  // === Bouton LIKE ===
  const likeBtn = card.querySelector('[data-action="like"]');
  const likesCountSpan = card.querySelector('[data-role="likes-count"]');
  
  // Vérifier si déjà liké (dans le sous-dossier likes/{uid})
  const likeRef = doc(db, 'forum_threads', threadId, 'likes', currentUser.uid);
  onSnapshot(likeRef, (likeSnap) => {
    if (likeSnap.exists()) {
      likeBtn.style.background = 'var(--brass)';
      likeBtn.style.color = '#fff';
      likeBtn.style.borderColor = 'var(--brass)';
    } else {
      likeBtn.style.background = 'transparent';
      likeBtn.style.color = 'var(--ink)';
      likeBtn.style.borderColor = 'var(--line)';
    }
  });

  likeBtn.onclick = async () => {
    try {
      const likeSnap = await getDoc(likeRef);
      if (likeSnap.exists()) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'forum_threads', threadId), {
          likesCount: increment(-1)
        });
            } else {
        await setDoc(likeRef, {
          date: serverTimestamp(),
          userNom: `${currentProfile.prenom} ${currentProfile.nom}`
        });
        await updateDoc(doc(db, 'forum_threads', threadId), {
          likesCount: increment(1)
        });

        // ⬇️ AJOUTER : Notifier l'auteur du thread
        if (data.auteurId && data.auteurId !== currentUser.uid) {
          const { creerNotification } = await import('./notifications.js');
          await creerNotification({
            destinataireId: data.auteurId,
            type: 'like',
            message: `a liké ton sujet "${data.titre}"`,
            lien: `thread.html?id=${threadId}`,
            auteurId: currentUser.uid,
            auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`
          });
        }
      }
    } catch (err) {
      console.error('Erreur like:', err);
    }
  };

  // === Bouton ÉPINGLER ===
  const epingleBtn = card.querySelector('[data-action="epingle"]');
  if (epingleBtn) {
    epingleBtn.onclick = async () => {
      try {
        await updateDoc(doc(db, 'forum_threads', threadId), {
          epingle: !data.epingle
        });
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  // === Bouton SUPPRIMER ===
  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce sujet ?')) return;
      try {
        // Supprimer les likes d'abord
        const likesSnap = await getDocs(collection(db, 'forum_threads', threadId, 'likes'));
        for (const l of likesSnap.docs) await deleteDoc(l.ref);
        // Supprimer les réponses
        const repliesSnap = await getDocs(collection(db, 'forum_threads', threadId, 'replies'));
        for (const r of repliesSnap.docs) await deleteDoc(r.ref);
        // Supprimer le thread
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