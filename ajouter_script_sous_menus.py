#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute le script JS de gestion des sous-menus (accordéon mobile)
à toutes les pages HTML qui ont un burger, AVANT </body>.

Usage : python ajouter_script_sous_menus.py
"""

import os
import glob
import re

# ============================================================
#  LE SCRIPT À INSÉRER
# ============================================================
SCRIPT_A_INSERER = '''<script>
  // ✅ Ouvre/ferme les sous-menus en accordéon sur mobile
  document.addEventListener('click', (e) => {
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
    document.querySelectorAll('.admin-dropdown.show, .labo-dropdown.show, .optique-dropdown.show').forEach(d => d.classList.remove('show'));
    if (!estOuvert) dropdown.classList.add('show');
  });
</script>
'''

# Marqueur unique pour détecter si le script est déjà présent
MARQUEUR = 'Ouvre/ferme les sous-menus en accordéon'

# Fichiers à ignorer (pages sans burger, pages admin, etc.)
FICHIERS_IGNORES = [
    'admin-gestion.html',
    'admin-ine.html',
    'admin-news.html',
    'feedback.html',
    'test_assistant.html',
    'identification.html',
    'inscription.html',
    'profil-eleve.html',  # à retirer de cette liste si vous voulez l'inclure
]


def traiter_fichier(chemin):
    """Traite un fichier HTML : ajoute le script si nécessaire."""
    
    try:
        with open(chemin, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {chemin} — Erreur de lecture : {e}"
    
    # 1. Vérifier si la page a un burger
    if 'burger-btn' not in contenu and 'menu-toggle' not in contenu:
        return f"⏭️  {chemin} — pas de burger, ignoré"
    
    # 2. Vérifier si le script est déjà présent
    if MARQUEUR in contenu:
        return f"⏭️  {chemin} — script déjà présent"
    
    # 3. Vérifier si </body> existe
    if '</body>' not in contenu:
        return f"⚠️  {chemin} — pas de </body>, ignoré"
    
    # 4. Insérer le script juste avant </body>
    nouveau_contenu = contenu.replace(
        '</body>',
        SCRIPT_A_INSERER + '</body>',
        1  # remplacer seulement le premier
    )
    
    # 5. Écrire le fichier
    try:
        with open(chemin, 'w', encoding='utf-8') as f:
            f.write(nouveau_contenu)
        return f"✅ {chemin} — script ajouté"
    except Exception as e:
        return f"❌ {chemin} — Erreur d'écriture : {e}"


def main():
    print("=" * 65)
    print("  🔧 AJOUT DU SCRIPT SOUS-MENUS")
    print("  (accordéon mobile pour Admin / Laboratoire / Optique)")
    print("=" * 65 + "\n")
    
    # Récupérer tous les fichiers HTML
    fichiers = sorted(glob.glob('*.html'))
    
    # Filtrer les fichiers ignorés
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]
    
    if not fichiers:
        print("❌ Aucun fichier HTML à traiter.")
        return
    
    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")
    
    # Compteurs
    ajoutes = 0
    ignores = 0
    erreurs = 0
    
    # Traiter chaque fichier
    for fichier in fichiers:
        resultat = traiter_fichier(fichier)
        print(resultat)
        
        if resultat.startswith('✅'):
            ajoutes += 1
        elif resultat.startswith('⏭️') or resultat.startswith('⚠️'):
            ignores += 1
        else:
            erreurs += 1
    
    # Rapport final
    print("\n" + "=" * 65)
    print("  📊 RAPPORT FINAL")
    print("=" * 65)
    print(f"✅ Modifiés    : {ajoutes}")
    print(f"⏭️  Ignorés     : {ignores}")
    print(f"❌ Erreurs     : {erreurs}")
    print("=" * 65)
    print("\n💡 Prochaines étapes :")
    print("   1. Vérifiez dans VS Code (Ctrl+F : 'accordéon')")
    print("   2. Testez sur votre téléphone (Ctrl+F5)")
    print("   3. Publiez : git add . && git commit -m '...' && git push\n")


if __name__ == '__main__':
    main()