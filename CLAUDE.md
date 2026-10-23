# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, données fictives.
Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).
Avant de modifier le diagnostic, la fiche produit, le relief ou les listes, lis `Docs/ref/conventions.md`.

## Arborescence
- Racine : `index.html` (E1-1 à E1-10), `diagnostic.html` (E2), `produit.html` (E3-1 à E3-8), `panier.html` (E4), `pro.html` (E5), espace client simulé : `connexion.html` (E6), `compte.html` (E7), `achats.html` (E8), `achat.html` (E9), `informations.html` (E12), tous `noindex` jusqu'au lot 10 ; `attente.html` (ancienne page d'attente) ; `accueil.html` (redirection vers `index.html`)
- `css/` : `tokens.css` (jetons), `base.css`, `composants.css`, `accueil.css`, `diagnostic.css`, `produit.css`, `panier.css`, `pro.css`, `compte.css`, `attente.css`, `wireframe.css`
- `data/` : `site.json`, `accueil.json`, `diagnostic.json`, `pro.json`, `compte.json`, `produit.json` : tous les textes et liens visibles
- `assets/js/` : `rendu.js` (chargement des données), `menu.js`, `adresse.js`, modules purs `*-logique.js` (`diagnostic`, `produit`, `cotes`, `lignes`, `panier`, `pro`, `compte`) ; un module par page (`diagnostic.js`, `produit.js`, `configurateur.js`, `ajout.js`, `panier.js`, `pro.js`, `connexion.js`, `compte.js`, `achats.js`, `achat.js`, `informations.js`) ; `compteur.js` (compteur du panier), `compte-lien.js` et `compte-session.js` (session du compte), `formulaire.js` (formulaire simulé générique), `alea.js` ; `assets/fonts/` : woff2 (OFL)
- `scripts/lots/` : génération de la page Lots (sans dépendance ; logique pure dans `logique.mjs`)
- `scripts/documents/` : générateur de PDF d'exemple, sans dépendance ; `assets/documents/` : cinq PDF fictifs générés, versionnés
- `wireframes/` : Lo-Fi publiés, `noindex` : écrans 1 à 13 (`accueil`… `sav-acces`) et `index.html`
- `tests/` : Vitest ; `tests/e2e/` Playwright ; `tests/outils/` serveur local et Lighthouse
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (références : `apercus.md`, `environnement.md`, `conventions.md` = règles détaillées par page), `apercus.txt` (lignes `lot-N|descriptif`, à compléter à chaque lot)
- `.github/workflows/pages.yml` : vérifications (PR, push) et publication Pages (push sur `main` ou `lot-*`) : racine = `main`, chaque `lot-N` sous `/lot-N/`, liste sur `/lots/`
- `apercu.txt` : cible (ligne 1), puis `type: wireframe|hifi|technique` et `titre:` facultatifs (voir `Docs/ref/apercus.md`) ; chaque lot règle ce fichier sur sa branche.

## Commandes vérifiées
- `npm ci` ; `npm run lint` (ESLint) ; `npm test` (Vitest) ; `npm run e2e` (Playwright, captures dans `test-results/`) ; `npm run lighthouse` (mobile)
- Seuils Lighthouse mobile : performance ≥ 90, accessibilité ≥ 95, bonnes pratiques ≥ 95, SEO ≥ 90 (`tests/outils/seuils-lighthouse.json`) ; wireframes, `index.html`, `diagnostic.html`, `produit.html` et `panier.html` tant qu'ils sont `noindex` : sans SEO.

