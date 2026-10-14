# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, 4 écrans (accueil, diagnostic, fiche produit, panier), données fictives.
Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).

## Arborescence
- `index.html` : page d'attente (lot 0)
- `accueil.html` : accueil Hi-Fi en cours, `noindex` jusqu'au lot 3, deviendra `index.html`
- `css/` : `tokens.css` (jetons), `base.css`, `composants.css`, `accueil.css`, `attente.css`, `wireframe.css` (wireframes)
- `data/` : `site.json`, `accueil.json` (tous les textes et liens visibles)
- `assets/js/` : `rendu.js` (chargement des données), `menu.js`, `adresse.js` (lot 2-C)
- `wireframes/` : Lo-Fi du lot 1, publiés, `noindex`
- `assets/fonts/` : polices woff2 (OFL)
- `tests/` : tests Vitest ; `tests/e2e/` Playwright ; `tests/outils/` serveur local et Lighthouse
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (références)
- `.github/workflows/pages.yml` : vérifications (PR, push) et publication Pages (push sur `main` ou `lot-*`) : la racine du site est `main`, chaque branche `lot-N` est publiée sous `/lot-N/`, et `/lot-N/` redirige vers le chemin lu dans `apercu.txt` (racine de la branche, une ligne, ex. `wireframes/`) ; liste des aperçus sur `/apercus/`
- `apercu.txt` : page principale du lot pour l'aperçu `/lot-N/`

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
- Aucune couleur en dur hors `css/tokens.css`.
- Chemins relatifs partout (site servi sous `/<dépôt>/`).
- Contenus fictifs, aucun vrai logo, aucun traceur, aucune police ni script externe.
- Un réglage qui résiste après trois essais : documenter et s'arrêter. Ne jamais modifier un critère non atteint : le signaler.
- Ne jamais simuler un résultat non obtenu.

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit.
- Le push de tags est refusé depuis la session cloud (HTTP 403 constaté au lot 0) : créer `lot-N` en local est facultatif, tenter le push une seule fois sans insister. Le lot N-1 est considéré fusionné si `Docs/lots/lot-<N-1>.md` et `.github/workflows/pages.yml` existent sur `origin/main` et si `git merge-base --is-ancestor origin/lot-<N-1> origin/main` réussit (ou, si la branche a été supprimée, si `git log --oneline --grep="Lot <N-1>-C" origin/main` n'est pas vide). Le bilan `Docs/lots/lot-N.md` est inclus dans le dernier commit de partie : aucun commit après le tag, jamais de force-push.
- Début de lot : `git fetch origin --prune --tags`, `git ls-remote --heads origin`, arbre propre, `git pull --ff-only origin main`, preuve que le lot N-1 est fusionné, `npm ci` puis lint et tests verts sur `main` avant de créer `lot-N`. Push : `git push -u origin refs/heads/lot-N:refs/heads/lot-N`, puis vérifier que `git ls-remote --heads origin lot-N` égale `git rev-parse HEAD`. Interdits : `--force`, `--force-with-lease`, `rebase`, `commit --amend` après un push. `gh`, s'il est disponible, sert à lire seulement ; jamais de `pr create` ni de `pr merge`. Fin de lot : afficher le lien de comparaison de Pull Request ; c'est le propriétaire qui la crée et la fusionne.
- Le workflow ne se modifie que sur autorisation explicite du prompt du lot. Ne jamais supprimer une branche `lot-N` : l'aperçu `/lot-N/` en dépend.
- Jamais de fusion dans `main` (le propriétaire fusionne par Pull Request).
- Fin de lot : `Docs/lots/lot-N.md`.

## Règles du Hi-Fi (lot 2 et suivants)
- Les textes visibles viennent de `data/*.json` par clés : `data-texte`, `data-lien` (ex. `site.liens.panier`), `data-aria-label`, `data-placeholder`. Exceptions en dur : `<title>`, meta description, message `noscript`, message d'erreur de chargement (dans `rendu.js`).
- Liens temporaires vers `wireframes/` pilotés par `site.liens`, remplacés page par page (seules les données changent).
- L'adresse saisie n'est jamais dans l'URL ni envoyée : `sessionStorage` seulement.
- L'ambre est réservé aux boutons d'action ; texte sur fond ambre en bleu marine.
- Aperçu de chaque lot : `apercu.txt` + branche `lot-N`.

## Seuils Lighthouse des wireframes
Pour les pages de `wireframes/` : seulement performance, accessibilité et bonnes pratiques (la catégorie SEO est inapplicable aux pages `noindex`).

## Seuils Lighthouse de `accueil.html`
Tant qu'elle est `noindex` : performance, accessibilité, bonnes pratiques seulement ; dès qu'elle devient indexable, la catégorie SEO s'applique avec son seuil.

## Pièges (voir `Docs/ref/environnement.md`)
- CLS : les textes remplis par JavaScript arrivent après le premier rendu ; réserver leur hauteur (`min-block-size`) pour ne pas décaler la page.
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`.
- Lighthouse ne fonctionne que sur http://localhost, pas sur file://.
- Le réseau sortant est filtré par un proxy.
- Le push de tag est refusé (403) : une seule tentative, le propriétaire pose le tag à la main (voir règles Git).
