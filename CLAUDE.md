# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, 4 écrans (accueil, diagnostic, fiche produit, panier), données fictives.
Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).

## Arborescence
- `index.html` : page d'attente (lot 0)
- `css/` : `tokens.css` (jetons), `base.css`, `attente.css`
- `assets/fonts/` : polices woff2 (OFL) ; `data/` : à créer avec le premier fichier de données
- `tests/` : tests Vitest ; `tests/e2e/` Playwright ; `tests/outils/` serveur local et Lighthouse
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (références)
- `.github/workflows/pages.yml` : vérifications (PR, push) et publication Pages (push sur main)

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
- Rien de contenu en dur : textes, liens, réglages dans des fichiers de données ou de configuration.
- Aucune couleur en dur hors `css/tokens.css`.
- Chemins relatifs partout (site servi sous `/<dépôt>/`).
- Contenus fictifs, aucun vrai logo, aucun traceur, aucune police ni script externe.
- Un réglage qui résiste après trois essais : documenter et s'arrêter. Ne jamais modifier un critère non atteint : le signaler.
- Ne jamais simuler un résultat non obtenu.

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit.
- Tag `lot-N` à la fin du lot. Branche et tag ont le même nom : références complètes `refs/heads/lot-N` et `refs/tags/lot-N`.
- Jamais de fusion dans `main` (le propriétaire fusionne par Pull Request).
- Fin de lot : `Docs/lots/lot-N.md`.

## Pièges (voir `Docs/ref/environnement.md`)
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`.
- Lighthouse ne fonctionne que sur http://localhost, pas sur file://.
- Le réseau sortant est filtré par un proxy.
