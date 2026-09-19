#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vérifie et corrige le menu Laboratoire dans les SEULS fichiers
qui doivent avoir le ruban public complet.

Fichiers cibles (4) :
- index.html
- historique.html
- actualites.html
- ressources.html

Usage : python fix_menu_labo.py
"""

import os
import re

# ============================================================
#  FICHIERS CIBLES
# ============================================================
FICHIERS_CIBLES = [
    'index.html',
    'historique.html',
    'actualites.html',
    'ressources.html',
]

# ============================================================
#  MENU LABORATOIRE À INSÉRER
# ============================================================
MENU_LABO = '''<li class="labo-item">
          <span class="labo-trigger">🔬 Laboratoire ▾</span>
          <div class="labo-dropdown">
            <a href="labo-pc.html">🔬 Labo PC (accueil)</a>
            <a href="simulateur-dosage.html">🧪 Dosage acido-basique</a>
            <a href="simulateur-circuits-libre.html">⚡ Atelier de circuits</a>
            <a href="simulateur-rc.html">⚡ RC — Condensateur</a>
            <a href="simulateur-rl.html">🌀 RL — Bobine</a>
            <a href="simulateur-lc.html">🌊 LC — Oscillant</a>
            <a href="simulateur-rlc.html">🌊 RLC libre</a>
            <a href="simulateur-rlc-forces.html">🎵 RLC forcé</a>
            <a href="simulateur-interferences.html">🎯 Optique / Young</a>
            <a href="simulateur-lentilles.html">🔭 Lentilles minces</a>
            <a href="labo-maths.html">📐 Labo Maths</a>
            <a href="labo-svt.html">🧬 Labo SVT</a>
          </div>
        </li>'''

# ============================================================
#  PATTERNS
# ============================================================
PATTERN_ACTU = re.compile(
    r'(<li><a href="actualites\.html">Actualités</a></li>)'
)

PATTERN_LABO = re.compile(
    r'<li class="labo-item">\s*<span class="labo-trigger">',
    re.DOTALL
)

PATTERN_RUBAN_PUBLIC = re.compile(
    r'<li><a href="actualites\.html">Actualités</a></li>'
)


def fixer_fichier(nom):
    if not os.path.exists(nom):
        print(f"⏭️  {nom} — fichier introuvable")
        return 'absent'
    
    try:
        with open(nom, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        print(f"❌ {nom} — Erreur lecture : {e}")
        return 'erreur'
    
    if not PATTERN_RUBAN_PUBLIC.search(contenu):
        print(f"⏭️  {nom} — ruban non public")
        return 'non_public'
    
    if PATTERN_LABO.search(contenu):
        print(f"✅ {nom} — déjà OK")
        return 'ok'
    
    nouveau_contenu, nb = PATTERN_ACTU.subn(
        r'\1\n        ' + MENU_LABO,
        contenu,
        count=1
    )
    
    if nb == 0:
        print(f"⚠️  {nom} — pattern non trouvé")
        return 'erreur'
    
    if 'style-menu.css' not in nouveau_contenu:
        nouveau_contenu = nouveau_contenu.replace(
            '</head>',
            '<link rel="stylesheet" href="style-menu.css">\n</head>',
            1
        )
        print(f"➕ {nom} — style-menu.css ajouté + menu Labo inséré")
    else:
        print(f"➕ {nom} — menu Labo inséré")
    
    try:
        with open(nom, 'w', encoding='utf-8') as f:
            f.write(nouveau_contenu)
        return 'ajoute'
    except Exception as e:
        print(f"❌ {nom} — Erreur écriture : {e}")
        return 'erreur'


def main():
    print("=" * 60)
    print("  🔬 FIX MENU LABORATOIRE — 4 fichiers ciblés")
    print("=" * 60 + "\n")
    
    print(f"📋 Fichiers à traiter : {len(FICHIERS_CIBLES)}")
    for f in FICHIERS_CIBLES:
        print(f"   • {f}")
    print()
    
    rapport = {'ok': [], 'ajoute': [], 'non_public': [], 'erreur': [], 'absent': []}
    
    for nom in FICHIERS_CIBLES:
        statut = fixer_fichier(nom)
        rapport[statut].append(nom)
    
    print("\n" + "=" * 60)
    print("  📊 RAPPORT FINAL")
    print("=" * 60)
    print(f"✅ Déjà OK              : {len(rapport['ok'])}")
    print(f"➕ Corrigés             : {len(rapport['ajoute'])}")
    print(f"⏭️  Non publics          : {len(rapport['non_public'])}")
    print(f"⚠️  Erreurs              : {len(rapport['erreur'])}")
    print(f"❌ Fichiers absents      : {len(rapport['absent'])}")
    
    if rapport['ajoute']:
        print("\n📝 Fichiers corrigés :")
        for f in rapport['ajoute']:
            print(f"   ✨ {f}")
    
    print("\n💡 Testez dans le navigateur avec Ctrl+F5.")
    print("   Puis publiez : git add . && git commit -m '...' && git push\n")


if __name__ == '__main__':
    main()