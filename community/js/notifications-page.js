/* ============================================================
 *  🏫 LFAKM — Page dédiée aux notifications
 *  Fichier : community/js/notifications-page.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, query, where, orderBy, limit,
  onSnapshot, updateDoc, deleteDoc
} from './community-common.js';

let currentUser = null;
let currentProfile = null;
let allNotifs = [];
let activeFilter = 'all';
let unsubscribeNotifs = null;

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

  chargerNotifications();
  attacherFiltres();
  attacherBoutonMarkAll();
});

/* ============================================================
 *  CHARGEMENT TEMPS RÉEL
 * ============================================================ */

function chargerNotifications() {
  if (unsubscribeNotifs) unsubscribeNotifs();

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('destinataireId', '==', currentUser.uid),
    orderBy('date', 'desc'),
    limit(100)
  );

  unsubscribeNotifs = onSnapshot(q, (snap) => {
    allNotifs = [];
    snap.forEach(d => allNotifs.push({ id: d.id, ...d.data() }));

    const nonLues = allNotifs.filter(n => !n.lu).length;
    document.getElementById('non-lues-count').textContent = nonLues;
    document.getElementById('plural-s').textContent = nonLues > 1 ? 's' : '';

    afficherNotifications();
  }, (err) => {
    console.error('Erreur:', err);
    document.getElementById('notifs-list').innerHTML = `
      <div class="empty-state" style="color:var(--danger);">
        ⚠️ Erreur : ${escapeHtml(err.message)}
      </div>
    `;
  });
}

/* ============================================================
 *  AFFICHAGE
 * ============================================================ */

function afficherNotifications() {
  const list = document.getElementById('notifs-list');

  // Filtrer
  let filtres = allNotifs;
  if (activeFilter === 'non-lues') {
    filtres = allNotifs.filter(n => !n.lu);
  } else if (activeFilter !== 'all') {
    filtres = allNotifs.filter(n => n.type === activeFilter.replace('reponses', 'reponse').replace('likes', 'like').replace('commentaires', 'commentaire'));
  }

  if (filtres.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">🔔</span>
        Aucune notification${activeFilter !== 'all' ? ' dans ce filtre' : ''}.
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  filtres.forEach(n => {
    list.appendChild(creerCarteNotification(n));
  });
}

/* ============================================================
 *  CARTE NOTIFICATION
 * ============================================================ */

function creerCarteNotification(notif) {
  const card = document.createElement('a');
  card.className = 'notif-item-card' + (notif.lu ? '' : ' non-lu');
  card.href = notif.lien || '#';
  card.target = '_self';

  let icone = '🔔';
  if (notif.type === 'reponse') icone = '💬';
  else if (notif.type === 'commentaire') icone = '📝';
  else if (notif.type === 'like') icone = '👍';
  else if (notif.type === 'ressource') icone = '📚';
  else if (notif.type === 'mention') icone = '@';

  card.innerHTML = `
    <div class="notif-icon-box">${icone}</div>
    <div class="notif-content">
      <div class="notif-message">
        <strong>${escapeHtml(notif.auteurNom || 'Quelqu\'un')}</strong>
        ${escapeHtml(notif.message || '')}
      </div>
      <div class="notif-date">
        <span>🕐 ${formatDate(notif.date)}</span>
        ${notif.lu ? '' : '<span class="non-lu-dot"></span><span style="color:var(--brass);font-weight:700;">Non lu</span>'}
      </div>
    </div>
    <button class="notif-delete-btn" title="Supprimer" data-action="delete">🗑</button>
  `;

  // Marquer comme lu au clic + navigation
  card.onclick = async (e) => {
    // Si on clique sur le bouton supprimer, ne pas naviguer
    if (e.target.closest('[data-action="delete"]')) {
      e.preventDefault();
      if (!confirm('Supprimer cette notification ?')) return;
      try {
        await deleteDoc(doc(db, 'notifications', notif.id));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
      return;
    }

    // Sinon : marquer comme lu + laisser la navigation se faire
    if (!notif.lu) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { lu: true });
      } catch (err) { /* silencieux */ }
    }
  };

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
      afficherNotifications();
    };
  });
}

/* ============================================================
 *  BOUTON "TOUT MARQUER COMME LU"
 * ============================================================ */

function attacherBoutonMarkAll() {
  const btn = document.getElementById('btn-mark-all');
  btn.onclick = async () => {
    const nonLues = allNotifs.filter(n => !n.lu);
    if (nonLues.length === 0) return;

    if (!confirm(`Marquer ${nonLues.length} notification${nonLues.length > 1 ? 's' : ''} comme lue${nonLues.length > 1 ? 's' : ''} ?`)) return;

    btn.disabled = true;
    btn.textContent = '⏳ Traitement...';

    try {
      for (const n of nonLues) {
        await updateDoc(doc(db, 'notifications', n.id), { lu: true });
      }
    } catch (err) {
      alert('Erreur : ' + err.message);
    }

    btn.disabled = false;
    btn.textContent = '✅ Tout marquer comme lu';
  };
}

console.log('✅ Page notifications LFAKM chargée');