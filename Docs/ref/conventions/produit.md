# Conventions de la fiche produit
Fiche, cotes (configurateur), spécifications et documents.

## Fiche produit
- Produit choisi (clé `produit`, lue sans être supprimée) et mode DIY ou pose (clé `mode`) en `sessionStorage`.
- `data/produit.json` reprend les `id`, titres et prix de `data/diagnostic.json` (un test les compare) ; prix et totaux par `formaterPrix`.
- Aucun `<video>` ni `<img>` : visuels = espaces réservés.
- Blocs : E3-1 à E3-8 ; `specs` (E3-6) et `documents` (E3-7) s'insèrent après `configurateur` (E3-5) sans déplacer les autres ; ils n'existent que pour le produit `complet` (attribut `hidden` sinon).
- CLS des blocs `achat` et `mode` : dépend du titre le plus long et du mode (DIY ou pose) ; toute modification de ces blocs impose de remesurer de 360 à 1440 px.
- Documents : PDF d'exemple générés par `scripts/documents/generer.mjs` à partir de `scripts/documents/contenus.json`, versionnés dans `assets/documents/`.

## Cotes (configurateur)
- Seul le produit `complet` (batardeau) a `cotes` ; faisabilité = `evaluerCotes` (valeur ± tolérance dans la plage, bornes comprises, tolérance vide = 0) ; entiers en mm uniquement.
- `sessionStorage.cotes` (saisie, par produit) ; le clic actif de « Ajouter au panier » écrit `panier` (lot 8a) ; l'ancienne clé `commande` du lot 8 n'existe plus.
- Le bouton n'est jamais `disabled` (`aria-disabled`) et c'est le seul bouton ambre ; le schéma n'a que les lettres A, B, C comme texte.

## Règles durables extraites de `CLAUDE.md` (lot 10a, texte d'origine)
- PDF d'exemple : `node scripts/documents/generer.mjs` (testé).
