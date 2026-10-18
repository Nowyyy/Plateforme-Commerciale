# Lot 3a — Hi-Fi de l'accueil : aléas, protection de la personne, comment ça marche et navigation à cinq libellés

**Livré** : sections E1-4 `aleas`, E1-5 `protection`, E1-6 `comment` (entre `recherche` et `avis`) ; listes par `<template data-liste>` (`rendu.js`) ; sprite de 6 pictogrammes ; navigation à cinq libellés avec ancres et focus ; carrousel cyclique des aléas (demande du propriétaire en cours de lot) ; aperçu `/lot-3a/` (`apercu.txt`, hifi).
**Choix** : `data-liste` se lit relativement à `accueil.json` ; `data-texte-global` pour un texte global dans un gabarit ; numéros des étapes par compteur CSS (aucun numéro en données) ; réserves de hauteur appliquées seulement tant que `aria-busy="true"` ; carrousel (`carrousel.js`, logique pure `etatFleches`) dès 1200 px seulement ; deux réserves du hero ajoutées (accroche sous 375 px, de 1200 à 1279 px).
**Écart voulu** : titre des aléas « À chaque aléa immobilier sa solution » (demandé, avec accent) ; 3 cartes d'aléas visibles dès 1200 px avec flèches (au lieu de 4 colonnes) ; sous 1200 px toutes les cartes restent visibles (1 puis 2 colonnes).

**Critères**
- Lint propre ; Vitest 119 (107 au départ, +12) ; Playwright 125 (104 au départ, +21) ; aucun test supprimé. Tests existants adaptés (liens `#`, cinq libellés) sans affaiblissement.
- Largeurs vues : 375, 768, 1440 px ; console propre, aucun débordement, axe sans violation, aucune requête externe. JavaScript désactivé : seul le message `noscript` est visible.
- Lighthouse mobile `accueil.html` : performance 100, accessibilité 100, bonnes pratiques 100 (SEO exclu : `noindex`). CLS 0,002 (Lighthouse) ; maximum 0,013 de 360 à 1440 px (JSON retardés de 400 ms).
- Aucune couleur hexadécimale hors `tokens.css` ; aucune dépendance ; aucun secret.

**Points ouverts**
- Déploiement `/lot-3a/` non vérifié depuis la session (adresse inaccessible).
- Push du tag `lot-3a` : une tentative, résultat dans le dernier message.
- Le Panier reste dans la barre sous 1200 px ; le panneau du menu contient quatre liens.

**Choix à valider**
- Tailles : h2 28 px mobile et 36 px dès 768 px, h3 20 px, corps 16 px.
- Titres : « À chaque aléa immobilier sa solution », « Protéger aussi les personnes », « Comment ça marche ».
- Pictogrammes : 6 symboles géométriques en traits dans une pastille claire.
- Familles : celles du cahier des charges (écart avec le wireframe : Pompes, Boucliers, Sprinklers, Cool roofing, etc.).
- Ancres : défilement doux, focus sur la section (`tabindex="-1"`), en-tête non fixe donc marge de 16 px.
- Rupture de la navigation : menu replié jusqu'à 1199 px (les cinq libellés passent à la ligne à 768 px).
- Fonds : blanc (`aleas`, `comment`), clair (`protection`), cartes blanches.

**À tester par moi** (téléphone réel, deux navigateurs, `/lot-3a/`) : lisibilité des trois sections ; menu à cinq libellés ; clics « Aléas » et « Comment ça marche » ; flèches du carrousel (E1-4) ; clic sur une carte ; « Vendre sur la plateforme » et « Mon compte » ; impression « calme et technique » ; blocs à ajuster désignés par `E1-4` à `E1-6` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-3a/` (en cours) et « Anciens lots » liste le lot 2.

**Fusion (à faire par moi)** : ouvrir la Pull Request `lot-3a` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/accueil.html` et `/lots/` sur le site.
