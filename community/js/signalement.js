/* ============================================================
 *  🏫 LFAKM — Bouton signalement global
 *  Fichier : community/js/signalement.js
 * ============================================================ */

import { 
  auth, db, collection, addDoc, serverTimestamp 
} from './community-common.js';

/**
 * Ouvre un modal pour signaler un contenu
 * @param {string} cibleType - 'thread' | 'reply' | 'blog_post' | 'blog_comment' | 'prof_resource'
 * @param {string} cibleId - ID du contenu
 * @param {string} parentId - ID du parent (thread pour reply, article pour blog_comment) ou null
 * @param {string} cibleTitre - Titre du contenu
 * @param {string} cibleApercu - Aperçu du contenu (texte brut)
 */
window.ouvrirModalSignalement = function(cibleType, cibleId, parentId, cibleTitre, cibleApercu) {
  // Créer le modal
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(16,25,46,0.75);
    z-index: 3000; display: flex; align-items: center; justify-content: center;
    padding: 20px; overflow-y: auto;
  `;

  overlay.innerHTML = `
    <div style="background: #fff; border-radius: 12px; padding: 28px; max-width: 480px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
      <h2 style="font-family: var(--serif); color: var(--ink); margin-bottom: 8px; font-size: 22px;">🚩 Signaler un contenu</h2>
      <p style="font-size: 13px; color: var(--slate); margin-bottom: 20px;">
        Tu signalerais ce contenu à l'administration du lycée. Sois respectueux et honnête.
      </p>

      <div style="background: #f9f7f2; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: var(--slate); border-left: 3px solid var(--brass);">
        <strong style="color: var(--ink);">Contenu signalé :</strong><br>
        ${escapeHtml(cibleTitre || '').substring(0, 100)}${(cibleTitre || '').length > 100 ? '...' : ''}
      </div>

      <label style="display: block; font-size: 12px; font-weight: 700; color: var(--slate); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
        Raison du signalement
      </label>
      <select id="signal-raison-select" style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--sans); font-size: 14px; margin-bottom: 12px; background: #fff;">
        <option value="">— Choisir une raison —</option>
        <option value="Contenu irrespectueux ou insultant">😠 Contenu irrespectueux</option>
        <option value="Harcèlement ou intimidation">😨 Harcèlement</option>
        <option value="Spam ou publicité">📢 Spam / Publicité</option>
        <option value="Contenu inapproprié">🚫 Contenu inapproprié</option>
        <option value="Fausse information">❌ Fausse information</option>
        <option value="Autre">📌 Autre</option>
      </select>

      <textarea id="signal-details" placeholder="Détails supplémentaires (facultatif, max 500 caractères)" maxlength="500" style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 6px; font-family: var(--sans); font-size: 14px; min-height: 80px; resize: vertical; margin-bottom: 20px;"></textarea>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="signal-cancel" style="background: transparent; border: 1px solid var(--line); color: var(--slate); padding: 11px 20px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; font-family: var(--sans);">
          Annuler
        </button>
        <button id="signal-confirm" style="background: var(--danger); color: #fff; border: none; padding: 11px 20px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; font-family: var(--sans);">
          🚩 Envoyer le signalement
        </button>
      </div>
      <div id="signal-status" style="margin-top: 10px; font-size: 12px;"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Récupérer les infos utilisateur
  const user = auth.currentUser;

  // Fermer
  overlay.querySelector('#signal-cancel').onclick = () => overlay.remove();

  // Envoyer
  overlay.querySelector('#signal-confirm').onclick = async () => {
    const raisonSelect = overlay.querySelector('#signal-raison-select').value;
    const details = overlay.querySelector('#signal-details').value.trim();
    const status = overlay.querySelector('#signal-status');

    if (!raisonSelect) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Choisis une raison.';
      return;
    }

    const raison = details ? `${raisonSelect} — ${details}` : raisonSelect;

    const btn = overlay.querySelector('#signal-confirm');
    btn.disabled = true;
    btn.textContent = '⏳ Envoi...';

    try {
      // Récupérer le profil
      const { getCurrentProfile } = await import('./community-common.js');
      const profile = await getCurrentProfile(user);

      await addDoc(collection(db, 'signalements'), {
        cibleType,
        cibleId,
        parentId: parentId || null,
        cibleTitre: cibleTitre || '',
        cibleApercu: (cibleApercu || '').substring(0, 200),
        raison,
        signaleurId: user.uid,
        signaleurNom: profile ? `${profile.prenom} ${profile.nom}` : 'Anonyme',
        signaleurRole: profile ? profile.role : '',
        statut: 'en_attente',
        date: serverTimestamp()
      });

      overlay.remove();

      // Message de confirmation
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: var(--success); color: #fff; padding: 12px 24px;
        border-radius: 8px; font-weight: 700; font-size: 14px; z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      `;
      toast.textContent = '✅ Signalement envoyé à l\'administration';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
      btn.disabled = false;
      btn.textContent = '🚩 Envoyer le signalement';
    }
  };
};

// Helper escapeHtml
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}