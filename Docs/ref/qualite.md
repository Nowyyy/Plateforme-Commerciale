# Qualité technique : mesures (lot 10a)
Toutes les mesures simulent les services tiers (le proxy refuse les vrais) et ne portent pas sur l'adresse publiée : jamais des scores réels. Seuils fixés au lot 0, jamais modifiés : performance 90, accessibilité 95, bonnes pratiques 95 (médiane de 3 passes, SEO exclu : `noindex`), CLS 0,1 (objectif 0,08), console sans erreur.
Outils : `npm run matrice` (Lighthouse), `node tests/outils/cls-matrice.mjs` (55 largeurs, JSON +400 ms), `node tests/outils/mesures-pages.mjs [largeur]` (poids, requêtes, console), `npm run empreinte:maj`.

## Documentation (correspondance ancien `conventions.md` vers `Docs/ref/conventions/`)
- `generales.md` : Pied et en-tête, Fond et relief, Listes et gabarits, Liens externes, Git, Pièges déplacés (lot 8d), tests de couleur et de clics (lot 8a), règles 4c « donnée revalidée » et « aucun id dans les gabarits ».
- `accueil.md` : Accueil. `diagnostic.md` : Diagnostic, Exposition et équipements (4e-B), Carte réelle, Saisie d'adresse. `produit.md` : Fiche produit, Cotes.
- `panier.md` : Panier, Panier à plusieurs lignes (8a). `comparateur.md` : Comparateur (9) et règle 4c du comparateur.
- `formulaires.md` : Formulaires (8b), Compte (8c), SAV (8d), règles 4c compte, SAV et demandes d'exemple.
- Règles retirées ou abrégées dans `CLAUDE.md` : reprises mot pour mot en fin de fichier, section « Règles durables extraites de `CLAUDE.md` » (`generales`, `diagnostic`, `panier`, `produit`, `formulaires`, `comparateur`). `CLAUDE.md` : 8 991 puis 7 468 caractères ; `conventions.md` : 171 puis 16 lignes.

## Référence (partie A, 375 px pour poids et requêtes)
| Page | Perf. | Access. | Bonnes prat. | CLS Lighthouse | CLS 55 largeurs | Ko | Req. | Console |
|---|---|---|---|---|---|---|---|---|
| index | 96 | 100 | 100 | 0,002 | 0,005 | 259 | 31 | 0 |
| diagnostic | 93 | 100 | 96 | 0,002 | 0,023 | 461 | 62 | 0 |
| produit | 94 | 100 | 100 | 0,018 | 0,005 | 287 | 28 | 0 |
| panier | 93 | 100 | 100 | 0,002 | 0,021 | 293 | 28 | 0 |
| pro | 95 | 100 | 100 | 0,002 | 0,005 | 262 | 28 | 0 |
| connexion | 78 | 100 | 100 | 0,348 | 0,033 | 285 | 29 | 0 |
| compte | 96 | 100 | 100 | 0,002 | 0,055 | 282 | 29 | 0 |
| achats | 95 | 100 | 100 | 0,002 | 0,012 | 281 | 29 | 0 |
| achat | 94 | 100 | 100 | 0,012 | 0,026 | 298 | 29 | 0 |
| informations | 95 | 100 | 100 | 0,002 | 0,026 | 264 | 28 | 0 |
| sav-acces | 96 | 100 | 100 | 0,009 | 0,031 | 268 | 29 | 0 |
| sav | 94 | 100 | 100 | 0,002 | 0,005 | 307 | 30 | 0 |
| demandes | 95 | 100 | 100 | 0,002 | 0,025 | 291 | 30 | 0 |
| comparateur | 96 | 100 | 100 | 0,002 | 0,026 | 255 | 28 | 0 |

Sous les seuils : `connexion` (performance 78, CLS Lighthouse 0,348 alors que le CLS Playwright à 55 largeurs est de 0,033 : écart propre à la simulation de réseau lente de Lighthouse) ; `diagnostic` : bonnes pratiques 96 (au-dessus du seuil de 95). Liens internes cassés : aucun (test `liens-internes`).
Instabilités relevées : `pro-b` « une colonne à 375 px » et `compte-c` « mesures à 1440 px » lisaient la mise en page juste après `setViewportSize` : attente de `document.fonts.ready` et `expect.poll` ; 10 relances isolées vertes (`stabilite.e2e.js`).

