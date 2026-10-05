/* ============================================================
 *  🏫 LFAKM — Blog du lycée
 *  Fichier : community/js/blog.js
 *  Rôle : liste des articles + publication + édition + upload image
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, 
  where, orderBy, serverTimestamp, peutModerer
} from './community-common.js';

/* ============================================================
 *  CONFIGURATION
 * ============================================================ */

const CATEGORIES = [
  { id: 'pedagogie',     nom: 'Pédagogie',     icon: '📚' },
  { id: 'vie-scolaire',  nom: 'Vie scolaire',  icon: '🏫' },
  { id: 'temoignages',   nom: 'Témoignages',   icon: '💬' },
  { id: 'projets',       nom: 'Projets',       icon: '🚀' },
  { id: 'actualites',    nom: 'Actualités',    icon: '📰' },
  { id: 'culture',       nom: 'Culture',       icon: '🎭' }
];

const CLOUDINARY_CLOUD = 'kgjydhyi';
const CLOUDINARY_PRESET = 'lfakm_ressources';
const TAILLE_MAX_IMAGE = 10 * 1024 * 1024; // 10 Mo

/* ============================================================
 *  ÉTAT GLOBAL
 * ============================================================ */

let currentUser = null;
let currentProfile = null;
let activeCategorie = 'all';
let searchTerm = '';
let unsubscribePosts = null;

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

  // Afficher le bouton Publier pour profs et admin
  if (['professeur', 'admin', 'proviseur', 'censeur'].includes(currentProfile.role)) {
    document.getElementById('publish-btn-container').style.display = 'flex';
  }

  initialiserBlog();
});

/* ============================================================
 *  INITIALISATION
 * ============================================================ */

function initialiserBlog() {
  afficherCategories();
  chargerArticles();
  attacherEvenements();
}

/* ============================================================
 *  CATÉGORIES
 * ============================================================ */

