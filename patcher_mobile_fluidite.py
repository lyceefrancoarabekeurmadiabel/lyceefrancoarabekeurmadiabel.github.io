#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patcher_mobile_fluidite.py

Patche automatiquement TOUS les simulateurs mobile avec :
- CSS fluidité (overscroll, user-select, touch-action, feedback tap)
- JS universel (vibrer, no-scroll, anti-zoom, anti-pull-to-refresh)
- Appels vibrer() avant jouerSon()
- activerNoScroll()/desactiverNoScroll() dans handleTouchStart/End

Sauvegarde chaque fichier en .bak avant modification.
"""

import re
import shutil
from pathlib import Path
from datetime import datetime

# ============================================================
#  CONFIGURATION
# ============================================================
RACINE = Path(__file__).parent.resolve()

# Dossiers où chercher les simulateurs mobile
DOSSIERS_MOBILE = ['simulateurs-mobile', 'mobile']

# Suffixe pour identifier un fichier mobile
SUFFIXE_MOBILE = '-mobile.html'

BACKUP_DIR = RACINE / f"_backup_patch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"


# ============================================================
#  BLOCS À INSÉRER
# ============================================================
CSS_PATCH = """
/* ============================================================
   ✅ PATCH FLUIDITÉ MOBILE — LFAKM (auto-généré)
   ============================================================ */

html, body {
  overscroll-behavior: none;
  overscroll-behavior-y: contain;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
canvas, .canvas-zone, .canvas-montage, .canvas-wrapper {
  touch-action: none;
  -webkit-user-drag: none;
  -webkit-user-select: none;
  user-select: none;
}
button, .btn, .outil-btn, .radio-btn, .tab, .tab-mobile,
.sous-onglet, .mode-courbe-btn, .bascule-btn, .composant-card,
.source-btn, .appli-btn, .qcm-option, .qcm-btn-valider,
.btn-action, .btn-courbe, .btn-mini, .btn-secondary, .btn-primary {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.1s ease, background 0.15s ease,
              border-color 0.15s ease, opacity 0.15s ease;
}
button:active:not(:disabled),
.btn:active:not(:disabled),
.outil-btn:active:not(.used),
.radio-btn:active,
.tab:active,
.tab-mobile:active,
.sous-onglet:active,
.mode-courbe-btn:active:not(.active),
.bascule-btn:active,
.composant-card:active,
.source-btn:active,
.appli-btn:active,
.qcm-option:active:not(:disabled),
.qcm-btn-valider:active:not(:disabled),
.btn-action:active:not(:disabled),
.btn-courbe:active:not(:disabled),
.btn-mini:active,
.btn-secondary:active,
.btn-primary:active:not(:disabled) {
  transform: scale(0.95);
}
button, .btn, .outil-btn, .radio-btn, .tab, .tab-mobile,
.sous-onglet, .bascule-btn, .composant-card, .source-btn,
.appli-btn, .qcm-option {
  min-height: 44px;
}
.tabs-mobile, .sous-onglets, .source-picker, .steps-container,
.bascule-tabs, .bascule-container {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 36px;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.15);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brass, #A8853F);
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  margin-top: -10px;
}
input[type="range"]::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.15);
}
input[type="range"]::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brass, #A8853F);
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
input[type="text"], input[type="number"], input[type="search"],
select, textarea {
  font-size: 16px;
  min-height: 44px;
}
@media screen and (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
body.no-scroll {
  overflow: hidden !important;
  touch-action: none;
}
"""

JS_PATCH = """
// ============================================================
//  ✅ PATCH FLUIDITÉ MOBILE — LFAKM (auto-généré)
// ============================================================

function vibrer(duree = 10) {
  if (navigator.vibrate && typeof sonActif === 'undefined') {
    try { navigator.vibrate(duree); } catch(e) {}
  } else if (navigator.vibrate && sonActif) {
    try { navigator.vibrate(duree); } catch(e) {}
  }
}

function activerNoScroll() {
  document.body.classList.add('no-scroll');
}
function desactiverNoScroll() {
  document.body.classList.remove('no-scroll');
}

document.addEventListener('touchmove', function(e) {
  const el = e.target;
  if (el.closest('input, textarea, select, .table-wrapper, .sous-onglets, .tabs-mobile, .source-picker')) {
    return;
  }
  if (el.closest('canvas')) {
    e.preventDefault();
    return;
  }
}, { passive: false });

let _lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  if (now - _lastTouchEnd <= 300) {
    e.preventDefault();
  }
  _lastTouchEnd = now;
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
  e.preventDefault();
});

