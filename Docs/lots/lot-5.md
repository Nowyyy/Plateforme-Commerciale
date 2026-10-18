# Lot 5 — Fiche produit Hi-Fi, zone haute (E3-1 à E3-4)

**Livré** : `produit.html` (`noindex`) avec fil d'Ariane, galerie à 4 vues, achat, bascule DIY / pose, pied et décor identiques à l'accueil ; `data/produit.json` (10 produits repris du diagnostic) ; `produit-logique.js` (pur) et `produit.js` ; liaison avec le diagnostic (`sessionStorage.produit`, `sessionStorage.mode`) ; `pages.yml` publie `produit.html` (seule modification) ; aperçu `/lot-5/` (cible `index.html`).
**Choix techniques** : listes relatives à `produit.json` dans `rendu.js` (`galerie.vues`, `badges`) ; sans JavaScript, le contenu est `visibility: hidden` (seul `noscript` visible) ; espace réservé par point de rupture (CLS).

## Critères
- Tests : lint propre ; 196 Vitest (+19 par rapport à `main`, 177) ; 215 Playwright (+29, 186) ; aucun test supprimé (seule adaptation : l'arrivée sur la fiche passe à `produit.html`).
- Largeurs vues : 375, 768, 1440 px, modes DIY et pose ; console propre, axe sans violation, aucune requête externe, aucun débordement.
- Mesures à 1440 px : galerie 701 px, achat 467 px (rapport 1,50) ; haut de galerie et d'achat identiques (171,6 px) ; mode sous achat, même largeur (467 px) et même x (845 px).
- Lighthouse mobile : performance 99, accessibilité 100, bonnes pratiques 100 (SEO exclu, `noindex`) ; CLS Lighthouse 0,059.
- CLS de 360 à 1440 px, JSON retardés de 400 ms, 3 produits : maximum 0,093 (cool-roofing à 1200 px, titre sur deux lignes) ; 0,080 à 360 px.
- Workflow : aucune ligne `uses:`, aucun droit ni secret modifié. `CLAUDE.md` : 9 223 caractères.

## Points ouverts
- Marge de CLS faible à 1200 px pour un titre long (0,093 pour un plafond de 0,1) ; les hauteurs réservées sont mesurées en mode DIY.
- Je n'ai pas pu ouvrir l'adresse publiée depuis la session : déploiement non vérifié. Le push de tag est attendu refusé (403).

## Choix à valider
- Tailles : h1 28 px (36 px dès 768), h2 22 px, corps 16 px, prix 26 px.
- Vues et légendes : Éclaté, Coupe, En situation, Vidéo ; espace réservé « Visuel à venir (exemple) », vidéo = rectangle 16:9 et triangle CSS.
- Références (BAT-120…), délais de livraison et de pose, poses estimées (entre 30 et 50 % du prix, à la dizaine) : exemples.
- Pastilles : certification d'usine, norme française, résistance classe 3 (génériques).
- Bascule : deux cartes radio, détail annoncé par `aria-live`, phrase d'annonce masquée « mode choisi, total estimé ».
- Proportions 60/40 (3fr / 2fr), espacement de 16 px comme le wireframe du lot 1.
- Fiche identique pour les dix produits (seuls titre, prix, référence, délais changent).

## À tester par moi (sur `/lot-5/`, vrai téléphone, deux navigateurs au moins)
Le diagnostic mène à la fiche du produit cliqué ; le fil d'Ariane ramène au diagnostic avec l'adresse ; les quatre vues de la galerie ; prix, délai et pastilles lisibles ; la bascule DIY / pose change le détail et le total ; impression « calme et technique » ; blocs à ajuster désignés par `E3-1` à `E3-4` ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-5/`.

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-5` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/`, `/diagnostic.html`, `/produit.html` et `/lots/` sur le site.
