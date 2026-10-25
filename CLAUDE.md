# CLAUDE.md — Plateforme de protection de l'habitat

## Projet
Démonstrateur statique hébergé sur GitHub Pages, données fictives.
Piliers, périmètre et plan en lots : `Docs/seed.md` (ne jamais le modifier).
Avant de modifier le diagnostic, la fiche produit, le comparateur, le relief ou les listes, lis `Docs/ref/conventions.md`.

## Arborescence
- Racine : `index.html` (E1-1 à E1-10), `diagnostic.html` (E2), `produit.html` (E3-1 à E3-8), `panier.html` (E4), `pro.html` (E5), espace client simulé : `connexion.html` (E6), `compte.html` (E7), `achats.html` (E8), `achat.html` (E9), `informations.html` (E12), SAV simulé : `sav-acces.html` (E13), `sav.html` (E10), `demandes.html` (E11), `comparateur.html` (E14), tous `noindex` jusqu'au lot 10 ; `attente.html` (ancienne attente) ; `accueil.html` (redirection vers `index.html`)
- `css/` : `tokens.css` (jetons), `base.css`, `composants.css`, `accueil.css`, `diagnostic.css`, `produit.css`, `panier.css`, `pro.css`, `compte.css`, `sav.css`, `comparateur.css`, `carte-reelle.css`, `attente.css`, `wireframe.css`
- `data/` : `site.json`, `accueil.json`, `diagnostic.json` (clé `carteReelle`), `pro.json`, `compte.json`, `produit.json` : tous les textes et liens visibles (SAV et comparateur : `conventions.md`)
- `assets/js/` : `rendu.js` (données), `menu.js`, `adresse.js`, modules purs `*-logique.js` (`diagnostic`, `produit`, `cotes`, `lignes`, `panier`, `pro`, `compte`, `sav`, `comparateur`) dont `comparateur-logique.js` et `carte-reelle-logique.js` ; un module par page (`diagnostic.js`… `comparateur.js`) plus `carte-reelle.js`, `configurateur.js`, `ajout.js` ; `compteur.js`, `compte-lien.js`, `compte-session.js`, `formulaire.js` (générique), `alea.js` ; `assets/fonts/` : woff2 (OFL) ; `assets/vendor/leaflet/` : Leaflet 1.9.4 copié, jamais modifié
- `scripts/lots/` (page Lots, logique pure dans `logique.mjs`) et `scripts/documents/` (PDF d'exemple ; `assets/documents/` : cinq PDF fictifs versionnés), sans dépendance
- `wireframes/` : Lo-Fi publiés, `noindex` : écrans 1 à 13 et `index.html`
- `tests/` : Vitest ; `tests/e2e/` Playwright ; `tests/outils/` serveur local et Lighthouse
- `Docs/` : `seed.md`, `lots/` (bilans), `ref/` (`apercus.md`, `environnement.md`, `conventions.md` : règles par page), `apercus.txt` (lignes `lot-N|descriptif`, à compléter à chaque lot)
- `.github/workflows/pages.yml` : vérifications (PR, push) et publication Pages (push sur `main` ou `lot-*`) : racine = `main`, chaque `lot-N` sous `/lot-N/`, liste sur `/lots/`
- `apercu.txt` : cible (ligne 1), puis `type: wireframe|hifi|technique` et `titre:` facultatifs (`Docs/ref/apercus.md`) ; chaque lot le règle sur sa branche.

## Commandes vérifiées
- `npm ci` ; `npm run lint` (ESLint) ; `npm test` (Vitest) ; `npm run e2e` (Playwright, captures dans `test-results/`) ; `npm run lighthouse` (mobile)
- Seuils Lighthouse mobile : performance ≥ 90, accessibilité ≥ 95, bonnes pratiques ≥ 95, SEO ≥ 90 (`tests/outils/seuils-lighthouse.json`) ; wireframes et pages `noindex` : sans SEO.

## Règles durables
- Dépendances de développement seulement, versions exactes ; toute nouvelle dépendance est signalée et justifiée.
- Rien de contenu en dur : textes, liens, réglages dans `data/` ou des fichiers de configuration (annotations de `wireframes/` exceptées ; jetons `--wf-*` réservés).
- Aucune couleur en dur hors `css/tokens.css`. Pas de rouge. L'ambre est réservé aux boutons d'action (texte marine dessus).
- Workflow et réglages GitHub : sur autorisation explicite du prompt du lot seulement ; l'aperçu `/lot-N/` reste en place ; `/lots/` est générée à chaque publication (`Docs/ref/apercus.md`).
- Navigation commune : en-tête = Vendre sur la plateforme, Mon compte, Panier ; pied = les mêmes plus Mentions légales, À propos du démonstrateur, Service après-vente, rappel « aucune vente ». Comptes, connexion et formulaires sont simulés : mention démonstrateur sur chaque formulaire, valeurs fictives, rien envoyé ni enregistré (sessionStorage seulement), aucune donnée dans l'URL.
- Blocs : `data-bloc` (code visible) et `data-role` (identifiant stable, utilisé par les tests) ; anciens codes des wireframes : `Docs/lots/lot-1b.md`.
- Chemins relatifs partout (site servi sous `/<dépôt>/`). Contenus fictifs, aucun vrai logo ni traceur, rien d'externe (police, script).
- Réglage résistant après trois essais : documenter et s'arrêter. Jamais modifier un critère non atteint (le signaler) ni simuler un résultat.
- Fiche produit : E3-1 à E3-8 ; PDF d'exemple : `node scripts/documents/generer.mjs` (testé octet à octet).
- Panier : `sessionStorage.panier` (v 2, sans prix), revalidé à la lecture, prix recalculés depuis `produit.json` ; aucun paiement.
- Formulaires simulés : champs sans `name`, `<form novalidate>` sans `action`, masqué jusqu'au branchement ; validation à l'envoi puis à la saisie, récapitulatif `role="alert"` focalisé ; aucune saisie conservée ni transmise ; un message par couple champ et raison (`conventions.md`).
- Compte simulé : sessions `compte` (`{ v: 1, connecte }`) et `achat` ; garde « Connexion requise » ; aucun e-mail, mot de passe ni saisie conservés.
- Comparateur : 2 à 3 produits d'un même aléa ; session `comparaison` (identifiants seulement) ; `selectionInitiale` et `basculerProduit` = seule source de vérité ; aucune valeur « meilleure » ni bouton ambre.
- Carte réelle seule (plus de schéma ni d'accord) : affichée dès qu'une adresse valide est en session, Leaflet chargé après le premier rendu ; hôtes `data.geopf.fr`, `www.georisques.gouv.fr` (toujours avec `www`), `tile.openstreetmap.org` ; aucune requête tierce sans adresse valide (diagnostic) ni avant 3 caractères saisis (accueil) ; l'adresse (ou son début) n'est envoyée qu'à `data.geopf.fr`, Géorisques ne reçoit que des coordonnées ; information permanente sous les champs d'adresse ; session : seulement `adresse` ; le score reste illustratif ; aucune couche hors `carteReelle`.
- Boutons ambre : « Ajouter au panier », « Valider ma commande » (actif), « Envoyer ma candidature », « Se connecter », « Enregistrer », « Continuer », « Envoyer ma demande ».
- SAV simulé : session `acces-sav` (commande d'exemple, jamais le numéro saisi ni l'e-mail) ; `resoudreContexte` ; « Se déconnecter » efface `compte`, `achat` et `acces-sav`.

## Git
- Branche `lot-N` ; un commit « Lot N-X — titre » par partie ; push après chaque commit ; bilan `Docs/lots/lot-N.md` dans le dernier commit de partie (aucun commit après le tag).
- Début de lot : sonde, arbre propre, `main` à jour, lot N-1 fusionné, lint et tests verts, puis création de `lot-N` (`conventions.md`, « Git »).
- Push : `git push -u origin refs/heads/lot-N:refs/heads/lot-N`, puis `git ls-remote --heads origin lot-N` égal à `git rev-parse HEAD`. Interdits : `--force`, `--force-with-lease`, `rebase`, `commit --amend` après un push, fusion dans `main`, suppression de `lot-N`, push sur un ancien lot. `gh` en lecture seule.
- Tag : push refusé (403), une seule tentative, le propriétaire le pose. Fin de lot : afficher le lien de comparaison de Pull Request ; le propriétaire la crée et la fusionne.

## Pièges (voir `Docs/ref/environnement.md` et `conventions.md`, « Pièges déplacés »)
- `accueil.css` est chargé par `diagnostic.html` et `produit.html` : toute règle ajoutée dedans touche les trois pages.
- Lot dont `apercu.txt` vise `index.html` : le workflow ne déplace plus l'`index.html` du lot (sinon boucle de redirection).
- Textes et listes remplis par JavaScript arrivent après le premier rendu : réserver leur hauteur (`min-block-size`, par point de rupture), sinon le CLS dépasse 0,1.
- `comparateur.html` charge `diagnostic.css` (jauge, pastilles) : une règle modifiée là touche aussi cette page ; les `performances` du batardeau égalent ses spécifications.
- Chromium préinstallé : `executablePath: '/opt/pw-browsers/chromium'`, pas de `playwright install`. Lighthouse : http://localhost seulement. Réseau sortant filtré par un proxy.
- Toute donnée lue en session est revalidée avant affichage ; modifier prix ou cotes de `produit.json` casse les totaux du panier et `compte.json` (un test le signale).
- `prefers-reduced-motion` : transitions à 0,01 ms, donc `toHaveCSS` ou `expect.poll`, jamais `getComputedStyle` juste après une action. Formulaire masqué : réserver sa hauteur (CLS).
- Aucun `id` dans les gabarits clonés ; zones d'ajout de la fiche écrites deux fois : classes seulement, sauf `cotes-ajouter` et son aide.
- Les demandes de `compte.json` sont des exemples fixes ; tout nouvel `id` de commande : `CMD-` suivi de 3 à 8 chiffres (`acces-sav`).
- Géorisques : `GEORISQUES_SERVICES` met 10 s (à éviter) ; titres officiels des couches absents : légendes génériques. Formats inférés et équipements non étirés : `conventions.md`.