document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('dragstart', function(e) {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
  }
});

console.log('✅ Patch fluidité mobile chargé');
"""


# ============================================================
#  FONCTIONS DE PATCH
# ============================================================
def sauvegarder_fichier(fichier: Path):
    """Copie le fichier en .bak dans le backup central."""
    rel = fichier.relative_to(RACINE)
    dest = BACKUP_DIR / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(fichier, dest)


def injecter_css(contenu: str) -> str:
    """Insère le CSS avant </style> (le dernier trouvé)."""
    if 'PATCH FLUIDITÉ MOBILE' in contenu:
        return contenu  # déjà patché
    # Trouver le dernier </style>
    pos = contenu.rfind('</style>')
    if pos == -1:
        return contenu
    return contenu[:pos] + CSS_PATCH + '\n' + contenu[pos:]


def injecter_js(contenu: str) -> str:
    """Insère le JS juste après le premier <script> contenant du code."""
    if 'PATCH FLUIDITÉ MOBILE' in contenu and 'function vibrer' in contenu:
        return contenu  # déjà patché

    # Trouver le dernier <script> avant </body>
    # (pour éviter les <script src="..."> qui n'ont pas de contenu inline)
    patterns = re.finditer(r'<script\b[^>]*>', contenu)
    meilleur_pos = -1
    for match in patterns:
        # Vérifier qu'il y a du contenu après (pas juste src=)
        after = contenu[match.end():match.end()+200]
        if 'src=' not in contenu[match.start():match.end()]:
            # C'est un <script> inline
            meilleur_pos = match.end()

    if meilleur_pos == -1:
        # Fallback : premier <script>
        match = re.search(r'<script\b[^>]*>', contenu)
        if not match:
            return contenu
        meilleur_pos = match.end()

    return contenu[:meilleur_pos] + '\n' + JS_PATCH + '\n' + contenu[meilleur_pos:]


def ajouter_vibrations(contenu: str) -> str:
    """Ajoute vibrer() avant chaque jouerSon().
       Version corrigée : supprime les vibrer() existants d'abord
       pour éviter le look-behind de largeur variable."""
    mapping = {
        "'pose'":    'vibrer(15);\n  ',
        "'connect'": 'vibrer(10);\n  ',
        "'valide'":  'vibrer([20, 30, 20]);\n  ',
        "'erreur'":  'vibrer([50, 30, 50]);\n  ',
        "'jingle'":  'vibrer([30, 50, 30, 50, 100]);\n  ',
    }

    # Étape 1 : supprimer TOUS les vibrer(...) existants
    # (mais PAS la définition de la fonction vibrer elle-même)
    contenu = re.sub(
        r'^\s*vibrer\([^)]*\);\s*$',
        '',
        contenu,
        flags=re.MULTILINE
    )

    # Étape 2 : ajouter vibrer() avant chaque jouerSon(...)
    for son, vibration in mapping.items():
        # Insertion simple : on remplace "jouerSon('pose')" par "vibrer(...); jouerSon('pose')"
        # en utilisant une regex SANS look-behind
        pattern = re.escape(f'jouerSon({son})')
        remplacement = vibration.strip() + ' ' + f'jouerSon({son})'
        contenu = re.sub(pattern, remplacement, contenu)

    return contenu


def ajouter_noscroll_handlers(contenu: str) -> str:
    """Ajoute activerNoScroll() au début de handleTouchStart
       et desactiverNoScroll() au début de handleTouchEnd."""
    # handleTouchStart
    pattern_start = r'(function handleTouchStart\s*\([^)]*\)\s*\{)'
    if re.search(pattern_start, contenu) and 'activerNoScroll();' not in contenu[:20000]:
        contenu = re.sub(
            pattern_start,
            r'\1\n  activerNoScroll();',
            contenu,
            count=1
        )
    # handleTouchEnd
    pattern_end = r'(function handleTouchEnd\s*\([^)]*\)\s*\{)'
    if re.search(pattern_end, contenu) and 'desactiverNoScroll();' not in contenu[:20000]:
        contenu = re.sub(
            pattern_end,
            r'\1\n  desactiverNoScroll();',
            contenu,
            count=1
        )
    return contenu


def patcher_fichier(fichier: Path) -> bool:
    """Patche un fichier. Retourne True si modifié."""
    print(f"\n📄 {fichier.relative_to(RACINE)}")

    contenu_original = fichier.read_text(encoding='utf-8')
    contenu = contenu_original

    # 1. CSS
    avant = contenu
    contenu = injecter_css(contenu)
    if contenu != avant:
        print("   ✅ CSS fluidité inséré")
    else:
        print("   ⏭️  CSS déjà présent ou </style> introuvable")

    # 2. JS
    avant = contenu
    contenu = injecter_js(contenu)
    if contenu != avant:
        print("   ✅ JS fluidité inséré")
    else:
        print("   ⏭️  JS déjà présent ou <script> introuvable")

    # 3. Vibrations
    avant = contenu
    contenu = ajouter_vibrations(contenu)
    if contenu != avant:
        print("   ✅ Vibrations ajoutées aux jouerSon()")
    else:
        print("   ⏭️  Aucune vibration ajoutée")

    # 4. no-scroll handlers
    avant = contenu
    contenu = ajouter_noscroll_handlers(contenu)
    if contenu != avant:
        print("   ✅ Handlers no-scroll ajoutés")
    else:
        print("   ⏭️  Handlers déjà présents ou non trouvés")

    # Sauvegarde + écriture
    if contenu != contenu_original:
        sauvegarder_fichier(fichier)
        fichier.write_text(contenu, encoding='utf-8')
        return True
    return False


# ============================================================
#  MAIN
# ============================================================
def main():
    print("=" * 60)
    print("🔧 PATCH FLUIDITÉ MOBILE — LFAKM")
    print("=" * 60)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n📦 Backup : {BACKUP_DIR.name}/")

    # Trouver tous les simulateurs mobile
    fichiers_mobile = []
    for dossier in DOSSIERS_MOBILE:
        chemin = RACINE / dossier
        if chemin.exists():
            fichiers_mobile.extend(sorted(chemin.glob(f'*{SUFFIXE_MOBILE}')))
            # Chercher aussi récursivement
            fichiers_mobile.extend(sorted(chemin.rglob(f'*{SUFFIXE_MOBILE}')))

    # Fallback : chercher à la racine
    fichiers_mobile.extend(sorted(RACINE.glob(f'*{SUFFIXE_MOBILE}')))

    # Dédoublonner
    fichiers_mobile = list(set(fichiers_mobile))

    if not fichiers_mobile:
        print("\n❌ Aucun fichier *-mobile.html trouvé.")
        print("   Vérifie que tu es bien à la racine du projet.")
        return

    print(f"\n📱 {len(fichiers_mobile)} simulateur(s) mobile trouvé(s) :")
    for f in fichiers_mobile:
        print(f"   • {f.relative_to(RACINE)}")

    reponse = input(f"\n⚠️  Patcher ces {len(fichiers_mobile)} fichiers ? (o/n) : ").strip().lower()
    if reponse != 'o':
        print("❌ Annulé.")
        return

    # Patch
    modifies = 0
    for fichier in fichiers_mobile:
        if patcher_fichier(fichier):
            modifies += 1

    print("\n" + "=" * 60)
    print(f"🎉 TERMINÉ : {modifies}/{len(fichiers_mobile)} fichier(s) modifié(s)")
    print("=" * 60)
    print(f"\n📦 Backup disponible dans : {BACKUP_DIR.name}/")
    print("\n🚀 Prochaines étapes :")
    print("   1. Ouvre un simulateur mobile dans le navigateur")
    print("   2. Teste :")
    print("      • Tap sur boutons → feedback visuel (scale)")
    print("      • Tap sur canvas → drag fluide, pas de scroll page")
    print("      • Vibrations (si supporté sur mobile)")
    print("   3. Si tout va bien : git add . && git commit")
    print("\n⚠️  Si problème, restaure depuis le backup :")
    print(f"   cp -r {BACKUP_DIR.name}/* .")


if __name__ == '__main__':
    main()