/* ============================================================
 *  🏫 LFAKM — Page de lecture d'un article du blog
 *  Fichier : community/js/blog-article.js
 *  Rôle : article + commentaires riches + réponses imbriquées
 * ============================================================ */

import { 
  auth, db, onAuthStateChanged, getCurrentProfile, escapeHtml, formatDate,
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, 
  query, orderBy, serverTimestamp, peutModerer
} from './community-common.js';

/* ============================================================
 *  CONFIGURATION
 * ============================================================ */

const CATEGORIES = [
  { id: 'pedagogie',     nom: 'Pédagogie',     icon: '📚' },
  { id: 'vie-scolaire',  nom: 'Vie scolaire',  icon: '🏫' },
  { id: 'temoignages',   nom: 'Témoignages',   icon: '💬' },
  { id: 'projets',       nom: 'Projets',       icon: '🚀' },
  { id: 'actualites',    nom: 'Actualités',    icon: '📰' },
  { id: 'culture',       nom: 'Culture',       icon: '🎭' }
];

/* ============================================================
 *  LISTE D'EMOJIS
 * ============================================================ */

const EMOJIS = {
  'Visages': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  'Gestes': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄'],
  'Coeurs': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💯','💢','💥','💫','💦','💨','💬','💭'],
  'Objets': ['📚','📖','📝','✏️','🖊️','🖋️','📕','📗','📘','📙','📓','📔','📒','📄','📃','📑','📊','📈','📉','🗒️','🗓️','📅','📆','📇','📋','📁','📂','🗂️','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔑','🔨','⚒️','🛠️','⛏️','🔧','🔩','⚙️','🧰','🧲','⚗️','🧪','🧬','🔬','🔭','📡','💡','🔦','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🎫','🎟️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🎲','🎯','🎮','🧩'],
  'Symboles': ['✅','❌','❓','❗','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','⭐','🌟','✨','⚡','🔥','💧','🌊','🎉','🎊','🎈','🎁','🏁','🚩','🏴','⚠️','🚨','⛔','🚫','♻️','🔄','🔄','🔙','🔚','🔛','🔜','🔝']
};

/* ============================================================
 *  ÉTAT GLOBAL
 * ============================================================ */

let currentUser = null;
let currentProfile = null;
let articleId = null;
let unsubscribeComments = null;
let quillComment = null;

/* ============================================================
 *  AUTHENTIFICATION
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

  const params = new URLSearchParams(window.location.search);
  articleId = params.get('id');

  if (!articleId) {
    document.getElementById('article-container').innerHTML =
      '<div class="empty-state">⚠️ Aucun article spécifié.</div>';
    return;
  }

  chargerArticle();
  chargerCommentaires();
  initialiserQuillCommentaire();
  attacherFormulaire();
});

/* ============================================================
 *  CHARGEMENT DE L'ARTICLE
 * ============================================================ */

function chargerArticle() {
  const container = document.getElementById('article-container');

  onSnapshot(doc(db, 'blog_posts', articleId), (snap) => {
    if (!snap.exists()) {
      container.innerHTML = '<div class="empty-state">❌ Cet article n\'existe plus.</div>';
      document.getElementById('comments-section').style.display = 'none';
      return;
    }

    const article = snap.data();
    container.innerHTML = '';
    container.appendChild(creerArticle(articleId, article));

    document.getElementById('comments-section').style.display = 'block';
  });
}

/* ============================================================
 *  AFFICHAGE DE L'ARTICLE
 * ============================================================ */