## Candidats de code mort (à vérifier en partie B ; en cas de doute, conserver)
- Jetons : aucun inutilisé. Classes CSS : aucune sans occurrence (`leaflet-control-attribution` est posée par Leaflet).
- Règles jamais appliquées dans l'état nominal (`tests/outils/couverture-css.mjs`, surtout des états : survol, erreur, ouverture) ; vraisemblablement mortes : `.galerie__video`, `.galerie__panneau[data-type="video"] …` (aucune vidéo).
- Exports sans importeur dans `assets/js/` ni HTML (tests seulement) : `RAISONSCOMPTE`, `supprimerAccesSav`, `filtrerEquipements`, `niveauGlobal`, `RAISONS` (`pro-logique`), `ETATS`, `ETAPES` (`sav-logique`).
- Clés de données sans lecteur par nom : `compte.pages.compte.aucuneCommande`, `site.navigation.fonctionnement`, `diagnostic.carteReelle.geocodage.typesAcceptes` (lu par un test seulement). `Docs/apercus.txt` : lu par des tests (`workflow.test.js` et autres), donc conservé sauf décision contraire.

## Après corrections (partie B ; avant→après, médianes de 3 passes, 375 px pour poids et requêtes)
| Page | Perf. | Access. | Bonnes prat. | CLS Lighthouse | Ko | Req. | Console |
|---|---|---|---|---|---|---|---|
| index | 96→97 | 100→100 | 100→100 | 0,002→0,002 | 259→261 | 31→32 | 0 |
| diagnostic | 93→95 | 100→100 | 96→96 | 0,002→0,007 | 461→453 | 62→62 | 0 |
| produit | 94→94 | 100→100 | 100→100 | 0,018→0,018 | 287→277 | 28→28 | 0 |
| panier | 93→93 | 100→100 | 100→100 | 0,002→0,002 | 293→284 | 28→28 | 0 |
| pro | 95→96 | 100→100 | 100→100 | 0,002→0,002 | 262→252 | 28→28 | 0 |
| connexion | 78→95 | 100→100 | 100→100 | 0,348→0,01 | 285→276 | 29→29 | 0 |
| compte | 96→95 | 100→100 | 100→100 | 0,002→0,002 | 282→273 | 29→29 | 0 |
| achats | 95→94 | 100→100 | 100→100 | 0,002→0,002 | 281→272 | 29→29 | 0 |
| achat | 94→94 | 100→100 | 100→100 | 0,012→0,002 | 298→288 | 29→29 | 0 |
| informations | 95→96 | 100→100 | 100→100 | 0,002→0,002 | 264→255 | 28→28 | 0 |
| sav-acces | 96→95 | 100→100 | 100→100 | 0,009→0,009 | 268→258 | 29→29 | 0 |
| sav | 94→93 | 100→100 | 100→100 | 0,002→0,002 | 307→298 | 30→30 | 0 |
| demandes | 95→95 | 100→100 | 100→100 | 0,002→0,002 | 291→282 | 30→30 | 0 |
| comparateur | 96→96 | 100→100 | 100→100 | 0,002→0,002 | 255→245 | 28→28 | 0 |

