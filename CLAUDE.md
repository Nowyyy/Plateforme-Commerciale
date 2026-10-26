# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, données fictives. Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).
Avant de modifier une page, lis le fichier correspondant de `Docs/ref/conventions/` (index : `Docs/ref/conventions.md`) : les règles détaillées y vivent. Mesures : `Docs/ref/qualite.md`.

## Arborescence
- Racine : `index.html`, `diagnostic.html`, `produit.html`, `panier.html`, `pro.html`, espace client simulé : `connexion.html`, `compte.html`, `achats.html`, `achat.html`, `informations.html`, SAV simulé : `sav-acces.html`, `sav.html`, `demandes.html`, `comparateur.html` ; tous `noindex` jusqu'au lot 10 ; `attente.html` ; `accueil.html` (redirection vers `index.html`)
- `css/` : `tokens.css` (jetons), `base.css`, `composants.css`, une feuille par page (`commun.css`, `accueil.css`, `sav.css`, `comparateur.css`…), `carte-reelle.css`, `attente.css`, `wireframe.css`
- `data/` : `site.json`, `accueil.json`, `diagnostic.json`, `pro.json`, `compte.json`, `produit.json` : textes et liens visibles
- `assets/js/` : `rendu.js` (données), modules purs `*-logique.js` (dont `comparateur-logique.js`), un module par page (dont `comparateur.js`), `compte-lien.js`, `formulaire.js` (générique) ; `assets/fonts/` (woff2, OFL) ; `assets/vendor/leaflet/` : Leaflet 1.9.4, jamais modifié
- `scripts/lots/` (page Lots) et `scripts/documents/` (PDF d'exemple : `node scripts/documents/generer.mjs`), sans dépendance
- `wireframes/` : Lo-Fi publiés, `noindex` ; `tests/` : Vitest, `tests/e2e/` : Playwright ; `tests/outils/` : serveur, Lighthouse, CLS, matrice, empreinte 
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (`conventions.md` index, `conventions/`, `apercus.md`, `environnement.md`, `qualite.md`), `apercus.txt`
- `.github/workflows/pages.yml` : vérifications et publication Pages : racine = `main`, chaque `lot-N` sous `/lot-N/`, liste sur `/lots/`
- `apercu.txt` : cible (ligne 1), puis `type: wireframe|hifi|technique` et `titre:` facultatifs (`Docs/ref/apercus.md`) ; chaque lot le règle sur sa branche.

## Commandes vérifiées
- `npm ci` ; `npm run lint` (ESLint) ; `npm test` (Vitest) ; `npm run e2e` (Playwright, captures dans `test-results/`) ; `npm run lighthouse` (mobile)
- `npm run matrice` (Lighthouse, 14 pages, médianes de 3 passes) ; `npm run empreinte:maj` (régénère `tests/empreintes/`, seulement pour un écart voulu)
- Seuils (jamais modifiés) : Lighthouse mobile, médiane de 3 passes : performance ≥ 90, accessibilité ≥ 95, bonnes pratiques ≥ 95 (`tests/outils/seuils-lighthouse.json` ; SEO exclu tant que les pages sont `noindex`) ; CLS ≤ 0,1 (objectif 0,08) de 360 à 1440 px, JSON retardés de 400 ms ; console sans erreur.

## Règles durables
- Dépendances de développement seulement, versions exactes ; toute nouvelle dépendance est signalée et justifiée.
- Rien de contenu en dur : textes, liens, réglages dans `data/` ou des fichiers de configuration (annotations de `wireframes/` exceptées ).
- Aucune couleur en dur hors `css/tokens.css`. Pas de rouge. Ambre : boutons d'action seulement (texte marine).
- Toute modification de mise en page passe par l'empreinte : le test `empreinte.e2e.js` doit rester vert, ou l'écart est justifié dans le bilan.
- Workflow et réglages GitHub : sur autorisation explicite du lot seulement ; l'aperçu `/lot-N/` reste en place (`Docs/ref/apercus.md`).
- Navigation commune : en-tête = Vendre sur la plateforme, Mon compte, Panier ; pied = les mêmes plus Mentions légales, À propos du démonstrateur, Service après-vente.
- Comptes, connexion et formulaires sont simulés : mention démonstrateur sur chaque formulaire, valeurs fictives, rien envoyé ni enregistré (sessionStorage seulement), aucune donnée dans l'URL. Chemins relatifs (site servi sous `/<dépôt>/`). Aucun vrai logo ni traceur, rien d'externe (police, script).
- Blocs : `data-bloc` (code visible) et `data-role` (identifiant stable des tests).
- Réglage résistant après trois essais : documenter et s'arrêter. Jamais modifier un critère non atteint (le signaler), ni simuler un résultat.
- Panier : `sessionStorage.panier` (v 2, sans prix), revalidé à la lecture ; aucun paiement.
- Formulaires simulés : champs sans `name`, `<form novalidate>` sans `action`, masqué jusqu'au branchement ; validation à l'envoi puis à la saisie, récapitulatif `role="alert"` focalisé ; aucune saisie conservée ni transmise.
- Compte simulé : sessions `compte` et `achat` ; garde « Connexion requise » ; aucune saisie conservée.
- SAV simulé : session `acces-sav` (commande d'exemple, jamais le numéro saisi ni l'e-mail) ; `resoudreContexte` ; « Se déconnecter » efface `compte`, `achat` et `acces-sav`.
- Comparateur : 2 à 3 produits d'un même aléa ; session `comparaison` ; `selectionInitiale` et `basculerProduit` = seule source de vérité ; `performances` ; aucune valeur « meilleure » ni bouton ambre.
- Diagnostic (carte réelle seule, niveau indicatif, saisie d'adresse stricte) : `Docs/ref/conventions/diagnostic.md`.
- Boutons ambre : « Ajouter au panier », « Valider ma commande » (actif), « Envoyer ma candidature », « Se connecter », « Enregistrer », « Continuer », « Envoyer ma demande ». Nouvel id de commande : `CMD-` suivi de 3 à 8 chiffres.

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit ; bilan `Docs/lots/lot-N.md` dans le dernier commit de partie (aucun commit après le tag).
- Début de lot : sonde, arbre propre, `main` à jour, lot N-1 fusionné, tests verts, puis `lot-N`.
- Push : `git push -u origin refs/heads/lot-N:refs/heads/lot-N`, puis `git ls-remote --heads origin lot-N` égal à `git rev-parse HEAD`. Interdits : `--force`, `--force-with-lease`, `rebase`, `commit --amend` après un push, fusion dans `main`, suppression de `lot-N`, push sur un ancien lot. `gh` en lecture seule.
- Tag : push refusé (403), une seule tentative. Fin de lot : afficher le lien de comparaison ; le propriétaire crée et fusionne la Pull Request.

## Pièges (détail : `Docs/ref/environnement.md`, `Docs/ref/conventions/`)
- `commun.css` (règles partagées) est chargé par les 14 pages : toute règle ajoutée dedans les touche toutes ; `accueil.css` est propre à l'accueil ; `comparateur.html` charge `diagnostic.css`.
- `apercu.txt` visant `index.html` : le workflow ne déplace plus l'`index.html` du lot (boucle de redirection).
- Textes et listes remplis par JavaScript : réserver leur hauteur (`min-block-size`, par point de rupture), sinon le CLS dépasse 0,1. Formulaire masqué : réserver sa hauteur.
- Chromium préinstallé, pas de `playwright install`. Lighthouse : http://localhost seulement. Réseau filtré.
- Toute donnée lue en session est revalidée avant affichage ; modifier prix ou cotes de `produit.json` casse les totaux du panier et `compte.json` (un test le signale).
- `prefers-reduced-motion` : transitions à 0,01 ms, donc `toHaveCSS` ou `expect.poll`, jamais `getComputedStyle` juste après.
- Aucun `id` dans les gabarits clonés. Les parcours qui saisissent une adresse choisissent une suggestion simulée (utilitaire partagé). Détection communale (inondation, feux) : jamais présentée comme un diagnostic de l'adresse.
- Géorisques : `GEORISQUES_SERVICES` à éviter (10 s). Les mesures simulent les services tiers : jamais un score réel.
