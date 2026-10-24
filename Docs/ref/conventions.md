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
- CLS des blocs `achat` et `mode` : dépend du titre le plus long et du mode (DIY ou pose) ; toute modification de ces blocs impose de remesurer de 360 à 1440 px.
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
- Règles durables (déplacées de `CLAUDE.md` au lot 8b) : identité d'une ligne = `cleLigne` ; limites dans `panier.limites` ; une seule case de confirmation, seulement pour les lignes sur mesure ; la case de responsabilité n'est jamais mémorisée ; « Valider ma commande » affiche une confirmation simulée et supprime le panier ; aucun paiement ; la clé `commande` du lot 8 n'existe plus.
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
- Compteur d'en-tête : `assets/js/compteur.js` (quatre pages Hi-Fi) lit `sessionStorage.panier` par `compterArticles(brut, 100)` et ajoute à chaque lien « Panier » un `<span>` « ({n}) » (« 99+ » au-delà de 99) suivi d'un texte masqué ; libellés dans `site.json` (clé `compteur`), requête de `rendu.js` réutilisée ; mise à jour sur `pageshow`, `storage` et l'événement `panier:modifie` (envoyé par `ajout.js` et `panier.js`, car `storage` ne part pas dans l'onglet qui écrit). En-tête statique identique sur toutes les pages. Sous 480 px le nombre remplace le pictogramme de la barre, sinon le bouton Menu passe à la ligne (CLS).
- Parcours multi-lignes : `tests/e2e/lignes-c.e2e.js` (accueil, adresse, diagnostic, batardeau en quantité 2 puis cumul, pose avec d'autres cotes, autre produit, panier, validation) à 375 et 1440 px ; `tests/outils/lighthouse-panier.mjs` écrit trois lignes.
- Assertions de couleur dans les tests : `toHaveCSS('background-color', …)` (avec nouvelle tentative), jamais une lecture immédiate de `getComputedStyle` juste après un changement d'état.
- Tests de clics : `emulateMedia({ reducedMotion: 'reduce' })` (défilement doux de `accueil.css`).

## Liens externes
- Seuls ceux de `liensExternes` (`data/site.json`) : `https://`, domaine déclaré, nouvel onglet, `rel="noopener noreferrer"`, aucune donnée du visiteur dans le lien.
- Aucune requête vers un autre site avant le lot optionnel 4b.

## Formulaires (lot 8b)
- Contrat de `assets/js/formulaire.js` : `brancherFormulaire({ formulaire, champs, lire, valider, texte, resume, apres })`, générique (ni logique ni texte métier).
- `champs` : `{ champ: élément }` dans l'ordre du formulaire (le champ d'un groupe de cases est son `fieldset` ; le focus va sur la première case).
- `lire()` renvoie la saisie brute ; `valider(saisie)` renvoie `{ ok, erreurs: [{ champ, raison }] }` (fonction pure) ; `texte(champ, raison)` et `resume` (gabarits et libellés de liens, issus de `data/<page>.json`) fournissent tous les textes.
- À l'envoi : toujours `preventDefault` ; avec erreurs, récapitulatif `role="alert"` `tabindex="-1"` en tête (focalisé), message `erreur-<champ>` sous chaque champ, `aria-invalid` et `aria-describedby` ; sans erreur, les champs sont réinitialisés puis `apres()` est appelé.
- Après le premier envoi seulement, chaque champ est revalidé à `input` ou `change` ; le récapitulatif suit et se masque sans erreur. Aucune validation à la perte du focus ni avant l'envoi. `hidden` est levé une fois le gestionnaire branché.
- Confidentialité : aucun `fetch`, `sendBeacon`, stockage, cookie ni IndexedDB ; aucun `name` ; rien dans l'URL ; la confirmation (`role="status"`, focalisée) ne répète aucune valeur saisie.
- `pro-logique.js` : `normaliser` (mono-ligne : bords et espaces ordinaires, U+00A0, U+202F compactés ; SIRET : 14 chiffres si la forme est valide ; zones : `\r\n` et `\r` en `\n`) puis `valider` ; refusés : C0 (sauf `\n` en zone), U+007F, bidirectionnels U+202A-202E et U+2066-2069 (`caractere`) ; SIRET : format seulement, jamais de clé ; e-mail : une arobase, domaine à deux étiquettes au moins, `format` ou `longueur`.
- Raisons (`RAISONS`, source unique) : société/prénom/nom `vide`, `longueur`, `caractere` ; SIRET `vide`, `format` ; e-mail `vide`, `format`, `longueur` ; téléphone `format` ; aléas `vide`, `invalide` ; description `vide`, `court`, `long`, `caractere` ; message `long`, `caractere` ; consentement `vide`. Chaque couple a un texte dans `messages` (plus `repli`).
- Parcours vendeur : fichier de test `tests/e2e/parcours-vendeur.e2e.js` (partie C) à 375 et 1440 px.
- Tests de style : `toHaveCSS` ou `expect.poll` (transitions à 0,01 ms sous `reducedMotion`).

