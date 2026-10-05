/* ============================================================
 *  🏫 LFAKM — Blog du lycée
 *  Fichier : community/js/blog.js
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

  // Extrait : 250 premiers caractères
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

  // Bouton Modifier (ouvre le modal avec les données pré-remplies)
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
}

/* ============================================================
 *  FERMETURE DU MODAL
 * ============================================================ */

function fermerModal() {
  document.getElementById('publish-modal').classList.remove('show');
  document.getElementById('post-titre').value = '';
  document.getElementById('post-categorie').value = '';
  document.getElementById('post-image').value = '';
  document.getElementById('post-contenu').value = '';
  document.getElementById('publish-status').textContent = '';
}

/* ============================================================
 *  PUBLICATION
 * ============================================================ */

async function publierArticle() {
  const btn = document.getElementById('confirm-publish');
  const status = document.getElementById('publish-status');

  const titre = document.getElementById('post-titre').value.trim();
  const categorie = document.getElementById('post-categorie').value;
  const image = document.getElementById('post-image').value.trim();
  const contenu = document.getElementById('post-contenu').value.trim();

  // Validations
  if (!titre)      { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le titre est obligatoire.'; return; }
  if (!categorie)  { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis une catégorie.'; return; }
  if (!contenu)    { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le contenu est obligatoire.'; return; }
  if (titre.length > 200)    { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Titre trop long (max 200).'; return; }
  if (contenu.length > 20000){ status.style.color = 'var(--danger)'; status.textContent = '⚠️ Contenu trop long (max 20000).'; return; }

  btn.disabled = true;
  btn.textContent = '📤 Publication...';
  status.textContent = '';

  try {
    await addDoc(collection(db, 'blog_posts'), {
      titre, categorie, image, contenu,
      auteurId: currentUser.uid,
      auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
      auteurRole: currentProfile.role,
      date: serverTimestamp()
    });

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
  document.getElementById('post-image').value = article.image || '';
  document.getElementById('post-contenu').value = article.contenu || '';

  document.getElementById('publish-modal').classList.add('show');

  // Changer le bouton en mode édition
  const btn = document.getElementById('confirm-publish');
  btn.textContent = '💾 Enregistrer les modifications';
  btn.onclick = async () => {
    const titre = document.getElementById('post-titre').value.trim();
    const categorie = document.getElementById('post-categorie').value;
    const image = document.getElementById('post-image').value.trim();
    const contenu = document.getElementById('post-contenu').value.trim();
    const status = document.getElementById('publish-status');

    if (!titre || !categorie || !contenu) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Tous les champs sont requis.';
      return;
    }

    try {
      await updateDoc(doc(db, 'blog_posts', article.id), {
        titre, categorie, image, contenu,
        dateModif: serverTimestamp()
      });
      fermerModal();
      // Restaurer le bouton
      btn.textContent = '📤 Publier';
      btn.onclick = publierArticle;
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
    }
  };
}

console.log('✅ Blog LFAKM chargé');