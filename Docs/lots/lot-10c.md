# Lot 10c — Retouches client : légende officielle de la carte, catégorie « Protection de la personne » chez les vendeurs
Aperçu : `/lot-10c/` (non vérifiable depuis la session). Services tiers et images de légende simulés : aucun score ni résultat réel. Parties A et B faites en deux sessions, puis retouche après retour du client sur le rendu réel de la légende (grille, phrases et entrée « Votre adresse » retirées, série des argiles rognée).
## Livré
A : légende officielle (image `GetLegendGraphic` par couche cochée) à la place des pastilles génériques ; `urlLegendeWms`, `entreesLegende`, `etatLegende` (logique pure) ; `carteReelle.legende` (données) ; états chargement et échec ; plancher de `legende` remesuré (`tests/outils/mesure-legende.mjs`). B : catégorie `protection-personne` en dernier dans `pro.html` (groupe « Aléas et catégories couverts », aide et message `vide` adaptés), réserve de hauteur du formulaire remesurée.
## Choix
Image à taille naturelle (8 rem au plus, réserve de 5 rem, opacité = couche ; une image plus haute que 5 rem agrandirait le cadre) ; nom technique de la couche conservé en texte masqué ; entrées en grille de colonnes égales dès 768 px (15 rem au moins), une colonne dessous, réserve de 8 rem levée quand l'image est reçue ; légende réarmée après un échec quand la carte est recréée ; libellé du lien du récapitulatif vendeur inchangé (« Aléas couverts par vos produits ») car seuls légende, aide et message `vide` devaient changer.
## Critères (chiffres)
- Vitest 778 → 807 (29 nouveaux : 21 + 8) ; Playwright 748 → 779 (31 nouveaux : 18 + 13) ; lint propre ; aucun test supprimé.
- Rectangles avant / après l'arrivée des images (réponse retardée de 2 s) : `legende`, `exposition`, `equipements`, `pied` identiques à 1 px, à 375, 768 et 1440 px.
- Lighthouse mobile (médiane de 3, `main` → `lot-10c`) : diagnostic 94 / 100 / 96 → 95 / 100 / 96 (poids 465 → 474 Ko, 62 → 66 requêtes : quatre images de légende) ; pro 96 / 100 / 100 → 96 / 100 / 100 (252 → 254 Ko). Seuils 90 / 95 / 95 atteints.
- CLS (JSON +400 ms, 360 à 1440 px) : diagnostic 0,005 → 0,005 (avec adresse et images : 0,005 au plus) ; pro 0,005 au plus (objectif 0,08) ; réserve du formulaire à 8 px au plus de la hauteur mesurée. Console : 0 message ; axe : 0 violation à 375, 768, 1440 px ; JavaScript désactivé : seul le `noscript`.
- `CLAUDE.md` : 7 484 caractères, inchangé ; workflow et dépendances inchangés ; aucune valeur hexadécimale ajoutée.
## Écarts d'empreinte justifiés (`diagnostic` et `pro` seules régénérées)
- `diagnostic` : entrées de légende = libellé + 5 rem (réserve ramenée de 8 à 5 rem après retour client : zone blanche ; images réelles de 25 à 65 px). `legende` 424 → 646 px (375), 267 → 371 (768), 301 → 371 (1440) ; `exposition`, `equipements`, `pied` décalés de +222, +104, +71 px ; `exposition` 839 → 910 px à 1440 px (étirée sur `legende`).
- `pro` : cinquième case d'aléas. `formulaire` 2257 → 2312 px (375, libellé sur deux lignes), 1644 → 1692 (768), 1622 → 1670 (1440) ; `pied` décalé d'autant.
## Tests adaptés (avant / après)
- `comparateur-a`, `sav-a-pages` : liste de titres d'`apercu.txt` autorisés, 5 → 6 titres. `pro-a.test` : égalité des cinq éléments avec l'accueil → quatre premiers égaux + cinquième `protection-personne`.
- `pro-b.e2e` : message « Cochez au moins un aléa » → « Choisissez au moins un aléa ou une catégorie » ; ordre de Tab : cinquième case insérée. `parcours-vendeur.e2e` : 4 → 5 Tab sur les cases. `carte-reelle-simulation.js` : images de légende simulées.
## Points ouverts
- **`GetLegendGraphic` n'est pas vérifié en réel** (paramètres inférés du GetCapabilities) ; si une légende affiche « indisponible », relever le nom de la couche.
- Le contenu de l'image (classes, niveaux, couleurs) n'est pas lisible par un lecteur d'écran : une phrase de la légende renvoie au service Géorisques.
- Retour client : l'image de légende des argiles contient deux séries (« Exposition forte, moyenne, faible » répétées) ; c'est le contenu du service, la moitié basse est masquée. Entrée « Votre adresse » retirée ; série répétée de l'image des argiles masquée (donnée `serieRepetee`, moitié haute seule : à retirer si le service corrige son image). Phrase « Elle suit les cases cochées… » et note Géorisques retirées (la note d'accessibilité demandée disparaît ; le lien « Source officielle » reste sous les cases). Test `sav-a-logique` intermittent sous forte charge (repassé seul).
## Choix à valider
- Phrases et « Votre adresse » retirées, rognage des argiles (retouche client) ; légende officielle plutôt que pastilles ; opacité de la légende = celle des couches (0,7) ; hauteur de 8 rem au plus.
- Texte d'échec sans fausse couleur ; groupe vendeur « Aléas et catégories couverts » ; une seule catégorie « Protection de la personne (froid, chaleur, chutes) » au lieu de trois.
## À tester par moi
Sur un vrai téléphone et deux navigateurs, sur `/lot-10c/` : saisir une adresse réelle, arriver au diagnostic, comparer la couleur des zones de la carte à la légende pour les trois calques (zone inondable, argiles, commune concernée par les feux de forêt) ; cocher et décocher chaque calque et vérifier que la légende suit ; si une légende affiche « indisponible », me dire laquelle (nom de la couche) ; sur `/pro.html`, vérifier la nouvelle case, tenter un envoi à vide, puis envoyer avec la seule nouvelle case ; impression « calme et technique » ; blocs à ajuster désignés par `E2-4`, `E5-4` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-10c/`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-10c` vers `main`, fusionner avec « Create a merge commit », ne pas supprimer la branche, vérifier `/diagnostic.html`, `/pro.html` et `/lots/` sur le site.