## Compte (lot 8c)
- Pages : `connexion.html` (E6-1 à E6-5), `compte.html` (E7), `achats.html` (E8), `achat.html` (E9), `informations.html` (E12) ; `<html data-donnees="compte">` (`site.json` et `compte.json` seulement) ; `rendu.js` lit les listes dans `compte.json` à défaut d'`accueil`, `produit` et `pro`.
- `compte.json` : `client` (valeurs fictives, `preferences`), `limites`, `statuts` et `statutsDemande` (`{ id, libelle }`), `commandes` (`{ id, date ISO, statut, lignes, livraison { delaiLivraison, delaiPose|null }, artisan|null }`, ligne = instantané `{ produit, titre, reference, icone, mode, cotes|null, quantite, prixUnitaire { materiel, pose } }`, vérifié contre `produit.json` par test), `demandes`, `documents` (catalogue `{ id, titre, fichier }`), `navigationCompte`, `formulaire`, `messages` (un texte par couple de `RAISONSCOMPTE`, plus `repli`), `gardes`, `connexion`, `pages`.
- `compte-logique.js` (pur) : `lireCompte`, `compteConnecte`, `formaterDate` (« 12 septembre 2026 », « 1er » le premier, sans `Intl`), `totauxCommande` (pose seulement en mode pose, fois la quantité), `resumeLignes`, `trierCommandes` (date décroissante, puis id croissant), `filtrerCommandes` (filtre inconnu = « tous »), `demandesEnCours` (hors `cloturee`, au plus 2), `documentsCommande`, `validerConnexion`, `validerInformations`. Il réutilise `normaliser`, `contientInterdit`, `validerEmail` et `validerTelephone` exportés de `pro-logique.js`.
- Documents par commande : `facture` toujours ; `notice` et `pv` si une ligne a des cotes ; `attestation-pose` et `garantie-decennale` si une ligne est en mode pose.
- Session : `compte` = `{ v: 1, connecte: true }` (autre forme = non connecté), `achat` = id de commande, lu sans être supprimé ; « Se déconnecter » supprime les deux et envoie `compte:modifie`. Accès via `compte-session.js` (try/catch partout, stockage injectable pour les tests).
- Garde : `appliquerGarde` remplace le contenu de `<main>` par « Connexion requise » (`h1`, phrase, lien) et masque `.nav-compte` ; en-tête et pied inchangés ; garde d'interface seulement.
- Bascule : `compte-lien.js` (chargé par les dix pages Hi-Fi après `compteur.js`) remplace `liens.connexion` par `liens.compte` dans `.entete` et `.pied` si la session est connectée ; mise à jour sur `pageshow`, `storage` et `compte:modifie`.
- `formulaire.js` : option `valeursInitiales` `[{ controle, valeur }]` (texte, ou booléen pour une case) : la réinitialisation remet ces valeurs au lieu du vide ; sans l'option, comportement inchangé.
- Connexion simulée : tout e-mail valide avec un mot de passe non vide ouvre le compte de démonstration ; rien n'est conservé ; stockage indisponible : message dédié, page inchangée.
- Parcours client : fichier de test `tests/e2e/parcours-client.e2e.js` (partie C) à 375 et 1440 px.
- Tableau de bord, achats, informations (partie B) : cartes de commande et de demande rendues par `compte-vue.js` depuis `<template data-gabarit="carte-commande">` et `carte-demande` (textContent seulement, aucun id) ; statut = texte et icône dessinée en CSS (forme par statut) ; « Voir le détail » écrit `achat` par `ecrireAchat` (délégation) puis ouvre `liens.achat` ; pastilles du filtre = `pages.achats.filtres` (Tous + statuts), `name="statut"` pour les flèches ; informations : formulaire prérempli depuis `client`, `valeursInitiales`, message `role="status"` après un envoi valide.
- CLS : réserves de hauteur mesurées de 360 à 1440 px (listes, carte d'informations, filtre) ; navigation du compte en grille 2 colonnes sous 768 px (hauteur indépendante du remplissage) ; mesure : `node tests/outils/cls-compte.mjs` (serveur local requis).

## Git (détail du début de lot)
- Sonde : `git fetch origin --prune --tags`, `git ls-remote --heads origin`, arbre propre, `git pull --ff-only origin main`.
- Preuve que le lot N-1 est fusionné : `Docs/lots/lot-<N-1>.md` et `pages.yml` sur `origin/main`, et `git merge-base --is-ancestor origin/lot-<N-1> origin/main` ; si la branche a été supprimée, `git log --grep="Lot <N-1>-C" origin/main` non vide. Puis `npm ci`, lint et tests verts sur `main`, puis création de `lot-N`.

## Pièges déplacés de `CLAUDE.md` (lot 8d)
- Le message d'erreur de la recherche d'adresse n'a pas de réserve de hauteur (apparition suivant une action de l'utilisateur, hors CLS) : ne pas la rétablir.
- PDF d'exemple : texte en WinAnsi, un caractère non supporté lève une erreur ; tout nouveau document passe par `scripts/documents/contenus.json`.
- Tests de clics Playwright : voir « Tests de clics » plus haut (`reducedMotion: 'reduce'`).

