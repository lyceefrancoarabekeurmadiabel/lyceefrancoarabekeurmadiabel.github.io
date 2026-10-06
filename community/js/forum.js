/* ============================================================
 *  🏫 LFAKM — Forum Communauté
 *  Fichier : community/js/forum.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, serverTimestamp, increment, 
  peutModerer, afficherProfilHeader,
  creerEditeurRiche, afficherEmojis
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
const TAILLE_MAX_FICHIER = 15 * 1024 * 1024;

/* ============================================================
 *  ÉTAT GLOBAL
 * ============================================================ */

let currentProfile = null;
let currentUser = null;
let activeCategorie = 'all';
let unsubscribeThreads = null;
let activeTri = 'recent';
let filtreMesSujets = false;
let searchTerm = '';
let quillThread = null;

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
  afficherBarreOutils();
  remplirSelects();
  chargerThreads();
  initialiserQuillThread();

  document.getElementById('publish-btn').onclick = publierThread;
}

/* ============================================================
 *  INITIALISER QUILL
 * ============================================================ */

function initialiserQuillThread() {
  quillThread = creerEditeurRiche('#quill-thread', {
    placeholder: 'Décris ta question ou ton sujet...',
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'link'],
      ['clean']
    ]
  });

  const emojiBtn = document.getElementById('btn-emoji-thread');
  const emojiPicker = document.getElementById('emoji-picker-thread');
  if (emojiBtn && emojiPicker && quillThread) {
    emojiBtn.onclick = (e) => {
      e.preventDefault();
      if (emojiPicker.style.display === 'none' || !emojiPicker.style.display) {
        afficherEmojis(emojiPicker, quillThread);
        emojiPicker.style.display = 'block';
      } else {
        emojiPicker.style.display = 'none';
      }
    };
  }
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
 *  BARRE D'OUTILS
 * ============================================================ */

function afficherBarreOutils() {
  const container = document.querySelector('.forum-container');
  const formCard = document.getElementById('new-thread-card');

  if (!container || !formCard) return;
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

  formCard.parentNode.insertBefore(toolbar, formCard);

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
  const selCat = document.getElementById('thread-categorie');
  selCat.innerHTML = '<option value="">— Choisir une catégorie —</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.nom}`;
    selCat.appendChild(opt);
  });

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
 *  CHARGEMENT DES THREADS
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

    if (filtreMesSujets) {
      threads = threads.filter(t => t.auteurId === currentUser.uid);
    }

    if (searchTerm) {
      threads = threads.filter(t => 
        (t.titre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.contenu || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
    <div class="thread-content ql-editor" style="padding:0; background:transparent; border:none;">${data.contenu || ''}</div>
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

  // Bouton LIKE
  const likeBtn = card.querySelector('[data-action="like"]');
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

        if (data.auteurId && data.auteurId !== currentUser.uid) {
          try {
            const { creerNotification } = await import('./notifications.js');
            await creerNotification({
              destinataireId: data.auteurId,
              type: 'like',
              message: `a liké ton sujet "${data.titre}"`,
              lien: `thread.html?id=${threadId}`,
              auteurId: currentUser.uid,
              auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`
            });
          } catch (notifErr) { /* silencieux */ }
        }
      }
    } catch (err) {
      console.error('Erreur like:', err);
    }
  };

  // Bouton ÉPINGLER
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

  // Bouton SUPPRIMER
  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce sujet ?')) return;
      try {
        const likesSnap = await getDoc(collection(db, 'forum_threads', threadId, 'likes'));
        const likes = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
          .then(m => m.getDocs(collection(db, 'forum_threads', threadId, 'likes')));
        for (const l of likes.docs) await deleteDoc(l.ref);
        
        const replies = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
          .then(m => m.getDocs(collection(db, 'forum_threads', threadId, 'replies')));
        for (const r of replies.docs) await deleteDoc(r.ref);
        
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
  const contenu = quillThread ? quillThread.root.innerHTML.trim() : '';
  const contenuTexte = quillThread ? quillThread.getText().trim() : '';
  const fichierInput = document.getElementById('thread-fichier');
  let fichier = fichierInput.files[0];

  if (!titre)         { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le titre est obligatoire.'; return; }
  if (!categorie)     { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis une catégorie.'; return; }
  if (!contenuTexte || contenuTexte.length === 0) { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le contenu est obligatoire.'; return; }
  if (titre.length > 200)   { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Titre trop long (max 200).'; return; }
  if (contenuTexte.length > 5000){ status.style.color = 'var(--danger)'; status.textContent = '⚠️ Contenu trop long (max 5000).'; return; }
  if (fichier && fichier.size > TAILLE_MAX_FICHIER) {
    status.style.color = 'var(--danger)';
    status.textContent = '⚠️ Fichier trop volumineux (max 15 Mo).';
    return;
  }

  btn.disabled = true;
  btn.textContent = '📤 Préparation...';
  status.textContent = '';

  try {
    if (fichier && fichier.type.startsWith('image/') && fichier.type !== 'image/gif') {
      status.textContent = '🗜️ Compression de l\'image...';
      const original = fichier.size;
      const compresse = await compresserImage(fichier);
      if (compresse && compresse.size < original) {
        fichier = compresse;
      }
    }

    const threadData = {
      titre,
      contenu,
      contenuTexte,
      categorie,
      classe,
      auteurId: currentUser.uid,
      auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
      auteurRole: currentProfile.role,
      likesCount: 0,
      nbReponses: 0,
      date: serverTimestamp()
    };

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

    document.getElementById('thread-titre').value = '';
    document.getElementById('thread-categorie').value = '';
    if (quillThread) quillThread.root.innerHTML = '';
    if (fichierInput) fichierInput.value = '';
    const preview = document.getElementById('fichier-preview');
    if (preview) preview.innerHTML = '';
    const picker = document.getElementById('emoji-picker-thread');
    if (picker) picker.style.display = 'none';

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
 *  COMPRESSION D'IMAGE
 * ============================================================ */

function compresserImage(file, maxWidth = 1600, qualite = 0.75) {
  return new Promise((resolve) => {
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
          (blob) => {
            if (!blob) { resolve(file); return; }
            const nouveauNom = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const fichierCompresse = new File([blob], nouveauNom, { type: 'image/jpeg' });
            resolve(fichierCompresse);
          },
          'image/jpeg',
          qualite
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

console.log('✅ Forum LFAKM chargé');