#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ajoute la redirection automatique vers la version mobile
dans les simulateurs PC qui n'en ont pas encore.
"""

import os
import re

# Simulateurs à corriger : (fichier PC, fichier mobile cible)
SIMULATEURS = [
    ('simulateur-circuits-libre.html', 'simulateur-circuits-libre-mobile.html'),
    ('simulateur-dosage.html',          'simulateur-dosage-mobile.html'),
]

SCRIPT_TEMPLATE = '''<script>
  (function() {{
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
                     || window.innerWidth < 768;
    const alreadyRedirected = sessionStorage.getItem('mobile_redirected_{slug}');
    if (isMobile && !alreadyRedirected) {{
      sessionStorage.setItem('mobile_redirected_{slug}', '1');
      window.location.replace('{mobile_file}');
    }}
  }})();
</script>'''


def ajouter_redirection(nom_fichier, fichier_mobile):
    if not os.path.exists(nom_fichier):
        return f"⏭️  {nom_fichier} — absent"
    
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"
    
    # Vérifier si la redirection existe déjà
    if 'mobile_redirected' in contenu and fichier_mobile in contenu:
        return f"⏭️  {nom_fichier} — redirection déjà présente"
    
    # Slug unique pour éviter les conflits entre simulateurs
    slug = nom_fichier.replace('.html', '').replace('simulateur-', '')
    
    script = SCRIPT_TEMPLATE.format(slug=slug, mobile_file=fichier_mobile)
    
    # Insérer le script juste après <body>
    pattern = re.compile(r'(<body\b[^>]*>)', re.IGNORECASE)
    if not pattern.search(contenu):
        return f"❌ {nom_fichier} — pas de <body> trouvé"
    
    nouveau = pattern.sub(r'\1\n\n' + script + '\n', contenu, count=1)
    
    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        return f"✅ {nom_fichier} — redirection ajoutée vers {fichier_mobile}"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 65)
    print("  📱 AJOUT REDIRECTION MOBILE DANS SIMULATEURS PC")
    print("=" * 65 + "\n")
    
    for fichier_pc, fichier_mobile in SIMULATEURS:
        resultat = ajouter_redirection(fichier_pc, fichier_mobile)
        print(resultat)
    
    print("\n" + "=" * 65)
    print("  ✅ TERMINÉ")
    print("=" * 65)


if __name__ == '__main__':
    main()