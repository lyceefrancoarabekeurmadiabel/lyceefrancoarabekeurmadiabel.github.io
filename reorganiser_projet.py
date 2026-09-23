#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reorganiser_projet.py

Réorganise automatiquement le projet LFAKM :
- Crée les dossiers : pc/, mobile/, assets/
- Déplace les fichiers HTML selon leur type
- Met à jour TOUS les liens dans les HTML, JS, manifest, etc.
- Génère un backup complet avant modification

Utilisation :
    python reorganiser_projet.py

Le script crée un dossier _backup_YYYYMMDD_HHMMSS/ avant de faire quoi que ce soit.
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path

# ============================================================
#  CONFIGURATION
# ============================================================
RACINE = Path(__file__).parent.resolve()
BACKUP_DIR = RACINE / f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# Fichiers à déplacer et leur dossier cible
PLAN_DEPLACEMENT = {
    # === Labo / admin (reste en PC pour l'instant) ===
    'labo-pc.html':              'pc/',
    'profil-eleve.html':         'pc/',
    'publier-annonce.html':      'pc/',
    'ressources.html':           'pc/',

    # === Simulateurs PC ===
    'simulateur-circuits-libre.html':           'pc/',
    'simulateur-circuits-serie-derivation.html':'pc/',
    'simulateur-dosage.html':                   'pc/',
    'simulateur-interferences.html':            'pc/',
    'simulateur-lc.html':                       'pc/',
    'simulateur-lentilles.html':                'pc/',
    'simulateur-rc.html':                       'pc/',
    'simulateur-rl.html':                       'pc/',
    'simulateur-rlc.html':                      'pc/',
    'simulateur-rlc-forces.html':               'pc/',

    # === Simulateurs Mobile ===
    'simulateur-circuits-libre-mobile.html':    'mobile/',
    'simulateur-dosage-mobile.html':            'mobile/',
    'simulateur-interferences-mobile.html':     'mobile/',
    'simulateur-lentilles-mobile.html':         'mobile/',
    'simulateur-rc-mobile.html':                'mobile/',
    'simulateur-rl-mobile.html':                'mobile/',
    'simulateur-rlc-mobile.html':               'mobile/',
    'simulateur-rlc-forces-mobile.html':        'mobile/',

    # === Assets (CSS, images, etc.) ===
    'favicon.png':               'assets/',
    'style-menu.css':            'assets/',
    'manifest.json':             'assets/',
    # service-worker.js et index.html restent à la racine
}

# Extensions à traiter pour la mise à jour des liens
EXTENSIONS_A_TRAITER = ['.html', '.js', '.css', '.json']


# ============================================================
#  ÉTAPE 1 : SAUVEGARDE
# ============================================================
def sauvegarder():
    """Copie tout le projet dans _backup_XXX/"""
    print(f"📦 Sauvegarde dans {BACKUP_DIR.name}/ ...")
    shutil.copytree(RACINE, BACKUP_DIR, ignore=shutil.ignore_patterns(
        '_backup_*', '__pycache__', '.git', 'node_modules'
    ))
    print(f"✅ Sauvegarde OK ({sum(1 for _ in BACKUP_DIR.rglob('*'))} fichiers)")


# ============================================================
#  ÉTAPE 2 : CRÉATION DES DOSSIERS
# ============================================================
def creer_dossiers():
    """Crée les dossiers pc/, mobile/, assets/"""
    dossiers = set(PLAN_DEPLACEMENT.values())
    for d in dossiers:
        (RACINE / d).mkdir(parents=True, exist_ok=True)
        print(f"📁 Dossier créé : {d}")


# ============================================================
#  ÉTAPE 3 : DÉPLACEMENT DES FICHIERS
# ============================================================
def deplacer_fichiers():
    """Déplace chaque fichier selon PLAN_DEPLACEMENT"""
    deplaces = []
    for nom_fichier, dossier_cible in PLAN_DEPLACEMENT.items():
        source = RACINE / nom_fichier
        if not source.exists():
            print(f"⚠️  {nom_fichier} introuvable — ignoré")
            continue
        destination = RACINE / dossier_cible / nom_fichier
        if destination.exists():
            print(f"⚠️  {destination} existe déjà — ignoré")
            continue
        shutil.move(str(source), str(destination))
        deplaces.append((nom_fichier, dossier_cible))
        print(f"➡️  {nom_fichier} → {dossier_cible}")
    return deplaces


# ============================================================
#  ÉTAPE 4 : MISE À JOUR DES LIENS
# ============================================================
def calculer_prefixe(fichier: Path) -> str:
    """
    Retourne le préfixe relatif pour atteindre la racine du projet.
    Ex :
      - fichier à la racine → ''
      - fichier dans pc/ → '../'
      - fichier dans pc/sous/ → '../../'
    """
    profondeur = len(fichier.relative_to(RACINE).parts) - 1
    return '../' * profondeur


