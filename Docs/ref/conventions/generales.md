# Conventions générales
Règles transversales : en-tête et pied, fond et relief, listes et gabarits, liens externes, Git, pièges et tests.

## Pied et en-tête
- Pages Hi-Fi : en-tête, pied et décor `.relief` sont copiés à l'identique entre les pages (un test compare) ; toute nouvelle page de la racine s'ajoute à la liste publiée du workflow (autorisation explicite du lot).
- Le pied de l'accueil vient de `data/site.json` (clé `pied`) ; une entrée sans `lien` est un texte non lié.
- Navigation : liens vers les pages pas encore en Hi-Fi = `wireframes/` via `data/site.json` ; menu replié jusqu'à 1199 px.
- Clés d'attribut : `data-texte`, `data-lien` (ex. `site.liens.panier`), `data-aria-label`, `data-placeholder`. En dur : `<title>`, meta description, `noscript`, erreur de chargement (`rendu.js`).

## Fond et relief
- Un seul fond de page (jeton de fond clair), sections transparentes ; cartes, pastilles et blocs de données en fond blanc à bordure fine.
- Le dégradé du hero part d'une teinte bleutée et arrive exactement sur le fond de page.
- Décor `.relief` (SVG en ligne, `aria-hidden`, `pointer-events: none`, jeton `--color-relief`) : jamais de texte ni d'interaction dedans ; deux groupes dès 768 px, un seul en dessous.

## Listes et gabarits
- Listes (cartes, étapes) : elles viennent des données et sont rendues par des `<template data-liste="…">`.
- Clés relatives à l'élément (`data-texte`, `data-icone`), `.` pour une chaîne ; `data-lien` et `data-texte-global` restent globaux.
- Jamais de nombre d'éléments figé dans le HTML ou le CSS ; conteneurs en `aria-busy` jusqu'au remplissage.
- Liste propre au produit courant (lot 7 : `specs`, `documents`) : `<template data-liste-produit="…">`, rendue par `produit.js` depuis l'objet du produit (`remplirListeProduit` de `rendu.js`) ; `data-liste` reste réservé aux listes de premier niveau.

## Liens externes
- Seuls ceux de `liensExternes` (`data/site.json`) : `https://`, domaine déclaré, nouvel onglet, `rel="noopener noreferrer"`, aucune donnée du visiteur dans le lien.
- Requêtes tierces : seulement celles de la carte réelle et de la saisie d'adresse (section « Carte réelle »).

## Git (détail du début de lot)
- Sonde : `git fetch origin --prune --tags`, `git ls-remote --heads origin`, arbre propre, `git pull --ff-only origin main`.
- Preuve que le lot N-1 est fusionné : `Docs/lots/lot-<N-1>.md` et `pages.yml` sur `origin/main`, et `git merge-base --is-ancestor origin/lot-<N-1> origin/main` ; si la branche a été supprimée, `git log --grep="Lot <N-1>-C" origin/main` non vide. Puis `npm ci`, lint et tests verts sur `main`, puis création de `lot-N`.

## Pièges déplacés de `CLAUDE.md` (lot 8d)
- Le message d'erreur de la recherche d'adresse n'a pas de réserve de hauteur (apparition suivant une action de l'utilisateur, hors CLS) : ne pas la rétablir.
- PDF d'exemple : texte en WinAnsi, un caractère non supporté lève une erreur ; tout nouveau document passe par `scripts/documents/contenus.json`.
- Tests de clics Playwright : voir « Tests de clics » plus haut (`reducedMotion: 'reduce'`).

## Tests et règles transversales
- Assertions de couleur dans les tests : `toHaveCSS('background-color', …)` (avec nouvelle tentative), jamais une lecture immédiate de `getComputedStyle` juste après un changement d'état.
- Tests de clics : `emulateMedia({ reducedMotion: 'reduce' })` (défilement doux de `commun.css`).
- Toute donnée lue en session est revalidée avant affichage. Modifier prix ou cotes de `produit.json` change les totaux du panier et casse les commandes de `compte.json` (un test le signale) ; les pages du compte ne chargent que `site.json` et `compte.json`.
- Aucun `id` dans les gabarits clonés (les listes de lignes dupliquent le balisage) ; les zones d'ajout de la fiche sont écrites deux fois dans `produit.html` : classes seulement, sauf `cotes-ajouter` et son aide.

## Règles durables extraites de `CLAUDE.md` (lot 10a, texte d'origine)
- Rien de contenu en dur : textes, liens, réglages dans `data/` ou des fichiers de configuration (annotations de `wireframes/` exceptées ; jetons `--wf-*` réservés).
- Navigation commune : en-tête = Vendre sur la plateforme, Mon compte, Panier ; pied = les mêmes plus Mentions légales, À propos du démonstrateur, Service après-vente, rappel « aucune vente ». Comptes, connexion et formulaires sont simulés : mention démonstrateur sur chaque formulaire, valeurs fictives, rien envoyé ni enregistré (sessionStorage seulement), aucune donnée dans l'URL.
- Blocs : `data-bloc` (code visible) et `data-role` (identifiant stable des tests) ; anciens codes des wireframes : `Docs/lots/lot-1b.md`.
- Chemins relatifs (site servi sous `/<dépôt>/`). Contenus fictifs, aucun vrai logo ni traceur, rien d'externe (police, script).
- Workflow et réglages GitHub : sur autorisation explicite du lot seulement ; l'aperçu `/lot-N/` reste en place (`Docs/ref/apercus.md`).
- `comparateur.html` charge `diagnostic.css` (jauge, pastilles) : une règle modifiée là touche aussi cette page ; les `performances` du batardeau égalent ses spécifications.
- Aucun `id` dans les gabarits clonés ; zones d'ajout de la fiche écrites deux fois : classes seulement, sauf `cotes-ajouter` et son aide.
- Textes et listes remplis par JavaScript : réserver leur hauteur (`min-block-size`, par point de rupture), sinon le CLS dépasse 0,1.
- `prefers-reduced-motion` : transitions à 0,01 ms, donc `toHaveCSS` ou `expect.poll`, jamais `getComputedStyle` juste après une action. Formulaire masqué : réserver sa hauteur (CLS).
- Boutons ambre : « Ajouter au panier », « Valider ma commande » (actif), « Envoyer ma candidature », « Se connecter », « Enregistrer », « Continuer », « Envoyer ma demande ».
- Géorisques : `GEORISQUES_SERVICES` met 10 s (à éviter) ; formats inférés : `conventions.md`.
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`. Lighthouse : http://localhost seulement. Réseau sortant filtré.
- Lot dont `apercu.txt` vise `index.html` : le workflow ne déplace plus l'`index.html` du lot (sinon boucle de redirection).
- Toute donnée lue en session est revalidée avant affichage ; modifier prix ou cotes de `produit.json` casse les totaux du panier et `compte.json` (un test le signale).
- Ancienne règle abrégée dans `CLAUDE.md` : jetons `--wf-*` réservés (annotations de `wireframes/`).
