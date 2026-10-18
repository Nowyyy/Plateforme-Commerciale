# Lot 4 — Diagnostic Hi-Fi
**Livré** : `diagnostic.html` (E2-1 à E2-6, `noindex`) : adresse de session modifiable, filtre par aléa (cartes de l'accueil → pastille), 3 équipements fictifs, score illustratif à jauge, carte SVG à 4 calques, lien Géorisques. `liens.diagnostic` pointe vers la page Hi-Fi ; seul changement de workflow : `diagnostic.html` ajouté aux chemins publiés.
**Choix** : `rendu.js` charge `data/<nom>.json` d'après `<html data-donnees>` ; `valider` extraite dans `adresse-validation.js` ; `data-id` posé sur les éléments de liste ayant un `id` ; `alea.js` mémorise l'aléa ; `lienExterneValide` contrôle `data-lien-externe` ; tailles : h1 28/36 px, h2 22, h3 18, corps 16.
**Critères** : Vitest 177 (+27), Playwright 186 (+26), lint propre, axe sans violation à 375/768/1440 px, aucun débordement, aucune requête externe.
**Mesures à 1440 px** : `equipements` 778,7 px, `score` = `carte` = 389,3 px (rapport 2,0) ; haut `equipements` = haut `score` ; bas `equipements` = bas `carte` (écart 0 px) ; carte SVG 339 × 254,5 px (4:3) ; à 375 px 293 × 219,8 px.
**Lighthouse mobile** (`diagnostic.html`, sans SEO) : performance 98, accessibilité 100, bonnes pratiques 100. **CLS** (JSON retardés de 400 ms, 360 à 1440 px) : 0,0132 au plus.
**Points ouverts** : déploiement `/lot-4/` non vérifié depuis la session (cache Pages 10 min) ; `apercu.txt` vise `index.html` comme demandé, le diagnostic s'atteint par la recherche ; lot 4b (carte réelle) non fait.
## Choix à valider
- Tailles de texte ci-dessus ; textes, niveaux (3, 2, 1, 2) et prix des 10 équipements fictifs ; priorités uniques et entrelacées.
- Jauge : 4 segments marine, repère triangulaire sous le niveau ; blocs en cartes blanches sous des titres sur le fond.
- Calque « argiles » rattaché à l'aléa « Grêle et vents » ; teintes `--calque-*` (bleu, violet, vert, ardoise) et motifs (diagonales, points, croisillons, losanges).
- Équipements étirés dès 1200 px (3 rangées égales, visuel pleine hauteur) : cartes un peu vides ; carte limitée à 36 rem de large.
- Lien Géorisques : page d'accueil du site, sans paramètre, texte masqué « (nouvel onglet) » ; `accueil.css` chargé aussi par le diagnostic.
## À tester par moi
Sur `/lot-4/`, téléphone réel et deux navigateurs : recherche d'adresse → diagnostic ; carte d'aléa → bonne pastille ; équipements selon le filtre ; score lisible et illustratif ; carte lisible, calques cochables, motifs distincts ; lien Géorisques en nouvel onglet ; impression « calme et technique » ; blocs à ajuster désignés par `E2-1` à `E2-6` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-4/`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-4` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/`, `/diagnostic.html` et `/lots/`.
