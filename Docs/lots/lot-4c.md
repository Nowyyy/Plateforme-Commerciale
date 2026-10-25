# Lot 4c — Carte réelle du diagnostic : consentement, fond OpenStreetMap ou Plan IGN, calques Géorisques
**Livré.** A : Leaflet 1.9.4 copié (`assets/vendor/leaflet/`, SHA-256 testé), `carteReelle` dans `diagnostic.json`, `carte-reelle-logique.js` pur, consentement, géocodage, carte de base. B : calques WMS Géorisques, fonds OpenStreetMap / Plan IGN avec repli automatique, attributions, légende, accessibilité. C : micro-texte de l'accueil, parcours, confidentialité, mesures. Une seule dépendance (Leaflet), workflow inchangé, aucun stockage du consentement. Tout est simulé : la session n'atteint aucun des trois services.
**Choix.** Légende, fonds et mention du score préparés dès le clic d'accord (hors CLS) ; mention d'adresse du diagnostic raccourcie pour garder son nombre de lignes ; couches : une requête WMS par calque (`uppercase: true`).
## Critères (chiffres)
- Vitest 548 → 612 (64 nouveaux : 29 + 28 + 7) ; Playwright 551 → 585 (34 nouveaux : 13 + 13 + 8) ; lint propre ; tests intermittents connus : aucun échec.
- Largeurs vues : 375, 768, 1440 px (états initial, panneau, carte réelle, retour, échec) : console propre (hors « Failed to load resource » des échecs simulés), aucun débordement, axe sans violation. JavaScript désactivé : seul le `noscript`.
- 1440 px : cadre de la carte 339,3 × 254,5 px = cadre du schéma (4:3) ; carte et score 389,3 px ; équipements 778,7 px (≥ 1,8 ×) ; écart des bas de colonne 0 px.
- Confidentialité : 0 requête externe avant l'accord ; ensuite trois hôtes ; l'adresse dans 1 requête (`/geocodage/search`) ; `Referer` = origine ; aucune API de risques ni géocodage inverse ; aucun stockage, cookie ni IndexedDB.
- Parcours `parcours-carte` : 2,5 s à 375 px, 2,3 s à 1440 px, 5 pages, aucune donnée dans les URL.
- Lighthouse mobile du diagnostic (état initial, 5 passes, médianes) : `main` 75 / 100 / 100 ; `lot-4c` 75 / 100 / 100 (performance / accessibilité / bonnes pratiques) ; la performance reste sous 90 (problème connu, lot 10a, non corrigé) ; CLS Lighthouse 0,453 des deux côtés (sans retard simulé).
- CLS de 360 à 1440 px, JSON retardés de 400 ms : `main` 0,012 au plus, `lot-4c` 0,008 ; à l'ouverture de la carte réelle : écart de 0,000 (objectif 0,02). Accueil : identique à `main` (0,005 au plus).
- Poids de transfert du diagnostic (état initial, aucune ressource de carte) : 229,9 Ko → 263,3 Ko (+33 Ko : données, modules, feuille de style) ; `CLAUDE.md` 8 778 caractères ; `conventions.md` 149 lignes.
## Tests adaptés (avant / après)
- `comparateur-a`, `sav-a-pages` : `apercu.txt` exactement « Comparateur de solutions » → ce contenu ou « Carte réelle avec consentement ». `jetons` : couleurs hexadécimales hors `css/tokens.css` → idem hors `assets/vendor/`.
## Points ouverts
Londres et le sud-est de l'Angleterre tombent dans la boîte de la métropole (latitude 41-52, longitude -6-10) ; titres officiels des couches inconnus (libellés génériques) ; Chrome et Safari non essayés ; services réels non essayés depuis la session ; performance du diagnostic < 90 (lot 10a).
## Choix à valider
- Texte du consentement et de l'avertissement (provisoires) ; couches retenues et libellés génériques (à raffiner avec les titres officiels) ; seuil de score 0,5 ; zoom initial 14.
- Fond OpenStreetMap par défaut, repli automatique sur le Plan IGN ; consentement non mémorisé ; chaleur sans calque réel ; attributions ; exclusion de `assets/vendor/` d'ESLint et du test de couleurs.
## À tester par moi
Sur un vrai téléphone en données mobiles (Safari, si possible Chrome), puis sur ordinateur, sur `/lot-4c/` : saisir une adresse réelle, arriver au diagnostic ; « Afficher la carte réelle » : lire le texte, refuser, puis accepter ; la carte s'affiche à la bonne adresse ; cocher et décocher les quatre calques ; passer en Plan IGN ; zoomer et déplacer au doigt ; revenir au schéma ; essayer une adresse hors de France ou fantaisiste ; recharger : l'accord est redemandé ; dire si les zones d'inondation, d'argiles et de feux de forêt sont lisibles et crédibles à l'endroit testé ; impression « calme et technique » ; blocs à ajuster désignés par `E2-5` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-4c/`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-4c` vers `main` (lien dans le dernier message), fusionner avec « Create a merge commit », ne pas supprimer la branche, vérifier `/`, `/diagnostic.html` et `/lots/` sur le site.
