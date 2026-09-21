#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supprime les doublons du script des sous-menus dans les pages HTML.
Garde UNIQUEMENT le dernier <script> contenant le marqueur.

Usage : python nettoyer_doublons_script.py
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
    'identification.html',
    'inscription.html',
]

# Motif pour trouver les blocs <script> contenant le marqueur
PATTERN_SCRIPT = re.compile(
    r'<script>\s*//\s*✅\s*Ouvre/ferme les sous-menus[^<]*?</script>',
    re.DOTALL
)


def traiter(chemin):
    try:
        with open(chemin, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {chemin} — Erreur lecture : {e}"

    # Trouve tous les scripts marqués
    matches = PATTERN_SCRIPT.findall(contenu)
    
    if len(matches) <= 1:
        return f"⏭️  {chemin} — {len(matches)} script(s), rien à faire"
    
    # Garde le DERNIER script, supprime les autres
    dernier_script = matches[-1]
    
    # Supprime tous les scripts marqués
    contenu_sans = PATTERN_SCRIPT.sub('', contenu)
    
    # Réinsère le dernier script juste avant </body>
    contenu_final = contenu_sans.replace(
        '</body>',
        dernier_script + '\n</body>',
        1
    )
    
    # Nettoie les lignes vides
    contenu_final = re.sub(r'\n\s*\n\s*\n+', '\n\n', contenu_final)
    
    try:
        with open(chemin, 'w', encoding='utf-8') as f:
            f.write(contenu_final)
        return f"✅ {chemin} — {len(matches)} script(s) → 1 seul conservé"
    except Exception as e:
        return f"❌ {chemin} — Erreur écriture : {e}"


def main():
    print("=" * 65)
    print("  🧹 SUPPRESSION DES DOUBLONS DE SCRIPT")
    print("=" * 65 + "\n")
    
    fichiers = sorted(glob.glob('*.html'))
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]
    
    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")
    
    modifs = 0
    ok = 0
    erreurs = 0
    
    for f in fichiers:
        r = traiter(f)
        print(r)
        if r.startswith('✅'): modifs += 1
        elif r.startswith('⏭️'): ok += 1
        else: erreurs += 1
    
    print("\n" + "=" * 65)
    print(f"✅ Modifiés : {modifs}")
    print(f"⏭️  Déjà ok  : {ok}")
    print(f"❌ Erreurs  : {erreurs}")
    print("=" * 65)


if __name__ == '__main__':
    main()