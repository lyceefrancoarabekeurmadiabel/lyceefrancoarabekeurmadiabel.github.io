/**
 * Détection mobile et redirection automatique.
 *
 * Usage : ajouter <script src="/assets/detect-mobile.js" defer></script>
 *         dans la page PC à partir de laquelle on veut rediriger.
 *
 * ⚠️ Définit window.__lfakmRedirectingMobile = true avant de rediriger.
 *    Les scripts de protection Firebase doivent vérifier ce verrou.
 *
 * ⚠️ CHEMIN ABSOLU obligatoire : /assets/detect-mobile.js
 *    (à cause de clean-url.js qui réécrit l'URL affichée)
 */

(function () {
  'use strict';

  const DEBUG = false; // Mettre à true pour voir les logs en console
  const log = (...args) => { if (DEBUG) console.log('[detect-mobile]', ...args); };

  const REDIRECTIONS = {
    // Pages principales
    '/index.html':                        '/mobile/index-mobile.html',
    '/':                                  '/mobile/index-mobile.html',
    '/actualites.html':                   '/mobile/actualites-mobile.html',
    '/actualites':                        '/mobile/actualites-mobile.html',
    '/pc/ressources.html':                '/mobile/ressources-mobile.html',
    '/pc/ressources':                     '/mobile/ressources-mobile.html',
    '/historique.html':                   '/mobile/historique-mobile.html',
    '/historique':                        '/mobile/historique-mobile.html',

    // Labos
    '/pc/labo-pc.html':                   '/mobile/labo-pc-mobile.html',
    '/pc/labo-pc':                        '/mobile/labo-pc-mobile.html',
    '/pc/labo-maths.html':                '/mobile/labo-maths-mobile.html',
    '/pc/labo-maths':                     '/mobile/labo-maths-mobile.html',
    '/pc/labo-svt.html':                  '/mobile/labo-svt-mobile.html',
    '/pc/labo-svt':                       '/mobile/labo-svt-mobile.html',

    // Simulateurs
    '/pc/simulateur-circuits-libre.html': '/mobile/simulateur-circuits-libre-mobile.html',
    '/pc/simulateur-circuits-libre':      '/mobile/simulateur-circuits-libre-mobile.html',
    '/pc/simulateur-dosage.html':         '/mobile/simulateur-dosage-mobile.html',
    '/pc/simulateur-dosage':              '/mobile/simulateur-dosage-mobile.html',
    '/pc/simulateur-interferences.html':  '/mobile/simulateur-interferences-mobile.html',
    '/pc/simulateur-interferences':       '/mobile/simulateur-interferences-mobile.html',
    '/pc/simulateur-lentilles.html':      '/mobile/simulateur-lentilles-mobile.html',
    '/pc/simulateur-lentilles':           '/mobile/simulateur-lentilles-mobile.html',
    '/pc/simulateur-rc.html':             '/mobile/simulateur-rc-mobile.html',
    '/pc/simulateur-rc':                  '/mobile/simulateur-rc-mobile.html',
    '/pc/simulateur-rl.html':             '/mobile/simulateur-rl-mobile.html',
    '/pc/simulateur-rl':                  '/mobile/simulateur-rl-mobile.html',
    '/pc/simulateur-rlc.html':            '/mobile/simulateur-rlc-mobile.html',
    '/pc/simulateur-rlc':                 '/mobile/simulateur-rlc-mobile.html',
    '/pc/simulateur-rlc-forces.html':     '/mobile/simulateur-rlc-forces-mobile.html',
    '/pc/simulateur-rlc-forces':          '/mobile/simulateur-rlc-forces-mobile.html',
    '/pc/simulateur-lc.html':             '/mobile/simulateur-lc-mobile.html',
    '/pc/simulateur-lc':                  '/mobile/simulateur-lc-mobile.html',
  };

  const ua = navigator.userAgent || '';
  const estMobile =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  log('User-Agent:', ua);
  log('estMobile:', estMobile);

  if (!estMobile) {
    log('Pas mobile → aucune redirection');
    return;
  }

  // Verrou "forcer PC" (via ?pc=1 ou sessionStorage)
  const params = new URLSearchParams(window.location.search);
  const forcePCUrl = params.get('pc') === '1';
  const forcePCSession = sessionStorage.getItem('lfakm-force-pc') === '1';

  log('forcePCUrl:', forcePCUrl, '| forcePCSession:', forcePCSession);

  if (forcePCUrl) {
    sessionStorage.setItem('lfakm-force-pc', '1');
    log('Verrou PC activé via URL');
    return;
  }
  if (forcePCSession) {
    log('Verrou PC actif → pas de redirection');
    return;
  }

  // Chercher une correspondance
  const chemin = window.location.pathname;
  log('Chemin actuel:', chemin);

  let pageMobile = null;
  for (const [pagePC, pageMobileCible] of Object.entries(REDIRECTIONS)) {
    if (chemin === pagePC || chemin.endsWith(pagePC)) {
      pageMobile = pageMobileCible;
      log('Correspondance trouvée:', pagePC, '→', pageMobileCible);
      break;
    }
  }

  if (!pageMobile) {
    log('Aucune correspondance mobile → pas de redirection');
    return;
  }

  // ✅ Verrou anti-double-redirection
  window.__lfakmRedirectingMobile = true;
  log('Redirection vers:', pageMobile);

  const nouvelleUrl = pageMobile + window.location.hash;
  window.location.replace(nouvelleUrl);
})();