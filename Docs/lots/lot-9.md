# Lot 9 — Comparateur de solutions (écran 14) et indicateur de niveau de risque
**Livré.** A : données (`aleas`, `performances`, objet `comparateur`), `comparateur-logique.js`, `comparateur.html` (sélection, pastilles d'aléa à jauge de 4 segments, cartes à cocher, session `comparaison`), workflow (publication de la page). B : `construireTableau`, tableau sémantique dans une zone défilante focalisable à première colonne figée, « Voir la fiche » (`produit-session.js`, partagé avec le diagnostic). C : lien « Comparer ces solutions » du diagnostic, entrée du pied, parcours, mesures.
**Choix.** Colonnes dans l'ordre de la sélection (ajout en fin) ; critères : inondations « Hauteur d'eau retenue » (cm), grêle et vents « Vitesse de vent supportée » (km/h), feux « Tenue au feu » (min), canicule « Réduction de température intérieure » (°C) ; page révélée par `data-comparateur` (module tardif sur réseau lent) ; texte du lien du diagnostic dans `diagnostic.json` (la page ne charge pas `produit.json`) ; réserves `.pied__grille[aria-busy]` d'`accueil.css` relevées de 2,75 rem (une entrée de pied en plus).
## Critères (chiffres)
- Vitest : 495 → 548 (53 nouveaux : 36 + 10 + 7) ; Playwright : 505 → 551 (46 nouveaux : 8 + 16 + 22) ; lint propre. Logique : 8 fonctions pures, propriété sur toutes les suites de 6 bascules (4 aléas et un aléa de 5 produits).
- Largeurs vues : 375, 768 et 1440 px ; console propre, aucun débordement, axe sans violation, aucune requête externe, JavaScript désactivé : seul le `noscript` est visible. Tableau de 1 024 px au plus à 1440 px ; à 375 px la zone défile (flèches) et la première colonne reste visible.
- Mesures à 1440 px (diagnostic) : carte 389,3 px = score 389,3 px ; équipements 778,7 px (2,0 fois le score) ; écart des bas de colonne 0 px.
- Lighthouse mobile : comparateur (3 produits) 96 / 100 / 100, CLS 0,002 ; diagnostic avant 76-77, CLS 0,441, après 74-75, CLS 0,453 (+0,012 sous Lighthouse, reporté au lot 10a ; mesure du lot, JSON retardés de 400 ms, 360 à 1440 px : 0,013 avant, 0,012 après). CLS comparateur 0,026 (aléa par défaut) et 0,028 (aléa à 2 produits). Relevé sans correction : index 96, produit 94, panier 94, pro 95, connexion 77 (CLS 0,348, identique sur `main`), compte 94, achats 95, achat 94, informations 95, sav-acces 95, sav 94, demandes 95.
- Parcours `parcours-comparateur` : 0,7 à 0,9 s chacun (4 cas) ; aucune donnée dans les URL. `CLAUDE.md` : 8 745 → 8 988 caractères.
## Tests adaptés (avant / après)
- `accueil-pied` : `sav.slice(1)` sans lien → `sav[1]` = « Comparer des solutions » puis `slice(2)` sans lien ; `pied.e2e` : liens du pied + « Comparer des solutions ».
- `sav-a-pages` : titre d'`apercu.txt` « Service après-vente simulé » → « Comparateur de solutions ».
## Points ouverts
- Diagnostic et connexion restent sous 90 en performance (CLS, lot 10a). Aperçu publié non ouvert depuis la session. Un commit de correction de lint suit le commit 9-B.
## Choix à valider
- Critères et unités propres à chaque aléa ; valeurs d'exemple (batardeau 60 cm et 12 min, comme sa fiche).
- Sélecteur d'aléa : pastilles avec jauge de 4 segments et texte de niveau ; aucune valeur « meilleure ».
- Tableau défilant, première colonne figée ; sélection de 2 à 3 produits, refus par message plutôt que `disabled`.
- Entrées : diagnostic et pied ; pas de wireframe (écran 14 défini par le prompt).
## À tester par moi
Sur téléphone et deux navigateurs, `/lot-9/` : « Comparer ces solutions » depuis le diagnostic ; changer d'aléa ; 3e puis 4e produit, décocher sous 2 ; lire et faire défiler le tableau au doigt ; « Voir la fiche » ; pied « Comparer des solutions » ; impression « calme et technique » ; blocs `E14-1` à `E14-4` ; `/lots/` : « Page Hi-Fi » mène à `/lot-9/`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-9` vers `main`, fusionner avec « Create a merge commit », ne pas supprimer la branche, vérifier `/`, `/diagnostic.html`, `/comparateur.html` et `/lots/`.
