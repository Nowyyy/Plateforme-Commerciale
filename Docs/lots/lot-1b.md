# Lot 1b — Correctifs d'agencement des wireframes (accueil et diagnostic)

## Livré
- Accueil : le bandeau d'avis passe entre la réassurance et le crash-test (partie A).
- Diagnostic : équipements à gauche, score puis carte à droite, carte à la largeur du score (partie B). Chaque bloc porte `data-role` en plus de `data-bloc`.

## Correspondance des codes (ancien → nouveau)
- Accueil : hero E1-3→E1-2, recherche E1-4→E1-3, aléas E1-5→E1-4, protection E1-6→E1-5, comment E1-7→E1-6, réassurance E1-8→E1-7, avis E1-2→E1-8 ; en-tête, crash-test (E1-9) et pied (E1-10) inchangés.
- Diagnostic : équipements E2-5→E2-3, carte E2-3→E2-5 ; en-tête, adresse, score (E2-4) et pied inchangés.

## Critères
- Tests : Vitest 26 (21 + 5 nouveaux), Playwright 26 (20 + 6 nouveaux) ; lint propre.
- 1440 px : largeur carte = largeur score = 410,7 px ; équipements 821,3 px (2,0 × le score) ; haut équipements = haut score (écart 0 px) ; hauteur équipements 999 px, bas équipements = bas carte (écart 0 px, seuil 80 px) ; carte 633 px.
- Lighthouse mobile (accueil, diagnostic) : performance 100, accessibilité 100, bonnes pratiques 100 (seuils 90/95/95).

## Points ouverts
- Pas pu ouvrir `/lot-1b/` depuis la session : déploiement non vérifié. Le bas des deux colonnes coïncide parce que le bloc équipements s'étire à la hauteur de la colonne de droite (cartes à rangées égales) : les cartes ont de l'espace libre.

## Choix à valider
- Ordre mobile du diagnostic : adresse, équipements, score, carte (ordre du HTML, sans `order`).
- Cartes d'équipements horizontales dès 768 px (image 40 %, texte 60 %), verticales en dessous.
- Carte : ratio 4:3 partout (c'était déjà le ratio actuel) ; calques empilés sous le rectangle dès 1200 px.
- Accueil : réassurance et avis restent deux blocs distincts, séparés par l'espacement existant.
- Ajout de `data-role` sur tous les blocs ; équipements sur une seule cellule de grille (pas deux rangées), la colonne de droite regroupant score et carte.

## À tester par moi
- Sur un vrai téléphone et deux navigateurs, `/lot-1b/` : accueil (ordre réassurance, avis, crash-test) ; diagnostic sur grand écran (carte plus petite, équipements agrandis, bas des deux colonnes) ; ordre sur mobile ; blocs à ajuster, désignés par leur code.

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-1b` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/wireframes/` sur le site.