function creerArticle(id, article) {
  const div = document.createElement('div');

  const cat = CATEGORIES.find(c => c.id === article.categorie);
  const badge = obtenirBadgeRole(article.auteurRole);
  const peutModifier = currentUser.uid === article.auteurId || peutModerer(currentProfile);

  div.innerHTML = `
    <div class="article-header">
      <h1>${escapeHtml(article.titre)}</h1>
      <div class="article-meta">
        <span>👤 <strong>${escapeHtml(article.auteurNom)}</strong></span>
        ${badge}
        ${cat ? `<span class="badge badge-cat">${cat.icon} ${cat.nom}</span>` : ''}
        <span>🕐 ${formatDate(article.date)}</span>
        ${article.dateModif ? '<span style="font-style:italic;">(modifié)</span>' : ''}
      </div>
      ${article.image ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.titre)}" class="article-image" onerror="this.style.display='none'">` : ''}
    </div>

    <div class="article-content ql-editor">${article.contenu || ''}</div>

    <!-- Boutons de partage -->
    <div style="margin-bottom:25px; padding:16px; background:#f9f7f2; border-radius:10px; border:1px solid var(--line);">
      <div style="font-size:12px; font-weight:700; color:var(--slate); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">
        📤 Partager cet article
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="share-btn share-whatsapp" data-reseau="whatsapp" style="background:#25D366; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700; font-size:12px;">💬 WhatsApp</button>
        <button class="share-btn share-facebook" data-reseau="facebook" style="background:#1877F2; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700; font-size:12px;">📘 Facebook</button>
        <button class="share-btn share-twitter" data-reseau="twitter" style="background:#000; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700; font-size:12px;">🐦 Twitter / X</button>
        <button class="share-btn share-linkedin" data-reseau="linkedin" style="background:#0A66C2; color:#fff; border:none; padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700; font-size:12px;">💼 LinkedIn</button>
        <button class="share-btn share-copy" data-reseau="copy" style="background:#f5f5f5; color:var(--ink); border:1px solid var(--line); padding:10px 16px; border-radius:6px; cursor:pointer; font-weight:700; font-size:12px;">🔗 Copier le lien</button>
      </div>
    </div>

    ${peutModifier ? `
      <div style="margin-bottom:25px; display:flex; gap:8px;">
        <button class="btn-delete" id="delete-article-btn" style="padding:10px 18px; font-size:13px;">🗑 Supprimer l'article</button>
      </div>
    ` : ''}
  `;

  // === Bouton Supprimer ===
  const delBtn = div.querySelector('#delete-article-btn');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement cet article ET ses commentaires ?')) return;
      try {
        const comments = collection(db, 'blog_posts', articleId, 'comments');
        const commentsList = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
          .then(m => m.getDocs(comments));
        for (const c of commentsList.docs) {
          await deleteDoc(c.ref);
        }
        await deleteDoc(doc(db, 'blog_posts', articleId));
        window.location.href = 'blog.html';
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  // === Boutons de partage ===
  const urlActuelle = window.location.href;
  const titreArticle = article.titre;

  div.querySelectorAll('.share-btn').forEach(btn => {
    btn.onclick = async () => {
      const reseau = btn.dataset.reseau;
      let shareUrl = '';

      if (reseau === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`📖 ${titreArticle}\n\n${urlActuelle}`)}`;
      } else if (reseau === 'facebook') {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlActuelle)}`;
      } else if (reseau === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`📖 ${titreArticle}`)}&url=${encodeURIComponent(urlActuelle)}`;
      } else if (reseau === 'linkedin') {
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(urlActuelle)}`;
      } else if (reseau === 'copy') {
        try {
          await navigator.clipboard.writeText(urlActuelle);
          btn.textContent = '✅ Lien copié !';
          setTimeout(() => {
            btn.innerHTML = '🔗 Copier le lien';
          }, 2000);
        } catch (err) {
          prompt('Copie ce lien :', urlActuelle);
        }
        return;
      }

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
      }
    };
  });

  return div;
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
  if (role === 'eleve') {
    return '<span class="badge badge-eleve">Élève</span>';
  }
  return '';
}

/* ============================================================
 *  CHARGEMENT DES COMMENTAIRES
 * ============================================================ */

function chargerCommentaires() {
  const list = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');

  const commentsRef = collection(db, 'blog_posts', articleId, 'comments');
  const q = query(commentsRef, orderBy('date', 'asc'));

  unsubscribeComments = onSnapshot(q, (snap) => {
    const comments = [];
    snap.forEach(d => comments.push({ id: d.id, ...d.data() }));

    countEl.textContent = comments.length;

    list.innerHTML = '';
    if (comments.length === 0) {
      list.innerHTML = '<div class="empty-state">Aucun commentaire. Sois le premier !</div>';
      return;
    }

    // Séparer parents et réponses
    const parents = comments.filter(c => !c.parentId);
    const reponses = comments.filter(c => c.parentId);

    parents.forEach(parent => {
      const parentCard = creerCommentaire(parent);

      // Trouver les réponses à ce commentaire
      const reponsesEnfant = reponses.filter(r => r.parentId === parent.id);

      if (reponsesEnfant.length > 0) {
        const reponsesContainer = document.createElement('div');
        reponsesContainer.style.cssText = 'margin-left:30px; margin-top:10px; padding-left:15px; border-left:3px solid var(--brass);';

        reponsesEnfant.forEach(reponse => {
          const reponseCard = creerCommentaire(reponse);
          reponseCard.style.background = '#fafafa';
          reponsesContainer.appendChild(reponseCard);
        });

        parentCard.appendChild(reponsesContainer);
      }

      list.appendChild(parentCard);
    });
  });
}

/* ============================================================
 *  CRÉATION D'UN COMMENTAIRE
 * ============================================================ */

function creerCommentaire(comment) {
  const div = document.createElement('div');
  div.className = 'comment-card';

  const badge = obtenirBadgeRole(comment.auteurRole);
  const peutSupprimer = currentUser.uid === comment.auteurId || peutModerer(currentProfile);

  div.innerHTML = `
    <div class="comment-header">
      <span><strong>${escapeHtml(comment.auteurNom)}</strong> ${badge}</span>
      <span>🕐 ${formatDate(comment.date)}</span>
    </div>
    <div class="comment-content ql-editor" style="padding:0; background:transparent; border:none;">${comment.contenu || ''}</div>
    <div class="comment-actions">
      <button class="btn-reply" data-action="reply" style="background:transparent; border:1px solid var(--line); color:var(--slate); padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-family:var(--sans); margin-right:6px;">💬 Répondre</button>
      ${peutSupprimer ? `
        <button class="btn-delete" data-action="delete">🗑 Supprimer</button>
      ` : ''}
    </div>
    <div class="reply-form-container" data-role="reply-container" style="display:none; margin-top:12px; padding:12px; background:#f9f7f2; border-radius:8px;"></div>
  `;

  // Bouton SUPPRIMER
  const delBtn = div.querySelector('[data-action="delete"]');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer ce commentaire ?')) return;
      try {
        await deleteDoc(doc(db, 'blog_posts', articleId, 'comments', comment.id));
      } catch (err) {
        alert('Erreur : ' + err.message);
      }
    };
  }

  // === Bouton RÉPONDRE ===
  const replyBtn = div.querySelector('[data-action="reply"]');
  const replyContainer = div.querySelector('[data-role="reply-container"]');

  if (replyBtn && replyContainer) {
    replyBtn.onclick = () => {
      // Toggle
      if (replyContainer.style.display === 'block') {
        replyContainer.style.display = 'none';
        return;
      }

      replyContainer.style.display = 'block';
      replyContainer.innerHTML = `
        <div data-role="reply-quill" style="background:#fff; border-radius:6px; min-height:80px; margin-bottom:8px;"></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <button class="btn-primary" data-role="reply-publish" style="font-size:12px; padding:8px 16px;">📤 Publier la réponse</button>
          <button class="btn-emoji" data-role="reply-emoji" style="background:#f5f5f5; border:1px solid var(--line); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:14px;">😀</button>
          <button class="btn-ghost" data-role="reply-cancel" style="font-size:12px; padding:8px 16px; background:transparent; border:1px solid var(--line); border-radius:6px; cursor:pointer; color:var(--slate);">Annuler</button>
        </div>
        <div data-role="reply-emoji-picker" style="display:none; margin-top:8px; padding:12px; background:#fff; border:1px solid var(--line); border-radius:8px; max-width:400px;"></div>
        <div data-role="reply-status" style="margin-top:6px; font-size:12px;"></div>
      `;

      // Initialiser Quill pour la réponse
      const replyQuillEl = replyContainer.querySelector('[data-role="reply-quill"]');
      let replyQuill = null;
      if (replyQuillEl && typeof Quill !== 'undefined') {
        replyQuill = new Quill(replyQuillEl, {
          theme: 'snow',
          placeholder: 'Écris ta réponse...',
          modules: {
            toolbar: [
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'list': 'ordered' }, { 'list': 'bullet' }],
              ['link'],
              ['clean']
            ]
          }
        });
      }

      // Bouton emoji
      const replyEmojiBtn = replyContainer.querySelector('[data-role="reply-emoji"]');
      const replyEmojiPicker = replyContainer.querySelector('[data-role="reply-emoji-picker"]');
      if (replyEmojiBtn && replyEmojiPicker && replyQuill) {
        replyEmojiBtn.onclick = (e) => {
          e.preventDefault();
          if (replyEmojiPicker.style.display === 'none' || !replyEmojiPicker.style.display) {
            afficherEmojis(replyEmojiPicker, replyQuill);
            replyEmojiPicker.style.display = 'block';
          } else {
            replyEmojiPicker.style.display = 'none';
          }
        };
      }

      // Annuler
      replyContainer.querySelector('[data-role="reply-cancel"]').onclick = () => {
        replyContainer.style.display = 'none';
        replyContainer.innerHTML = '';
      };

      // Publier
      replyContainer.querySelector('[data-role="reply-publish"]').onclick = async () => {
        const contenuHtml = replyQuill ? replyQuill.root.innerHTML.trim() : '';
        const contenuTexte = replyQuill ? replyQuill.getText().trim() : '';
        const status = replyContainer.querySelector('[data-role="reply-status"]');

        if (!contenuTexte || contenuTexte.length === 0) {
          status.style.color = 'var(--danger)';
          status.textContent = '⚠️ Écris quelque chose.';
          return;
        }
        if (contenuTexte.length > 1000) {
          status.style.color = 'var(--danger)';
          status.textContent = '⚠️ Trop long (max 1000).';
          return;
        }

        try {
          await addDoc(collection(db, 'blog_posts', articleId, 'comments'), {
            contenu: contenuHtml,
            contenuTexte: contenuTexte,
            parentId: comment.id,
            auteurId: currentUser.uid,
            auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
            auteurRole: currentProfile.role,
            date: serverTimestamp()
          });

          // Notifier l'auteur du commentaire parent
          if (comment.auteurId && comment.auteurId !== currentUser.uid) {
            try {
              const { creerNotification } = await import('./notifications.js');
              await creerNotification({
                destinataireId: comment.auteurId,
                type: 'commentaire',
                message: `a répondu à ton commentaire`,
                lien: `blog-article.html?id=${articleId}`,
                auteurId: currentUser.uid,
                auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`
              });
            } catch (notifErr) {
              console.warn('Erreur notification:', notifErr);
            }
          }

          replyContainer.style.display = 'none';
          replyContainer.innerHTML = '';
        } catch (err) {
          status.style.color = 'var(--danger)';
          status.textContent = '❌ Erreur : ' + err.message;
        }
      };
    };
  }

  return div;
}

