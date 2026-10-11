/* ============================================================
 *  🏫 LFAKM — Panneau de modération
 *  Fichier : community/js/admin-moderation.js
 *  Rôle : gestion des signalements par les admins
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, 
  query, where, orderBy, serverTimestamp, peutModerer
} from './community-common.js';

const TYPES_LABELS = {
  thread: { nom: 'Sujet forum', icon: '💬' },
  reply: { nom: 'Réponse forum', icon: '💬' },
  blog_post: { nom: 'Article blog', icon: '📝' },
  blog_comment: { nom: 'Commentaire blog', icon: '💬' },
  prof_resource: { nom: 'Ressource prof', icon: '📚' }
};

let currentUser = null;
let currentProfile = null;
let allSignalements = [];
let activeFilter = 'en_attente';
let unsubscribeSignalements = null;

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

  // Vérifier que l'utilisateur est admin
  if (!['admin', 'proviseur', 'censeur'].includes(currentProfile.role)) {
    document.querySelector('.modo-container').innerHTML = `
      <div class="empty-state">
        <span class="icon">⛔</span>
        <strong>Accès réservé</strong><br>
        <small>Cette page est réservée à l'administration.</small><br><br>
        <a href="index.html" style="color:var(--brass);font-weight:700;">← Retour à la communauté</a>
      </div>
    `;
    return;
  }

  chargerSignalements();
  attacherFiltres();
});

/* ============================================================
 *  CHARGEMENT DES SIGNALEMENTS
 * ============================================================ */

function chargerSignalements() {
  if (unsubscribeSignalements) unsubscribeSignalements();

  const signalRef = collection(db, 'signalements');
  const q = query(signalRef, orderBy('date', 'desc'));

  unsubscribeSignalements = onSnapshot(q, (snap) => {
    allSignalements = [];
    snap.forEach(d => allSignalements.push({ id: d.id, ...d.data() }));

    // Mettre à jour les stats
    afficherStats();

    // Afficher la liste
    afficherListe();
  }, (err) => {
    console.error('Erreur:', err);
    document.getElementById('signalements-list').innerHTML = `
      <div class="empty-state" style="color:var(--danger);">
        ⚠️ Erreur : ${escapeHtml(err.message)}
      </div>
    `;
  });
}

/* ============================================================
 *  STATISTIQUES
 * ============================================================ */

function afficherStats() {
  const total = allSignalements.length;
  const enAttente = allSignalements.filter(s => s.statut === 'en_attente' || !s.statut).length;
  const traites = allSignalements.filter(s => s.statut === 'traite').length;
  const ignores = allSignalements.filter(s => s.statut === 'ignore').length;

  document.getElementById('stats-container').innerHTML = `
    <div class="stat-card danger">
      <div class="stat-value">${enAttente}</div>
      <div class="stat-label">⏳ En attente</div>
    </div>
    <div class="stat-card success">
      <div class="stat-value">${traites}</div>
      <div class="stat-label">✅ Traités</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${ignores}</div>
      <div class="stat-label">🗑 Ignorés</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${total}</div>
      <div class="stat-label">📋 Total</div>
    </div>
  `;
}

/* ============================================================
 *  AFFICHAGE DE LA LISTE
 * ============================================================ */

