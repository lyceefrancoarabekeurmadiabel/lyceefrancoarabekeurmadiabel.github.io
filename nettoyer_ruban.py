#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supprime 'Contacter le Proviseur' et 'Voir les retours' du ruban
dans tous les fichiers HTML du dossier.
"""

import glob
import re

# Regex qui matche le <li> "Contacter le Proviseur" (multi-ligne, avec ou sans style)
PATTERN_CONTACT = re.compile(
    r'\s*<li>\s*<a[^>]*showContact[^>]*>.*?</a>\s*</li>',
    re.DOTALL
)

# Regex qui matche le <li class="feedback-item"> ... </li>
PATTERN_FEEDBACK = re.compile(
    r'\s*<li class="feedback-item">.*?</li>',
    re.DOTALL
)

fichiers = sorted(glob.glob('*.html'))
total_modifs = 0

for fichier in fichiers:
    with open(fichier, 'r', encoding='utf-8') as f:
        contenu = f.read()
    
    nouveau = contenu
    nb_contact = 0
    nb_feedback = 0
    
    # ⚠️ On ne supprime QUE dans la partie <header> ... </header>
    # pour ne pas toucher au footer (où on veut garder le lien)
    header_match = re.search(r'<header>.*?</header>', nouveau, re.DOTALL)
    if header_match:
        header_original = header_match.group(0)
        header_nouveau = header_original
        
        header_nouveau, n1 = PATTERN_CONTACT.subn('', header_nouveau)
        header_nouveau, n2 = PATTERN_FEEDBACK.subn('', header_nouveau)
        
        nouveau = nouveau.replace(header_original, header_nouveau)
        nb_contact = n1
        nb_feedback = n2
    
    if nb_contact > 0 or nb_feedback > 0:
        with open(fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        total_modifs += 1
        print(f"✅ {fichier} : {nb_contact} contact(s), {nb_feedback} feedback(s) supprimé(s)")
    else:
        print(f"⏭️  {fichier} : rien à supprimer")

print(f"\n📊 {total_modifs} fichier(s) modifié(s) au total.")
print("💡 Teste dans le navigateur avec Ctrl+F5.")