/* ============================================================
 *  INITIALISER QUILL POUR LES COMMENTAIRES PRINCIPAUX
 * ============================================================ */

function initialiserQuillCommentaire() {
  const editorEl = document.getElementById('quill-comment');
  if (!editorEl || typeof Quill === 'undefined') {
    console.warn('Quill non disponible pour les commentaires');
    return;
  }

  quillComment = new Quill('#quill-comment', {
    theme: 'snow',
    placeholder: 'Ton commentaire...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'link'],
        ['clean']
      ]
    }
  });

  // Bouton emoji
  const emojiBtn = document.getElementById('btn-emoji-comment');
  const emojiPicker = document.getElementById('emoji-picker-comment');
  if (emojiBtn && emojiPicker) {
    emojiBtn.onclick = (e) => {
      e.preventDefault();
      if (emojiPicker.style.display === 'none' || !emojiPicker.style.display) {
        afficherEmojis(emojiPicker, quillComment);
        emojiPicker.style.display = 'block';
      } else {
        emojiPicker.style.display = 'none';
      }
    };
  }
}

/* ============================================================
 *  AFFICHER LES EMOJIS
 * ============================================================ */

function afficherEmojis(container, quillInstance) {
  let html = '<div class="emoji-grid">';
  for (const [categorie, emojis] of Object.entries(EMOJIS)) {
    html += `<div class="emoji-category">${categorie}</div>`;
    emojis.forEach(e => {
      html += `<button class="emoji-btn" data-emoji="${e}">${e}</button>`;
    });
  }
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.onclick = (ev) => {
      ev.preventDefault();
      const emoji = btn.dataset.emoji;
      const range = quillInstance.getSelection(true);
      quillInstance.insertText(range.index, emoji);
      quillInstance.setSelection(range.index + emoji.length);
    };
  });
}

