#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Déplace le <div class="menu-toggle"> AVANT le <a class="brand"> 
dans tous les fichiers HTML qui ont un header.
"""

import os
import re
import glob

def deplacer_burger(html):
    """Déplace le menu-toggle avant le brand."""
    
    # Pattern : capture le brand, puis le burger, et les échange
    # On cherche : <a class="brand">...</a> <div class="menu-toggle"...>...</div>
    pattern = re.compile(
        r'(<a\s+href="[^"]*"\s+class="brand">[\s\S]*?</a>)\s*(<div\s+class="menu-toggle"[^>]*>[\s\S]*?</div>)',
        re.DOTALL | re.IGNORECASE
    )
    
    def repl(m):
        brand = m.group(1)
        burger = m.group(2)
        return burger + '\n    ' + brand
    
    nouveau, nb = pattern.subn(repl, html)
    return nouveau, nb


def traiter_fichier(nom_fichier):
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"
    
    # Vérifier présence du burger et du brand
    if 'menu-toggle' not in contenu:
        return f"⏭️  {nom_fichier} — pas de burger"
    
    # Vérifier si déjà déplacé (burger avant brand)
    if re.search(r'<div\s+class="menu-toggle"[^>]*>[\s\S]*?</div>\s*<a\s+href="[^"]*"\s+class="brand">', contenu, re.DOTALL | re.IGNORECASE):
        return f"✅ {nom_fichier} — déjà déplacé"
    
    nouveau, nb = deplacer_burger(contenu)
    
    if nb == 0:
        return f"⏭️  {nom_fichier} — pattern non trouvé"
    
    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        return f"✅ {nom_fichier} — burger déplacé ({nb} fois)"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 60)
    print("  🔄 DÉPLACEMENT DU BURGER À GAUCHE")
    print("=" * 60 + "\n")
    
    fichiers = sorted(glob.glob('*.html'))
    if not fichiers:
        print("❌ Aucun fichier .html trouvé.")
        return
    
    print(f"📁 {len(fichiers)} fichier(s) trouvé(s)\n")
    
    ok = 0
    for fichier in fichiers:
        resultat = traiter_fichier(fichier)
        print(resultat)
        if resultat.startswith('✅'):
            ok += 1
    
    print("\n" + "=" * 60)
    print(f"  ✅ {ok} fichier(s) traité(s)")
    print("=" * 60)


if __name__ == '__main__':
    main()