# Lot 4b-C : catalogue des couches et galerie (outil jetable, non fusionné)

Page `assets/outils/couches.html`, aperçu `/lot-4b/assets/outils/couches.html`. Aucune requête avant un clic ; tout part du navigateur du propriétaire, sur des lieux publics fixes (Paris, Toulouse, Aix-en-Provence) ; aucun stockage.

## Parcours
1. « Lire le catalogue des couches » : un GetCapabilities (`www`), 10 s de délai ; états `bloque`, `http`, `delai` affichés, la page s'arrête là en cas d'échec.
2. Quatre familles repliables (inondation, argiles, feux de forêt, chaleur) et « Tout le catalogue » avec recherche libre ; six couches cochées au plus (la 7e est refusée par un message, sans `disabled`).
3. « Afficher les tuiles d'essai » : par couche, deux chargements WMS 1.3.0 (EPSG:3857, 256 × 256, paramètre `essai` distinct) posés sur la tuile OSM de mêmes z/x/y ; délai 15 s ; trois jugements en boutons radio.
4. « Lire l'API Géorisques » : `gaspar/risques` (Paris) puis `rga` (Toulouse, chemin non vérifié), contenu aplati (40 lignes au plus).
5. « Générer le rapport » puis « Copier le rapport » (texte à coller dans la conversation de cadrage).

## Choix
- Familles par motifs d'affichage normalisés (sans accents ni casse) ; jetons courts (`tri`, `azi`, `rga`, `old`, `ppri`) entourés de séparateurs, jamais de `\b`. `ALEARG` donne argiles ; `PPRN_COMMUNE_GASPAR` seul ne donne rien.
- La galerie suit l'ordre du catalogue ; les cartes en échec sont `image-echec` (erreur ou délai) ; le calque en échec est masqué.
- Boutons créés par JavaScript sauf « Lire le catalogue » (un seul bouton dans le HTML).

## Vérifié / non vérifié
- Vérifié : logique pure (20 tests Vitest) et page entière avec services simulés (12 tests Playwright, aucune requête réelle).
- Non vérifié : tous les services réels (proxy de la session refusé), noms réels des couches, valeur du jugement. Aucune couche n'est recommandée.
