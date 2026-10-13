# Lot 1 — Wireframes Lo-Fi des 4 écrans
**Livré** : `wireframes/` (index de validation + accueil 8 blocs, diagnostic 6, fiche produit 8, panier 6), `css/wireframe.css`, jetons `--wf-gris-*`, publication ajoutée au workflow Pages, tests, `CLAUDE.md` mis à jour.
**Choix** : niveaux de gris, sans JavaScript ni ressource externe, mobile d'abord (ruptures 768 et 1200 px, conteneur de 1280 px) ; annotations en dur permises dans `wireframes/` seulement.
**Critères** :
- Lint sans avertissement ; 18 tests Vitest verts (7 du lot 0 + 11 nouveaux : 4 + 3 + 4).
- 20 tests Playwright verts : 15 (5 pages × 375, 768, 1440 px : console propre, aucun débordement, axe sans violation, aucune requête externe) + 3 page d'attente + 2 parcours cliqué (375 et 1440 px, jusqu'au panier).
- Captures des 5 pages vues aux 3 largeurs.
- Lighthouse mobile (performance / accessibilité / bonnes pratiques) : index 100/100/100 ; accueil 99/100/100 ; diagnostic 100/100/100 ; produit 99/100/100 ; panier 100/100/100 (seuils 90 / 95 / 95 ; SEO exclu, pages `noindex`).
**Adresses (site `https://nowyyy.github.io/Plateforme-Commerciale/`)** :
- Racine `/` : contenu de `main` (production, page d'attente tant que `lot-1` n'est pas fusionné).
- `/lot-1/` : aperçu de la branche `lot-1`, redirige vers `/lot-1/wireframes/` (page principale du lot, lue dans `apercu.txt`). Après fusion, `/wireframes/` existe aussi à la racine.
- `/apercus/` : liste des aperçus de lots. Pages directes : `/lot-1/wireframes/accueil.html`, `diagnostic.html`, `produit.html`, `panier.html`.
- Règle durable : l'adresse par lot `/lot-N/` doit rester en place pour tous les autres lots (une branche `lot-N` + son `apercu.txt` suffisent) ; la page d'attente d'un lot y devient `attente.html`.
**Autorisation** : le propriétaire m'a donné l'autorisation explicite de modifier le workflow de publication de `main` (`.github/workflows/pages.yml`) et les réglages GitHub nécessaires (environnement `github-pages` : branches `main` et `lot-*` autorisées, fait par lui) pour obtenir une page par lot (commits 1-D et 1-E).
**Points ouverts** : push du tag `lot-1` tenté une fois (refus attendu, voir message final) ; workflow non exécuté avant la fusion ; `tests/outils/lighthouse.mjs` accepte désormais des chemins de pages en arguments.

## Choix d'agencement à valider
- Familles d'équipements des cartes E1-5 (absentes du seed) : batardeaux, clapets anti-retour, barrières anti-crue ; volets et stores résistants, films, protections de toiture ; grilles pare-braises, volets coupe-feu, pare-flammes ; brise-soleil, films solaires, stores extérieurs.
- E2-2 : « Tous » actif par défaut, bouton « Mettre à jour » ; E2-3 : premier calque coché ; E2-4 : niveau « élevé », repère sous le 3e segment.
- Pastilles, calques, libellés de navigation : texte ou cases non liés ; E3-4 : variantes a et b empilées sur tous les écrans ; E3-7 : boutons non liés.
- Écrans 2 et 3 : colonnes à partir de 1200 px (diagnostic 2/3 – 1/3, produit 60 % – 40 %) ; à 768 px tout reste en une colonne sauf les grilles de cartes.
- E3-6 : tableau dont les lignes s'empilent sur mobile ; E3-1 et E4-1 : fil d'Ariane et étapes placés dans le bloc d'en-tête.
- Chiffres, prix, références et libellés de chiffres clés : « 000 » et textes provisoires.

## À tester par moi
Sur un vrai téléphone et dans au moins deux navigateurs, sur `/wireframes/` après fusion. Pour chaque écran : tous les éléments du cahier des charges sont-ils présents ? l'ordre sur mobile est-il juste ? quels blocs déplacer, supprimer ou ajouter, désignés par leur code `E<écran>-<n>` ?

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-1` vers `main` sur GitHub (lien de comparaison dans le dernier message), fusionner avec « Create a merge commit », attendre le déploiement, vérifier `https://<compte>.github.io/<dépôt>/wireframes/`.
