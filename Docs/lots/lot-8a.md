# Lot 8a — Panier à plusieurs lignes : aperçus repliables, quantités, ajout pour les dix produits

**Livré.** Session `panier` (v 2, lignes `{ produit, mode, cotes|null, quantite }`, sans prix) à la place de `commande`, logique pure `lignes-logique.js`, quantité et « Ajouter au panier » pour les dix produits (confirmation sans redirection, deux liens), panier en lignes aperçues avec détails repliables (cotes, aperçu schématique, délais), quantités, « Retirer » / « Annuler », lignes invalides signalées, responsabilité et case seulement pour les lignes sur mesure, totaux et délais les plus longs, compteur d'en-tête (`compteur.js`, clé `compteur`). Tailles : h1 28 px (36 px dès 768 px), h2 22 px, corps 16 px.

**Critères chiffrés.** Vitest : 356 tests (305 au départ, 33 fichiers). Playwright : 345 tests (321 au départ). Propriétés : 80 scénarios (10 produits x 2 modes x 4 quantités), 240 cas de fusion, 80 x 3 suites pour l'ordre et les totaux ; grille de 2 091 cotes validée contre `evaluerCotes`. `cotes-c` : 80 exécutions sur 80 en charge après correction. Lint sans erreur.
- Largeurs vues : 375, 768 et 1440 px, tous les états (vide, illisible, 1 ligne, 3 lignes repliées et dépliées, 10 lignes, invalide, confirmé) : console propre, axe sans violation, aucun débordement, aucune requête externe.
- Mesures à 1440 px : liste 701 px, total 467 px (rapport 1,50), haut de la liste = haut du total (175,6 px).
- Lighthouse mobile (3 lignes, détails fermés puis ouverts, case décochée puis cochée) : performance 95, accessibilité 100, bonnes pratiques 100.
- CLS (JSON retardés de 400 ms, 360 à 1440 px, compteur compris) : 1 ligne 0,039 au plus ; 3 lignes 0,012 ; 10 lignes 0,030 ; invalide 0,063 ; vide 0,062. Fiche, accueil et diagnostic : 0,005 au plus avec compteur.
- Parcours multi-lignes cliqué : 2,8 s à 375 px, 3,0 s à 1440 px, 8 URL sans donnée du panier. `CLAUDE.md` : 8 681 caractères.

**Tests adaptés (avant / après).** `cotes-c.e2e` : « l'ajout écrit `commande` et mène au panier » / « l'ajout écrit `panier`, la fiche reste, « Voir le panier » mène au panier » (3 tests dont stockage indisponible : message dédié au lieu de la navigation) ; tabulation depuis la tolérance : 1 / 3 pas (quantité). `parcours-principal.e2e` : navigation directe / clic sur « Voir le panier » ; `commande` / `panier` ; « Modifier mes cotes » / « Reprendre ces cotes à la fiche » (la fiche affiche « 1200 », entiers de la ligne) ; commande refusée / ligne « À vérifier » ; CLS : DIY, pose, vide, invalide / 7 cas. `panier-b.e2e` : une commande / une ligne (totaux « Matériel (1 article) », aperçu dans le détail, clavier depuis « Voir les cotes »). `panier-a.e2e` remplacé par `lignes-b.e2e`. `cotes-a.test`, `cotes-c.test` : `construireCommande` / `construireLigne`. `panier-a/b/c.test` : `validerCommande` / `validerPanier` (grille de cotes conservée). `produit-c.test`, `cotes-c.test` : 1 / 6 boutons dans `<main>`.

**Points ouverts.** Avec `reducedMotion`, `base.css` donne 0,01 ms de transition à toute propriété : une lecture immédiate de `getComputedStyle` rend l'ancien style (cause des échecs vus) ; les tests utilisent `toHaveCSS` / `toHaveText`. Un panier dont des lignes ont une forme invalide les perd à la prochaine écriture. Largeur 320 px : le bouton Menu passait déjà à la ligne avant le lot. Lighthouse non rejoué sur les autres pages. Aperçu `/lot-8a/` non vérifiable depuis la session.

**Choix à valider.**
- Limites de 10 unités et 10 lignes (exemples, données) ; `plafonnee` quand le total demandé dépasse 10.
- Identité d'une ligne = produit, mode, cotes, tolérance ; la quantité n'y entre pas.
- Textes d'ajout, de retrait et d'annulation ; clé `article` (singulier) ajoutée ; libellés de quantité de la fiche réutilisés dans le panier.
- « Reprendre ces cotes à la fiche » et son aide ; une seule case de confirmation.
- Délais les plus longs par maxima numériques ; aucune barre fixe sur mobile.
- Compteur : `compterArticles(brut, 100)` pour distinguer « 99+ » ; événement `panier:modifie` (le `storage` ne part pas dans l'onglet qui écrit) ; sous 480 px le nombre remplace le pictogramme.
- Ordre des blocs inchangé ; produits non complets sans cotes ; panier vidé : clé supprimée.

**À tester par moi** (téléphone et deux navigateurs, sur `/lot-8a/`) : ajouter le batardeau en deux quantités et deux configurations, un autre produit en plusieurs exemplaires, observer la confirmation et les deux liens ; aperçus lisibles, détails dépliables, quantités, « Retirer » puis « Annuler » ; case de confirmation seulement pour les lignes sur mesure ; totaux justes ; compteur d'en-tête ; confirmation simulée ; impression « calme et technique » ; blocs à ajuster : `E3-4`, `E3-5`, `E4-1` à `E4-6` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-8a/`.

**Fusion (à faire par moi).** Ouvrir la Pull Request `lot-8a` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/`, `/diagnostic.html`, `/produit.html`, `/panier.html` et `/lots/`.
