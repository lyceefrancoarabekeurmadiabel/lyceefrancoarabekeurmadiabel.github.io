/* ============================================================
 *  🏫 LFAKM — Espace Professeurs
 *  Fichier : community/js/professeurs.js
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, orderBy, serverTimestamp, increment, peutModerer
} from './community-common.js';

const MATIERES = {
  maths: { nom: 'Mathématiques', icon: '📐' },
  francais: { nom: 'Français', icon: '📖' },
  anglais: { nom: 'Anglais', icon: '🇬🇧' },
  arabe: { nom: 'Arabe', icon: '🕌' },
  svt: { nom: 'SVT', icon: '🧬' },
  physique: { nom: 'Physique-Chimie', icon: '⚗️' },
  histoire: { nom: 'Histoire-Géo', icon: '🌍' },
  philosophie: { nom: 'Philosophie', icon: '💭' },
  eps: { nom: 'EPS', icon: '⚽' },
  religion: { nom: 'Éducation Religieuse', icon: '📿' },
  autre: { nom: 'Autre', icon: '📌' }
};

const TYPES = {
  cours:     { nom: 'Cours',             icon: '📘', classe: 'cours' },
  td:        { nom: 'TD',                icon: '✏️', classe: 'td' },
  exercices: { nom: 'Exercices',         icon: '🎯', classe: 'exercices' },
  examen:    { nom: 'Sujet d\'examen',   icon: '📝', classe: 'examen' },
  fiche:     { nom: 'Fiche pédagogique', icon: '📄', classe: 'fiche' }
};

const CLOUDINARY_CLOUD = 'kgjydhyi';
const CLOUDINARY_PRESET = 'lfakm_ressources';
const TAILLE_MAX_FICHIER = 20 * 1024 * 1024;

let currentUser = null;
let currentProfile = null;
let searchTerm = '';
let filterMatiere = 'all';
let filterType = 'all';
let unsubscribeResources = null;

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

  // Accès réservé aux profs + admin
  const estAutorise = ['professeur', 'intendant', 'admin', 'proviseur', 'censeur'].includes(currentProfile.role);
  if (!estAutorise) {
    document.querySelector('.profs-container').innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <div style="font-size:60px; margin-bottom:20px;">🔒</div>
        <h1 style="font-family:var(--serif); color:var(--ink); margin-bottom:15px;">Accès réservé</h1>
        <p style="color:var(--slate); margin-bottom:25px;">Cet espace est réservé aux professeurs et à l'administration.</p>
        <a href="index.html" style="color:var(--brass); font-weight:700; text-decoration:none;">← Retour à la communauté</a>
      </div>
    `;
    return;
  }

  // Afficher le bouton Upload
  document.getElementById('publish-btn-container').style.display = 'flex';

  initialiserEspace();
});

/* ============================================================
 *  INITIALISATION
 * ============================================================ */

function initialiserEspace() {
  chargerRessources();
  attacherEvenements();
}

/* ============================================================
 *  CHARGEMENT DES RESSOURCES
 * ============================================================ */