def remplacer_liens_dans_fichier(fichier: Path):
    """Remplace tous les liens dans un fichier donné."""
    contenu = fichier.read_text(encoding='utf-8')
    original = contenu
    prefixe = calculer_prefixe(fichier)
    modifications = 0

    # Pour chaque fichier déplaçable, on remplace son nom par son chemin complet
    for nom_source, dossier_cible in PLAN_DEPLACEMENT.items():
        # Chemins possibles pour ce fichier (avec et sans ./)
        chemins_candidats = [
            nom_source,
            f'./{nom_source}',
        ]
        chemin_final = f'{prefixe}{dossier_cible}{nom_source}'.replace('//', '/')

        for chemin in chemins_candidats:
            # Remplacer dans href="..." ET src="..." ET url(...) ET '...' JS
            patterns = [
                f'href="{chemin}"',
                f"href='{chemin}'",
                f'src="{chemin}"',
                f"src='{chemin}'",
                f"url('{chemin}')",
                f'url("{chemin}")',
                f"'{chemin}'",  # dans les JS : window.location.replace('...')
                f'"{chemin}"',
            ]
            for pattern in patterns:
                nouveau = pattern.replace(chemin, chemin_final)
                if pattern in contenu:
                    contenu = contenu.replace(pattern, nouveau)
                    modifications += contenu.count(nouveau) - 0  # approximatif

    if contenu != original:
        fichier.write_text(contenu, encoding='utf-8')
        return modifications

    return 0


def mettre_a_jour_liens():
    """Parcourt tous les fichiers et met à jour les liens."""
    print("\n🔗 Mise à jour des liens...")
    total_fichiers = 0
    total_modifs = 0

    for ext in EXTENSIONS_A_TRAITER:
        for fichier in RACINE.rglob(f'*{ext}'):
            # Ignorer le backup
            if '_backup_' in str(fichier):
                continue
            # Ignorer les dossiers système
            if any(p in fichier.parts for p in ['__pycache__', '.git', 'node_modules']):
                continue

            modifs = remplacer_liens_dans_fichier(fichier)
            if modifs > 0:
                print(f"✏️  {fichier.relative_to(RACINE)} : {modifs} lien(s)")
                total_fichiers += 1
                total_modifs += modifs

    print(f"\n✅ {total_fichiers} fichier(s) modifié(s), {total_modifs} lien(s) au total")


# ============================================================
#  ÉTAPE 5 : RAPPORT FINAL
# ============================================================
def afficher_recap(deplaces):
    """Affiche un récapitulatif final."""
    print("\n" + "=" * 60)
    print("🎉 RÉORGANISATION TERMINÉE")
    print("=" * 60)
    print(f"\n📦 Sauvegarde : {BACKUP_DIR.name}/")
    print(f"📁 Structure créée :")

    for dossier in sorted(set(PLAN_DEPLACEMENT.values())):
        chemin = RACINE / dossier
        nb = len(list(chemin.glob('*')))
        print(f"   • {dossier:<10} → {nb} fichier(s)")

    print(f"\n➡️  {len(deplaces)} fichier(s) déplacé(s) :")
    for nom, dossier in deplaces:
        print(f"   • {nom} → {dossier}")

    print("\n🚀 Prochaines étapes :")
    print("   1. Ouvre index.html dans Live Server pour tester")
    print("   2. Vérifie les liens (Labo PC, PC ↔ Mobile, etc.)")
    print("   3. Si tout va bien, supprime le dossier de sauvegarde")
    print("   4. git add . && git commit -m 'Réorganisation structure'")
    print("   5. git push origin main")
    print("\n⚠️  Si un lien est cassé, restaure depuis la sauvegarde.")


# ============================================================
#  MAIN
# ============================================================
def main():
    print("=" * 60)
    print("🔧 RÉORGANISATION DU PROJET LFAKM")
    print("=" * 60)

    # 1. Vérification
    if not (RACINE / 'index.html').exists():
        print("❌ index.html introuvable. Es-tu bien à la racine du projet ?")
        return

    # 2. Confirmation
    reponse = input("\n⚠️  Cette opération va déplacer des fichiers. Continuer ? (o/n) : ").strip().lower()
    if reponse != 'o':
        print("❌ Annulé.")
        return

    # 3. Sauvegarde
    sauvegarder()

    # 4. Création des dossiers
    creer_dossiers()

    # 5. Déplacement
    print("\n➡️  Déplacement des fichiers...")
    deplaces = deplacer_fichiers()

    # 6. Mise à jour des liens
    mettre_a_jour_liens()

    # 7. Récap
    afficher_recap(deplaces)


if __name__ == '__main__':
    main()