# Lot 8 — Panier Hi-Fi : récapitulatif, validation de responsabilité, total, paiement et SAV, parcours principal
Aperçu : `/lot-8/`. Parties A, B et C faites dans une seule session, à la demande du propriétaire.
## Livré
- A : `panier.html` (E4-1 à E4-6), `panier-logique.js` (`lireCommande`, `validerCommande`, `delaisCommande`, `peutValider`), `panier.js`, `css/panier.css`, objet `panier` de `produit.json`, `liens.panier` = `panier.html`, workflow : `panier.html` ajouté à la liste publiée (seul changement).
- B : aperçu schématique des cotes (SVG copié de la fiche, tracé de `cote-a` et `cote-b` comparé par test), case de responsabilité, total, bouton « Valider ma commande », confirmation simulée, paiement et SAV, grille 60 / 40.
- C : fichier `parcours-principal` (4 parcours, aller-retour, états, noscript, CLS), `tests/outils/lighthouse-panier.mjs` (commande en session, puppeteer-core déjà installé par lighthouse, aucune dépendance ajoutée).
## Critères (chiffres)
- Vitest : 305 (275 + 30). Playwright : 321 (278 + 43). Lint propre. Un test du lot 6 (`cotes-c`) a échoué une fois en suite complète, passé seul puis en suite.
- 375, 768, 1440 px, cinq états : console propre, axe sans violation, aucun débordement, aucune requête externe.
- 1440 px : récapitulatif 701 px, total 467 px (rapport 1,50) ; hauts identiques (y = 175,6) ; paiement sous le total, même largeur (467 px) ; responsabilité sous le récapitulatif.
- Parcours accueil → confirmation : DIY 1,9 s (375) et 1,3 s (1440), pose 0,9 s et 1,2 s ; totaux fiche = panier (690 € et 970 €) ; aucune donnée dans les 5 URL.
- Lighthouse mobile `panier.html` (commande valide, case décochée puis cochée) : performance 96 (DIY) et 97 (pose), accessibilité 100, bonnes pratiques 100 ; CLS 0,002.
- CLS de 360 à 1440 px (JSON retardés de 400 ms) : DIY au plus 0,016, pose 0,015, vide et invalide 0,062 (objectif 0,08 atteint).
- `CLAUDE.md` : 7 805 caractères. Tailles : h1 28 px (36 dès 768), h2 22 px, corps 16 px.
## Points ouverts
- Adresse publiée non ouverte depuis la session : déploiement non vérifié. Push du tag tenté une fois. Produits non complets : `construireCommande` renvoie `null` ; le test des dix produits lui présente une copie marquée complète pour obtenir la raison `incomplet`.
## Choix à valider
- Textes d'exemple, étapes et avertissement dans `produit.json` (clé `panier`) ; libellés de prix de la fiche (pas ceux du wireframe) ; aperçu sans C, valeurs A et B hors des groupes copiés.
- Région d'état unique du total : phrase d'aide visible tant que la case n'est pas cochée, puis confirmation focalisée ; commande supprimée à la validation ; rechargement depuis le cache de navigation (`pageshow`).
- `main` occupe au moins un écran (190 % de la hauteur d'écran avant rendu : décor `.relief` en pourcentage, CLS) ; panier à une ligne ; délais en texte ; deux colonnes 3fr / 2fr dès 1200 px.
- États vide (commande absente) et invalide (présente mais refusée) distingués dans `panier.js`.
## À tester par moi (sur `/lot-8/`, téléphone et deux navigateurs)
- Parcours complet de l'accueil à la confirmation, en DIY puis en pose ; totaux identiques à la fiche ; aperçu des cotes lisible ; bouton neutre tant que la case n'est pas cochée ; confirmation claire (ni paiement ni enregistrement) ; retour au panier après validation : panier vide ; « Modifier mes cotes » ; impression « calme et technique » ; blocs à ajuster : `E4-1` à `E4-6` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-8/`.
## Fusion (à faire par moi)
Pull Request `lot-8` vers `main`, « Create a merge commit », ne pas supprimer la branche ; vérifier `/`, `/diagnostic.html`, `/produit.html`, `/panier.html` et `/lots/`.
