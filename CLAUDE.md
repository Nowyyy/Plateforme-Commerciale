# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, 4 écrans (accueil, diagnostic, fiche produit, panier), données fictives.
Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).

## Arborescence
- `index.html` : accueil Hi-Fi complet (blocs E1-1 à E1-10, `noindex` jusqu'au lot 10) ; `attente.html` : ancienne page d'attente, conservée ; `accueil.html` : redirection vers `index.html` (anciens liens)
- `css/` : `tokens.css` (jetons), `base.css`, `composants.css`, `accueil.css`, `attente.css`, `wireframe.css` (wireframes)
- `data/` : `site.json`, `accueil.json` (tous les textes et liens visibles)
- `scripts/lots/` : génération de la page Lots (sans dépendance ; logique pure dans `logique.mjs`)
- `assets/js/` : `rendu.js` (chargement des données), `menu.js`, `adresse.js` (lot 2-C)
- `wireframes/` : Lo-Fi publiés, `noindex` : écrans 1 à 13 (`accueil`, `diagnostic`, `produit`, `panier`, `pro`, `connexion`, `compte`, `achats`, `achat`, `sav`, `demandes`, `informations`, `sav-acces`) et `index.html`
- `assets/fonts/` : polices woff2 (OFL)
- `tests/` : tests Vitest ; `tests/e2e/` Playwright ; `tests/outils/` serveur local et Lighthouse
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (références, dont `apercus.md` : aperçus et page Lots)
- `.github/workflows/pages.yml` : vérifications (PR, push) et publication Pages (push sur `main` ou `lot-*`) : la racine du site est `main`, chaque branche `lot-N` est publiée sous `/lot-N/`, et `/lot-N/` redirige vers le chemin lu dans `apercu.txt` (racine de la branche, une ligne, ex. `wireframes/`) ; liste des aperçus sur `/apercus/`
- `apercu.txt` : page principale du lot pour l'aperçu `/lot-N/`
- `Docs/apercus.txt` : une ligne `lot-N|descriptif` par lot, affichée sous chaque lot sur `/apercus/` (à compléter à chaque nouveau lot)

## Commandes vérifiées
- `npm ci` : installe les outils de développement
- `npm run lint` : ESLint
- `npm test` : Vitest
- `npm run e2e` : Playwright (captures dans `test-results/`)
- `npm run lighthouse` : audit mobile et seuils

## Seuils Lighthouse (mobile)
Performance ≥ 90, accessibilité ≥ 95, bonnes pratiques ≥ 95, SEO ≥ 90 (`tests/outils/seuils-lighthouse.json`).

## Règles durables
- Dépendances de développement seulement, versions exactes ; toute nouvelle dépendance est signalée et justifiée.
- Rien de contenu en dur : textes, liens, réglages dans des fichiers de données ou de configuration. Exception : les wireframes sont jetables, les annotations en dur sont permises dans `wireframes/` seulement ; les vrais textes passent en `data/` à partir du lot 2 ; les jetons `--wf-*` sont réservés aux wireframes.
- L'aperçu par lot `/lot-N/` (publication par branche, `apercu.txt`) reste en place pour tous les lots ; ne pas le retirer ni modifier le workflow ou les réglages GitHub sans accord explicite du propriétaire.
- Page `/lots/` générée à chaque publication à partir des branches `lot-*` ; `apercus/` redirige vers elle. `apercu.txt` : cible sur la première ligne ; lignes optionnelles `type: wireframe|hifi|technique` et `titre: <court>`. Sans `type:`, une cible `wireframes/…` est un wireframe, toute autre cible un lot Hi-Fi. Chaque lot règle `apercu.txt` sur sa branche (`type: technique` pour un lot d'outillage). Les lots techniques n'apparaissent pas sur la page.
- Aucune couleur en dur hors `css/tokens.css`.
- Navigation commune : en-tête = Aléas, Comment ça marche, Vendre sur la plateforme, Mon compte, Panier ; pied = Mentions légales, À propos du démonstrateur, Service après-vente, rappel « aucune vente ». Comptes, connexion et formulaires sont simulés : mention démonstrateur sur chaque formulaire, valeurs fictives, rien envoyé ni enregistré (sessionStorage seulement dans la version interactive), jamais de données dans l'URL.
- Wireframes : chaque bloc porte `data-bloc` (code visible, suit l'ordre de la page) et `data-role` (identifiant stable) ; les tests s'appuient sur `data-role` ; `Docs/lots/lot-1b.md` donne la correspondance anciens/nouveaux codes de l'accueil et du diagnostic.
- Chemins relatifs partout (site servi sous `/<dépôt>/`).
- Contenus fictifs, aucun vrai logo, aucun traceur, aucune police ni script externe.
- Un réglage qui résiste après trois essais : documenter et s'arrêter. Ne jamais modifier un critère non atteint : le signaler.
- Ne jamais simuler un résultat non obtenu.

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit.
- Le push de tags est refusé depuis la session cloud (HTTP 403 constaté au lot 0) : créer `lot-N` en local est facultatif, tenter le push une seule fois sans insister. Le lot N-1 est considéré fusionné si `Docs/lots/lot-<N-1>.md` et `.github/workflows/pages.yml` existent sur `origin/main` et si `git merge-base --is-ancestor origin/lot-<N-1> origin/main` réussit (ou, si la branche a été supprimée, si `git log --oneline --grep="Lot <N-1>-C" origin/main` n'est pas vide). Le bilan `Docs/lots/lot-N.md` est inclus dans le dernier commit de partie : aucun commit après le tag, jamais de force-push.
- Début de lot : `git fetch origin --prune --tags`, `git ls-remote --heads origin`, arbre propre, `git pull --ff-only origin main`, preuve que le lot N-1 est fusionné, `npm ci` puis lint et tests verts sur `main` avant de créer `lot-N`. Push : `git push -u origin refs/heads/lot-N:refs/heads/lot-N`, puis vérifier que `git ls-remote --heads origin lot-N` égale `git rev-parse HEAD`. Interdits : `--force`, `--force-with-lease`, `rebase`, `commit --amend` après un push. `gh`, s'il est disponible, sert à lire seulement ; jamais de `pr create` ni de `pr merge`. Fin de lot : afficher le lien de comparaison de Pull Request ; c'est le propriétaire qui la crée et la fusionne.
- Le workflow ne se modifie que sur autorisation explicite du prompt du lot. Ne jamais supprimer une branche `lot-N` : l'aperçu `/lot-N/` en dépend.
- Ne jamais pousser sur une ancienne branche de lot après la fusion du lot 2b : son ancien workflow régénérerait l'ancienne page.
- Jamais de fusion dans `main` (le propriétaire fusionne par Pull Request).
- Fin de lot : `Docs/lots/lot-N.md`.

## Règles du Hi-Fi (lot 2 et suivants)
- Un seul fond de page pour toutes les sections de l'accueil (jeton de fond clair) ; les sections sont transparentes ; cartes, pastilles et blocs de données sont en fond blanc à bordure fine. Le dégradé du hero part d'une teinte bleutée et arrive exactement sur le fond de page.
- Décor `.relief` (SVG en ligne, `aria-hidden`, `pointer-events: none`, couleur par le jeton `--color-relief`) : jamais de texte ni d'interaction dedans ; deux groupes à partir de 768 px, un seul en dessous.
- Ordre final des blocs de l'accueil : en-tete, hero, recherche, aleas, protection, comment, reassurance, avis, preuve, pied ; les tests vérifient l'ordre relatif, jamais la liste exacte. Le pied de page est piloté par `data/site.json` (clé `pied`) ; une entrée sans `lien` est un texte non lié.
- Listes (cartes, étapes) : elles viennent de `data/accueil.json` et sont rendues par des `<template data-liste="…">` ; clés relatives à l'élément (`data-texte`, `data-icone`), `.` pour une chaîne ; `data-lien` et `data-texte-global` restent globaux ; les nombres d'éléments ne sont jamais figés dans le HTML ou le CSS ; conteneurs en `aria-busy` jusqu'au remplissage.
- Navigation Hi-Fi : les liens vers des pages pas encore en Hi-Fi pointent provisoirement vers `wireframes/` via `data/site.json` ; menu replié jusqu'à 1199 px.
- Les textes visibles viennent de `data/*.json` par clés : `data-texte`, `data-lien` (ex. `site.liens.panier`), `data-aria-label`, `data-placeholder`. Exceptions en dur : `<title>`, meta description, message `noscript`, message d'erreur de chargement (dans `rendu.js`).
- L'adresse saisie n'est jamais dans l'URL ni envoyée : `sessionStorage` seulement.
- L'ambre est réservé aux boutons d'action ; texte sur fond ambre en bleu marine.
- `apercu.txt` : un lot de wireframes pointe vers `wireframes/`, un lot Hi-Fi vers une page Hi-Fi ; chaque lot règle ce fichier sur sa branche.

## Seuils Lighthouse des wireframes
Pour les pages de `wireframes/` : seulement performance, accessibilité et bonnes pratiques (la catégorie SEO est inapplicable aux pages `noindex`).

## Seuils Lighthouse de `index.html` (accueil)
Tant qu'elle est `noindex` : performance, accessibilité, bonnes pratiques seulement ; dès qu'elle devient indexable, la catégorie SEO s'applique avec son seuil.

## Pièges (voir `Docs/ref/environnement.md`)
- Le message d'erreur de la recherche d'adresse n'a plus de réserve de hauteur : son apparition suit une action de l'utilisateur, donc hors CLS ; ne pas la rétablir.
- Le pied de page, réutilisé sur d'autres pages, devra préfixer ses ancres (`index.html#aleas`) ; il n'est utilisé que sur l'accueil pour l'instant.
- Un lot dont `apercu.txt` vise `index.html` : le workflow ne déplace plus l'`index.html` du lot (sinon boucle de redirection).
- Les listes remplies par JavaScript (cartes, étapes) arrivent après le premier rendu : réserver leur hauteur (`min-block-size` par point de rupture), sinon le CLS dépasse 0,1.
- CLS : les textes remplis par JavaScript arrivent après le premier rendu ; réserver leur hauteur (`min-block-size`) pour ne pas décaler la page.
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`.
- Lighthouse ne fonctionne que sur http://localhost, pas sur file://.
- La génération de la page Lots est tolérante aux pannes : en cas d'échec, page de repli et `::warning::`, la publication des aperçus `/lot-N/` continue.
- Réseau sortant filtré par un proxy.
- Le push de tag est refusé (403) : une seule tentative, le propriétaire pose le tag à la main (voir règles Git).
