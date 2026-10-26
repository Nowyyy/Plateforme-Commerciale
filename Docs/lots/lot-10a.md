# Lot 10a — Qualité technique : mesures, corrections, accessibilité, documentation
Aperçu : `/lot-10a/` (publié par le workflow ; non vérifiable depuis la session). Mesures simulées (services tiers refusés par le proxy) : jamais des scores réels. Parties A, B et C faites dans la même session, sur demande.
## Livré
A : `CLAUDE.md` 8 991 → 7 484 caractères, `conventions.md` (171 → 16 lignes, index) et 7 fichiers `Docs/ref/conventions/` (55 lignes au plus), outils (`matrice`, `cls-matrice`, `mesures-pages`, `empreinte`), 14 empreintes, `liens-internes`, `qualite.md`, stabilisation de `pro-b` et `compte-c`. B : `connexion` (réserve du formulaire masqué), relief, `commun.css`, préchargement d'Inter 600 retiré, code mort, aide d'adresse, lectures API sans Leaflet. C : tests d'accessibilité transversaux, titre de galerie, noms des liens « Reprendre… ».
## Choix
Positions du relief réglées par page (`body:has(…)`) ; `commun.css` = règle utilisée hors accueil ; `aria-label` à gabarit de données pour les liens répétés ; aide d'adresse aussi masquée quand l'adresse est déjà affichée (diagnostic).
## Critères (chiffres)
- Vitest : 738 → 778 (40 nouveaux : 15 + 14 + 11) ; Playwright : 648 → 748 (100 nouveaux : 44 + 25 + 31) ; lint propre ; aucun test supprimé.
- Lighthouse mobile, médiane de 3 passes, avant → après : 14 pages ≥ 90 / 95 / 95 ; `connexion` 78 → 95 (CLS 0,348 → 0,010) ; diagnostic 93 → 94 (bonnes pratiques 96 : tuiles de carte à 256 px) ; autres 93 à 97, accessibilité 100.
- CLS Playwright (55 largeurs, JSON +400 ms) : 0,055 au plus (objectif 0,08), inchangé. Poids à 375 px : 4 093 → 3 974 Ko, 438 → 439 requêtes ; console : 0 message ; liens cassés : 0.
- Parcours (relance isolée) : principal 2,0 s, vendeur 1,0 s, client 2,1 s, SAV 1,0 à 1,8 s, comparateur 0,6 à 1,4 s, adresse stricte 1,6 s. `pro-b` et `compte-c` : 10 relances isolées vertes, suite complète verte.
- `CLAUDE.md` : 7 484 caractères ; empreinte : identique à celle de départ (écart 0).
## Correspondance des règles (ancien `conventions.md` → `conventions/`)
Pied, Fond et relief, Listes, Liens externes, Git, Pièges → `generales` ; Accueil → `accueil` ; Diagnostic, Exposition, Carte réelle, Saisie d'adresse → `diagnostic` ; Fiche produit, Cotes → `produit` ; Panier, Panier 8a → `panier` ; Formulaires, Compte, SAV → `formulaires` ; Comparateur → `comparateur` ; règles 4c réparties par sujet ; règles retirées de `CLAUDE.md` : reprises mot pour mot en fin de fichier.
## Écarts d'empreinte justifiés
Aucun : le relief et l'aide d'adresse ne déplacent aucun bloc (`data-role`), la réserve de `connexion` égale la hauteur du formulaire.
## Tests adaptés (avant / après)
- Six tests lisaient `conventions.md` (`produit-7a`, `sav-a-pages`, `comparateur-a`, `compte-a-pages`, `pro-a`, `sav-b`) → `lireConventions()` (index + dossier) ; plafond de 190 lignes appliqué à l'index.
- `accueil-fond`, `accueil-relief`, `saisie-stricte-4e-c` : `css/accueil.css` → `commun.css` + `accueil.css` ; `comparateur-a` : feuille `accueil.css` → `commun.css` et tuple `apercu.txt` ; `sav-a-pages` : tuple `apercu.txt`.
- `compte-c.test` : préchargement d'Inter 600 présent → absent ; `adresse-assistee-b` : exports + `aideVisible` ; `pro-b.e2e` et `compte-c.e2e` : attente de la mise en page (`expect.poll`, `focaliser`).
## Points ouverts
- À 768 px, le groupe 1 du relief de l'accueil passe en grande partie derrière la première carte blanche. À 320 px, « En situation » (vignettes de `produit`) se coupe en milieu de mot (non corrigé). Bonnes pratiques de `diagnostic` : 96 (tuiles Leaflet 256 px sous DPR 1,75). Conservés car lus par des tests : `RAISONS`, `RAISONSCOMPTE`, `ETATS`, `filtrerEquipements`, `niveauGlobal`, `Docs/apercus.txt`.
## Choix à valider
- Seuils inchangés (90/95/95, CLS 0,1) ; documentation en index + 7 fichiers ; relief : positions verticales par page ; `commun.css` extrait d'`accueil.css`.
- Préchargement d'Inter 600 retiré (aucun gain : 93→94 et 96→96) ; code mort retiré : `ETAPES`, `aucuneCommande`, `navigation.fonctionnement`.
- Liens répétés : `aria-label` tiré des données (« Voir la fiche : titre », « Reprendre… : titre (mode, cotes) ») ; reflow à 320 px : aucune correction nécessaire.
## À tester par moi
Sur un vrai téléphone et deux navigateurs, sur `/lot-10a/` : parcourir les 14 pages ; vérifier que rien n'a changé visuellement, que le relief ne gêne plus la lecture à 375 et 768 px, que l'aide de l'adresse disparaît quand l'adresse est choisie, que la carte et les aléas s'affichent comme avant ; faire défiler les pages au clavier ; blocs à ajuster désignés par leur code ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-10a/`.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-10a` vers `main`, fusionner avec « Create a merge commit », ne pas supprimer la branche, vérifier `/`, `/diagnostic.html` et `/lots/` sur le site.
