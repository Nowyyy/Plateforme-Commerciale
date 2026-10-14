# Lot 1 — Wireframes Lo-Fi des 4 écrans
**Livré** : `wireframes/` (index de validation + accueil 10 blocs, diagnostic 6, fiche produit 8, panier 6), `css/wireframe.css`, jetons `--wf-gris-*`, publication par lot (workflow, `apercu.txt`), tests, `CLAUDE.md` mis à jour. Commits : 1-A socle, 1-B accueil et diagnostic, 1-C produit, panier, parcours, bilan ; puis ajouts demandés par le propriétaire : 1-D et 1-E aperçu par lot, 1-F bilan, 1-G accueil révisé, 1-H bandeau d'avis sobre, 1-I délai de livraison au panier.
**Choix** : niveaux de gris, sans JavaScript ni ressource externe, mobile d'abord (ruptures 768 et 1200 px, conteneur de 1280 px) ; annotations en dur permises dans `wireframes/` seulement.
**Critères** :
- Lint sans avertissement ; 21 tests Vitest verts (7 du lot 0 + 14 nouveaux, dont ordre et contenu de l'accueil révisé, délai du panier).
- 20 tests Playwright verts : 15 (5 pages × 375, 768, 1440 px : console propre, aucun débordement, axe sans violation, aucune requête externe) + 3 page d'attente + 2 parcours cliqué (375 et 1440 px, jusqu'au panier).
- Captures des 5 pages vues aux 3 largeurs ; accueil revu à 375 et 1440 px après révision, panier à 1440 px après ajout du délai.
- Lighthouse mobile (perf. / access. / bonnes pratiques, relancé après les ajouts) : index 100/100/100 ; accueil 99/100/100 ; diagnostic 99/100/100 ; produit 100/100/100 ; panier 99/100/100 (seuils 90 / 95 / 95 ; SEO exclu, pages `noindex`).
**Adresses** (`https://nowyyy.github.io/Plateforme-Commerciale/`) : `/` = `main` (page d'attente jusqu'à la fusion ; `/wireframes/` y apparaît après) ; `/lot-1/` = aperçu de la branche, redirige vers `/lot-1/wireframes/` (chemin lu dans `apercu.txt`) ; pages directes `/lot-1/wireframes/accueil.html`, `diagnostic.html`, `produit.html`, `panier.html` ; `/apercus/` = liste des aperçus. Chaque push sur `main` ou `lot-*` redéploie automatiquement.
**Règle durable** : l'adresse par lot `/lot-N/` reste en place pour tous les autres lots (branche `lot-N` + `apercu.txt`) ; la page d'attente du lot y devient `attente.html`.
**Autorisation** : le propriétaire m'a donné l'autorisation explicite de modifier le workflow de publication de `main` (`.github/workflows/pages.yml`) et les réglages GitHub nécessaires (environnement `github-pages` : branches `main` et `lot-*` autorisées, fait par lui) pour obtenir une page par lot (commits 1-D et 1-E).
**Points ouverts** : tag `lot-1` : push refusé (HTTP 403), tentative unique ; tag local seulement, à poser par le propriétaire sur le dernier commit de `lot-1` ; `tests/outils/lighthouse.mjs` accepte des chemins de pages en arguments ; index des projets sur `nowyyy.github.io` : proposé, non fait (autre dépôt, accord attendu).

## Choix d'agencement à valider
- Familles d'équipements (absentes du seed), E1-5 : batardeaux, clapets anti-retour, barrières anti-crue ; volets et stores résistants, films, protections de toiture ; grilles pare-braises, volets coupe-feu, pare-flammes ; brise-soleil, films solaires, stores extérieurs. Nombre d'aléas non figé : 4 exemples, grille qui passe à la ligne.
- E2-2 : « Tous » actif, bouton « Mettre à jour » ; E2-3 : premier calque coché ; E2-4 : niveau « élevé », repère sous le 3e segment.
- Pastilles, calques, navigation : texte ou cases non liés ; E3-4 : variantes a et b empilées partout ; E3-7 : boutons non liés ; E3-6 : tableau empilé sur mobile ; fil d'Ariane (E3-1) et étapes (E4-1) dans l'en-tête.
- Colonnes à partir de 1200 px (diagnostic 2/3 – 1/3, produit 60 % – 40 %) ; à 768 px tout en une colonne sauf les grilles de cartes.
- Accueil révisé (10 blocs) : E1-2 bandeau d'avis sobre (5 étoiles en carrés, note, nombre d'avis, [Logo exemple], aucun vrai logo ni nom de plateforme) ; E1-6 protection de la personne (froid : gilets, gants chauffants, sous-vêtements thermiques ; chaleur : gilets refroidissants, casquettes, bandanas ; chutes : gilets anti-chute, harnais, longes), nombre non figé, liens vers `diagnostic.html` faute d'autre page ; E1-8 réassurance déplacée entre « Comment ça marche » (E1-7) et crash-test (E1-9) ; pied E1-10.
- Panier : délai de livraison en E4-2 (usine, intervention de l'artisan si option pose, date estimée) et rappelé en E4-4. Chiffres, prix, références, délais : « 000 » ou « 00 », textes provisoires.

## À tester par moi
Sur un vrai téléphone et dans au moins deux navigateurs, sur `/lot-1/` puis `/wireframes/` après fusion. Pour chaque écran : tous les éléments du cahier des charges sont-ils présents ? l'ordre sur mobile est-il juste ? quels blocs déplacer, supprimer ou ajouter, désignés par leur code `E<écran>-<n>` ?

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-1` vers `main` (https://github.com/Nowyyy/Plateforme-Commerciale/compare/main...lot-1?expand=1), fusionner avec « Create a merge commit », attendre le déploiement, vérifier `https://nowyyy.github.io/Plateforme-Commerciale/wireframes/`.
