# Lot 7 — Fiche produit : spécifications d'ingénierie (E3-6) et documents à télécharger (E3-7)
Aperçu : `/lot-7/`. Parties A, B et C faites dans une seule session, à la demande du propriétaire. 
## Livré
- A : `CLAUDE.md` allégé (9 460 → 7 007 caractères ; détails dans `Docs/ref/conventions.md`) ; données `specs`, `documents`, `specifications`, `documentsTextes` ; sections masquées (`hidden`) pour un produit non complet ; message du configurateur mis à jour.
- B : `scripts/documents/generer.mjs` (PDF 1.4, sans dépendance, déterministe), `contenus.json`, deux PDF de moins de 2 Ko ; bloc `documents`. Workflow inchangé (`assets` copié récursivement).
- C : tableau sémantique `specs` ; 5 symboles au sprite, que `produit.html` n'avait pas (copié d'`index.html`).
- Choix : listes du produit courant par `<template data-liste-produit>` (`remplirListeProduit`, `rendu.js`) ; libellé de lien par `remplirGabarit` ; h2 22 px, corps 16 px.

## Critères (chiffres)
- Vitest : 275 (255 + 20 nouveaux). Playwright : 20 nouveaux (5 A, 6 B, 9 C) ; total au dernier message. Lint propre.
- 375, 768 et 1440 px : console propre, axe sans violation, aucun débordement, aucune requête externe.
- 1440 px : tableau de 1 024 px (64 rem) à x = 128 px ; liens de documents côte à côte, empilés à 375 px.
- Lighthouse mobile `produit.html` : performance 97 et 98, accessibilité 100, bonnes pratiques 100 ; CLS 0,018.
- CLS de 360 à 1440 px (JSON retardés de 400 ms) : batardeau DIY et pose au plus 0,005, produit non complet au plus 0,034 ; avant : 0,029 et 0,008. Objectif 0,08 atteint : décor `.relief` inchangé.

## Points ouverts
- Adresse publiée non ouverte depuis la session : déploiement non vérifié. Push du tag tenté une fois.

## Choix à valider
- Valeurs d'exemple (60 cm d'eau, 12 minutes, 10 ans, normes fictives, toutes « (exemple) ») et note du tableau, texte libre.
- Écart avec le wireframe : deux colonnes sur mobile, pictogramme et libellé dans la cellule d'en-tête de ligne.
- Pictogrammes en traits ; PDF d'une page A4, mention « DOCUMENT FICTIF — EXEMPLE », sans mise en forme.
- Libellés « {titre} (PDF, exemple) » avec texte d'aide sous chaque lien ; produits non complets : blocs masqués.

## À tester par moi (sur `/lot-7/`, téléphone et deux navigateurs)
- Fiche du batardeau : tableau lisible et crédible ; télécharger et ouvrir les deux PDF ; impression « calme et technique ».
- Autre produit : spécifications et documents absents ; blocs à ajuster désignés par `E3-6` et `E3-7` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-7/`.

## Fusion (à faire par moi)
Pull Request `lot-7` vers `main`, « Create a merge commit », ne pas supprimer la branche ; vérifier `/`, `/diagnostic.html`, `/produit.html` et `/lots/`.