function afficherListe() {
  const list = document.getElementById('signalements-list');

  let filtres = allSignalements;
  if (activeFilter === 'en_attente') {
    filtres = allSignalements.filter(s => s.statut === 'en_attente' || !s.statut);
  } else if (activeFilter !== 'all') {
    filtres = allSignalements.filter(s => s.statut === activeFilter);
  }

  if (filtres.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">✅</span>
        Aucun signalement ${activeFilter === 'en_attente' ? 'en attente' : ''}.
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  filtres.forEach(s => list.appendChild(creerCarteSignalement(s)));
}

/* ============================================================
 *  CARTE SIGNALEMENT
 * ============================================================ */

function creerCarteSignalement(signal) {
  const card = document.createElement('div');
  card.className = 'signal-card';
  if (signal.statut === 'traite') card.classList.add('traite');
  if (signal.statut === 'ignore') card.classList.add('ignore');

  const typeInfo = TYPES_LABELS[signal.cibleType] || { nom: signal.cibleType, icon: '❓' };
  const statutBadge = signal.statut === 'traite'
    ? '<span class="signal-status traite">✅ Traité</span>'
    : signal.statut === 'ignore'
    ? '<span class="signal-status ignore">🗑 Ignoré</span>'
    : '<span class="signal-status traite" style="background:#fdecea;color:var(--danger);">⏳ En attente</span>';

  card.innerHTML = `
    <div class="signal-header">
      <span class="signal-type-badge ${signal.cibleType}">
        ${typeInfo.icon} ${typeInfo.nom}
      </span>
      ${statutBadge}
    </div>

    <div class="signal-info">
      <div class="signal-info-item">
        <span class="signal-info-label">Signalé par</span>
        <span class="signal-info-value">👤 ${escapeHtml(signal.signaleurNom || 'Anonyme')}</span>
      </div>
      <div class="signal-info-item">
        <span class="signal-info-label">Date du signalement</span>
        <span class="signal-info-value">🕐 ${formatDate(signal.date)}</span>
      </div>
    </div>

    <div class="signal-raison">
      <strong>Raison :</strong> ${escapeHtml(signal.raison || 'Non spécifiée')}
    </div>

    ${signal.cibleApercu ? `
      <div class="signal-apercu">
        "${escapeHtml(signal.cibleApercu)}"
      </div>
    ` : ''}

    <div class="signal-actions">
      ${signal.cibleUrl ? `
        <button class="btn-action btn-voir" data-action="voir">👁️ Voir le contenu</button>
      ` : ''}
      ${(!signal.statut || signal.statut === 'en_attente') ? `
        <button class="btn-action btn-ignorer" data-action="ignore">🗑 Ignorer</button>
        <button class="btn-action btn-supprimer" data-action="delete">⚠️ Supprimer le contenu</button>
      ` : ''}
    </div>
  `;

  // Bouton Voir
  const voirBtn = card.querySelector('[data-action="voir"]');
  if (voirBtn && signal.cibleUrl) {
    voirBtn.onclick = () => {
      window.open(signal.cibleUrl, '_blank');
    };
  }

  // Bouton Ignorer
  const ignoreBtn = card.querySelector('[data-action="ignore"]');
  if (ignoreBtn) {
    ignoreBtn.onclick = async () => {
      if (!confirm('Ignorer ce signalement ?')) return;
      try {
        await updateDoc(doc(db, 'signalements', signal.id), {
          statut: 'ignore',
          traitePar: currentUser.uid,
          traiteParNom: `${currentProfile.prenom} ${currentProfile.nom}`,
          dateTraitement: serverTimestamp()
        });
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  // Bouton Supprimer
  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (!confirm('⚠️ SUPPRIMER DÉFINITIVEMENT le contenu signalé ?\n\nCette action est irréversible.')) return;

      try {
        // Supprimer le contenu selon son type
        const type = signal.cibleType;
        const cibleId = signal.cibleId;

        if (type === 'thread') {
          // Supprimer les réponses
          const replies = await getDocs(collection(db, 'forum_threads', cibleId, 'replies'));
          for (const r of replies.docs) await deleteDoc(r.ref);
          // Supprimer les likes
          const likes = await getDocs(collection(db, 'forum_threads', cibleId, 'likes'));
          for (const l of likes.docs) await deleteDoc(l.ref);
          // Supprimer le thread
          await deleteDoc(doc(db, 'forum_threads', cibleId));
        } else if (type === 'reply') {
          await deleteDoc(doc(db, 'forum_threads', signal.parentId, 'replies', cibleId));
        } else if (type === 'blog_post') {
          // Supprimer les commentaires
          const comments = await getDocs(collection(db, 'blog_posts', cibleId, 'comments'));
          for (const c of comments.docs) await deleteDoc(c.ref);
          // Supprimer l'article
          await deleteDoc(doc(db, 'blog_posts', cibleId));
        } else if (type === 'blog_comment') {
          await deleteDoc(doc(db, 'blog_posts', signal.parentId, 'comments', cibleId));
        } else if (type === 'prof_resource') {
          await deleteDoc(doc(db, 'prof_resources', cibleId));
        }

        // Marquer le signalement comme traité
        await updateDoc(doc(db, 'signalements', signal.id), {
          statut: 'traite',
          traitePar: currentUser.uid,
          traiteParNom: `${currentProfile.prenom} ${currentProfile.nom}`,
          dateTraitement: serverTimestamp()
        });

        alert('✅ Contenu supprimé et signalement traité.');
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return card;
}

/* ============================================================
 *  FILTRES
 * ============================================================ */

function attacherFiltres() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      afficherListe();
    };
  });
}

console.log('✅ Panneau modération LFAKM chargé');