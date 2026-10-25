# Lot 4b — Test de faisabilité de la carte réelle (outil jetable, non fusionné)
**Livré.** A : `assets/outils/faisabilite-logique.js` (pur : Web Mercator, URL, analyses, verdicts, rapport), page, huit sondes séquentielles, tableau, conclusions, rapport à copier, `apercu.txt` (technique), `Docs/ref/faisabilite-carte.md`. B : saisie facultative d'un nom de couche et « Relancer cette sonde », tableau lisible à 375 px (zone défilante focalisable, première colonne figée), tests, mesures, bilan. C : page `assets/outils/couches.html` (catalogue WMS en familles, galerie de tuiles d'essai avec jugements, lecture de l'API, rapport), `couches-logique.js` pur, `Docs/ref/faisabilite-couches.md`. D : exclusion des couches `ENJEUX_*` et « Limites de commune » de la famille inondation. Aucune dépendance, `CLAUDE.md` et workflow inchangés, aucun tag.
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
Non testable depuis la session : le proxy sortant répond 403 à `data.geopf.fr` (essai unique de la partie A). Rien n'a été simulé ; aucun script `sonde-reelle.mjs` écrit.
## Rapports du propriétaire (5, déployé sur `/lot-4b/`)
iPhone Safari (3, dont un en navigation privée) ; PC Firefox 158 avec bloqueurs ; PC Firefox 158 en navigation privée sans extension. Identiques : 7 sondes ok, WMS sans `www` bloqué (`TypeError`, 24 à 201 ms) avec et sans extension, WMS avec `www` ok (1,56 à 1,69 s, 222 couches), image de calque ok mais lente (6,76 à 7,10 s). Carte réelle possible : oui dans les 5. Non testé : Chrome, hors de France.
## Points ouverts
Cause du blocage du WMS sans `www` inconnue (serveur ou redirection sans CORS, non prouvé) ; chemin de l'API Géorisques non vérifié ; couche d'inondation choisie par son nom (`PPRN_COMMUNE_GASPAR`, rien ne prouve qu'elle montre des zones inondables) ; aucune couche d'argiles reconnue ; adresse non ouverte depuis la session.
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
## Parties C et D (catalogue des couches)
- **Chiffres.** Vitest 596 → 617 (21 pour la page des couches) ; Playwright 569 → 581 (12 nouveaux, services simulés, aucune requête réelle) ; un échec isolé de `compte-c.e2e.js:145` (mise en page sous charge) passé 3 fois sur 3 en relance, test non modifié. Commits `eebaf42` (C) et `c74c87c` (D).
- **Rapports du propriétaire (PC Firefox ×2, iPhone Safari).** Catalogue de 222 couches lu en 1,7 à 1,9 s (avec `www`) ; API `gaspar/risques` et `rga` en 200 (chemin RGA confirmé, exposition moyenne à Toulouse) ; 17 tuiles essayées, toutes `ok`, 0,3 à 1,0 s sauf `GEORISQUES_SERVICES` (10 à 11 s, deux fois sur PC, non cochée sur iPhone).
- **Jugements.** « Montre bien la zone » : `ALEARG` (Toulouse), `PPRN_COMMUNE_FEU_APPROUV` (Aix), `PPRN_COMMUNE_RISQINOND_PRESCRIT`, `ALEA_SYNT_01_04FAI_FXX`, `COMMUNE_FXX`, `INSTALLATIONS_CLASSEES_SIMPLIFIE_GE`. « Ne montre rien » (iPhone, Paris) : `ALEA_SYNT_01_01FOR_FXX`, `ALEA_SYNT_02_02MOY_FXX`, `ALEA_SYNT_02_04FAI_FXX`. Jugement subjectif, un lieu et un zoom par famille : aucune couche recommandée.
- **Familles.** Avant D : inondation 103, argiles 3, feux 3, chaleur 0. Après D : inondation 80 (lu en ligne), les autres inchangées. Chaleur reste à 0 : aucun nom ni titre du catalogue ne la contient.
- **Points ouverts.** Les 23 couches exclues par D ne sont pas toutes relues ; durée de `GEORISQUES_SERVICES` non mesurée sur mobile ; les `ALEA_SYNT_*` vides à Paris (lieu, zoom ou absence de zone ?) ; aucune couche de chaleur trouvée ; Chrome et hors de France non testés ; adresse des tuiles lentes à confirmer.
- **Adresse.** `https://nowyyy.github.io/Plateforme-Commerciale/lot-4b/assets/outils/couches.html`.
