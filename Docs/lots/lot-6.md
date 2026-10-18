# Lot 6 — Configurateur de cotes (E3-5) et « Ajouter au panier »

**Livré** : bloc E3-5 de `produit.html` (schéma SVG interactif, « Où mesurer », 3 champs en mm, faisabilité `role="status"`, bouton « Ajouter au panier ») ; `cotes-logique.js` (pur) et `configurateur.js` ; `cotes` (batardeau seul) et `configurateur` dans `produit.json` ; `sessionStorage.cotes` et `commande` ; réserves de hauteur de `achat`, `mode` et de l'outil recalculées ; aperçu `/lot-6/` (cible `index.html`). Workflow inchangé. `CLAUDE.md` : 9 460 caractères (consolidé avant ajout, ≈ 8 850 hors ajouts, la cible de 8 200 n'est pas atteinte).
**Choix** : champs `type="text"` + `inputmode="numeric"` ; bouton `aria-disabled` (jamais `disabled`), classe `bouton--action` posée par le script seulement à l'état actif ; test du lot 5 adapté (« aucun bouton » devient « un seul bouton, `type="button"` »), non supprimé.

## Critères
- Tests : lint propre ; 255 Vitest (+59, 196) ; 258 Playwright (+43, 215) ; aucun test supprimé. Logique : 50 cas Vitest (bornes, tolérance, monotonie sur 201 × 11 points, pureté, `commande` pour 10 produits × 2 modes).
- Largeurs vues : 375, 768, 1440 px (états à saisir, compatible, hors tolérance, bouton inactif et actif) ; console propre, axe sans violation, aucune requête externe, aucun débordement.
- Mesures à 1440 px : schéma x 132, l 576, h 432 (4:3) ; saisie x 728, l 584 ; faisabilité l 584 h 156 ; bouton l 584 h 45 ; pied stable (écart 0 px entre états à 375, 768 et 1440).
- Lighthouse mobile `produit.html` : performance 97, accessibilité 100, bonnes pratiques 100 (SEO exclu) ; CLS 0,018.
- CLS 360 à 1440 px, JSON retardés de 400 ms, 10 produits × DIY et pose : maximum 0,029 (autres produits, 1200 px), 0,009 pour le batardeau. Mesure de la zone haute seule (E3-5 masqué) : 0,102 avant correction des réserves (cool-roofing, pose, 1200 px), 0,094 après ; le reste vient du décor `.relief` (sa hauteur suit celle de la page), hors lot.

## Points ouverts
- Décor `.relief` : sa taille change au remplissage (source du CLS résiduel) ; pour un produit non complet, l'outil réservé disparaît (CLS 0,029).
- Playwright juge un bouton `aria-disabled` inactif : les tests forcent le clic.
- Adresse publiée non ouverte depuis la session : déploiement non vérifié ; push de tag attendu refusé (403).

## Choix à valider
- Plage du batardeau : largeur 700 à 1 600 mm, hauteur 300 à 600 mm, tolérance au plus 50 mm (exemples).
- Tolérance = marge d'erreur de l'utilisateur : valeur ± t doit tenir dans la plage ; vide = 0 (0 dans `commande`).
- Entiers de millimètres, 1 à 4 chiffres ; espaces tolérées.
- Textes d'aide et d'état : voir `configurateur` ; saisie invalide = état « Cotes à saisir » et message sous le champ.
- Schéma : mur hachuré, barrière en repère ; focus = trait épais + pastille pleine + `aria-current` dans la liste.
- Bouton neutre (contour marine) tant qu'incompatible ; focus du bouton actif = composant existant (contour marine).
- Produit non complet : message et lien « Retour au diagnostic », sans champ.
- `commande` : `{ v, produit, mode, cotes, prix: { materiel, pose|null, total } }`.

## À tester par moi (sur `/lot-6/`, vrai téléphone, deux navigateurs au moins)
Depuis le diagnostic, ouvrir la fiche du batardeau ; saisir des cotes compatibles puis hors tolérance : la confirmation est claire et chiffrée ; le schéma met en évidence la bonne cote au focus ; le bouton reste neutre tant que c'est hors tolérance et devient ambre sinon ; « Ajouter au panier » mène au wireframe du panier ; ouvrir la fiche d'un autre produit et lire le message ; impression « calme et technique » ; blocs à ajuster désignés par `E3-5` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-6/`.

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-6` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/`, `/diagnostic.html`, `/produit.html` et `/lots/` sur le site.