## SAV (lot 8d)
- Pages : `sav-acces.html` (E13-1 à E13-3), `sav.html` (E10-1 à E10-9), `demandes.html` (E11-1 à E11-4) ; `<html data-donnees="compte">` ; textes dans `compte.json` : `motifs`, `sav` (`acces`, `resume`, `demande`, `etats`, `confirmation`, `suivi`, `messages`), `limites.numero` et `limites.description`. `sav-acces.html` et `sav.html` sont publiques ; `demandes.html` a la garde « Connexion requise ».
- Session : `acces-sav` = `CMD-` suivi de 3 à 8 chiffres, désignant une commande de `compte.json` (jamais le numéro saisi, jamais l'e-mail) ; écrite par `sav-acces.html`, lue sans suppression par `sav.html` ; valeur invalide lue comme absente ; supprimée par « Se déconnecter » avec `compte` et `achat` (`compte-session.js`).
- `sav-logique.js` (pur) : `lireNumero` (espaces, U+00A0 et U+202F retirés ; préfixe `CMD-`, `CMD ` ou `CMD` facultatif, insensible à la casse ; 3 à 8 chiffres ; `vide`, `invalide`, `ok` + id), `trouverCommande`, `commandeParDefaut` (première commande à 2 lignes au moins dans l'ordre de `trierCommandes`, sinon la première), `validerAcces` (`numero` : `vide`, `format` ; `email` : `vide`, `format`, `longueur` ; `commandeId` = commande du numéro, sinon commande par défaut ; l'e-mail n'est jamais renvoyé), `validerDemande`, `coordonneesInitiales`, `trierDemandes`, `filtrerDemandes`, `etapesDemande`, `resoudreContexte`.
- Contexte (`resoudreContexte({ connecte, achat, acces }, commandes)`), par priorité : `compte` (connecté et `achat` désigne une commande), `sans-compte` (`acces` désigne une commande), `achat-manquant` (connecté sans commande valide), `acces-requis`. Les deux derniers remplacent le formulaire par un message (`h2`, phrase, liens).
- Raisons (`RAISONSACCES`, `RAISONSSAV`, source unique) : ligne et motif `vide`, `invalide` ; description `vide`, `caractere`, `court`, `long` (20 à 1 000 points de code) ; prénom, nom, adresse, ville `vide`, `caractere`, `longueur` ; e-mail `vide`, `format`, `longueur` ; téléphone `format` ; code postal `vide`, `format` (5 chiffres, espaces tolérés) ; consentement `vide` (seul `true` est accepté). Un texte par couple dans `sav.messages` (plus `repli`).
- Accès sans compte : format vérifié seulement ; un numéro bien formé mais inconnu ouvre la commande par défaut ; stockage indisponible : message dédié, aucune navigation.
- Demande (partie B) : fil d'Ariane de la variante `compte` (Mon compte > Mes achats > Commande n° {id} > Demande de SAV) ou `sans-compte` (Accueil > Service après-vente > Demande de SAV), dernier élément `aria-current="page"` ; produit concerné en radios-cartes (valeur = index de la ligne, présélectionnée s'il n'y en a qu'une) ; coordonnées préremplies seulement avec compte.
- `formulaire.js` (extension rétrocompatible) : `champs[x].focus()` facultatif, élément focalisé par le lien du récapitulatif (premier radio d'un groupe) ; un groupe de radios déclare son `fieldset` comme zone et contrôle (`aria-invalid` posé sur le `fieldset`, `aria-describedby` vers son message). Le `name` des radios est posé par `sav.js` à l'exécution (flèches dans le groupe), jamais dans le HTML ; les textarea passent déjà.
- Confirmation sans écho : `region role="status"` focalisée ; seule ligne issue du contexte : « Demande concernant : {titre} (commande {id}) » (données de la commande, `texteConcerne`) ; « Retour à mes demandes » seulement en variante `compte` ; champs réinitialisés avant l'affichage.
- Suivi (partie C) : `demandes.js` rend `data-gabarit="carte-demande-sav"` et `etape-sav` (aucun lien ni bouton dans les lignes) ; `etapesDemande` donne `terminee`, `actuelle` ou `a-venir` par statut, rendus par une pastille dessinée en CSS (coche, point, cercle) et un texte masqué (« terminée », « étape actuelle », « à venir ») ; filtre = pastilles `name="statut"` (flèches) ; message vide `sav.suivi.vide`.
- Parcours SAV : `tests/e2e/parcours-sav.e2e.js` (avec compte, sans compte ; 375 et 1440 px). Mesures : `node tests/outils/cls-sav.mjs` (CLS) et `node tests/outils/lighthouse-sav.mjs [releve]` (serveur local non requis pour Lighthouse, requis pour le CLS).
