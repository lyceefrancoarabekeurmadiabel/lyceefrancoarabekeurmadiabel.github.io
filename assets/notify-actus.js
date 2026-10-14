/**
 * assets/notify-actus.js
 * =======================
 * Détecte les nouvelles actualités ciblant l'utilisateur connecté
 * et affiche :
 *   - Un badge rouge avec compteur sur le lien "Actualités"
 *   - Un point d'exclamation 🔴 à côté du lien
 *   - Un toast lors du premier chargement
 *
 * Utilise localStorage pour mémoriser la dernière consultation.
 *
 * ⚠️ Nécessite Firebase déjà initialisé dans la page parente.
 *    Expose window.lfakmNotifierActus(db, auth, profile)
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'lfakm.lastSeenActu';
  const NEW_DAYS = 7; // On considère une actu "nouvelle" si < 7 jours

  /**
   * Vérifie si une actu cible l'utilisateur courant.
   * @param {object} actu - Données de l'actu
   * @param {object} profile - Profil utilisateur { role, niveau, uid }
   * @returns {boolean}
   */
  function isTargeted(actu, profile) {
    if (!actu || !actu.destinataire) return false;
    const dest = actu.destinataire;
    if (dest === 'tous') return true;
    if (dest === 'eleve' && profile.role === 'eleve') return true;
    if (dest === 'professeur' && profile.role === 'professeur') return true;
    if (dest.startsWith('classe:')) {
      const classeId = dest.split(':')[1];
      // Pour un élève : comparer avec son niveau
      if (profile.role === 'eleve' && profile.niveau === classeId) return true;
      // Pour un prof : comparer avec ses classes assignées
      if (profile.role === 'professeur' && Array.isArray(profile.assignedClasses)) {
        return profile.assignedClasses.includes(classeId);
      }
    }
    return false;
  }

  /**
   * Retourne la clé localStorage pour un utilisateur.
   */
  function getStorageKey(uid, niveau) {
    return `${STORAGE_KEY}.${uid}.${niveau || 'all'}`;
  }

  /**
   * Récupère le timestamp de dernière consultation.
   */
  function getLastSeen(uid, niveau) {
    try {
      const v = localStorage.getItem(getStorageKey(uid, niveau));
      return v ? parseInt(v, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Met à jour le timestamp de dernière consultation.
   */
  function setLastSeen(uid, niveau) {
    try {
      localStorage.setItem(getStorageKey(uid, niveau), String(Date.now()));
    } catch (e) {}
  }

  /**
   * Compte les nouvelles actus pour l'utilisateur.
   * @returns {Promise<{count: number, latest: object|null}>}
   */
  async function countNewActus(db, profile) {
    if (!profile || !profile.uid) return { count: 0, latest: null };

    const { collection, query, orderBy, getDocs, Timestamp } = 
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const lastSeen = getLastSeen(profile.uid, profile.niveau);
    const sevenDaysAgo = Date.now() - NEW_DAYS * 864e5;

    // On récupère les 30 dernières actus pour filtrer côté client
    // (évite les problèmes d'index Firestore avec les filtres complexes)
    const q = query(
      collection(db, 'actualites'),
      orderBy('date', 'desc')
    );

    const snap = await getDocs(q);
    let count = 0;
    let latest = null;

    snap.forEach((d) => {
      const actu = d.data();
      if (!isTargeted(actu, profile)) return;

      const ts = actu.date?.toDate ? actu.date.toDate().getTime() : 0;
      if (ts < sevenDaysAgo) return;

      if (ts > lastSeen) {
        count++;
        if (!latest || ts > latest.ts) {
          latest = { id: d.id, ts, titre: actu.titre };
        }
      }
    });

    return { count, latest };
  }

  /**
   * Injecte un badge dans les liens "Actualités".
   */
  function injectBadge(count) {
    // Supprimer les anciens badges
    document.querySelectorAll('.lfakm-actu-badge').forEach((el) => el.remove());

    if (count <= 0) return;

    // Trouver tous les liens vers actualites.html ou actualites-mobile.html
    const selectors = [
      'a[href*="actualites"]',
      'a[href*="actualites-mobile"]',
    ];
    const links = document.querySelectorAll(selectors.join(','));

    links.forEach((link) => {
      // Ignorer si déjà traité
      if (link.querySelector('.lfakm-actu-badge')) return;
      // Ignorer si c'est un lien vers une autre page (déjà redirigé)
      if (link.dataset.noBadge === '1') return;

      const badge = document.createElement('span');
      badge.className = 'lfakm-actu-badge';
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.style.cssText = `
        display: inline-block;
        background: #d9534f;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 999px;
        margin-left: 6px;
        line-height: 1;
        vertical-align: middle;
        animation: lfakm-pulse 1.5s ease-in-out infinite;
      `;
      link.appendChild(badge);
    });

    // Ajouter l'animation CSS si pas déjà présente
    if (!document.getElementById('lfakm-badge-style')) {
      const style = document.createElement('style');
      style.id = 'lfakm-badge-style';
      style.textContent = `
        @keyframes lfakm-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Affiche un toast informatif.
   */
  function showToast(message, count) {
    // Éviter les doublons
    if (document.querySelector('.lfakm-actu-toast')) return;

    const toast = document.createElement('div');
    toast.className = 'lfakm-actu-toast';
    toast.innerHTML = `
      <span>${message}</span>
      <button aria-label="Fermer" style="background:none;border:none;color:#B7BCC9;font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 5000;
      background: #10192E;
      color: #fff;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      cursor: pointer;
      max-width: 90vw;
      animation: lfakm-slideDown 0.3s ease-out;
    `;
    toast.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') {
        toast.remove();
        return;
      }
      // Naviguer vers les actus
      const url = location.pathname.includes('/mobile/')
        ? 'actualites-mobile.html'
        : '/actualites.html';
      window.location.href = url;
    };
    toast.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      toast.remove();
    };
    document.body.appendChild(toast);

    // Animation CSS
    if (!document.getElementById('lfakm-toast-style')) {
      const style = document.createElement('style');
      style.id = 'lfakm-toast-style';
      style.textContent = `
        @keyframes lfakm-slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    // Auto-dismiss après 8s
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 8000);
  }

  /**
   * Point d'entrée principal. À appeler après initialisation Firebase.
   * @param {object} db - Firestore instance
   * @param {object} auth - Auth instance
   * @param {object} profile - Profil utilisateur { uid, role, niveau, assignedClasses }
   * @param {object} options - { showToast: bool, injectBadge: bool }
   */
  window.lfakmNotifierActus = async function (db, auth, profile, options = {}) {
    const opts = Object.assign({
      showToast: true,
      injectBadge: true,
    }, options);

    if (!profile || !profile.uid) return;

    try {
      const { count, latest } = await countNewActus(db, profile);
      if (count === 0) return;

      if (opts.injectBadge) injectBadge(count);

      if (opts.showToast) {
        const msg = count === 1
          ? `📰 1 nouvelle actualité${latest?.titre ? ` : "${latest.titre}"` : ''}`
          : `📰 ${count} nouvelles actualités vous attendent`;
        showToast(msg, count);
      }

      // Exposer une fonction pour marquer comme vu
      window.lfakmMarkActusAsSeen = () => setLastSeen(profile.uid, profile.niveau);
    } catch (e) {
      console.warn('[notify-actus] Erreur:', e.message);
    }
  };

  /**
   * Marque les actus comme vues (à appeler sur la page actualites.html).
   */
  window.lfakmMarkActusAsSeen = function () {
    const uid = window.__lfakmCurrentUid;
    const niveau = window.__lfakmCurrentNiveau;
    if (uid) setLastSeen(uid, niveau);
  };

})();