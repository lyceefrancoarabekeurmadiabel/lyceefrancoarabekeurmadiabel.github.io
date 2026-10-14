/**
 * assets/notify-actus.js (v3)
 * ============================
 * Badge persistant sur les liens "Actualités".
 *
 * Fonctionnement :
 *   1. Compte les actus non vues ciblant l'utilisateur
 *   2. Affiche un badge rouge avec le compteur (si > 0)
 *   3. Le badge ne disparaît QUE lorsque l'utilisateur clique sur un lien "Actualités"
 *   4. Utilise localStorage pour persister entre les sessions
 *
 * Expose :
 *   - window.lfakmNotifierActus(db, auth, profile)  → à appeler après le chargement du profil
 *   - window.lfakmMarkActusAsSeen()                  → appelé automatiquement au clic
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'lfakm.lastSeenActu';
  const NEW_DAYS = 7;
  let __observer = null;
  let __currentCount = 0;

  // ============================================================
  // Utilitaires localStorage
  // ============================================================
  function getStorageKey(uid, niveau) {
    return `${STORAGE_KEY}.${uid}.${niveau || 'all'}`;
  }

  function getLastSeen(uid, niveau) {
    try {
      const v = localStorage.getItem(getStorageKey(uid, niveau));
      return v ? parseInt(v, 10) : 0;
    } catch (e) { return 0; }
  }

  function setLastSeen(uid, niveau) {
    try {
      localStorage.setItem(getStorageKey(uid, niveau), String(Date.now()));
    } catch (e) {}
  }

  // ============================================================
  // Détection des actus ciblant l'utilisateur
  // ============================================================
  function isTargeted(actu, profile) {
    if (!actu || !actu.destinataire) return false;
    const dest = actu.destinataire;
    if (dest === 'tous') return true;
    if (dest === 'eleve' && profile.role === 'eleve') return true;
    if (dest === 'professeur' && profile.role === 'professeur') return true;
    if (dest.startsWith('classe:')) {
      const classeId = dest.split(':')[1];
      if (profile.role === 'eleve' && profile.niveau === classeId) return true;
      if (profile.role === 'professeur' && Array.isArray(profile.assignedClasses)) {
        return profile.assignedClasses.includes(classeId);
      }
    }
    return false;
  }

  async function countNewActus(db, profile) {
    if (!profile || !profile.uid) return { count: 0, latest: null };

    const { collection, query, orderBy, getDocs } =
      await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

    const lastSeen = getLastSeen(profile.uid, profile.niveau);
    const sevenDaysAgo = Date.now() - NEW_DAYS * 864e5;

    const q = query(collection(db, 'actualites'), orderBy('date', 'desc'));
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

  // ============================================================
  // Injection du badge
  // ============================================================
  function removeBadge() {
    document.querySelectorAll('.lfakm-actu-badge').forEach((el) => el.remove());
  }

  function injectBadge(count) {
    removeBadge();
    if (count <= 0) return 0;

    const links = document.querySelectorAll('a[href*="actualites"]');
    let injected = 0;

    links.forEach((link) => {
      if (link.querySelector('.lfakm-actu-badge')) return;
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
      injected++;
    });

    if (!document.getElementById('lfakm-badge-style')) {
      const style = document.createElement('style');
      style.id = 'lfakm-badge-style';
      style.textContent = `@keyframes lfakm-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`;
      document.head.appendChild(style);
    }

    return injected;
  }

  // ============================================================
  // Clic sur un lien actualités → marquer comme vu + retirer le badge
  // ============================================================
  function attachClickHandler() {
    // Retirer l'ancien listener si présent
    document.removeEventListener('click', handleActusClick, true);
    document.addEventListener('click', handleActusClick, true);
  }

  function handleActusClick(e) {
    const link = e.target.closest('a[href*="actualites"]');
    if (!link) return;

    // Marquer comme vu
    if (typeof window.lfakmMarkActusAsSeen === 'function') {
      window.lfakmMarkActusAsSeen();
    }

    // Retirer le badge immédiatement
    removeBadge();
    __currentCount = 0;

    console.log('[lfakm-notify] Actus marquées comme vues (clic)');
  }

  // ============================================================
  // Toast (optionnel, informatif)
  // ============================================================
  function showToast(message) {
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
      z-index: 99999;
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
      if (e.target.tagName === 'BUTTON') { toast.remove(); return; }
      window.location.href = '/actualites.html';
    };
    toast.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      toast.remove();
    };
    document.body.appendChild(toast);

    if (!document.getElementById('lfakm-toast-style')) {
      const style = document.createElement('style');
      style.id = 'lfakm-toast-style';
      style.textContent = `@keyframes lfakm-slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }`;
      document.head.appendChild(style);
    }

    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 10000);
  }

  // ============================================================
  // Observer le DOM : si les liens apparaissent plus tard, réinjecter
  // ============================================================
  function watchForLinks() {
    if (__observer) return;

    __observer = new MutationObserver(() => {
      if (__currentCount > 0) {
        injectBadge(__currentCount);
      }
    });

    __observer.observe(document.body, { childList: true, subtree: true });

    // Arrêter après 60 secondes (suffisant pour tout chargement dynamique)
    setTimeout(() => {
      if (__observer) {
        __observer.disconnect();
        __observer = null;
      }
    }, 60000);
  }

  // ============================================================
  // Point d'entrée
  // ============================================================
  window.lfakmNotifierActus = async function (db, auth, profile, options = {}) {
    const opts = Object.assign({ showToast: false, injectBadge: true }, options);
    if (!profile || !profile.uid) return;

    try {
      // Attacher le listener de clic (une seule fois)
      attachClickHandler();

      const { count, latest } = await countNewActus(db, profile);
      __currentCount = count;

      console.log('[lfakm-notify] Actus non vues:', count);

      if (count === 0) {
        removeBadge();
        return;
      }

      if (opts.injectBadge) {
        const injected = injectBadge(count);
        console.log('[lfakm-notify] Badges injectés:', injected);

        // Si aucun lien trouvé → observer le DOM
        if (injected === 0) {
          console.log('[lfakm-notify] Aucun lien trouvé, observer activé');
          watchForLinks();
        }
      }

      // Toast optionnel (par défaut OFF pour ne pas gêner)
      if (opts.showToast) {
        const msg = count === 1
          ? `📰 1 nouvelle actualité${latest?.titre ? ` : "${latest.titre}"` : ''}`
          : `📰 ${count} nouvelles actualités vous attendent`;
        showToast(msg);
      }
    } catch (e) {
      console.warn('[lfakm-notify] Erreur:', e.message);
    }
  };

  // ============================================================
  // Marquer comme vu (appelé au clic sur un lien actualités)
  // ============================================================
  window.lfakmMarkActusAsSeen = function () {
    const uid = window.__lfakmCurrentUid;
    const niveau = window.__lfakmCurrentNiveau;
    if (uid) setLastSeen(uid, niveau);
  };

})();