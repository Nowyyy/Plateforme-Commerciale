# Lot 1c — Wireframes Lo-Fi : espace professionnel, compte client et SAV (écrans 5 à 13)

**Livré** : navigation commune (en-tête et pied) sur les 13 écrans ; écrans 5 `pro`, 6 `connexion`, 7 `compte`, 8 `achats`, 9 `achat`, 10 `sav`, 11 `demandes`, 12 `informations`, 13 `sav-acces` ; index des 13 écrans par parcours ; `apercu.txt` → `wireframes/`.
**Choix** : menu mobile repliable sans JavaScript (case masquée + label « Menu ») ; E7-5 (raccourcis) retiré à ta demande (doublon avec la navigation du compte), le pied de `compte.html` est donc E7-5 ; création de compte hors lot (non ajoutée, sur ta décision).
**Critères** : lint sans erreur ; Vitest 60 tests (45 au départ, 15 nouveaux) ; Playwright 89 tests (47 au départ) : 14 pages × 375/768/1440 px (console propre, aucun débordement, axe sans violation, aucune requête externe), 3 parcours cliqués à 375 et 1440 px, ordre vertical à 375 px sur les 9 nouvelles pages ; captures des 9 pages aux 3 largeurs regardées.
**Lighthouse mobile** (perf / accessibilité / bonnes pratiques) : accueil 99/100/100 ; pro 100/100/100 ; connexion 99/100/100 ; compte 99/100/100 ; achats 100/100/100 ; achat 100/100/100 ; sav 99/100/100 ; demandes 99/100/100 ; informations 99/100/100 ; sav-acces 100/100/100 (SEO exclu, pages `noindex`).
**Points ouverts** : la regex de `tests/workflow.test.js` accepte désormais `lot-1c` (`lot-\d+[a-z]?`) ; `Docs/apercus.txt` complété ; aperçu publié non vérifiable depuis la session ; push du tag `lot-1c` tenté une fois.

## Choix d'agencement à valider
- Menu mobile : bouton « Menu » = case à cocher masquée + label ; la liste s'empile sous le bouton ; absent dès 768 px.
- E5-5 et E10-8 : variante de confirmation affichée sous le formulaire (« Variante b » pour la candidature, « Variante c » pour le SAV).
- E7-3 : 3 lignes en liste ; E7-4 : 2 cartes ; deux colonnes (2/3, 1/3) dès 1200 px.
- E8-3 et E11-3 : cartes empilées sur mobile, lignes pleine largeur dès 768 px ; pastilles actives repérées par le texte « (actif) ».
- E9 : colonne gauche 60 % (E9-2 à E9-4), droite 40 % (E9-5 à E9-7) dès 1200 px ; documents = 5 boutons discrets non liés.
- E10-1 : les deux fils d'Ariane (avec et sans compte) sont affichés l'un sous l'autre dans l'en-tête ; E10-3 et E10-6 : variantes a et b côte à côte dès 1200 px.
- E10 et E12 : un seul `<form>` englobe les blocs de saisie ; la mention démonstrateur est dans le dernier bloc.
- E11-3 : indicateur à 4 pastilles, étape actuelle en noir avec le texte « (étape actuelle) » ; produits d'exemple choisis par moi.

## À tester par moi
Sur un vrai téléphone et dans au moins deux navigateurs, sur `/lot-1c/` puis `/wireframes/` après fusion, pour chaque écran 5 à 13 : tous les éléments attendus sont-ils présents ; l'ordre sur mobile est-il juste ; quels blocs déplacer, supprimer ou ajouter (les désigner par leur code `E<écran>-<n>`) ? Les libellés « Vendre sur la plateforme », « Mon compte » et « Service après-vente » conviennent-ils ? Les trois parcours (vendeur, SAV avec compte, SAV sans compte) se suivent-ils naturellement ? Le menu mobile se déplie-t-il bien ?

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-1c` vers `main` (lien de comparaison dans le dernier message), fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/wireframes/` et `/wireframes/pro.html` sur le site.
