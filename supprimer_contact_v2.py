#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supprime le bloc <li> contenant "Contacter le Proviseur" 
UNIQUEMENT dans la balise <header>...</header>.
"""

import os
import re
import glob

def supprimer_bloc_contact(html):
    """Supprime le bloc <li> contenant 'Contacter le Proviseur'."""
    # Pattern qui cherche <li ...> ... Contacter le Proviseur ... </li>
    # en gérant les sauts de ligne
    pattern = re.compile(
        r'<li\b[^>]*>\s*<a\b[^>]*>\s*<span[^>]*>.*?Contacter le Proviseur.*?</span>.*?</a>\s*</li>',
        re.DOTALL | re.IGNORECASE
    )
    
    # Version alternative si le premier pattern échoue
    pattern2 = re.compile(
        r'<li\b[^>]*class="contact-info"[^>]*>.*?</li>',
        re.DOTALL | re.IGNORECASE
    )
    
    # Essayer le premier pattern
    nouveau, nb = pattern.subn('', html)
    if nb > 0:
        return nouveau, nb
    
    # Essayer le second
    nouveau, nb = pattern2.subn('', html)
    return nouveau, nb


def traiter_fichier(nom_fichier):
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"
    
    # Isoler le <header>
    header_match = re.search(r'<header\b[^>]*>[\s\S]*?</header>', contenu, re.DOTALL | re.IGNORECASE)
    if not header_match:
        return f"⚠️  {nom_fichier} — Pas de <header>"
    
    header_original = header_match.group(0)
    header_nouveau, nb = supprimer_bloc_contact(header_original)
    
    if nb == 0:
        return f"⏭️  {nom_fichier} — Rien à supprimer"
    
    # Remplacer dans le contenu complet
    nouveau_contenu = contenu.replace(header_original, header_nouveau)
    
    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau_contenu)
        return f"✅ {nom_fichier} — {nb} bloc(s) supprimé(s)"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 60)
    print("  🧹 SUPPRESSION 'CONTACTER LE PROVISEUR' — VERSION 2")
    print("=" * 60 + "\n")
    
    fichiers = sorted(glob.glob('*.html'))
    
    if not fichiers:
        print("❌ Aucun fichier .html trouvé.")
        return
    
    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")
    
    for fichier in fichiers:
        resultat = traiter_fichier(fichier)
        print(resultat)
    
    print("\n" + "=" * 60)
    print("  ✅ TERMINÉ")
    print("=" * 60)
    print("\n💡 Vérifiez avec Ctrl+F5 dans le navigateur.\n")


if __name__ == '__main__':
    main()