#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supprime le bloc "Contacter le Proviseur" même s'il est incomplet.
Cherche à partir de <span class="contact-label"> et remonte pour trouver
la balise <li> ouvrante, et descend pour trouver </li>.
"""

import os
import re
import glob

def supprimer_bloc(html):
    """Supprime le bloc <li> contenant 'Contacter le Proviseur'."""
    
    # Pattern 1 : Structure standard complète
    p1 = re.compile(
        r'\s*<li\b[^>]*>\s*<a\b[^>]*>\s*<span class="contact-label">[^<]*Contacter le Proviseur[^<]*</span>\s*<span[^>]*>.*?</span>\s*</a>\s*</li>',
        re.DOTALL | re.IGNORECASE
    )
    
    # Pattern 2 : Structure incomplète (span sans <li> avant)
    p2 = re.compile(
        r'\s*<span class="contact-label">[^<]*Contacter le Proviseur[^<]*</span>\s*<span[^>]*id="contact-phone-display"[^>]*>.*?</span>\s*</a>\s*</li>',
        re.DOTALL | re.IGNORECASE
    )
    
    # Pattern 3 : Juste la ligne "Contacter le Proviseur" avec son span
    p3 = re.compile(
        r'\s*<span class="contact-label">[^<]*Contacter le Proviseur[^<]*</span>\s*\n?',
        re.IGNORECASE
    )
    
    # Pattern 4 : contact-phone-display orphelin
    p4 = re.compile(
        r'\s*<span[^>]*id="contact-phone-display"[^>]*>.*?</span>\s*</a>\s*</li>',
        re.DOTALL | re.IGNORECASE
    )
    
    # On essaie les patterns dans l'ordre
    for i, p in enumerate([p1, p2, p3, p4], 1):
        nouveau, nb = p.subn('', html)
        if nb > 0:
            return nouveau, nb, i
    
    return html, 0, 0


def traiter_fichier(nom_fichier):
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"
    
    header_match = re.search(r'<header\b[^>]*>[\s\S]*?</header>', contenu, re.DOTALL | re.IGNORECASE)
    if not header_match:
        return f"⚠️  {nom_fichier} — Pas de <header>"
    
    header_original = header_match.group(0)
    header_nouveau, total_nb, pattern_utilise = supprimer_bloc(header_original)
    
    if total_nb == 0:
        return f"⏭️  {nom_fichier} — Rien à supprimer"
    
    # Nettoyage : supprimer les lignes vides résiduelles
    header_nouveau = re.sub(r'\n\s*\n\s*\n', '\n\n', header_nouveau)
    
    nouveau_contenu = contenu.replace(header_original, header_nouveau)
    
    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau_contenu)
        return f"✅ {nom_fichier} — {total_nb} bloc(s) supprimé(s) (pattern #{pattern_utilise})"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 60)
    print("  🧹 SUPPRESSION 'CONTACTER LE PROVISEUR' — VERSION 3")
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