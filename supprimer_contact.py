#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supprime les blocs <li> "Contacter le Proviseur" et "feedback-item"
UNIQUEMENT dans la balise <header>...</header> de chaque fichier HTML.
Ne touche PAS au footer.
"""

import os
import re
import glob

# ============================================================
#  REGEX ROBUSTES
# ============================================================

# Matche tout <li> qui contient "Contacter le Proviseur"
PATTERN_CONTACT = re.compile(
    r'\s*<li\b[^>]*class="contact-info"[^>]*>[\s\S]*?</li>',
    re.DOTALL | re.IGNORECASE
)

# Matche <li class="feedback-item"> ... </li>
PATTERN_FEEDBACK = re.compile(
    r'\s*<li\b[^>]*class="feedback-item"[^>]*>[\s\S]*?</li>',
    re.DOTALL | re.IGNORECASE
)

# ============================================================
#  FONCTION DE NETTOYAGE D'UN FICHIER
# ============================================================

def nettoyer_fichier(nom_fichier):
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return ('erreur_lecture', str(e), 0, 0)

    # --- On isole le <header>...</header> ---
    header_match = re.search(r'<header\b[^>]*>[\s\S]*?</header>', contenu, re.DOTALL | re.IGNORECASE)
    if not header_match:
        return ('pas_de_header', '', 0, 0)

    header_original = header_match.group(0)
    header_nouveau = header_original

    # --- Suppression du <li> "Contacter le Proviseur" ---
    header_nouveau, nb_contact = PATTERN_CONTACT.subn('', header_nouveau)

    # --- Suppression du <li class="feedback-item"> ---
    header_nouveau, nb_feedback = PATTERN_FEEDBACK.subn('', header_nouveau)

    # --- Nettoyage des lignes vides résiduelles ---
    header_nouveau = re.sub(r'\n\s*\n\s*\n', '\n\n', header_nouveau)
    header_nouveau = re.sub(r'\s*</ul>', '\n      </ul>', header_nouveau)

    # --- Si rien n'a changé, on ne réécrit pas ---
    if header_nouveau == header_original:
        return ('rien', '', 0, 0)

    # --- Écriture du fichier modifié ---
    nouveau_contenu = contenu.replace(header_original, header_nouveau)

    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau_contenu)
    except Exception as e:
        return ('erreur_ecriture', str(e), 0, 0)

    return ('ok', '', nb_contact, nb_feedback)


# ============================================================
#  EXÉCUTION SUR TOUS LES FICHIERS HTML
# ============================================================

def main():
    print("=" * 60)
    print("  🧹 SUPPRESSION DU BOUTON 'CONTACTER LE PROVISEUR'")
    print("=" * 60 + "\n")

    fichiers = sorted(glob.glob('*.html'))

    if not fichiers:
        print("❌ Aucun fichier .html trouvé dans ce dossier.")
        return

    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")

    rapport = {
        'ok': [], 'rien': [], 'pas_de_header': [],
        'erreur_lecture': [], 'erreur_ecriture': [],
    }

    for fichier in fichiers:
        statut, msg, nb_c, nb_f = nettoyer_fichier(fichier)

        if statut == 'ok':
            rapport['ok'].append(fichier)
            print(f"✅ {fichier}")
            if nb_c > 0:
                print(f"   → {nb_c} bloc(s) 'Contacter le Proviseur' supprimé(s)")
            if nb_f > 0:
                print(f"   → {nb_f} bloc(s) 'feedback-item' supprimé(s)")
        elif statut == 'rien':
            rapport['rien'].append(fichier)
            print(f"⏭️  {fichier} — rien à supprimer")
        elif statut == 'pas_de_header':
            rapport['pas_de_header'].append(fichier)
            print(f"⚠️  {fichier} — pas de <header> trouvé")
        elif statut == 'erreur_lecture':
            rapport['erreur_lecture'].append(fichier)
            print(f"❌ {fichier} — erreur lecture : {msg}")
        elif statut == 'erreur_ecriture':
            rapport['erreur_ecriture'].append(fichier)
            print(f"❌ {fichier} — erreur écriture : {msg}")

    print("\n" + "=" * 60)
    print("  📊 RAPPORT FINAL")
    print("=" * 60)
    print(f"✅ Fichiers nettoyés     : {len(rapport['ok'])}")
    print(f"⏭️  Rien à faire          : {len(rapport['rien'])}")
    print(f"⚠️  Sans <header>         : {len(rapport['pas_de_header'])}")
    print(f"❌ Erreurs               : {len(rapport['erreur_lecture']) + len(rapport['erreur_ecriture'])}")

    if rapport['ok']:
        print("\n📝 Fichiers modifiés :")
        for f in rapport['ok']:
            print(f"   ✨ {f}")

    print("\n💡 Vérifie dans le navigateur avec Ctrl+F5.")
    print("   Puis publie : git add . && git commit -m '...' && git push\n")


if __name__ == '__main__':
    main()