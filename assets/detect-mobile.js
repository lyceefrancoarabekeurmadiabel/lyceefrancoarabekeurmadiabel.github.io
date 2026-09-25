/**
 * Détection mobile et redirection automatique.
 * 
 * Usage : ajouter <script src="assets/detect-mobile.js" defer></script>
 *         dans la page PC à partir de laquelle on veut rediriger.
 *
 * Comportement :
 *  - Si l'utilisateur est sur mobile ET n'a pas demandé explicitement la version PC,
 *    on le redirige vers la page mobile correspondante.
 *  - Si l'utilisateur clique sur "Version PC", on met ?pc=1 dans l'URL et on stocke
 *    en sessionStorage pour ne plus rediriger pendant la session.
 *  - Si l'utilisateur revient sur mobile après avoir déjà forcé la version PC, on le
 *    redirige vers la version mobile (nouvelle session ou ?mobile=1).
 */

(function () {
  'use strict';

  // ---- Configuration : table des redirections ----
  // Correspondance : page PC  ->  page mobile
  const REDIRECTIONS = {
    // Labos
    '/pc/labo-pc.html':                      '/mobile/labo-pc-mobile.html',
    '/pc/labo-maths.html':                   '/mobile/labo-maths-mobile.html',
    '/pc/labo-svt.html':                     '/mobile/labo-svt-mobile.html',

    // Simulateurs
    '/pc/simulateur-circuits-libre.html':    '/mobile/simulateur-circuits-libre-mobile.html',
    '/pc/simulateur-dosage.html':            '/mobile/simulateur-dosage-mobile.html',
    '/pc/simulateur-interferences.html':     '/mobile/simulateur-interferences-mobile.html',
    '/pc/simulateur-lentilles.html':         '/mobile/simulateur-lentilles-mobile.html',
    '/pc/simulateur-rc.html':                '/mobile/simulateur-rc-mobile.html',
    '/pc/simulateur-rl.html':                '/mobile/simulateur-rl-mobile.html',
    '/pc/simulateur-rlc.html':               '/mobile/simulateur-rlc-mobile.html',
    '/pc/simulateur-rlc-forces.html':        '/mobile/simulateur-rlc-forces-mobile.html',
    // Note : simulateur-lc.html n'a pas de version mobile → pas de redirection
  };

  // ---- Détection mobile ----
  const ua = navigator.userAgent || '';
  const estMobile = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua)
                    || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  if (!estMobile) return; // Pas mobile → on ne fait rien

  // ---- Est-ce que l'utilisateur a forcé la version PC ? ----
  const params = new URLSearchParams(window.location.search);
  const forcePCUrl = params.get('pc') === '1';
  const forcePCSession = sessionStorage.getItem('lfakm-force-pc') === '1';

  if (forcePCUrl) {
    sessionStorage.setItem('lfakm-force-pc', '1');
    return; // On le laisse voir la version PC
  }
  if (forcePCSession) {
    return; // Il a déjà choisi la version PC dans cette session
  }

  // ---- Construire l'URL de redirection ----
  const chemin = window.location.pathname;

  let pageMobile = null;
  for (const [pagePC, pageMobileCible] of Object.entries(REDIRECTIONS)) {
    if (chemin.endsWith(pagePC)) {
      pageMobile = pageMobileCible;
      break;
    }
  }

  if (!pageMobile) return; // Aucune redirection définie pour cette page

  // ---- Rediriger en gardant le hash éventuel ----
  const nouvelleUrl = pageMobile + window.location.hash;
  window.location.replace(nouvelleUrl);
})();