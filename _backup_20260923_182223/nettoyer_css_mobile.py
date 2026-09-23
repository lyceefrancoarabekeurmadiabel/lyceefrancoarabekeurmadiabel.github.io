#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Retire les blocs CSS @media (max-width: 1024px) qui entrent en conflit
avec style-menu.css sur les pages HTML.

Usage : python nettoyer_css_mobile.py
"""

import os
import glob
import re

FICHIERS_IGNORES = [
    'admin-gestion.html',
    'admin-ine.html',
    'admin-news.html',
    'feedback.html',
    'test_assistant.html',
]

def nettoyer_fichier(chemin):
    try:
        with open(chemin, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {chemin} — Erreur lecture : {e}"
    
    original = contenu
    
    # Retire les blocs @media (max-width: 1024px) { ... } dans les <style>
    # On cible précisément les règles conflictuelles
    pattern_media = re.compile(
        r'@media\s*\(\s*max-width\s*:\s*1024px\s*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',
        re.DOTALL
    )
    
    # Retire tous les blocs @media max-width: 1024px
    contenu = pattern_media.sub('', contenu)
    
    # Nettoie les lignes vides multiples
    contenu = re.sub(r'\n\s*\n\s*\n+', '\n\n', contenu)
    
    if contenu == original:
        return f"⏭️  {chemin} — rien à nettoyer"
    
    try:
        with open(chemin, 'w', encoding='utf-8') as f:
            f.write(contenu)
        return f"✅ {chemin} — CSS mobile retiré"
    except Exception as e:
        return f"❌ {chemin} — Erreur écriture : {e}"


def main():
    print("=" * 65)
    print("  🧹 NETTOYAGE DES CSS MOBILES CONFLICTUELS")
    print("=" * 65 + "\n")
    
    fichiers = sorted(glob.glob('*.html'))
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]
    
    if not fichiers:
        print("❌ Aucun fichier HTML à traiter.")
        return
    
    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")
    
    modifs = 0
    ignores = 0
    erreurs = 0
    
    for fichier in fichiers:
        resultat = nettoyer_fichier(fichier)
        print(resultat)
        if resultat.startswith('✅'):
            modifs += 1
        elif resultat.startswith('⏭️'):
            ignores += 1
        else:
            erreurs += 1
    
    print("\n" + "=" * 65)
    print(f"✅ Modifiés : {modifs}")
    print(f"⏭️  Ignorés  : {ignores}")
    print(f"❌ Erreurs  : {erreurs}")
    print("=" * 65)


if __name__ == '__main__':
    main()