function chargerRessources() {
  if (unsubscribeResources) unsubscribeResources();

  const grid = document.getElementById('resources-grid');
  grid.innerHTML = '<div class="loader">⏳ Chargement des ressources...</div>';

  const resourcesRef = collection(db, 'prof_resources');
  const q = query(resourcesRef, orderBy('date', 'desc'));

  unsubscribeResources = onSnapshot(q, (snap) => {
    grid.innerHTML = '';

    const ressources = [];
    snap.forEach(d => ressources.push({ id: d.id, ...d.data() }));

    const filtres = ressources.filter(r => {
      if (searchTerm && !(r.titre || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterMatiere !== 'all' && r.matiere !== filterMatiere) return false;
      if (filterType !== 'all' && r.type !== filterType) return false;
      return true;
    });

    if (filtres.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="icon">📚</span>
          <strong>Aucune ressource pour le moment.</strong><br>
          <small>Les ressources partagées par les professeurs apparaîtront ici.</small>
        </div>
      `;
      return;
    }

    filtres.forEach(r => grid.appendChild(creerCarteRessource(r)));
  }, (err) => {
    console.error('Erreur:', err);
    grid.innerHTML = `<div class="empty-state" style="color:var(--danger);">
      ⚠️ Erreur : ${escapeHtml(err.message)}
    </div>`;
  });
}

/* ============================================================
 *  CARTE RESSOURCE
 * ============================================================ */

function creerCarteRessource(res) {
  const card = document.createElement('div');
  card.className = 'resource-card';

  const mat = MATIERES[res.matiere] || { nom: res.matiere, icon: '📌' };
  const type = TYPES[res.type] || { nom: res.type, icon: '📄', classe: '' };
  const badge = obtenirBadgeRole(res.auteurRole);
  const peutSupprimer = currentUser.uid === res.auteurId || peutModerer(currentProfile);

  card.innerHTML = `
    <span class="resource-type-badge ${type.classe}">${type.icon} ${type.nom}</span>
    <h3>${escapeHtml(res.titre)}</h3>
    ${res.description ? `<p class="description">${escapeHtml(res.description)}</p>` : '<p class="description"></p>'}
    <div class="resource-meta">
      <span class="badge badge-mat">${mat.icon} ${mat.nom}</span>
      ${badge}
    </div>
    <div class="resource-meta">
      <span>👤 ${escapeHtml(res.auteurNom)}</span>
      <span>🕐 ${formatDate(res.date)}</span>
    </div>
    <div class="resource-meta">
      ${res.nbTelechargements ? `<span>📥 ${res.nbTelechargements} téléchargement${res.nbTelechargements > 1 ? 's' : ''}</span>` : '<span>📥 0 téléchargement</span>'}
    </div>
    <div class="resource-actions">
      <a href="${res.fichierUrl}" target="_blank" class="btn-download" data-action="download">
        📥 Télécharger
      </a>
      ${peutSupprimer ? `
        <button class="btn-delete" data-action="delete">🗑 Supprimer</button>
      ` : ''}
    </div>
  `;

  // Compteur téléchargements
  const dlBtn = card.querySelector('[data-action="download"]');
  if (dlBtn) {
    dlBtn.onclick = async () => {
      try {
        await updateDoc(doc(db, 'prof_resources', res.id), {
          nbTelechargements: increment(1)
        });
      } catch (err) { /* silencieux */ }
    };
  }

  // Suppression
  const delBtn = card.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement cette ressource ?')) return;
      try {
        await deleteDoc(doc(db, 'prof_resources', res.id));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  return card;
}

/* ============================================================
 *  BADGE DE RÔLE
 * ============================================================ */

function obtenirBadgeRole(role) {
  if (['admin', 'proviseur', 'censeur'].includes(role)) {
    return '<span class="badge badge-admin">Admin</span>';
  }
  if (['professeur', 'intendant'].includes(role)) {
    return '<span class="badge badge-prof">Prof</span>';
  }
  return '';
}

/* ============================================================
 *  ÉVÉNEMENTS
 * ============================================================ */

function attacherEvenements() {
  document.getElementById('search-bar').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    chargerRessources();
  });

  document.getElementById('filter-matiere').addEventListener('change', (e) => {
    filterMatiere = e.target.value;
    chargerRessources();
  });

  document.getElementById('filter-type').addEventListener('change', (e) => {
    filterType = e.target.value;
    chargerRessources();
  });

  document.getElementById('open-publish-modal').onclick = () => {
    document.getElementById('publish-modal').classList.add('show');
  };

  document.getElementById('cancel-publish').onclick = fermerModal;
  document.getElementById('confirm-publish').onclick = publierRessource;

  // Aperçu fichier
  const fi = document.getElementById('res-fichier');
  if (fi) {
    fi.addEventListener('change', () => {
      const preview = document.getElementById('res-fichier-preview');
      const f = fi.files[0];
      if (!f) { preview.innerHTML = ''; return; }
      const tailleMo = (f.size / 1024 / 1024).toFixed(2);
      preview.innerHTML = `📎 <strong>${f.name}</strong> (${tailleMo} Mo)`;
    });
  }
}

/* ============================================================
 *  FERMETURE MODAL
 * ============================================================ */

function fermerModal() {
  document.getElementById('publish-modal').classList.remove('show');
  document.getElementById('res-titre').value = '';
  document.getElementById('res-matiere').value = '';
  document.getElementById('res-type').value = '';
  document.getElementById('res-description').value = '';
  document.getElementById('res-fichier').value = '';
  document.getElementById('res-fichier-preview').innerHTML = '';
  document.getElementById('publish-status').textContent = '';
}

/* ============================================================
 *  PUBLICATION
 * ============================================================ */

async function publierRessource() {
  const btn = document.getElementById('confirm-publish');
  const status = document.getElementById('publish-status');

  const titre = document.getElementById('res-titre').value.trim();
  const matiere = document.getElementById('res-matiere').value;
  const type = document.getElementById('res-type').value;
  const description = document.getElementById('res-description').value.trim();
  const fichier = document.getElementById('res-fichier').files[0];

  if (!titre)     { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le titre est obligatoire.'; return; }
  if (!matiere)   { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis une matière.'; return; }
  if (!type)      { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Choisis un type.'; return; }
  if (!fichier)   { status.style.color = 'var(--danger)'; status.textContent = '⚠️ Le fichier est obligatoire.'; return; }
  if (fichier.size > TAILLE_MAX_FICHIER) {
    status.style.color = 'var(--danger)';
    status.textContent = '⚠️ Fichier trop volumineux (max 20 Mo).';
    return;
  }

  btn.disabled = true;
  btn.textContent = '📤 Upload...';
  status.textContent = '';

  try {
    const fd = new FormData();
    fd.append('file', fichier);
    fd.append('upload_preset', CLOUDINARY_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
      method: 'POST',
      body: fd
    });
    const data = await res.json();

    if (!data.secure_url) throw new Error("Échec de l'upload");

    await addDoc(collection(db, 'prof_resources'), {
      titre, matiere, type, description,
      fichierUrl: data.secure_url,
      fichierNom: fichier.name,
      fichierType: fichier.type,
      fichierTaille: fichier.size,
      auteurId: currentUser.uid,
      auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
      auteurRole: currentProfile.role,
      nbTelechargements: 0,
      date: serverTimestamp()
    });

    fermerModal();
    status.style.color = 'var(--success)';
    status.textContent = '✅ Ressource partagée !';
  } catch (err) {
    console.error(err);
    status.style.color = 'var(--danger)';
    status.textContent = '❌ Erreur : ' + err.message;
  }

  btn.disabled = false;
  btn.textContent = '📤 Partager';
}

console.log('✅ Espace Professeurs LFAKM chargé');