/* ============================================================
 *  FORMULAIRE DE COMMENTAIRE PRINCIPAL
 * ============================================================ */

function attacherFormulaire() {
  const btn = document.getElementById('publish-comment-btn');
  const status = document.getElementById('comment-status');

  if (!btn) return;

  btn.onclick = async () => {
    const contenuHtml = quillComment ? quillComment.root.innerHTML.trim() : '';
    const contenuTexte = quillComment ? quillComment.getText().trim() : '';

    if (!contenuTexte || contenuTexte.length === 0) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Écris un commentaire.';
      return;
    }
    if (contenuTexte.length > 1000) {
      status.style.color = 'var(--danger)';
      status.textContent = '⚠️ Trop long (max 1000).';
      return;
    }

    btn.disabled = true;
    btn.textContent = '📤 Publication...';

    try {
      await addDoc(collection(db, 'blog_posts', articleId, 'comments'), {
        contenu: contenuHtml,
        contenuTexte: contenuTexte,
        auteurId: currentUser.uid,
        auteurNom: `${currentProfile.prenom} ${currentProfile.nom}`,
        auteurRole: currentProfile.role,
        date: serverTimestamp()
      });

      // Reset
      if (quillComment) quillComment.root.innerHTML = '';
      const picker = document.getElementById('emoji-picker-comment');
      if (picker) picker.style.display = 'none';

      status.style.color = 'var(--success)';
      status.textContent = '✅ Commentaire publié !';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      status.style.color = 'var(--danger)';
      status.textContent = '❌ Erreur : ' + err.message;
    }

    btn.disabled = false;
    btn.textContent = '📤 Publier le commentaire';
  };
}

console.log('✅ Page article LFAKM chargée');