CLS Playwright à 55 largeurs (JSON +400 ms) : inchangé, 0,055 au plus (`compte`, 360 px) ; `connexion` 0,033→0,032.
- `connexion` : le formulaire masqué n'avait aucune réserve : `connexion.js` arrivant après le rendu, la section « démo » descendait de 418 px (CLS 0,348, perf. 77). Réserve de la carte (`min-block-size` 30,6 / 29,2 / 27,8 rem par point de rupture). Le préchargement d'Inter 600 n'y changeait rien (testé).
- `diagnostic` bonnes pratiques 96 : « images basse résolution » = tuiles Leaflet de 256 px sous un DPR de 1,75 (propre à la carte, inchangé ; seuil de 95 tenu).
- Relief : `achat` à 375 px, `index`, `panier`, `achat`, `comparateur` à 768 px chevauchaient du texte hors carte (10 cas) : positions verticales par page dans `commun.css` (décor, couleur, opacité inchangés) ; 0 chevauchement après. À 768 px le groupe 1 de l'accueil passe en grande partie derrière la première carte blanche.
- CSS : `accueil.css` scindé (26,5 Ko) en `commun.css` (15,2 Ko, 14 pages) et `accueil.css` (11,6 Ko, accueil seul) ; empreinte identique. Préchargement d'Inter 600 (`diagnostic`, `comparateur`) retiré : aucun gain (perf. 93→94 et 96→96, 5 passes).
- Aide d'adresse masquée si l'adresse est valide ou déjà affichée : aucun écart d'empreinte (le plancher de hauteur absorbe le retrait ; `ecarts-autorises-10a-b.json` vide).
- Carte : un échec de Leaflet, du fond ou de la création garde les lectures de l'API (niveau et aléas lus) ; géocodage en échec : inchangé.
- Code mort retiré : export `ETAPES`, clés `compte.pages.compte.aucuneCommande` et `site.navigation.fonctionnement`. Conservés (tests les lisent) : `RAISONSCOMPTE`, `RAISONS`, `ETATS`, `supprimerAccesSav`, `filtrerEquipements`, `niveauGlobal`, `Docs/apercus.txt`. `.galerie__video` n'est pas mort (vue vidéo des données).

## Final (partie C ; performance/accessibilité/bonnes pratiques en médiane de 3 passes, CLS Playwright à 55 largeurs)
| Page | Page |
|---|---|
| index 97/100/100, CLS 0,005 | diagnostic 94/100/96, CLS 0,023 |
| produit 94/100/100, CLS 0,005 | panier 93/100/100, CLS 0,021 |
| pro 95/100/100, CLS 0,005 | connexion 95/100/100, CLS 0,032 |
| compte 95/100/100, CLS 0,055 | achats 95/100/100, CLS 0,012 |
| achat 95/100/100, CLS 0,026 | informations 96/100/100, CLS 0,026 |
| sav-acces 96/100/100, CLS 0,031 | sav 94/100/100, CLS 0,005 |
| demandes 95/100/100, CLS 0,025 | comparateur 96/100/100, CLS 0,026 |

Toutes les pages atteignent les seuils (90/95/95, CLS 0,1 ; objectif 0,08 tenu partout, 0,055 au plus). Poids à 375 px : 4 093 → 3 974 Ko pour les 14 pages (index +2 Ko et +1 requête : `commun.css` et `accueil.css`) ; console : 0 message partout ; liens internes : aucun cassé ; requêtes externes : seulement la carte et la saisie d'adresse (simulées).
Accessibilité (partie C) : un `h1` et aucun saut de titre, repères, `title` uniques, clavier sans piège, lien d'évitement, focus visible ≥ 3:1, aucun défilement horizontal à 320 px, axe sans violation à 320, 375, 768 et 1440 px. Corrigés : titre de galerie de `produit` (h2 masqué avant le h1, devenu `p` nommant la section), noms distincts des liens « Reprendre… » du panier (`reprendreAria`). Reste, sans correction (hors périmètre) : à 320 px, l'étiquette « En situation » des vignettes de `produit` se coupe en milieu de mot.
**Lot 10c-A (écarts d'empreinte, `diagnostic` seule ; plancher de `legende` remesuré par `tests/outils/mesure-legende.mjs`)** : les entrées réservent libellé + 8 rem pour l'image officielle ; `legende` 424→1026 px (375), 267→581 (768), 301→546 (1440) ; `exposition`, `equipements`, `pied` décalés de +601, +313, +245 px (hauteurs inchangées, sauf `exposition` 839→1084 px à 1440 px, étirée sur `legende`). CLS 0,005 avant et après ; services simulés, jamais des scores réels.
