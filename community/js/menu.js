/* ============================================================
 *  🏫 LFAKM — Menu unifié pour le module Communauté
 *  Fichier : community/js/menu.js
 *  Rôle : injecte le header + drawer mobile
 *         Gère burger, sous-menu Communauté, profil, rôle
 * ============================================================ */

import { 
  auth, onAuthStateChanged, getCurrentProfile, signOut 
} from './community-common.js';

/* ------------------------------------------------------------
 *  CONSTRUCTION DU MENU (Header desktop + Drawer mobile)
 * ------------------------------------------------------------ */
function construireMenu() {
  return `
  <!-- ============ HEADER DESKTOP ============ -->
  <header id="lfakm-header">
    <div class="nav-row">
      <div class="menu-toggle" id="burger-btn">☰</div>
      <a href="../index.html" class="brand">
        <div class="brand-mark"><img src="../logo-header.png" alt="LFAKM"></div>
        <div>
          <div class="brand-name">Lycée Franco Arabe de Keur Madiabel</div>
          <div class="brand-tag">Excellence & Savoir</div>
        </div>
      </a>
      <nav class="desktop-nav">
        <ul id="menu-desktop">
          <li><a href="../index.html">Accueil</a></li>
          <li><a href="../actualites.html">Actualités</a></li>
          <li><a href="../pc/ressources.html">Ressources</a></li>
          
          <!-- Sous-menu Communauté (regroupe tout) -->
          <li class="community-item">
            <span class="community-trigger">👥 Communauté ▾</span>
            <div class="community-dropdown">
              <a href="index.html">🏠 Accueil communauté</a>
              <a href="forum.html">💬 Forum</a>
              <a href="blog.html">📝 Blog du lycée</a>
              <a href="professeurs.html">👩‍🏫 Espace Professeurs</a>
            </div>
          </li>
          
          <li id="user-profile" class="profile-info"></li>
          <li><a href="../identification.html" class="nav-cta" id="auth-link">Se connecter</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- ============ DRAWER MOBILE ============ -->
  <div class="drawer-backdrop" id="drawer-backdrop"></div>
  <aside class="drawer" id="drawer">
    <div class="drawer-header">
      <h2>Menu</h2>
      <button class="drawer-close" id="drawer-close" aria-label="Fermer">×</button>
    </div>

    <div class="drawer-user" id="drawer-user" style="display:none;">
      <div class="name" id="drawer-user-name"></div>
      <div class="role" id="drawer-user-role"></div>
    </div>

    <nav class="drawer-nav">
      <a href="../index.html">🏠 Accueil</a>
      <a href="../actualites.html">📰 Actualités</a>
      <a href="../pc/ressources.html" class="connecte-only">📚 Ressources</a>

      <div class="separator"></div>

      <a href="index.html">🏠 Accueil communauté</a>
      <a href="forum.html">💬 Forum</a>
      <a href="blog.html">📝 Blog du lycée</a>
      <a href="professeurs.html">👩‍🏫 Espace Professeurs</a>

      <div class="separator"></div>

      <a href="#" id="drawer-auth-link" class="primary">🔐 Se connecter</a>
    </nav>

    <div class="drawer-footer">LFAKM — Communauté</div>
  </aside>
  `;
}

/* ------------------------------------------------------------
 *  INITIALISATION DU MENU
 * ------------------------------------------------------------ */
export async function initialiserMenuComplet() {
  // 1. Injecter le menu en haut du <body>
  document.body.insertAdjacentHTML('afterbegin', construireMenu());

  // 2. Gestion du burger + drawer
  initialiserDrawer();

  // 3. Gestion du sous-menu Communauté (desktop hover / mobile clic)
  initialiserSousMenu();

  // 4. Gestion de l'authentification
  initialiserAuth();
}

/* ------------------------------------------------------------
 *  GESTION DU DRAWER MOBILE
 * ------------------------------------------------------------ */