function afficherCategories() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';

  const btnAll = document.createElement('button');
  btnAll.className = 'cat-btn' + (activeCategorie === 'all' ? ' active' : '');
  btnAll.innerHTML = `<span class="cat-icon">📖</span>Tous les articles`;
  btnAll.onclick = () => {
    activeCategorie = 'all';
    afficherCategories();
    chargerArticles();
  };
  grid.appendChild(btnAll);

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (activeCategorie === cat.id ? ' active' : '');
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span>${cat.nom}`;
    btn.onclick = () => {
      activeCategorie = cat.id;
      afficherCategories();
      chargerArticles();
    };
    grid.appendChild(btn);
  });
}

/* ============================================================
 *  CHARGEMENT DES ARTICLES
 * ============================================================ */

function chargerArticles() {
  if (unsubscribePosts) unsubscribePosts();

  const list = document.getElementById('posts-list');
  list.innerHTML = '<div class="loader">⏳ Chargement des articles...</div>';

  const postsRef = collection(db, 'blog_posts');
  let q;

  if (activeCategorie === 'all') {
    q = query(postsRef, orderBy('date', 'desc'));
  } else {
    q = query(postsRef, where('categorie', '==', activeCategorie), orderBy('date', 'desc'));
  }

  unsubscribePosts = onSnapshot(q, (snap) => {
    list.innerHTML = '';

    const articles = [];
    snap.forEach(d => articles.push({ id: d.id, ...d.data() }));

    // Filtre par recherche
    const filtres = articles.filter(a => {
      if (!searchTerm) return true;
      return (a.titre || '').toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (filtres.length === 0) {
      list.innerHTML = '<div class="empty-state"><span class="icon">📝</span>Aucun article pour le moment.</div>';
      return;
    }

    filtres.forEach(article => {
      list.appendChild(creerCarteArticle(article));
    });
  }, (err) => {
    console.error('Erreur:', err);
    list.innerHTML = `<div class="empty-state" style="color:var(--danger);">
      ⚠️ Erreur : ${escapeHtml(err.message)}
    </div>`;
  });
}

/* ============================================================
 *  CRÉATION D'UNE CARTE ARTICLE
 * ============================================================ */

function creerCarteArticle(article) {
  const card = document.createElement('div');
  card.className = 'post-card';

  const cat = CATEGORIES.find(c => c.id === article.categorie);
  const badge = obtenirBadgeRole(article.auteurRole);
  const peutModifier = currentUser.uid === article.auteurId || peutModerer(currentProfile);

  const extrait = (article.contenu || '').substring(0, 250) + ((article.contenu || '').length > 250 ? '...' : '');

  card.innerHTML = `
    ${article.image ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.titre)}" class="post-card-image" onerror="this.style.display='none'">` : ''}
    <div class="post-card-body">
      <h3><a href="blog-article.html?id=${article.id}">${escapeHtml(article.titre)}</a></h3>
      <div class="post-meta">
        <span>👤 <strong>${escapeHtml(article.auteurNom)}</strong></span>
        ${badge}
        ${cat ? `<span class="badge badge-cat">${cat.icon} ${cat.nom}</span>` : ''}
        <span>🕐 ${formatDate(article.date)}</span>
      </div>
      <p class="post-excerpt">${escapeHtml(extrait)}</p>
      <div class="post-actions">
        <a href="blog-article.html?id=${article.id}" class="btn-read">📖 Lire l'article</a>
        ${peutModifier ? `
          <button class="btn-edit" data-action="edit">✏️ Modifier</button>
          <button class="btn-delete" data-action="delete">🗑 Supprimer</button>
        ` : ''}
      </div>
    </div>
  `;

  // Bouton Supprimer
  const delBtn = card.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement cet article ?')) return;
      try {
        await deleteDoc(doc(db, 'blog_posts', article.id));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  // Bouton Modifier
  const editBtn = card.querySelector('[data-action="edit"]');
  if (editBtn) {
    editBtn.onclick = () => ouvrirModalEdition(article);
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
  return '';
}

/* ============================================================
 *  ÉVÉNEMENTS
 * ============================================================ */

function attacherEvenements() {
  // Recherche
  document.getElementById('search-bar').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    chargerArticles();
  });

  // Ouvrir modal publication
  document.getElementById('open-publish-modal').onclick = () => {
    document.getElementById('publish-modal').classList.add('show');
  };

  // Fermer modal
  document.getElementById('cancel-publish').onclick = () => {
    fermerModal();
  };

  // Publier
  document.getElementById('confirm-publish').onclick = publierArticle;

  // Aperçu de l'image
  const imageInput = document.getElementById('post-image-file');
  if (imageInput) {
    imageInput.addEventListener('change', async () => {
      const preview = document.getElementById('post-image-preview');
      const f = imageInput.files[0];
      if (!f) { preview.innerHTML = ''; return; }

      const tailleMo = (f.size / 1024 / 1024).toFixed(2);
      preview.innerHTML = `📷 <strong>${f.name}</strong> (${tailleMo} Mo) — <em>compression...</em>`;

      try {
        const compresse = await compresserImage(f);
        const tailleC = (compresse.size / 1024 / 1024).toFixed(2);
        const gain = ((1 - compresse.size / f.size) * 100).toFixed(0);
        preview.innerHTML = `📷 <strong>${f.name}</strong> — 
          <span style="color:#B3402A;text-decoration:line-through;">${tailleMo} Mo</span> → 
          <span style="color:#2e7d32;font-weight:700;">${tailleC} Mo</span> 
          <span style="color:var(--slate);">(−${gain}%)</span>`;
      } catch (err) {
        preview.innerHTML = `📷 <strong>${f.name}</strong> (${tailleMo} Mo)`;
      }
    });
  }
}

/* ============================================================
 *  FERMETURE DU MODAL
 * ============================================================ */

function fermerModal() {
  document.getElementById('publish-modal').classList.remove('show');
  document.getElementById('post-titre').value = '';
  document.getElementById('post-categorie').value = '';
  const fi = document.getElementById('post-image-file');
  if (fi) fi.value = '';
  document.getElementById('post-image').value = '';
  document.getElementById('post-contenu').value = '';
  document.getElementById('publish-status').textContent = '';
  const prev = document.getElementById('post-image-preview');
  if (prev) prev.innerHTML = '';
}

/* ============================================================
 *  PUBLICATION
 * ============================================================ */

async function publierArticle() {
  const btn = document.getElementById('confirm-publish');
  const status = document.getElementById('publish-status');

  const titre = document.getElementById('post-titre').value.trim();
  const categorie = document.getElementById('post-categorie').value;
  const contenu = document.getElementById('post-contenu').value.trim();
  const fichierImage = document.getElementById('post-image-file')?.files[0];

  // Validations
  if (!titre)      { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le titre est obligatoire.'; return; }
  if (!categorie)  { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis une catégorie.'; return; }
  if (!contenu)    { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le contenu est obligatoire.'; return; }
  if (titre.length > 200)    { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Titre trop long (max 200).'; return; }
  if (contenu.length > 20000){ status.style.color = 'var(--danger)'; status.textContent = '⚠️ Contenu trop long (max 20000).'; return; }
  if (fichierImage && fichierImage.size > TAILLE_MAX_IMAGE) {
    status.style.color = 'var(--danger)';
    status.textContent = '⚠️ Image trop lourde (max 10 Mo).';
    return;
  }

  btn.disabled = true;
  btn.textContent = '📤 Publication...';
  status.textContent = '';

  try {
    const articleData = {
      titre, categorie, contenu,
      auteurId: currentUser.uid,
      auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
      auteurRole: currentProfile.role,
      date: serverTimestamp()
    };

    // Upload image si présente
    if (fichierImage) {
      status.textContent = '🗜️ Compression...';
      const compresse = await compresserImage(fichierImage);

      status.textContent = '📤 Upload de l\'image...';
      const fd = new FormData();
      fd.append('file', compresse, 'cover.jpg');
      fd.append('upload_preset', CLOUDINARY_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (!data.secure_url) throw new Error("Échec de l'upload de l'image");
      articleData.image = data.secure_url;
    }

    await addDoc(collection(db, 'blog_posts'), articleData);

    fermerModal();
  } catch (err) {
    console.error(err);
    status.style.color = 'var(--danger)';
    status.textContent = '❌ Erreur : ' + err.message;
  }

  btn.disabled = false;
  btn.textContent = '📤 Publier';
}

/* ============================================================
 *  ÉDITION
 * ============================================================ */

function ouvrirModalEdition(article) {
  document.getElementById('post-titre').value = article.titre || '';
  document.getElementById('post-categorie').value = article.categorie || '';
  document.getElementById('post-contenu').value = article.contenu || '';
  const fi = document.getElementById('post-image-file');
  if (fi) fi.value = '';
  document.getElementById('post-image').value = article.image || '';
  
  const preview = document.getElementById('post-image-preview');
  if (preview) {
    preview.innerHTML = article.image
      ? `<div style="margin-top:6px;">Image actuelle :<br><img src="${article.image}" style="max-width:200px; border-radius:6px; margin-top:4px;"></div>`
      : '';
  }

  document.getElementById('publish-modal').classList.add('show');

  // Changer le bouton en mode édition
  const btn = document.getElementById('confirm-publish');
  btn.textContent = '💾 Enregistrer les modifications';
  btn.onclick = async () => {
    const titre = document.getElementById('post-titre').value.trim();
    const categorie = document.getElementById('post-categorie').value;
    const contenu = document.getElementById('post-contenu').value.trim();
    const fichierImage = document.getElementById('post-image-file')?.files[0];
    const status = document.getElementById('publish-status');

    if (!titre || !categorie || !contenu) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Tous les champs sont requis.';
      return;
    }

    const updates = { titre, categorie, contenu, dateModif: serverTimestamp() };

    // Nouvelle image uploadée ?
    if (fichierImage) {
      try {
        status.textContent = '🗜️ Compression...';
        const compresse = await compresserImage(fichierImage);

        status.textContent = '📤 Upload...';
        const fd = new FormData();
        fd.append('file', compresse, 'cover.jpg');
        fd.append('upload_preset', CLOUDINARY_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
          method: 'POST', body: fd
        });
        const data = await res.json();
        if (data.secure_url) updates.image = data.secure_url;
      } catch (err) {
        status.style.color = 'var(--danger)';
        status.textContent = '❌ Erreur upload : ' + err.message;
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'blog_posts', article.id), updates);
      fermerModal();
      btn.textContent = '📤 Publier';
      btn.onclick = publierArticle;
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
    }
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

console.log('✅ Blog LFAKM chargé');