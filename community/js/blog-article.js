/* ============================================================
 *  🏫 LFAKM — Page de lecture d'un article du blog
 *  Fichier : community/js/blog-article.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, orderBy, serverTimestamp, peutModerer
} from './community-common.js';

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
let articleId = null;
let unsubscribeComments = null;

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

  const params = new URLSearchParams(window.location.search);
  articleId = params.get('id');

  if (!articleId) {
    document.getElementById('article-container').innerHTML =
      '<div class="empty-state">⚠️ Aucun article spécifié.</div>';
    return;
  }

  chargerArticle();
  chargerCommentaires();
  attacherFormulaire();
});

/* ============================================================
 *  CHARGEMENT DE L'ARTICLE
 * ============================================================ */

function chargerArticle() {
  const container = document.getElementById('article-container');

  onSnapshot(doc(db, 'blog_posts', articleId), (snap) => {
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">❌ Cet article n\'existe plus.</div>';
      document.getElementById('comments-section').style.display = 'none';
      return;
    }

    const article = snap.data();
    container.innerHTML = '';
    container.appendChild(creerArticle(articleId, article));

    document.getElementById('comments-section').style.display = 'block';
  });
}

function creerArticle(id, article) {
  const div = document.createElement('div');

  const cat = CATEGORIES.find(c => c.id === article.categorie);
  const badge = obtenirBadgeRole(article.auteurRole);
  const peutModifier = currentUser.uid === article.auteurId || peutModerer(currentProfile);

  div.innerHTML = `
    <div class="article-header">
      <h1>${escapeHtml(article.titre)}</h1>
      <div class="article-meta">
        <span>👤 <strong>${escapeHtml(article.auteurNom)}</strong></span>
        ${badge}
        ${cat ? `<span class="badge badge-cat">${cat.icon} ${cat.nom}</span>` : ''}
        <span>🕐 ${formatDate(article.date)}</span>
        ${article.dateModif ? '<span style="font-style:italic;">(modifié)</span>' : ''}
      </div>
      ${article.image ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.titre)}" class="article-image" onerror="this.style.display='none'">` : ''}
    </div>

    <div class="article-content">${escapeHtml(article.contenu)}</div>

    ${peutModifier ? `
      <div style="margin-bottom:25px; display:flex; gap:8px;">
        <button class="btn-delete" id="delete-article-btn" style="padding:10px 18px; font-size:13px;">🗑 Supprimer l'article</button>
      </div>
    ` : ''}
  `;

  // Bouton Supprimer
  const delBtn = div.querySelector('#delete-article-btn');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement cet article ET ses commentaires ?')) return;
      try {
        const commentsSnap = await getDoc(doc(db, 'blog_posts', articleId));
        // Supprimer les commentaires en premier
        const comments = collection(db, 'blog_posts', articleId, 'comments');
        const commentsList = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
          .then(m => m.getDocs(comments));
        for (const c of commentsList.docs) {
          await deleteDoc(c.ref);
        }
        await deleteDoc(doc(db, 'blog_posts', articleId));
        window.location.href = 'blog.html';
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return div;
}

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
 *  CHARGEMENT DES COMMENTAIRES
 * ============================================================ */

function chargerCommentaires() {
  const list = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');

  const commentsRef = collection(db, 'blog_posts', articleId, 'comments');
  const q = query(commentsRef, orderBy('date', 'asc'));

  unsubscribeComments = onSnapshot(q, (snap) => {
    const comments = [];
    snap.forEach(d => comments.push({ id: d.id, ...d.data() }));

    countEl.textContent = comments.length;

    list.innerHTML = '';
    if (comments.length === 0) {
      list.innerHTML = '<div class="empty-state">Aucun commentaire. Sois le premier !</div>';
      return;
    }

    comments.forEach(c => {
      list.appendChild(creerCommentaire(c));
    });
  });
}

function creerCommentaire(comment) {
  const div = document.createElement('div');
  div.className = 'comment-card';

  const badge = obtenirBadgeRole(comment.auteurRole);
  const peutSupprimer = currentUser.uid === comment.auteurId || peutModerer(currentProfile);

  div.innerHTML = `
    <div class="comment-header">
      <span><strong>${escapeHtml(comment.auteurNom)}</strong> ${badge}</span>
      <span>🕐 ${formatDate(comment.date)}</span>
    </div>
    <div class="comment-content">${escapeHtml(comment.contenu)}</div>
    ${peutSupprimer ? `
      <div class="comment-actions">
        <button class="btn-delete" data-action="delete">🗑 Supprimer</button>
      </div>
    ` : ''}
  `;

  const delBtn = div.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer ce commentaire ?')) return;
      try {
        await deleteDoc(doc(db, 'blog_posts', articleId, 'comments', comment.id));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return div;
}

/* ============================================================
 *  FORMULAIRE DE COMMENTAIRE
 * ============================================================ */

function attacherFormulaire() {
  const btn = document.getElementById('publish-comment-btn');
  const textarea = document.getElementById('comment-content');
  const status = document.getElementById('comment-status');

  btn.onclick = async () => {
    const contenu = textarea.value.trim();

    if (!contenu) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Écris un commentaire.';
      return;
    }
    if (contenu.length > 1000) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Trop long (max 1000).';
      return;
    }

    btn.disabled = true;
    btn.textContent = '📤 Publication...';

    try {
            await addDoc(collection(db, 'blog_posts', articleId, 'comments'), {
        contenu,
        auteurId: currentUser.uid,
        auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
        auteurRole: currentProfile.role,
        date: serverTimestamp()
      });

      // ⬇️ AJOUTER : Notifier l'auteur de l'article
      const articleSnap = await getDoc(doc(db, 'blog_posts', articleId));
      if (articleSnap.exists()) {
        const article = articleSnap.data();
        if (article.auteurId && article.auteurId !== currentUser.uid) {
          const { creerNotification } = await import('./notifications.js');
          await creerNotification({
            destinataireId: article.auteurId,
            type: 'commentaire',
            message: `a commenté ton article "${article.titre}"`,
            lien: `blog-article.html?id=${articleId}`,
            auteurId: currentUser.uid,
            auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`
          });
        }
      }

      textarea.value = '';
      status.style.color = 'var(--success)';
      status.textContent = '✅ Commentaire publié !';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
    }

    btn.disabled = false;
    btn.textContent = '📤 Publier le commentaire';
  };
}

console.log('✅ Page article LFAKM chargée');