function initialiserDrawer() {
  const burgerBtn = document.getElementById('burger-btn');
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close');

  if (!burgerBtn || !drawer || !backdrop || !closeBtn) return;

  function openDrawer() {
  drawer.classList.add('show');
  backdrop.classList.add('show');
  document.body.classList.add('drawer-open');
  // Sauvegarder la position de scroll actuelle
  document.body.dataset.scrollY = window.scrollY;
}

function closeDrawer() {
  drawer.classList.remove('show');
  backdrop.classList.remove('show');
  document.body.classList.remove('drawer-open');
  // Restaurer la position de scroll
  const scrollY = document.body.dataset.scrollY;
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY));
  }
}

  burgerBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  // Fermer le drawer quand on clique sur un lien
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/* ------------------------------------------------------------
 *  GESTION DU SOUS-MENU COMMUNAUTÉ
 * ------------------------------------------------------------ */
function initialiserSousMenu() {
  // Sur mobile : clic pour ouvrir/fermer le sous-menu
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    const trigger = e.target.closest('.community-trigger');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    const item = trigger.closest('.community-item');
    if (item) item.classList.toggle('open');
  });

  // Fermer les sous-menus ouverts au clic ailleurs
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    if (e.target.closest('.community-item')) return;
    document.querySelectorAll('.community-item.open').forEach(el => {
      el.classList.remove('open');
    });
  });
}

/* ------------------------------------------------------------
 *  GESTION DE L'AUTHENTIFICATION
 * ------------------------------------------------------------ */
function initialiserAuth() {
  onAuthStateChanged(auth, async (user) => {
    const authLink = document.getElementById('auth-link');
    const drawerAuthLink = document.getElementById('drawer-auth-link');
    const profileSpan = document.getElementById('user-profile');
    const drawerUser = document.getElementById('drawer-user');
    const drawerName = document.getElementById('drawer-user-name');
    const drawerRole = document.getElementById('drawer-user-role');

    if (user) {
      const profile = await getCurrentProfile(user);
      if (!profile) return;

      // --- Profil desktop ---
      if (profileSpan) {
        profileSpan.innerHTML = `
          <span class="profile-name">👤 ${profile.prenom} ${profile.nom}</span>
          <span class="profile-role">${profile.role}</span>
        `;
        profileSpan.style.display = 'flex';
      }

      // --- Profil drawer mobile ---
      if (drawerUser && drawerName && drawerRole) {
        drawerUser.style.display = 'block';
        drawerName.textContent = `👤 ${profile.prenom} ${profile.nom}`;
        drawerRole.textContent = profile.role;
      }

      // --- Lien Ressources (visible si connecté) ---
      document.querySelectorAll('.connecte-only').forEach(el => {
        el.style.display = 'flex';
      });

      // --- Bouton Déconnexion ---
      if (authLink) {
        authLink.textContent = 'Déconnexion';
        authLink.onclick = (e) => {
          e.preventDefault();
          signOut(auth).then(() => window.location.reload());
        };
      }
      if (drawerAuthLink) {
        drawerAuthLink.textContent = '🚪 Se déconnecter';
        drawerAuthLink.onclick = (e) => {
          e.preventDefault();
          signOut(auth).then(() => window.location.reload());
        };
      }

    } else {
      // --- Non connecté ---
      if (profileSpan) profileSpan.style.display = 'none';
      if (drawerUser) drawerUser.style.display = 'none';

      document.querySelectorAll('.connecte-only').forEach(el => {
        el.style.display = 'none';
      });

      if (authLink) {
        authLink.textContent = 'Se connecter';
        authLink.href = '../identification.html';
        authLink.onclick = null;
      }
      if (drawerAuthLink) {
        drawerAuthLink.textContent = '🔐 Se connecter';
        drawerAuthLink.href = '../identification.html';
        drawerAuthLink.onclick = null;
      }
    }
  });
}