## Règles durables
- Dépendances de développement seulement, versions exactes ; toute nouvelle dépendance est signalée et justifiée.
- Rien de contenu en dur : textes, liens, réglages dans `data/` ou des fichiers de configuration (annotations de `wireframes/` exceptées ; jetons `--wf-*` réservés).
- Aucune couleur en dur hors `css/tokens.css`. Pas de rouge. L'ambre est réservé aux boutons d'action (texte marine dessus).
- Workflow et réglages GitHub : sur autorisation explicite du prompt du lot seulement ; l'aperçu `/lot-N/` reste en place pour tous les lots ; `/lots/` est générée à chaque publication (détail : `Docs/ref/apercus.md`).
- Navigation commune : en-tête = Vendre sur la plateforme, Mon compte, Panier ; pied = les mêmes plus Mentions légales, À propos du démonstrateur, Service après-vente, rappel « aucune vente ». Comptes, connexion et formulaires sont simulés : mention démonstrateur sur chaque formulaire, valeurs fictives, rien envoyé ni enregistré (sessionStorage seulement), jamais de données dans l'URL.
- Wireframes : chaque bloc porte `data-bloc` (code visible) et `data-role` (identifiant stable) ; les tests s'appuient sur `data-role` ; `Docs/lots/lot-1b.md` donne la correspondance des anciens codes.
- Chemins relatifs partout (site servi sous `/<dépôt>/`). Contenus fictifs, aucun vrai logo ni traceur, aucune police ni script externe.
- Un réglage qui résiste après trois essais : documenter et s'arrêter. Ne jamais modifier un critère non atteint (le signaler) ni simuler un résultat.
- Fiche produit : E3-1 à E3-8 ; `specs` et `documents` pour le produit `complet` seulement ; PDF d'exemple : `node scripts/documents/generer.mjs` (octet à octet, testé).
- Panier : `sessionStorage.panier` (v 2, sans prix), revalidé à la lecture ; prix et délais recalculés depuis `data/produit.json` ; aucun paiement (détail : `conventions.md`).
- Formulaires simulés : champs sans `name`, `<form novalidate>` sans `action`, masqué jusqu'au branchement ; validation à l'envoi puis à la saisie, récapitulatif `role="alert"` focalisé ; aucune saisie conservée ni transmise ; un message par couple champ et raison (`RAISONS`, détail : `conventions.md`).
- Compte simulé : session `compte` (`{ v: 1, connecte }`) et `achat` (id de commande) seulement ; aucun e-mail, mot de passe ni saisie conservés ; garde d'interface « Connexion requise » ; les liens « Mon compte » sont réécrits par `compte-lien.js` ; commandes de `compte.json` = instantanés vérifiés contre `produit.json`.
- Boutons ambre : « Ajouter au panier », « Valider ma commande » (actif), « Envoyer ma candidature », « Se connecter », « Enregistrer ».

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit ; bilan `Docs/lots/lot-N.md` dans le dernier commit de partie (aucun commit après le tag).
- Début de lot : `git fetch origin --prune --tags`, `git ls-remote --heads origin`, arbre propre, `git pull --ff-only origin main`, preuve que le lot N-1 est fusionné (`Docs/lots/lot-<N-1>.md` et `pages.yml` sur `origin/main`, et `git merge-base --is-ancestor origin/lot-<N-1> origin/main` ; si la branche a été supprimée, `git log --grep="Lot <N-1>-C" origin/main` non vide), `npm ci`, lint et tests verts sur `main`, puis création de `lot-N`.
- Push : `git push -u origin refs/heads/lot-N:refs/heads/lot-N`, puis `git ls-remote --heads origin lot-N` doit égaler `git rev-parse HEAD`. Interdits : `--force`, `--force-with-lease`, `rebase`, `commit --amend` après un push, fusion dans `main`, suppression d'une branche `lot-N`, push sur un ancien lot. `gh` en lecture seule.
- Le push de tag est refusé (403) : une seule tentative, le propriétaire pose le tag. Fin de lot : afficher le lien de comparaison de Pull Request ; le propriétaire la crée et la fusionne.

## Pièges (voir `Docs/ref/environnement.md`)
- `accueil.css` est chargé par `diagnostic.html` et `produit.html` : toute règle ajoutée dedans touche les trois pages.
- Le message d'erreur de la recherche d'adresse n'a pas de réserve de hauteur (apparition suivant une action de l'utilisateur, hors CLS) : ne pas la rétablir.
- Lot dont `apercu.txt` vise `index.html` : le workflow ne déplace plus l'`index.html` du lot (sinon boucle de redirection).
- Textes et listes remplis par JavaScript arrivent après le premier rendu : réserver leur hauteur (`min-block-size`, par point de rupture), sinon le CLS dépasse 0,1.
- PDF d'exemple : texte en WinAnsi, un caractère non supporté lève une erreur ; tout nouveau document passe par `scripts/documents/contenus.json`.
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`. Lighthouse : http://localhost seulement. Réseau sortant filtré par un proxy.
- Toute donnée lue en session est revalidée avant affichage. Modifier prix ou cotes de `produit.json` change les totaux du panier et casse la cohérence des commandes de `compte.json` (un test le signale) ; les pages du compte ne chargent que `site.json` et `compte.json`.
- Sous `prefers-reduced-motion`, `base.css` met les transitions à 0,01 ms : pas de `getComputedStyle` juste après une action ; `toHaveCSS` ou `expect.poll`. Le formulaire masqué (`hidden`) doit réserver sa hauteur au chargement (CLS).
- Aucun `id` dans les gabarits clonés (les listes de lignes dupliquent le balisage) ; les zones d'ajout de la fiche sont écrites deux fois dans `produit.html` : classes seulement, sauf `cotes-ajouter` et son aide.
- Playwright : défilement doux d'`accueil.css` = clics instables : `page.emulateMedia({ reducedMotion: 'reduce' })` dans les tests de clics.
