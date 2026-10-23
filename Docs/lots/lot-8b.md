# Lot 8b — Espace professionnel Hi-Fi : « Vendre sur la plateforme » (écran 5)
**Livré** : `pro.html` (E5-1 à E5-6, `noindex`), `data/pro.json`, `css/pro.css`, `assets/js/pro-logique.js` (logique pure), `formulaire.js` (module générique, contrat dans `conventions.md`, section « Formulaires »), `pro.js`. Introduction, 3 étapes (composant de l'accueil réutilisé), formulaire simulé (9 champs, récapitulatif d'erreurs, revalidation à la saisie), confirmation simulée. `liens.pro` = `pro.html`. Workflow : seul ajout de `pro.html` à la liste publiée. Tailles : h1 28 px (36 px dès 768), h2 22 px, corps 16 px.
**Critères (chiffres)**
- Vitest 394 (356 + 38 nouveaux : 18 logique, 11 données/page, 6 formulaire, 3 confirmation) ; Playwright 385 (345 + 40 : 9 + 14 + 15 + 2 parcours) ; lint propre. Aucun test supprimé ; trois tests adaptés (`wireframes/pro.html` devient `pro.html`).
- Logique : toutes les règles par champ testées, grille déterministe de 1 500 saisies (`ok` ⇔ aucune erreur, raisons dans `RAISONS`, idempotence), jamais d'exception.
- Largeurs vues : 375, 768, 1440 px (vide, erreurs, confirmation) : console propre, axe sans violation, aucun débordement, aucune requête externe.
- 1440 px : carte du formulaire 896 px (56 rem) ; paires côte à côte (société x=153, SIRET x=588) ; étapes en 3 colonnes (x=128, 525, 923) ; une colonne à 375 et 768 px.
- Lighthouse mobile `pro.html` : performance 96, accessibilité 100, bonnes pratiques 100 ; récapitulatif et confirmation : 100 / 100 ; CLS 0,002. CLS de 360 à 1440 px, JSON retardés de 400 ms : 0,005 au plus (réserve de hauteur du formulaire mesurée : 139, 137, 132, 100, 99 rem).
- Autres pages (perf / access. / bonnes pratiques) : `index` 98/100/100 ; `produit` 96/100/100 ; `panier` 96/100/100 ; `diagnostic` 77/100/100.
- Parcours vendeur cliqué : 1,8 s à 375 px, 1,8 s à 1440 px ; aucune donnée dans les URL. `CLAUDE.md` : 8 681 → 7 883 (consolidé) → 8 808 caractères.
**Points ouverts**
- `diagnostic.html` passe sous le seuil de performance (77 < 90) de façon intermittente : CLS 0,441 dû au chargement tardif de la police Inter 600 (non préchargée). Mesuré aussi sur `main` (77 puis 97 selon les passes) : non causé par ce lot, page non modifiée.
- Relief : le décor chevauche parfois du texte à 375 et 768 px (comme les autres pages, axe sans violation).
- Le prompt du lot était tronqué (liste des tests Vitest de la partie C) : appliqué selon la spécification entière. Les trois parties ont été faites dans la même session sur demande.
**Choix à valider**
- Bornes : société 2–100, prénom et nom 1–50 chacun, description 20–1 000, message 0–1 000, e-mail 254 (partie locale 64) ; SIRET : 14 chiffres, format seulement ; téléphone facultatif (9 à 15 chiffres).
- Ordre des raisons : vide, caractère interdit, longueur ; `caractere` seulement pour société, prénom, nom, description, message.
- Aléa inconnu : `invalide` ; liste vide : `vide`. Certifications : deux emplacements d'exemple, aucun téléversement. Aucun stockage, aucune requête.
- La confirmation remplace toute la section formulaire (titre compris) ; « Déposer une autre candidature » la ré-affiche vide, focus sur son titre. Libellés des liens du récapitulatif et textes d'erreur dans `data/pro.json`. Seul bouton ambre : « Envoyer ma candidature ». Module générique `formulaire.js` prêt pour le lot 8c.
**À tester par moi** (téléphone réel, deux navigateurs, `/lot-8b/`) : « Vendre sur la plateforme » mène à la page ; étapes lisibles ; envoi à vide : récapitulatif et liens vers les champs ; correction champ par champ ; saisie fictive puis envoi : confirmation sans écho ; « Déposer une autre candidature » ; rien conservé au rechargement ; impression « calme et technique » ; blocs à ajuster désignés par E5-1 à E5-6 ; sur `/lots/`, « Page Hi-Fi » mène à `/lot-8b/`.
**Fusion (à faire par moi)** : ouvrir la Pull Request `lot-8b` vers `main`, « Create a merge commit », ne pas supprimer la branche ; vérifier `/`, `/pro.html`, `/panier.html` et `/lots/`.
