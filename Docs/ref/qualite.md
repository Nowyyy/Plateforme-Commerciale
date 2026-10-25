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
