#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Réorganise le header des fichiers HTML dans l'ordre :
1. menu-toggle (burger)
2. brand (logo + texte)
3. nav (menu)

Le texte et le logo à l'intérieur du brand ne sont PAS modifiés.
C'est le CSS qui les inversera visuellement sur mobile.
"""

import os
import re
import glob

# Fichiers à ignorer (pages sans header classique)
FICHIERS_IGNORES = [
    'admin-gestion.html',
    'admin-ine.html',
    'admin-news.html',
    'feedback.html',
    'test_assistant.html',
    'simulateur-rc-mobile.html',
    'simulateur-dosage-mobile.html',
    'simulateur-circuits-libre-mobile.html',
    'simulateur-interferences-mobile.html',
    'simulateur-lentilles-mobile.html',
    'publier-annonce.html',
]

# Marqueur pour éviter de traiter deux fois
MARQUEUR = '<!-- header-reorganized -->'


def reordonner_header(html):
    """
    Réorganise le header : burger → brand → nav.
    Retourne (nouveau_html, nb_modifications).
    """
    
    # On travaille uniquement dans le <header>...</header>
    header_match = re.search(
        r'<header\b[^>]*>[\s\S]*?</header>',
        html,
        re.DOTALL | re.IGNORECASE
    )
    if not header_match:
        return html, 0
    
    header_original = header_match.group(0)
    header_new = header_original
    
    # Déjà réorganisé ?
    if MARQUEUR in header_new:
        return html, 0
    
    # 1. Extraire les 3 blocs (brand, burger, nav)
    # Pattern pour <a class="brand">...</a>
    brand_match = re.search(
        r'(<a\s+[^>]*class="brand"[^>]*>[\s\S]*?</a>)',
        header_new,
        re.IGNORECASE
    )
    if not brand_match:
        return html, 0
    brand_block = brand_match.group(1)
    
    # Pattern pour <div class="menu-toggle"...>...</div>
    burger_match = re.search(
        r'(<div\s+[^>]*class="menu-toggle"[^>]*>[\s\S]*?</div>)',
        header_new,
        re.IGNORECASE
    )
    if not burger_match:
        return html, 0
    burger_block = burger_match.group(1)
    
    # Pattern pour <nav>...</nav>
    nav_match = re.search(
        r'(<nav\b[^>]*>[\s\S]*?</nav>)',
        header_new,
        re.IGNORECASE
    )
    if not nav_match:
        return html, 0
    nav_block = nav_match.group(1)
    
    # 2. Supprimer les 3 blocs de leur position actuelle
    header_new = header_new.replace(brand_block, '', 1)
    header_new = header_new.replace(burger_block, '', 1)
    header_new = header_new.replace(nav_block, '', 1)
    
    # 3. Nettoyer les lignes vides multiples créées par les suppressions
    header_new = re.sub(r'\n\s*\n\s*\n+', '\n\n', header_new)
    
    # 4. Trouver le conteneur .nav-row pour réinsérer dans le bon ordre
    nav_row_match = re.search(
        r'(<div\s+[^>]*class="[^"]*nav-row[^"]*"[^>]*>)([\s\S]*?)(</div>)',
        header_new,
        re.DOTALL
    )
    
    if not nav_row_match:
        # Si pas de nav-row, on échoue proprement
        return html, 0
    
    # 5. Insérer les 3 blocs dans le bon ordre
    ouverture = nav_row_match.group(1)
    interieur = nav_row_match.group(2)
    fermeture = nav_row_match.group(3)
    
    # Récupérer et nettoyer l'espace résiduel à l'intérieur
    interieur_propre = interieur.strip()
    
    # Nouveau contenu : burger → brand → nav
    nouveau_contenu = f'''
    {MARQUEUR}
    {burger_block}
    {brand_block}
    {nav_block}
    '''
    
    # Reconstruction du nav-row
    nav_row_nouveau = f'{ouverture}{nouveau_contenu}    {fermeture}'
    
    # Remplacer dans le header
    header_new = header_new.replace(nav_row_match.group(0), nav_row_nouveau, 1)
    
    # Remplacer dans le HTML complet
    html_new = html.replace(header_original, header_new, 1)
    
    return html_new, 1


def traiter_fichier(nom_fichier):
    if not os.path.exists(nom_fichier):
        return f"⏭️  {nom_fichier} — absent"
    
    try:
        with open(nom_fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur lecture : {e}"
    
    # Vérifier présence des 3 éléments clés
    if 'class="brand"' not in contenu:
        return f"⏭️  {nom_fichier} — pas de brand"
    if 'menu-toggle' not in contenu:
        return f"⏭️  {nom_fichier} — pas de burger"
    if '<nav' not in contenu:
        return f"⏭️  {nom_fichier} — pas de nav"
    
    # Vérifier si déjà fait
    if MARQUEUR in contenu:
        return f"✅ {nom_fichier} — déjà réorganisé"
    
    nouveau, nb = reordonner_header(contenu)
    
    if nb == 0:
        return f"⚠️  {nom_fichier} — patterns non trouvés (structure inattendue)"
    
    try:
        with open(nom_fichier, 'w', encoding='utf-8') as f:
            f.write(nouveau)
        return f"✅ {nom_fichier} — header réorganisé"
    except Exception as e:
        return f"❌ {nom_fichier} — Erreur écriture : {e}"


def main():
    print("=" * 65)
    print("  🔄 RÉORGANISATION DU HEADER")
    print("  Ordre cible : ☰ burger → texte+logo → nav")
    print("=" * 65 + "\n")
    
    fichiers = sorted(glob.glob('*.html'))
    fichiers = [f for f in fichiers if f not in FICHIERS_IGNORES]
    
    if not fichiers:
        print("❌ Aucun fichier .html à traiter.")
        return
    
    print(f"📁 {len(fichiers)} fichier(s) HTML trouvé(s)\n")
    
    ok = 0
    ignore = 0
    erreur = 0
    
    for fichier in fichiers:
        resultat = traiter_fichier(fichier)
        print(resultat)
        if resultat.startswith('✅'):
            ok += 1
        elif resultat.startswith('⏭️') or resultat.startswith('⚠️'):
            ignore += 1
        else:
            erreur += 1
    
    print("\n" + "=" * 65)
    print("  📊 RAPPORT FINAL")
    print("=" * 65)
    print(f"✅ Modifiés        : {ok}")
    print(f"⏭️  Ignorés         : {ignore}")
    print(f"❌ Erreurs         : {erreur}")
    print("=" * 65)
    print("\n💡 Prochaines étapes :")
    print("   1. Vérifiez dans VS Code (Ctrl+F : header-reorganized)")
    print("   2. Testez sur votre téléphone (Ctrl+F5)")
    print("   3. Publiez : git add . && git commit -m '...' && git push\n")


if __name__ == '__main__':
    main()