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
- `sessionStorage.cotes` (saisie, par produit) ; le clic actif de « Ajouter au panier » écrit `panier` (lot 8a) ; l'ancienne clé `commande` du lot 8 n'existe plus.
- Le bouton n'est jamais `disabled` (`aria-disabled`) et c'est le seul bouton ambre ; le schéma n'a que les lettres A, B, C comme texte.

## Panier
- `panier.html` (E4-1 à E4-6) : `en-tete`, `recapitulatif`, `responsabilite`, `total`, `paiement`, `pied` ; indicateur d'étapes = `<nav>` en tête du `<main>`, sans `data-role`. Textes dans `data/produit.json`, clé `panier`.
- États : plein (au moins une ligne), vide (`panier` absent ou liste vide : « Votre panier est vide »), illisible (JSON invalide, forme ou version inconnue : « Panier à vérifier », `statutListe`). Vide et illisible masquent `responsabilite`, `total` et `paiement` ; `h1` toujours présent ; la carte d'état est dans `#recap-vide`, les annonces dans `#recap-etat` (`role="status"`).
- Grille : une colonne sous 1200 px dans l'ordre du HTML ; dès 1200 px deux colonnes 3fr / 2fr (`panier__colonne`) : `recapitulatif` puis `responsabilite` à gauche, `total` puis `paiement` à droite. `main` occupe au moins un écran (pied sous la ligne de flottaison, CLS) ; avant le rendu, `.recap[aria-busy]` réserve la hauteur (30 rem).
- Lignes : gabarit `<template data-gabarit="ligne">` (aucun id) ; `<details>` (cotes, aperçu schématique, délais, reprise à la fiche) ; ligne invalide : « À vérifier : {raison} », ni quantité ni détail, « Retirer » (et « Reprendre à la fiche » si le produit est connu). Après la validation, les lignes restent affichées sans contrôle.
- Aperçu des cotes d'une ligne : gabarit SVG sans `id` (pas de motif de hachure), groupes `cote-a` et `cote-b` dont les `d` sont comparés par un test à ceux de `produit.html` ; valeurs et lettres par `textContent`, `aria-label` par gabarit de données.
- « Valider ma commande » : jamais `disabled` ; `aria-disabled` ; classe `bouton--action` seulement à l'état actif ; aide : lignes à vérifier d'abord, sinon case de confirmation (seulement s'il y a une ligne sur mesure) ; clic actif = confirmation (CMD-000, exemple), `panier` supprimé.
- Parcours principal : fichier de test `tests/e2e/parcours-principal.e2e.js` (accueil, adresse, diagnostic, fiche, cotes, mode, ajout, « Voir le panier », validation) à 375 et 1440 px ; aucune donnée dans les URL.

## Panier à plusieurs lignes (lot 8a)
- Modèle : `sessionStorage.panier` = `{ v: 2, lignes: [{ produit, mode: "diy"|"pose", cotes: { largeur, hauteur, tolerance }|null, quantite }] }`, jamais de prix, de titre ni de délai. `cotes` est `null` pour les produits sans configurateur. Logique pure : `assets/js/lignes-logique.js`.
- Identité : `cleLigne` = `produit|mode|largeur|hauteur|tolerance` (`produit|mode|-` sans cotes) ; la quantité n'en fait pas partie. Même clé = fusion, clé différente = nouvelle ligne.
- Lecture : `lireListe(brut, limites)` (JSON sûr, `v` 2 seulement, lignes de forme invalide écartées et comptées, doublons fusionnés, quantité plafonnée, `lignesMax` premières lignes), puis `validerPanier` ; raisons de refus d'une ligne : `produit`, `mode`, `cotes`. `compterArticles(brut, plafond = 99)` ne dépend pas des données.
- Limites (exemples, `panier.limites`) : `quantiteMax` 10, `lignesMax` 10. `ajouterLigne` : `ajoutee`, `fusionnee`, `plafonnee` (le total demandé dépasse `quantiteMax`), `pleine` (état inchangé), `refusee`. Retrait / restauration : `retirerLigne` rend la ligne et son index, `restaurerLigne` réinsère à `min(index, longueur)`.
- Totaux : lignes valides seulement ; pose seulement en mode pose ; délai le plus long = produit au `livraisonSemainesMax` (ou `poseSemainesMax`) le plus grand, égalité : première ligne.
- Fiche : groupe « Quantité » (`role="group"`, sortie `aria-live`, boutons `aria-disabled` aux bornes) ; batardeau : zone `#cotes-action` sous la faisabilité ; autres produits : zone `data-ajout="mode"` dans le bloc `mode`, bouton ambre d'emblée (classe posée par `ajout.js`). Confirmation : région `role="status"` `tabindex="-1"` qui reçoit le focus, deux liens (« Voir le panier », « Continuer mes achats ») sauf si le panier est plein ou le stockage indisponible.
- Retrait et annulation : « Retirer » annonce « {titre} retiré du panier. » avec « Annuler » (région d'état) ; « Annuler » restaure à l'index d'origine ; le bouton disparaît après toute autre modification. Quantités : plancher 1, plafond `quantiteMax` ; annonces par la région d'état du récapitulatif.
- Reprise à la fiche : écrit `produit`, `mode` et `cotes` (textes) en session, jamais dans l'URL, puis ouvre `liens.produit` ; la fiche affiche donc les entiers de la ligne (« 1200 »).
- Tests de clics : `emulateMedia({ reducedMotion: 'reduce' })` (défilement doux de `accueil.css`).

## Liens externes
- Seuls ceux de `liensExternes` (`data/site.json`) : `https://`, domaine déclaré, nouvel onglet, `rel="noopener noreferrer"`, aucune donnée du visiteur dans le lien.
- Aucune requête vers un autre site avant le lot optionnel 4b.
