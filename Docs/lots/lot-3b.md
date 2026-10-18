# Lot 3b — Accueil Hi-Fi complet et passage en index.html
**Livré** : A renommages (`index.html` = accueil, `attente.html`, `accueil.html` redirection) ; B réassurance E1-7 et preuve E1-9 ; C pied E1-10 (un seul `<footer>`), parcours, mesures. Aperçu : `/lot-3b/`.
**Choix** : sur demande, Aléas et Comment ça marche retirés de l'en-tête (ancres) mais gardés dans le pied. Pied : `pied.colonnes` = `{titre, navigation:[{cle,lien}] | entrees:[{texte, lien?}]}` ; `cle` renvoie à `navigation`, `lien` à `liens` (rien de dupliqué) ; `resoudrePied` (rendu.js) les aplatit en `{texte, lien?}`. Colonne 3 = `site.nom` + `pied.presentation`. Entrée sans lien : `<span>` (`baliseEntree`). Clé de liste `site.…` lue dans `site.json`.
**Workflow** : A ajoute `attente.html` à la liste publiée ; correctif demandé ensuite (cible `index.html` : plus de déplacement ni de redirection du lot, sinon boucle). Lignes `uses:`, droits et secrets inchangés.
**Critères** : Vitest 144 (120 sur `main`, +24), Playwright 145 (125, +20) ; lint propre. `index.html` à 375, 768, 1440 px : console propre, aucun débordement, axe 0, aucune requête externe, 10 blocs dans l'ordre (375 et 1440). Pied : 1 colonne à 375 px, 3 à 1440 px, 2 à 768 px. JS désactivé : seul le message noscript. Lighthouse mobile `index.html` : perf 99, accessibilité 100, bonnes pratiques 100 (2 passes identiques ; SEO exclu, `noindex`). CLS max 0,0051 de 360 à 1440 px (JSON retardés de 400 ms).
**Écarts** : « aucun test supprimé » : 2 tests d'ancres de l'en-tête remplacés par 1 test du menu à 2 liens (suite à la demande de retrait) ; test « pas de trou comment→avis » étendu à reassurance. Pas de pied sur les autres pages (hors lot).
**Points ouverts** : déploiement `/lot-3b/` non vérifié depuis la session ; ancres du pied à préfixer si réutilisé ailleurs ; `index.html` doit rester `noindex` jusqu'au lot 10.

## Choix à valider
- Tailles : h2 28 px (36 px dès 768), h3 20 px, corps 16 px, chiffres 34 px.
- Pastilles : pictogramme bouclier + libellé « (exemple) », 2 par rangée en mobile, 3 dès 768 px, 5 dès 1200 px.
- Emplacement vidéo (rectangle 16:9, glyphe lecture CSS) et chiffres d'exemple 60 cm, 12 min, 72 h.
- Pied : 3 colonnes dès 1200 px, 2 dès 768 px (marque pleine largeur), titres de colonnes en `h2`, fond marine.
- Textes « (à venir) » non liés ; fonds alternés blanc/clair, filet entre avis et preuve.
- Redirection `accueil.html` : textes en dur (« Accueil déplacé », « Aller à l'accueil »), exception documentée.

## À tester par moi
Sur un vrai téléphone et deux navigateurs, sur `/lot-3b/` : lisibilité de la réassurance (E1-7), de la preuve (E1-9) et du pied (E1-10) ; liens du pied et ancres (focus sur la section) ; page entière « calme et technique » ; blocs à ajuster désignés par leur code. Sur `/lots/` : « Page Hi-Fi » mène à `/lot-3b/` (en cours), « Anciens lots » liste les lots 2 et 3a.

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-3b` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, puis vérifier `/`, `/accueil.html` (redirection), `/attente.html`, `/lots/` et `/wireframes/`.
