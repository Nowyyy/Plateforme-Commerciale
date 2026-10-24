# Lot 4b — Test de faisabilité de la carte réelle (outil jetable, non fusionné)
**Livré.** A : `assets/outils/faisabilite-logique.js` (pur : Web Mercator, URL, analyses, verdicts, rapport), page, huit sondes séquentielles, tableau, conclusions, rapport à copier, `apercu.txt` (technique), `Docs/ref/faisabilite-carte.md`. B : saisie facultative d'un nom de couche et « Relancer cette sonde », tableau lisible à 375 px (zone défilante focalisable, première colonne figée), tests, mesures, bilan. Aucune dépendance, `CLAUDE.md` et workflow inchangés, aucun tag.
**Choix.** `carteReellePossible` vaut `true`, `false` ou `'inconnu'` (inconnu si une sonde non testée pourrait encore le rendre vrai) ; libellé « Horodatage (date et heure) » dans le rapport (le fichier de logique ne contient pas le mot `Date`) ; boutons « Copier le rapport » et « Relancer cette sonde » créés par JavaScript (un seul `<button>` dans le HTML) ; paramètre `essai=<horodatage>` ajouté aux images ; la zone de saisie n'apparaît que si aucune couche d'inondation n'a été lue ; la sonde 8 utilise l'hôte (avec ou sans `www`) où la couche a été trouvée.
## Critères (chiffres)
- Vitest : 548 → 596 (48 nouveaux : 41 + 7) ; Playwright : 551 → 569 (18 nouveaux : 9 + 9), 568 verts à la dernière exécution complète ; lint propre ; toutes les requêtes externes interceptées, aucune requête réelle.
- 375, 768 et 1440 px (avant, réussi, échecs, relance) : console propre (hors « Failed to load resource » des échecs simulés), aucun débordement, axe sans violation ; JavaScript désactivé : seul le `noscript` ; aucune écriture de stockage, de cookie ni d'IndexedDB ; huit requêtes séquentielles vers les quatre hôtes.
- Lighthouse mobile (avant clic) : performance 99, accessibilité 100, bonnes pratiques 96 (SEO sans objet, `noindex`) ; CLS 0 ; LCP 1,7 s.
## Tests adaptés (avant / après)
- `comparateur-a` et `sav-a-pages` : `apercu.txt` exactement `index.html / hifi / Comparateur de solutions` → ce contenu ou celui de la page de test (`toContainEqual`).
## Test intermittent (non lié au lot)
`pro-b.e2e.js` « mise en page… une colonne à 375 px » échoue 2 fois sur 5 en relance isolée (mesure juste après `setViewportSize`, sans attente de la mise en page) ; page non touchée par le lot, test non modifié, à traiter hors lot.
## Essai réel de l'agent
Non testable depuis la session : le proxy sortant répond 403 à `data.geopf.fr` (essai unique de la partie A). Rien n'a été simulé ; aucun script `sonde-reelle.mjs` écrit. Premier rapport du propriétaire (Safari, iPhone) reçu en conversation : huit sondes lisibles sauf le WMS sans `www`, bloqué en 31 ms.
## Points ouverts
Le chemin de l'API Géorisques n'est pas vérifié dans la documentation officielle ; la couche d'inondation est choisie par son nom (`PPRN_COMMUNE_GASPAR` sur iPhone), ce qui ne prouve pas qu'elle montre des zones inondables ; aucune couche d'argiles reconnue ; l'image du calque a pris 6,8 s ; adresse non ouverte depuis la session.
## Choix à valider
- Adresse testée : hôtel de ville de Paris (4 place de l'Hôtel de Ville), score de géocodage affiché.
- Huit sondes dans cet ordre, une à la fois, délai de 10 s.
- Chemin d'API `gaspar/risques` non vérifié.
- Noms d'hôte avec et sans `www` testés séparément.
- `carteReellePossible` : géocodage ok, un fond (OSM ou IGN) ok et image de calque ok ; `'inconnu'` si une sonde non testée pourrait le changer.
- Aucune recommandation : le rapport donne des états.
## À tester par moi
Ouvre `https://nowyyy.github.io/Plateforme-Commerciale/lot-4b/assets/outils/faisabilite.html` sur ton téléphone en données mobiles, puis sur ton ordinateur dans une fenêtre privée sans extension, puis une troisième fois avec tes extensions. Chaque fois : « Lancer le test », attends la fin, « Copier le rapport », colle-le dans la conversation de cadrage (les trois rapports). Ne saisis aucune donnée personnelle (le nom de couche, facultatif, n'est proposé que si aucune couche n'est lue).
## Suite
Ce lot n'est pas fusionné. Après lecture des rapports, le lot 4c (carte réelle avec consentement) est écrit ou abandonné.
