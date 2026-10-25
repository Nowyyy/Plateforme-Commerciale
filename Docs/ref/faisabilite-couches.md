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

## Partie D : motifs de familles (après les rapports du propriétaire)
- Rapports PC et iPhone : 222 couches ; inondation 103, argiles 3, feux 3, chaleur 0. Le bruit venait des couches `ENJEUX_*` et `COMMUNE_FXX` (« Limites de commune… »), qui citent l'inondation sans montrer de zone.
- `FAMILLES.inondation.exclusion` : nom commençant par `enjeux` ou titre commençant par « limites de commune » ; ces couches restent dans « Tout le catalogue ». Les `PPRN_COMMUNE_*`, `ALEA_SYNT_*`, `ISO_HT_*` et `OUV_*` restent classés.
- Chaleur reste à 0 : aucun nom ni titre du catalogue ne contient `chaleur`, `canicule`, `température` ni `îlot` ; aucun motif n'est inventé.
- Non vérifié : les 78 couches de la liste tronquée (rapport limité à 25 lignes) ; l'effet exact sur l'effectif d'inondation se lira sur le prochain rapport.
