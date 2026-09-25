/**
 * Détection mobile et redirection automatique.
 * 
 * Usage : ajouter <script src="assets/detect-mobile.js" defer></script>
 *         dans la page PC à partir de laquelle on veut rediriger.
 *
 * ⚠️ Définit window.__lfakmRedirectingMobile = true avant de rediriger.
 *    Les scripts de protection Firebase doivent vérifier ce verrou.
 */

(function () {
  'use strict';

  const REDIRECTIONS = {
    // Pages principales
    '/index.html':                      '/mobile/index-mobile.html',
    '/actualites.html':                 '/mobile/actualites-mobile.html',
    '/pc/ressources.html':              '/mobile/ressources-mobile.html',
    '/historique.html':                 '/mobile/historique-mobile.html',

    // Labos
    '/pc/labo-pc.html':                 '/mobile/labo-pc-mobile.html',
    '/pc/labo-maths.html':              '/mobile/labo-maths-mobile.html',
    '/pc/labo-svt.html':                '/mobile/labo-svt-mobile.html',

    // Simulateurs
    '/pc/simulateur-circuits-libre.html': '/mobile/simulateur-circuits-libre-mobile.html',
    '/pc/simulateur-dosage.html':         '/mobile/simulateur-dosage-mobile.html',
    '/pc/simulateur-interferences.html':  '/mobile/simulateur-interferences-mobile.html',
    '/pc/simulateur-lentilles.html':      '/mobile/simulateur-lentilles-mobile.html',
    '/pc/simulateur-rc.html':             '/mobile/simulateur-rc-mobile.html',
    '/pc/simulateur-rl.html':             '/mobile/simulateur-rl-mobile.html',
    '/pc/simulateur-rlc.html':            '/mobile/simulateur-rlc-mobile.html',
    '/pc/simulateur-rlc-forces.html':     '/mobile/simulateur-rlc-forces-mobile.html',
    '/pc/simulateur-lc.html':            '/mobile/simulateur-lc-mobile.html',
  };

  const ua = navigator.userAgent || '';
  const estMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)
                    || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  if (!estMobile) return;

  const params = new URLSearchParams(window.location.search);
  const forcePCUrl = params.get('pc') === '1';
  const forcePCSession = sessionStorage.getItem('lfakm-force-pc') === '1';

  if (forcePCUrl) {
    sessionStorage.setItem('lfakm-force-pc', '1');
    return;
  }
  if (forcePCSession) {
    return;
  }

  const chemin = window.location.pathname;
  let pageMobile = null;
  for (const [pagePC, pageMobileCible] of Object.entries(REDIRECTIONS)) {
    if (chemin === pagePC || chemin.endsWith(pagePC)) {
      pageMobile = pageMobileCible;
      break;
    }
  }

  if (!pageMobile) return;

  // ✅ Verrou anti-double-redirection
  window.__lfakmRedirectingMobile = true;

  const nouvelleUrl = pageMobile + window.location.hash;
  window.location.replace(nouvelleUrl);
})();
