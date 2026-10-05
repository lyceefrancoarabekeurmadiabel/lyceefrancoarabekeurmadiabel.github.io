/* ============================================================
 *  🏫 LFAKM — Menu unifié pour le module Communauté
 *  Fichier : community/js/menu.js
 *  Rôle : injecte le ruban + gère le burger + sous-menus
 * ============================================================ */

import { auth, db, getCurrentProfile, onAuthStateChanged, afficherProfilHeader } 
  from './community-common.js';

/* ------------------------------------------------------------
 *  CONSTRUCTION DU MENU
 * ------------------------------------------------------------ */
function construireMenu(profile) {
  const isAdmin = profile && ['admin', 'proviseur', 'censeur'].includes(profile.role);
  const isGouvernement = profile && ['president', 'ministre_communication'].includes(profile.role);

  return `
    <header>
      <div class="nav-row">
        <div class="menu-toggle" id="burger-btn">☰</div>
        <a href="../index.html" class="brand">
          <div class="brand-mark"><img src="../logo-header.png" alt="LFAKM"></div>
          <div>
            <div class="brand-name">Lycée Franco Arabe de Keur Madiabel</div>
            <div class="brand-tag">Excellence & Savoir</div>
          </div>
        </a>
        <nav>
          <ul id="menu">
            <li><a href="../index.html">Accueil</a></li>
            <li><a href="../actualites.html">Actualités</a></li>
            <li><a href="../pc/ressources.html">Ressources</a></li>
            
            <!-- Sous-menu Communauté -->
            <li class="community-item">
              <span class="community-trigger">👥 Communauté ▾</span>
              <div class="community-dropdown">
                <a href="index.html">🏠 Accueil communauté</a>
                <a href="forum.html">💬 Forum</a>
                <a href="professeurs.html">👩‍🏫 Espace Professeurs</a>
                <a href="blog.html">📝 Blog du lycée</a>
              </div>
            </li>
            
            <li id="user-profile" class="profile-info"></li>
            <li><a href="../identification.html" class="nav-cta" id="auth-link">Se connecter</a></li>
          </ul>
        </nav>
      </div>
    </header>
  `;
}

/* ------------------------------------------------------------
 *  CSS DES SOUS-MENUS (injecté dynamiquement)
 * ------------------------------------------------------------ */
function injecterCSSMenu() {
  const style = document.createElement('style');
  style.textContent = `
    /* Sous-menu Communauté */
    .community-item { position: relative; }
    .community-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      right: 0;
      background: #fff;
      border: 1px solid rgba(27,42,74,0.14);
      border-radius: 6px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      min-width: 220px;
      z-index: 100;
      padding: 5px 0;
    }
    .community-dropdown a {
      display: block;
      padding: 10px 15px;
      color: #1B2A4A;
      font-size: 13px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .community-dropdown a:hover {
      background: #f5f5f5;
      color: #A8853F;
    }
    .community-item:hover .community-dropdown {
      display: block;
    }
    .community-trigger {
      font-size: 13px;
      font-weight: 600;
      color: #1B2A4A;
      cursor: pointer;
      white-space: nowrap;
    }
    .community-trigger.active { color: #A8853F; }
    
    /* Mobile : sous-menu au clic */
    @media (max-width: 900px) {
      .community-dropdown {
        position: static;
        box-shadow: none;
        border: none;
        padding-left: 20px;
      }
      .community-item.open .community-dropdown {
        display: block;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------
 *  MARQUER LE LIEN ACTIF
 * ------------------------------------------------------------ */
function marquerLienActif() {
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  if (page === 'index.html' || page === '' || page === 'community/') {
    // On est sur le hub → marquer le trigger
    const trigger = document.querySelector('.community-trigger');
    if (trigger) trigger.classList.add('active');
  } else if (['forum.html', 'thread.html', 'professeurs.html', 'blog.html'].includes(page)) {
    const trigger = document.querySelector('.community-trigger');
    if (trigger) trigger.classList.add('active');

    // Marquer le lien actif dans le sous-menu
    const dropdown = document.querySelector('.community-dropdown');
    if (dropdown) {
      dropdown.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href === page) {
          a.style.fontWeight = '700';
          a.style.color = '#A8853F';
        }
      });
    }
  }
}

/* ------------------------------------------------------------
 *  GESTION DU BURGER + SOUS-MENUS MOBILE
 * ------------------------------------------------------------ */
function initialiserNavigation() {
  const burgerBtn = document.getElementById('burger-btn');
  const menu = document.getElementById('menu');

  if (burgerBtn && menu) {
    burgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (menu.classList.contains('show') && !menu.contains(e.target) && !burgerBtn.contains(e.target)) {
        menu.classList.remove('show');
      }
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => menu.classList.remove('show'));
    });
  }

  // Sous-menu Communauté sur mobile (clic)
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    const trigger = e.target.closest('.community-trigger');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    const item = trigger.closest('.community-item');
    if (item) item.classList.toggle('open');
  });
}

/* ------------------------------------------------------------
 *  INITIALISATION
 * ------------------------------------------------------------ */
export async function initialiserMenuComplet() {
  // Injecter le CSS
  injecterCSSMenu();

  // Construire le menu (avec profile null au départ, on mettra à jour après auth)
  const headerHTML = construireMenu(null);
  document.body.insertAdjacentHTML('afterbegin', headerHTML);

  // Gestion burger
  initialiserNavigation();

  // Marquer le lien actif
  marquerLienActif();

  // Mettre à jour après auth
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getCurrentProfile(user);
      afficherProfilHeader(profile);
    } else {
      afficherProfilHeader(null);
    }
  });
}