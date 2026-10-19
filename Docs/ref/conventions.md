# Conventions détaillées par page (référence durable)
Règles déplacées de `CLAUDE.md` au lot 7, sans changement de fond. À lire avant de modifier le diagnostic, la fiche produit, le relief ou les listes.

## Pied et en-tête
- Pages Hi-Fi : en-tête, pied et décor `.relief` sont copiés à l'identique entre les pages (un test compare) ; toute nouvelle page de la racine s'ajoute à la liste publiée du workflow (autorisation explicite du lot).
- Le pied de l'accueil vient de `data/site.json` (clé `pied`) ; une entrée sans `lien` est un texte non lié.
- Navigation : liens vers les pages pas encore en Hi-Fi = `wireframes/` via `data/site.json` ; menu replié jusqu'à 1199 px.
- Clés d'attribut : `data-texte`, `data-lien` (ex. `site.liens.panier`), `data-aria-label`, `data-placeholder`. En dur : `<title>`, meta description, `noscript`, erreur de chargement (`rendu.js`).

## Fond et relief
- Un seul fond de page (jeton de fond clair), sections transparentes ; cartes, pastilles et blocs de données en fond blanc à bordure fine.
- Le dégradé du hero part d'une teinte bleutée et arrive exactement sur le fond de page.
- Décor `.relief` (SVG en ligne, `aria-hidden`, `pointer-events: none`, jeton `--color-relief`) : jamais de texte ni d'interaction dedans ; deux groupes dès 768 px, un seul en dessous.

## Accueil
- Ordre des blocs : en-tete, hero, recherche, aleas, protection, comment, reassurance, preuve, avis, pied ; les tests vérifient l'ordre relatif, jamais la liste exacte.

## Listes et gabarits
- Listes (cartes, étapes) : elles viennent des données et sont rendues par des `<template data-liste="…">`.
- Clés relatives à l'élément (`data-texte`, `data-icone`), `.` pour une chaîne ; `data-lien` et `data-texte-global` restent globaux.
- Jamais de nombre d'éléments figé dans le HTML ou le CSS ; conteneurs en `aria-busy` jusqu'au remplissage.
- Liste propre au produit courant (lot 7 : `specs`, `documents`) : `<template data-liste-produit="…">`, rendue par `produit.js` depuis l'objet du produit (`remplirListeProduit` de `rendu.js`) ; `data-liste` reste réservé aux listes de premier niveau.

## Diagnostic
- Adresse en `sessionStorage` (clé `adresse`), aléa de l'accueil (clé `alea`, lu une fois) ; jamais dans l'URL.
- Score et équipements illustratifs, jamais calculés sur l'adresse.
- Carte schématique en SVG, calques distingués par des motifs ; aucun bouton ambre sur cette page.
- Le diagnostic Hi-Fi est `diagnostic.html` ; `wireframes/diagnostic.html` ne sert que de gabarit (ne pas confondre leurs tests).

## Fiche produit
- Produit choisi (clé `produit`, lue sans être supprimée) et mode DIY ou pose (clé `mode`) en `sessionStorage`.
- `data/produit.json` reprend les `id`, titres et prix de `data/diagnostic.json` (un test les compare) ; prix et totaux par `formaterPrix`.
- Aucun `<video>` ni `<img>` : visuels = espaces réservés.
- Blocs : E3-1 à E3-8 ; `specs` (E3-6) et `documents` (E3-7) s'insèrent après `configurateur` (E3-5) sans déplacer les autres ; ils n'existent que pour le produit `complet` (attribut `hidden` sinon).
- Documents : PDF d'exemple générés par `scripts/documents/generer.mjs` à partir de `scripts/documents/contenus.json`, versionnés dans `assets/documents/`.

## Cotes (configurateur)
- Seul le produit `complet` (batardeau) a `cotes` ; faisabilité = `evaluerCotes` (valeur ± tolérance dans la plage, bornes comprises, tolérance vide = 0) ; entiers en mm uniquement.
- `sessionStorage.cotes` (saisie, par produit) et `commande` (écrite au clic actif de « Ajouter au panier », lue au lot 8).
- Le bouton n'est jamais `disabled` (`aria-disabled`) et c'est le seul bouton ambre ; le schéma n'a que les lettres A, B, C comme texte.

## Panier
- `panier.html` (E4-1 à E4-6) : `en-tete`, `recapitulatif`, `responsabilite`, `total`, `paiement`, `pied` ; indicateur d'étapes = `<nav>` en tête du `<main>`, sans `data-role`. Textes dans `data/produit.json`, clé `panier`.
- Trois états : plein (commande valide), vide (clé `commande` absente ou vide : « Votre panier est vide », lien vers le diagnostic), invalide (commande présente mais refusée : « Commande à vérifier », lien vers la fiche). Vide et invalide masquent `responsabilite`, `total` et `paiement` ; `h1` toujours présent ; message annoncé par une région `role="status"`.
- `validerCommande(objet, produits)` : `{ ok, commande }` ou `{ ok: false, raison }` ; raisons `absente`, `version`, `produit`, `incomplet`, `mode`, `cotes` (entiers requis, `evaluerCotes` avec les limites du produit). Lignes de prix et total recalculés par `lignesPrix`, jamais ceux de la session.
- Grille : une colonne sous 1200 px dans l'ordre du HTML ; dès 1200 px deux colonnes 3fr / 2fr (`panier__colonne`) : `recapitulatif` puis `responsabilite` à gauche, `total` puis `paiement` à droite. `main` occupe au moins un écran (pied sous la ligne de flottaison, CLS).
- Aperçu des cotes : SVG copié de `produit.html` (mur, ouverture, seuil, barrière, flèches A et B, sans C) ; le tracé des groupes `cote-a` et `cote-b` est comparé par un test ; valeurs écrites par `textContent`.
- « Valider ma commande » : jamais `disabled` ; `aria-disabled` ; classe `bouton--action` seulement à l'état actif ; clic inactif = aide dans la région d'état et focus sur la case ; clic actif = confirmation (CMD-000, exemple), `commande` supprimée.
- Parcours principal : fichier de test `tests/e2e/parcours-principal.e2e.js` (accueil, adresse, diagnostic, fiche, cotes, mode, panier, validation) à 375 et 1440 px, DIY et pose ; aucune donnée dans les URL.

## Liens externes
- Seuls ceux de `liensExternes` (`data/site.json`) : `https://`, domaine déclaré, nouvel onglet, `rel="noopener noreferrer"`, aucune donnée du visiteur dans le lien.
- Aucune requête vers un autre site avant le lot optionnel 4b.
