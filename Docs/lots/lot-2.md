# Lot 2 — Hi-Fi de l'accueil, partie haute (E1-1 à E1-4)
**Livré** : `accueil.html` (en-tête, bandeau d'avis, hero, recherche, pied minimal, `noindex`), `data/site.json` et `data/accueil.json`, `assets/js/` (`rendu.js`, `menu.js`, `adresse.js`), `css/composants.css`, `css/accueil.css`, jetons ajoutés, workflow étendu à `accueil.html` (seule modification), `CLAUDE.md` mis à jour. Commits 2-A, 2-B, 2-C.
**Choix** : textes et liens par clés (`data-texte`, `data-lien`, `data-aria-label`, `data-placeholder`) ; l'adresse valide va dans `sessionStorage` puis `wireframes/diagnostic.html`, jamais dans l'URL. Exceptions écrites en dur : `<title>`, meta description, `<noscript>`, message d'erreur de chargement (dans `rendu.js`).
**Critères** :
- Lint sans avertissement ; 39 tests Vitest (21 + 18 nouveaux) ; 36 tests Playwright (20 + 16 nouveaux), tous verts.
- `accueil.html` à 375, 768 et 1440 px : console propre, aucun débordement, axe sans violation (aussi à l'état d'erreur), aucune requête externe ; captures vues aux 3 largeurs, plus l'erreur à 375 px et la saisie à 1440 px.
- JavaScript désactivé : seul le message `noscript` est visible. Chargement en échec : alerte `role="alert"`.
- Parcours cliqué accueil, saisie, diagnostic à 375 et 1440 px : adresse dans `sessionStorage`, absente de l'URL et des requêtes ; stockage indisponible : navigation quand même.
- Lighthouse mobile (SEO exclu, page `noindex`) : performance 100, accessibilité 100, bonnes pratiques 100 ; CLS 0,005 (≤ 0,1 ; mesuré aussi de 360 à 1440 px, maximum 0,047 à 1200 px).
- Aucune valeur hexadécimale hors `css/tokens.css` ; aucun fichier de plus de 5 Mo.
**Points ouverts** : le schéma du hero est un schéma de substitution, à remplacer par celui du propriétaire ; sous 350 px environ le bouton « Menu » passe à la ligne (léger décalage) ; message d'erreur unique, aussi pour une adresse trop longue ou sans lettre ; l'outil Lighthouse exclut le SEO des pages `noindex` ; tag `lot-2` : push tenté une fois (refus 403 attendu), à poser par le propriétaire ; adresse publiée non ouverte depuis la session.
## Choix à valider
- Tailles : h1 34 px (mobile), 48 px (768), 54 px (1200 et plus), interligne 1,1 ; accroche 16 px puis 18 px dès 768 ; corps 16 px.
- Nom provisoire « Protection Habitat » (non vérifié libre de droits) ; placeholder « Ex. : 12 rue des Tilleuls, Lyon ».
- Deux colonnes du hero à partir de 1200 px (texte et recherche 55 %, illustration 45 %) ; en dessous, une colonne : texte, illustration, puis recherche (demande du propriétaire, lot 2-D).
- Fond du hero : dégradé très léger blanc vers fond clair, sans grille (demande du propriétaire, lot 2-D).
- Bandeau démonstrateur vert (jeton), en-tête bleu marine ; carrés de note verts, le 5e à 80 % ; focus des boutons ambre en marine, ailleurs en vert.
- Validation : 5 à 200 caractères, au moins une lettre ; erreur signalée par texte, icône « ! » et filet marine, sans rouge.
- Navigation : « Aléas » et « Comment ça marche » non liés (lot 3) ; Panier visible à côté du bouton Menu sur mobile et en fin de navigation sur desktop (deux liens, un seul affiché à la fois) ; liens temporaires vers `wireframes/`.
## À tester par moi
Sur un vrai téléphone et au moins deux navigateurs, sur `/lot-2/` : lisibilité du titre (E1-3), menu mobile (E1-1), saisie d'adresse valide et invalide (E1-4), aspect du bandeau d'avis (E1-2) et de l'illustration (E1-3), impression générale « calme et technique » ; blocs ou détails à modifier, désignés par `E1-<n>`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-2` vers `main` (https://github.com/Nowyyy/Plateforme-Commerciale/compare/main...lot-2?expand=1), fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier que `/accueil.html` répond sur le site.
