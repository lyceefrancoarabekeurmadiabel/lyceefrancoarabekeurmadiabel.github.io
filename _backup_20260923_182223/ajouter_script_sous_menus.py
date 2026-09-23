#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute le script JS des sous-menus (Admin, Laboratoire, Optique)
à toutes les pages HTML qui ont un burger.

Usage : python ajouter_script_sous_menus.py
"""

import os
import glob

SCRIPT = '''<script>
  // ✅ Ouvre/ferme les sous-menus (Admin, Laboratoire, Optique) en accordéon sur mobile
  document.addEventListener('click', function(e) {
    if (window.innerWidth > 1024) return;
    const trigger = e.target.closest('.admin-trigger, .labo-trigger, .optique-trigger');
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    const item = trigger.closest('.admin-item, .labo-item, .optique-item');
    if (!item) return;
    const dropdown = item.querySelector('.admin-dropdown, .labo-dropdown, .optique-dropdown');
    if (!dropdown) return;
    const estOuvert = dropdown.classList.contains('show');
    document.querySelectorAll('.admin-dropdown.show, .labo-dropdown.show, .optique-dropdown.show')
      .forEach(function(d) { d.classList.remove('show'); });
    if (!estOuvert) dropdown.classList.add('show');
  });
</script>
'''

MARQUEUR = 'Ouvre/ferme les sous-menus (Admin, Laboratoire, Optique)'

FICHIERS_IGNORES = [
    'admin-gestion.html',
    'admin-ine.html',
    'admin-news.html',
    'feedback.html',
    'test_assistant.html',
    'identification.html',
    'inscription.html',
]


def traiter(chemin):
    try:
        with open(chemin, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {chemin} — Erreur lecture : {e}"

    if 'burger-btn' not in contenu and 'menu-toggle' not in contenu:
        return f"⏭️  {chemin} — pas de burger"

    if MARQUEUR in contenu:
        return f"⏭️  {chemin} — script déjà présent"

    if '</body>' not in contenu:
        return f"⚠️  {chemin} — pas de </body>"

    nouveau = contenu.replace('</body>', SCRIPT + '</body>', 1)

    try:
        with open(chemin, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        return f"✅ {chemin} — script ajouté"
    except Exception as e:
        return f"❌ {chemin} — Erreur écriture : {e}"


def main():
    print("=" * 60)
    print("  🔧 AJOUT DU SCRIPT SOUS-MENUS MOBILES")
    print("  (Admin, Laboratoire, Optique)")
    print("=" * 60 + "\n")

    fichiers = sorted(glob.glob('*.html'))
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]

    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")

    ajoutes = 0
    ignores = 0
    erreurs = 0

    for f in fichiers:
        r = traiter(f)
        print(r)
        if r.startswith('✅'): ajoutes += 1
        elif r.startswith('⏭️') or r.startswith('⚠️'): ignores += 1
        else: erreurs += 1

    print("\n" + "=" * 60)
    print(f"✅ Modifiés : {ajoutes}")
    print(f"⏭️  Ignorés  : {ignores}")
    print(f"❌ Erreurs  : {erreurs}")
    print("=" * 60)
    print("\n💡 Prochaines étapes :")
    print("   1. Publiez : git add . && git commit -m '...' && git push")
    print("   2. Testez sur téléphone (rafraîchir la page)")
    print("   3. Ouvrez le burger ☰ → tapez sur Admin ou Laboratoire\n")


if __name__ == '__main__':
    main()