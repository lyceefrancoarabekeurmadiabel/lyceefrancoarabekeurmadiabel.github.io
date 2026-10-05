/* ============================================================
 *  🏫 LFAKM — Système de notifications temps réel
 *  Fichier : community/js/notifications.js
 * ============================================================ */

import { 
  auth, db, escapeHtml, formatDate,
  collection, doc, query, where, orderBy, limit,
  onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp,
  getDoc
} from './community-common.js';

let currentUserId = null;
let unsubscribeNotifs = null;

/* ============================================================
 *  INITIALISATION
 * ============================================================ */

export function initialiserNotifications(userId) {
  currentUserId = userId;
  if (!currentUserId) return;

  // Écouter les notifications non lues
  ecouterNotifications();

  // Bouton cloche
  const btn = document.getElementById('notif-btn');
  if (btn) {
    btn.onclick = (e) => {
      e.stopPropagation();
      const item = document.getElementById('notif-item');
      if (item) item.classList.toggle('show');
    };
  }

  // Fermer au clic extérieur
  document.addEventListener('click', (e) => {
    const item = document.getElementById('notif-item');
    if (item && item.classList.contains('show') && !item.contains(e.target)) {
      item.classList.remove('show');
    }
  });

  // Bouton "Tout marquer comme lu"
  const markAll = document.getElementById('notif-mark-all-read');
  if (markAll) {
    markAll.onclick = async (e) => {
      e.stopPropagation();
      await marquerToutesLues();
    };
  }
}

/* ============================================================
 *  ÉCOUTER LES NOTIFICATIONS EN TEMPS RÉEL
 * ============================================================ */

function ecouterNotifications() {
  if (unsubscribeNotifs) unsubscribeNotifs();

  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('destinataireId', '==', currentUserId),
    orderBy('date', 'desc'),
    limit(20)
  );

  unsubscribeNotifs = onSnapshot(q, (snap) => {
    const notifs = [];
    snap.forEach(d => notifs.push({ id: d.id, ...d.data() }));

    // Mettre à jour le badge
    const nonLues = notifs.filter(n => !n.lu);
    const count = nonLues.length;

    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }

    const drawerBadge = document.getElementById('notif-count-drawer');
    if (drawerBadge) {
      if (count > 0) {
        drawerBadge.textContent = count > 99 ? '99+' : count;
        drawerBadge.style.display = 'inline-block';
      } else {
        drawerBadge.style.display = 'none';
      }
    }

    // Afficher la liste
    afficherListe(notifs);
  }, (err) => {
    console.warn('Erreur notifications:', err);
  });
}

/* ============================================================
 *  AFFICHER LA LISTE
 * ============================================================ */

function afficherListe(notifs) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">Aucune notification</div>';
    return;
  }

  list.innerHTML = '';
  notifs.forEach(n => {
    const card = document.createElement('a');
    card.className = 'notif-card' + (n.lu ? '' : ' non-lu');
    card.href = n.lien || '#';

    let icone = '🔔';
    if (n.type === 'reponse') icone = '💬';
    else if (n.type === 'commentaire') icone = '📝';
    else if (n.type === 'like') icone = '👍';
    else if (n.type === 'ressource') icone = '📚';
    else if (n.type === 'mention') icone = '@';

    card.innerHTML = `
      <div class="notif-card-ligne1">
        <span class="notif-card-icon">${icone}</span>
        <strong>${escapeHtml(n.auteurNom || 'Quelqu\'un')}</strong>
        ${escapeHtml(n.message || '')}
      </div>
      <div class="notif-card-ligne2">
        <span class="notif-card-date">🕐 ${formatDate(n.date)}</span>
        ${n.lu ? '' : '<span style="color:var(--brass);font-weight:700;">• Non lu</span>'}
      </div>
    `;

    card.onclick = async (e) => {
      // Marquer comme lu avant de naviguer
      if (!n.lu) {
        try {
          await updateDoc(doc(db, 'notifications', n.id), { lu: true });
        } catch (err) { /* silencieux */ }
      }
      // Le lien s'ouvre automatiquement
    };

    list.appendChild(card);
  });
}

/* ============================================================
 *  MARQUER TOUTES COMME LUES
 * ============================================================ */

async function marquerToutesLues() {
  const notifsRef = collection(db, 'notifications');
  const q = query(
    notifsRef,
    where('destinataireId', '==', currentUserId),
    where('lu', '==', false)
  );

  try {
    const snap = await new Promise((resolve, reject) => {
      const unsub = onSnapshot(q, (s) => {
        unsub();
        resolve(s);
      }, reject);
    });

    for (const d of snap.docs) {
      await updateDoc(d.ref, { lu: true });
    }
  } catch (err) {
    console.warn('Erreur marquer toutes lues:', err);
  }
}

/* ============================================================
 *  CRÉER UNE NOTIFICATION (utilitaire exporté)
 * ============================================================ */

export async function creerNotification({
  destinataireId,
  type,
  message,
  lien,
  auteurId,
  auteurNom
}) {
  if (!destinataireId || !auteurId) return;
  
  // Ne pas se notifier soi-même
  if (destinataireId === auteurId) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      destinataireId,
      type,
      message,
      lien: lien || null,
      auteurId,
      auteurNom,
      lu: false,
      date: serverTimestamp()
    });
  } catch (err) {
    console.warn('Erreur création notification:', err);
  }
}

console.log('✅ Notifications LFAKM chargées');