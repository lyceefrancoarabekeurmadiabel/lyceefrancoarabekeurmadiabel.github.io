#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration : remplace les 7 liens Labo par un menu déroulant "Laboratoire".
Style cohérent avec le dropdown Optique existant dans style-menu.css.
Usage : python migrate_menu_labo.py
"""

import os
import re
import glob

# ============================================================
#  1. LE MOTIF À RECHERCHER (bloc des 7 <li> labo)
# ============================================================
PATTERN_LABO = re.compile(
    r'\s*<li class="labo-pc-item">\s*<a href="labo-pc\.html"[^>]*>🔬 Labo PC</a>\s*</li>'
    r'\s*<li class="labo-pc-item">\s*<a href="simulateur-dosage\.html"[^>]*>🧪 Dosage</a>\s*</li>'
    r'\s*<li class="labo-pc-item">\s*<a href="simulateur-circuits\.html"[^>]*>⚡ Circuits</a>\s*</li>'
    r'\s*<li class="labo-pc-item">\s*<a href="simulateur-interferences\.html"[^>]*>🎯 Optique</a>\s*</li>'
    r'\s*<li class="labo-pc-item">\s*<a href="simulateur-lentilles\.html"[^>]*>🔭 Lentilles</a>\s*</li>'
    r'\s*<li class="labo-maths-item">\s*<a href="labo-maths\.html"[^>]*>📐 Labo Maths</a>\s*</li>'
    r'\s*<li class="labo-svt-item">\s*<a href="labo-svt\.html"[^>]*>🧬 Labo SVT</a>\s*</li>',
    re.MULTILINE
)

# ============================================================
#  2. LE REMPLACEMENT (menu déroulant Laboratoire)
# ============================================================
REMPLACEMENT_LABO = '''
        <li class="labo-item">
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
#  3. CSS À AJOUTER DANS style-menu.css (même style que Optique)
# ============================================================
CSS_LABO = '''

/* ============================================================ */
/* 🔬 Menu déroulant Laboratoire                                  */
/* ============================================================ */
.labo-item { position: relative; }
.labo-trigger {
  color: var(--brass, #A8853F);
  font-weight: 700;
  cursor: pointer;
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  transition: background 0.2s;
}
.labo-trigger:hover { background: rgba(168, 133, 63, 0.15); }

.labo-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border: 1px solid rgba(27,42,74,0.14);
  border-radius: 6px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  min-width: 240px;
  z-index: 100;
  padding: 5px 0;
}
.labo-dropdown a {
  display: block;
  padding: 10px 15px;
  color: #1B2A4A;
  font-size: 13px;
  text-decoration: none;
  transition: background 0.15s;
  white-space: nowrap;
}
.labo-dropdown a:hover { background: #fdf8ee; color: var(--brass, #A8853F); }
.labo-item:hover .labo-dropdown { display: block; }

@media (max-width: 1024px) {
  .labo-dropdown { position: static; box-shadow: none; border: none; }
}
'''

# ============================================================
#  4. EXÉCUTION
# ============================================================
def migrer_fichiers():
    fichiers_modifies = []
    fichiers_html = sorted(glob.glob('*.html'))
    
    print(f"📁 {len(fichiers_html)} fichiers HTML trouvés\n")
    
    for fichier in fichiers_html:
        try:
            with open(fichier, 'r', encoding='utf-8') as f:
                contenu = f.read()
            
            nouveau_contenu, nb = PATTERN_LABO.subn(REMPLACEMENT_LABO, contenu)
            
            if nb > 0:
                with open(fichier, 'w', encoding='utf-8') as f:
                    f.write(nouveau_contenu)
                fichiers_modifies.append(fichier)
                print(f"✅ {fichier} — {nb} bloc(s) remplacé(s)")
            else:
                print(f"⏭️  {fichier} — pas de bloc labo trouvé")
        except Exception as e:
            print(f"❌ {fichier} — Erreur : {e}")
    
    print(f"\n📊 Résumé : {len(fichiers_modifies)} fichier(s) modifié(s)")
    return fichiers_modifies


def ajouter_css():
    if not os.path.exists('style-menu.css'):
        print("❌ style-menu.css introuvable !")
        return
    
    with open('style-menu.css', 'r', encoding='utf-8') as f:
        contenu = f.read()
    
    if '.labo-trigger' not in contenu:
        with open('style-menu.css', 'a', encoding='utf-8') as f:
            f.write(CSS_LABO)
        print("✅ CSS du menu Laboratoire ajouté à style-menu.css")
    else:
        print("⏭️  CSS déjà présent dans style-menu.css")


if __name__ == '__main__':
    print("=" * 60)
    print("  🔬 MIGRATION MENU LABORATOIRE")
    print("=" * 60 + "\n")
    
    print("📌 ÉTAPE 1 : Remplacement des 7 <li> par le dropdown")
    print("-" * 60)
    migrer_fichiers()
    
    print("\n📌 ÉTAPE 2 : Ajout du CSS dans style-menu.css")
    print("-" * 60)
    ajouter_css()
    
    print("\n" + "=" * 60)
    print("  ✅ MIGRATION TERMINÉE")
    print("=" * 60)
    print("\n💡 Testez dans le navigateur avec Ctrl+F5.")
    print("   Si problème : restaurez depuis votre sauvegarde.\n")