#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute la gestion du menu .labo-item dans le onAuthStateChanged
de chaque fichier HTML qui contient ce bloc.

Ajoute :
- Dans le bloc 'if (user)'  : afficher .labo-item
- Dans le bloc 'else'       : cacher .labo-item
"""

import os
import re
import glob

# Fichiers à ignorer (pages sans menu complet)
FICHIERS_IGNORES = ['admin-gestion.html', 'admin-ine.html', 'admin-news.html', 'test_assistant.html']

# Marqueurs pour éviter les doublons
MARQUEUR_IF  = "AFFICHER le menu déroulant \"Laboratoire\" du ruban"
MARQUEUR_ELSE = "CACHER le menu déroulant \"Laboratoire\" du ruban"


def ajouter_gestion_labo(contenu):
    """Ajoute la gestion de .labo-item dans le onAuthStateChanged."""
    modifs = 0

    # ---- 1. Dans le bloc "if (user)" : ajouter l'affichage ----
    # On cherche la ligne "if (user) {" puis on insère notre code juste après
    # le "try {" ou après "profile = snap.data();" (le plus fiable)
    if MARQUEUR_IF not in contenu:
        # Pattern : on cherche "profile = snap.data();" dans la section if(user)
        # On ajoute notre ligne juste après
        pattern_if = re.compile(
            r'(if\s*\(user\)\s*\{[\s\S]*?profile\s*=\s*snap\.data\(\);)',
            re.MULTILINE
        )
        def repl_if(m):
            return m.group(1) + '\n\n                // ✅ AFFICHER le menu déroulant "Laboratoire" du ruban (utilisateur connecté)\n                document.querySelectorAll(\'.labo-item\').forEach(el => el.style.display = \'block\');'

        nouveau, nb = pattern_if.subn(repl_if, contenu, count=1)
        if nb > 0:
            contenu = nouveau
            modifs += 1

    # ---- 2. Dans le bloc "else" : ajouter le masquage ----
    if MARQUEUR_ELSE not in contenu:
        # Pattern : on cherche "profile = null;" dans le else
        pattern_else = re.compile(
            r'(\}\s*else\s*\{[\s\S]*?profile\s*=\s*null;)',
            re.MULTILINE
        )
        def repl_else(m):
            return m.group(1) + '\n\n        // ✅ CACHER le menu déroulant "Laboratoire" du ruban (visiteur non connecté)\n        document.querySelectorAll(\'.labo-item\').forEach(el => el.style.display = \'none\');'

        nouveau, nb = pattern_else.subn(repl_else, contenu, count=1)
        if nb > 0:
            contenu = nouveau
            modifs += 1

    return contenu, modifs


def traiter_fichier(nom_fichier):
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"

    # Vérifier que le fichier contient bien un onAuthStateChanged
    if 'onAuthStateChanged' not in contenu:
        return f"⏭️  {nom_fichier} — pas de onAuthStateChanged"

    # Vérifier que le fichier a bien le menu .labo-item
    if 'class="labo-item"' not in contenu and "class='labo-item'" not in contenu:
        return f"⏭️  {nom_fichier} — pas de menu .labo-item"

    nouveau, nb = ajouter_gestion_labo(contenu)

    if nb == 0:
        return f"⏭️  {nom_fichier} — déjà modifié ou patterns non trouvés"

    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        return f"✅ {nom_fichier} — {nb} bloc(s) modifié(s)"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 65)
    print("  🔬 AJOUT GESTION .labo-item DANS LES FICHIERS HTML")
    print("=" * 65 + "\n")

    fichiers = sorted(glob.glob('*.html'))
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]

    if not fichiers:
        print("❌ Aucun fichier .html trouvé.")
        return

    print(f"📁 {len(fichiers)} fichier(s) HTML à traiter\n")

    ok = 0
    for fichier in fichiers:
        resultat = traiter_fichier(fichier)
        print(resultat)
        if resultat.startswith('✅'):
            ok += 1

    print("\n" + "=" * 65)
    print(f"  ✅ TERMINÉ — {ok} fichier(s) modifié(s)")
    print("=" * 65)
    print("\n💡 Vérifiez avec Ctrl+F5 dans le navigateur.")
    print("   Puis publiez : git add . && git commit -m '...' && git push\n")


if __name__ == '__main__':
    main()