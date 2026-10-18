# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 7, 18 octobre 2026 (remplace la version 6).

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif. S'y ajoutent un espace professionnel (candidature de vendeurs) et un espace client simulé (achats, service après-vente).

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif ou simulé (produits, avis, certifications, scores, cartes d'exemple, connexion, formulaires) est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 375 et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers, comptes et formulaires simulés.

## Navigation commune
- Wireframes : en-tête à cinq libellés (Aléas, Comment ça marche, Vendre sur la plateforme, Mon compte, Panier). « Mon compte » mène à la connexion, ou au tableau de bord sur les pages connectées (écrans 7, 8, 9, 11, 12). Menu mobile : bouton « Menu » repliable sans JavaScript (case masquée et libellé), absent dès 768 px.
- En-tête Hi-Fi (état après le lot 3b) : Vendre sur la plateforme, Mon compte, Panier. À la demande du propriétaire, « Aléas » et « Comment ça marche » ont été retirés de l'en-tête et du pied ; les sections de l'accueil gardent leurs ancres `#aleas` et `#comment`. Le Panier reste dans la barre sous 1200 px ; le panneau du menu (replié jusqu'à 1199 px) contient les deux autres liens. « Vendre sur la plateforme » et « Mon compte » pointent provisoirement vers `wireframes/`, via `data/site.json`, jusqu'aux lots 8b et 8c. Le logo mène à `index.html`. Les wireframes gardent leurs cinq libellés : écart voulu, à réaligner un jour (idée en attente).
- Pied de page des wireframes : Mentions légales (lot 10), À propos du démonstrateur, Service après-vente (accès sans compte), rappel « aucune vente ».
- Pied de page Hi-Fi complet (lot 3b), piloté par `data/site.json` (clé `pied`), fond bleu marine, trois colonnes dès 1200 px : « Le site » (les liens de l'en-tête) ; « Aide et informations » (Service après-vente vers `wireframes/sav-acces.html`, Mentions légales et À propos du démonstrateur en texte « (à venir) », sans lien) ; marque et phrase de présentation. Bas de pied : « Démonstrateur : contenus fictifs, aucune vente ». Le pied ne contient plus d'ancre : il est réutilisable tel quel sur les autres pages Hi-Fi, avec l'en-tête.
- Navigation du compte (écrans 7, 8, 11, 12) : Tableau de bord, Mes achats, Mes demandes, Mes informations, Se déconnecter ; la page courante est repérée par du texte.

## Pages et parcours : écrans 1 à 4
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 1 Accueil | `index.html` (`accueil.html` est une redirection, l'ancienne page d'attente est `attente.html`) | E1-1 en-tête ; E1-2 hero ; E1-3 recherche d'adresse ; E1-4 les 4 aléas (cartes en 1 puis 2 colonnes, carrousel dès 1200 px avec 3 cartes visibles et des flèches) ; E1-5 protection de la personne (froid, chaleur, chutes) ; E1-6 comment ça marche (3 étapes) ; E1-7 réassurance (pastilles génériques marquées « exemple ») ; E1-8 preuve crash-test (emplacement vidéo sans lecteur, 3 chiffres d'exemple) ; E1-9 bandeau d'avis ; E1-10 pied complet. Dans les wireframes, l'avis précède la preuve : écart voulu du lot 3c |
| 2 Diagnostic | `diagnostic.html` (Hi-Fi, depuis le lot 4 ; `wireframes/diagnostic.html` reste le wireframe) | E2-1 en-tête ; E2-2 adresse évaluée et filtre d'aléa ; E2-3 équipements recommandés (colonne principale) ; E2-4 score de vulnérabilité illustratif ; E2-5 carte schématique et calques (sous le score, même largeur) ; E2-6 pied |
| 3 Fiche produit | `produit.html` | E3-1 en-tête et fil d'Ariane ; E3-2 galerie et vidéo ; E3-3 achat ; E3-4 mode de commande (DIY ou pose) ; E3-5 configurateur de cotes ; E3-6 spécifications ; E3-7 documents ; E3-8 pied |
| 4 Panier | `panier.html` | E4-1 en-tête et étapes ; E4-2 récapitulatif technique et délai de livraison ; E4-3 validation de responsabilité ; E4-4 total ; E4-5 paiement sécurisé et SAV ; E4-6 pied |

Diagnostic Hi-Fi (lot 4) :
- L'adresse vient de la recherche de l'accueil (`sessionStorage`, clé `adresse`), jamais de l'URL. L'aléa choisi sur une carte d'aléa de l'accueil passe par `sessionStorage` (clé `alea`, lue une seule fois) ; sans aléa, le filtre est « Tous ». Les identifiants d'aléa sont ceux de `data/accueil.json`.
- Le score est illustratif : des niveaux fixes par aléa dans `data/diagnostic.json` (faible, modéré, élevé, très élevé), jamais calculés à partir de l'adresse ; « Tous » prend le niveau le plus élevé. Une mention le dit à l'écran.
- La carte est un schéma d'exemple en SVG : quatre calques (zone inondable, retrait-gonflement des argiles, feux de forêt, chaleur extrême) distingués par des motifs et pas seulement par la couleur, cochables. Sous la carte, un lien sortant vers le site officiel Géorisques, en nouvel onglet, sans paramètre.
- Les équipements recommandés (2 ou 3) sont fictifs ; leurs boutons « Voir la fiche » mènent à `wireframes/produit.html` jusqu'au lot 5.
- Bureau : équipements en colonne principale et étirés à la hauteur de la colonne de droite (score puis carte), cartes horizontales.

## Pages et parcours : écrans 5 à 13 (agencement validé au lot 1c)
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 5 Espace professionnel | `pro.html` | E5-1 en-tête ; E5-2 introduction ; E5-3 trois étapes (candidature, validation du catalogue et des certifications, mise en ligne) ; E5-4 formulaire de candidature (société, SIRET en format seulement, contact, e-mail, téléphone, aléas couverts, description des produits, certifications en emplacements de fichiers, message, consentement) ; E5-5 confirmation (variante) ; E5-6 pied |
| 6 Connexion | `connexion.html` | E6-1 en-tête ; E6-2 connexion ; E6-3 compte de démonstration ; E6-4 « SAV sans compte » ; E6-5 pied |
| 7 Tableau de bord | `compte.html` | E7-1 en-tête et navigation du compte ; E7-2 bienvenue ; E7-3 dernières commandes ; E7-4 demandes de SAV en cours ; E7-5 pied (le bloc de raccourcis a été retiré : doublon avec la navigation du compte) |
| 8 Mes achats | `achats.html` | E8-1 en-tête et navigation du compte ; E8-2 filtre par statut ; E8-3 liste (produit, date, numéro, statut, mode DIY ou pose) ; E8-4 pied |
| 9 Détail d'un achat | `achat.html` | E9-1 en-tête et fil d'Ariane ; E9-2 résumé ; E9-3 cotes saisies et schéma de rappel ; E9-4 mode de commande (artisan et date d'intervention fictifs) ; E9-5 livraison ; E9-6 documents (facture, notice, PV d'essais, attestation de pose, garantie décennale) en emplacements de fichiers ; E9-7 « Demander une intervention » ; E9-8 pied |
| 10 Demande de SAV | `sav.html` | E10-1 en-tête et fil d'Ariane (avec ou sans compte) ; E10-2 introduction ; E10-3 produit concerné (prérempli depuis un achat, ou à choisir sans compte) ; E10-4 motif et description ; E10-5 photos en emplacements de fichiers ; E10-6 coordonnées (préremplies avec compte) ; E10-7 envoi et consentement ; E10-8 confirmation avec numéro fictif (variante) ; E10-9 pied |
| 11 Mes demandes | `demandes.html` | E11-1 en-tête et navigation du compte ; E11-2 filtre par statut ; E11-3 liste avec indicateur d'étapes (reçue, en analyse, intervention planifiée, clôturée) ; E11-4 pied |
| 12 Mes informations | `informations.html` | E12-1 en-tête et navigation du compte ; E12-2 identité ; E12-3 adresse de livraison ; E12-4 préférences de communication, mention RGPD en texte seulement (export et suppression non actifs), enregistrement simulé ; E12-5 pied |
| 13 SAV sans compte | `sav-acces.html` | E13-1 en-tête ; E13-2 numéro de commande et e-mail (valeurs de démonstration indiquées à l'écran, format vérifié seulement) ; E13-3 pied |

Parcours :
- Principal : recherche d'adresse, diagnostic, sélection produit, saisie des cotes, choix de pose, panier.
- Vendeur : accueil, « Vendre sur la plateforme », formulaire, confirmation.
- SAV avec compte : connexion, tableau de bord, achats, détail d'un achat, demande de SAV, confirmation, suivi.
- SAV sans compte : pied de page, accès SAV, demande de SAV, confirmation.

Source de vérité de l'agencement : `wireframes/` (validé aux lots 1, 1b et 1c). Identifiants stables : les `data-role`. Les numéros suivent l'ordre de la page ; tout déplacement passe par un lot de correctif. Le Hi-Fi suit l'ordre des wireframes ; les écarts voulus sont listés ci-dessus (carrousel des aléas, familles d'équipements issues du cahier des charges, ordre preuve puis avis, navigation à trois libellés). Une seule fiche produit est complète (un batardeau) ; les autres restent allégées.

## Carte réelle (lot 4b, optionnel)
Un lot optionnel pourra remplacer la carte schématique par une vraie carte : fond OpenStreetMap avec les calques des services cartographiques (WMS) de Géorisques. Il n'est lancé qu'après la fin du parcours principal (lot 8) et après un court test de faisabilité. Règles à respecter :
- Consentement : la carte schématique reste affichée par défaut ; un bouton « Afficher les données réelles » explique que l'adresse sera envoyée à des services tiers (géocodage, fond de carte, Géorisques) et demande l'accord du visiteur. La mention de la recherche (« l'adresse reste dans votre navigateur… ») est alors adaptée.
- Fond de carte : les tuiles OpenStreetMap sont servies par des serveurs bénévoles soumis à une politique d'usage (attribution visible, pas d'usage intensif, en-tête référent HTTP, URL non figée) ; prévoir un fournisseur de repli. Attribution « © OpenStreetMap » visible sur la carte.
- Données de risque : calques WMS publics de Géorisques ; licence et attribution à confirmer sur le site officiel ; le score reste « illustratif » et ne remplace ni un document réglementaire ni l'avis d'un professionnel.
- Test de faisabilité préalable : appels depuis une page GitHub Pages (CORS), clé d'accès éventuelle, quotas, géocodage de l'adresse (service à choisir), bibliothèque de carte à héberger dans le dépôt (seule dépendance d'exécution envisagée), poids et CLS.
- Hors France, ou adresse introuvable : retour automatique à la carte schématique avec un message.

## Page des lots (`/lots/`)
Page de relecture pour un téléphone, hors démonstrateur, publiée à `/lots/` depuis le lot 2b. L'ancienne adresse `/apercus/` est une page de redirection vers `/lots/`. Elle comporte :
- un bouton « Accès Wireframe » : le lot de wireframes le plus récent (lien vers son aperçu s'il est en cours, vers la version de `main` s'il est fusionné) ;
- un bouton « Page Hi-Fi » : même règle pour le lot Hi-Fi le plus récent. Chaque lot part de `main` à jour, donc cette page contient toutes les évolutions précédentes ;
- un menu déroulant « Anciens lots » : tous les lots Hi-Fi sauf le plus récent, du plus récent au plus ancien, chacun avec un lien vers son aperçu d'époque ; un message s'affiche quand la liste est vide. Ni wireframes ni lots techniques.
Règles :
- Générée automatiquement à chaque publication à partir des branches `lot-*` et de leur fichier `apercu.txt`, sans liste à maintenir à la main. Le nom du fichier `apercu.txt` ne change pas. La logique et le rendu vivent dans `scripts/lots/`, décrits dans `Docs/ref/apercus.md`.
- Format de `apercu.txt` : la cible sur la première ligne (caractères `A-Za-z0-9._/-`, sans `..` ni `/` initial) ; lignes optionnelles `type: wireframe`, `hifi` ou `technique`, et `titre: <court>`. Sans `type:`, une cible `wireframes/…` est un wireframe et toute autre cible un lot Hi-Fi. Un lot d'outillage s'écrit `type: technique` et n'apparaît pas sur la page. Un type inconnu ou une branche sans `apercu.txt` est ignoré.
- Chaque lot Hi-Fi règle `apercu.txt` sur sa branche : cible `index.html`, `type: hifi`, `titre: …`. Une cible `index.html` ne déclenche ni déplacement ni redirection du lot dans le workflow (sinon boucle).
- Mêmes jetons et même police que le site ; lisible à 375 et 1440 px ; `noindex` ; aucun script (menu déroulant natif, utilisable au clavier) ; aucune ressource externe.
- Une panne de génération ne doit jamais empêcher la publication des aperçus `/lot-N/` : page de repli et avertissement dans les journaux.
- Toute modification du workflow exige l'autorisation explicite du prompt du lot.
- Ne plus pousser sur les anciennes branches de lot : leur ancien workflow régénérerait l'ancienne page.

## Contenus et source
| Contenu | Source |
|---|---|
| Textes, produits, prix, délais, cotes, avis | Fictifs, rédigés par l'agent, dans `data/*.json` ; avis marqués « exemple » |
| Familles d'équipements par aléa | Issues du cahier des charges (batardeaux, clapets, pompes ; boucliers, volets extrudés, filets de toiture ; sprinklers, grilles pare-braises ; cool roofing, isolants réflecteurs) ; familles de protection de la personne rédigées par l'agent, fictives |
| Titres de section de l'accueil | « À chaque aléa immobilier sa solution », « Protéger aussi les personnes », « Comment ça marche » ; provisoires |
| Réassurance (accueil) | Cinq pastilles génériques, toutes marquées « exemple » (organisme de certification, norme française, marquage européen, deux assureurs) ; aucun vrai nom |
| Preuve crash-test (accueil) | Emplacement vidéo sans lecteur ; chiffres d'exemple (60 cm de hauteur d'eau retenue, 12 min de déploiement, 72 h d'essai) et note « valeurs d'exemple » |
| Diagnostic (niveaux par aléa, équipements recommandés, prix indicatifs) | Fictifs, dans `data/diagnostic.json` ; scores et prix marqués « illustratif » ou « exemple » |
| Carte du diagnostic | Schéma SVG d'exemple, sans donnée réelle ; lien sortant vers le site officiel Géorisques (adresse `https://www.georisques.gouv.fr/`, page d'accueil : le préremplissage d'une adresse n'a pas été vérifié) ; carte réelle seulement au lot 4b |
| Client de démonstration, commandes, demandes SAV, candidatures | Fictifs, dans `data/compte.json` ; aucune donnée réelle |
| Photos, rendus 3D, coupes, vidéo de crash-test réelle | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Pictogrammes | Sprite SVG géométrique de substitution (aléas, protection, bouclier) |
| Certifications, assureurs, plateformes d'avis | Pastilles « exemple » sans vrai logo ni vrai nom |
| Facture, PV d'essais, notices, attestations, pièces jointes | Emplacements « [Fichier exemple] » ou PDF fictifs marqués « exemple » |
| Nom de marque | « Protection Habitat », provisoire, à remplacer |
| Schéma du hero | Schéma de substitution, à remplacer par celui du propriétaire |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine `#0F1D38` (structure), vert `#1B4332` (durabilité), fond `#F8FAFC`, accent ambre `#D97706`. Texte sur fond ambre en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair, ni pour les calques de carte. Bandeau démonstrateur vert, en-tête et pied de page bleu marine ; focus ambre sur les boutons d'action, vert ailleurs. Les liens de cartes ne sont pas des boutons d'action : bleu marine, soulignés au survol et au focus.
- Fond de page unique (lot 3c) : toutes les sections partagent le jeton `--color-bg` ; les sections sont transparentes ; cartes, pastilles de réassurance et blocs de chiffres sont en fond blanc à bordure fine. Les espacements entre sections sont par jetons.
- Hero : dégradé vertical d'une teinte bleutée (jeton `--color-hero-debut`, `#d2e0f2`, tenue jusqu'à 20 % de la hauteur) qui se fond exactement dans le fond de page, sans arête ; sans grille ; sur mobile, ordre texte, illustration, puis recherche ; dès 1200 px, deux colonnes (texte et recherche environ 55 %, illustration environ 45 %).
- Relief décoratif (lot 3c) : courbes de niveau en SVG en ligne, très discrètes (jeton `--color-relief`, marine à 10 %, moitié sous 768 px), derrière le contenu, non interactives (`aria-hidden`, `pointer-events: none`) ; deux « collines » dès 768 px (à 38 % et 70 % de la hauteur de page), une seule en dessous. Les cartes blanches les masquent. Le diagnostic reprend le même décor et le même fond.
- Carte du diagnostic : schéma sobre, rapport 4:3 ; calques distingués par un motif propre (diagonales, points, croisillons, losanges) et un jeton de teinte `--calque-*` ; aucune couleur d'alerte, pas d'ambre ; légende avec le même motif ; l'état d'un calque est donné par la case et le texte.
- Pastilles de filtre (diagnostic) : boutons radio stylés, contour marine, état choisi repéré par un trait et du texte ; boutons « Mettre à jour » et « Voir la fiche » en style secondaire (contour marine), aucun bouton ambre sur cette page.
- Pictogrammes en traits dans des pastilles claires ; numéros d'étapes en ronds marine ; preuve crash-test : emplacement vidéo 16:9 et chiffres en grand, chiffres tabulaires.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes), polices hébergées dans le dépôt.
- Tous les réglages vivent dans des variables CSS (`css/tokens.css`) ; aucune couleur en dur. Jetons d'espacement `--space-*` (le plus grand : `--space-8`, 72 px ; `--gap-lg` n'existe pas). Les wireframes restent en niveaux de gris (`--wf-*`).
- Les écrans de formulaires et de compte reprennent les composants existants (champs, boutons, cartes) ; aucun style hors jetons. Les erreurs de saisie se signalent par texte, icône et filet marine, sans rouge ; l'état d'un élément (actif, repéré) est toujours donné par du texte, jamais par la couleur seule. Le message d'erreur de la recherche d'adresse n'a pas de réserve de hauteur (il suit une action de l'utilisateur).

## Stack et hébergement
HTML, CSS à variables, JavaScript en modules, sans compilation ni dépendance d'exécution. Textes et liens dans `data/*.json`, injectés par clés (`data-texte`, `data-lien`) ; les listes (cartes, étapes, pastilles, chiffres, colonnes du pied) sont rendues par des gabarits `<template data-liste="…">` et leur nombre d'éléments n'est jamais figé dans le HTML ou le CSS ; une entrée sans lien est un texte simple. Outils de développement seulement : ESLint, Vitest, Playwright avec axe, Lighthouse. Chemins relatifs. Justification : peu d'état, aucun serveur possible. Alternative si le nombre de pages explose : Astro ou Vite.
Données de session (`sessionStorage`, jamais dans l'URL, jamais envoyées) : `adresse` (adresse saisie à la recherche), `alea` (aléa choisi sur l'accueil, lu une seule fois par le diagnostic), état de connexion et saisies des comptes et formulaires simulés ; chaque formulaire affiche « Démonstrateur : saisissez des données fictives, rien n'est envoyé ni enregistré ».
Liens externes : seuls les liens déclarés dans la clé `liensExternes` de `data/site.json` sont autorisés ; `https://` uniquement, domaine déclaré, ouverture en nouvel onglet avec `rel="noopener noreferrer"`, jamais de donnée du visiteur dans le lien. Aucune requête vers un autre site tant que le lot 4b n'existe pas.
Hébergement : GitHub Pages (adresse `github.io`), publication par workflow GitHub Actions. Chaque branche `lot-N` est publiée en aperçu à `/lot-N/` (fichier `apercu.txt`) ; ne jamais supprimer ces branches. À la racine du site : `index.html` (accueil Hi-Fi, `noindex` jusqu'au lot 10), `diagnostic.html` (depuis le lot 4), `attente.html` (ancienne page d'attente), `accueil.html` (redirection vers `index.html`, pour les anciens liens), `lots/`, `apercus/` (redirection), `wireframes/`. Le workflow publie les pages par liste explicite : chaque nouvelle page de la racine exige l'autorisation du prompt du lot.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code cloud, relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit sans retouche humaine ; vrai paiement ; vraie authentification (connexion réelle, mot de passe) ; création de compte ; vrai envoi des formulaires professionnel et SAV ; vrai stockage de pièces jointes ; vraie vérification du SIRET ; suivi réel de colis ; page de détail d'une demande de SAV ; messagerie avec l'artisan et favoris ; vraies données de risque, carte réelle et vrai calcul de vulnérabilité (sauf le lot optionnel 4b) ; vrais logos, certifications, avis clients et notes ; vraies vidéos et lecteur vidéo (avant fourniture des fichiers) ; catalogue complet et page de liste ; page « À propos du démonstrateur » ; CMS ; autre langue que le français ; analytique et cookies.

## Risques connus
- Constaté aux lots 0 à 3c : navigateur piloté, captures, Lighthouse, push de branches et de workflow fonctionnent ; le push de tags est refusé (HTTP 403) ; l'agent ne peut pas ouvrir l'adresse publiée, donc le déploiement se vérifie à la main ; Lighthouse exclut la catégorie SEO des pages `noindex`.
- Les lots 1, 2, 3a, 3b et 3c ont reçu des ajouts ou des changements en cours de route (demandes du propriétaire, parties supplémentaires) : le plafond de taille d'un lot n'est pas tenu. Préférer un lot de correctif (comme le 1b) à des parties ajoutées ; les prompts interdisent toute partie supplémentaire.
- `CLAUDE.md` approche de sa limite de 10 000 caractères (deux puces condensées au lot 3c) : consolider avant d'y ajouter des règles.
- Écarts entre wireframes et Hi-Fi (navigation à trois libellés, ordre preuve puis avis) : les wireframes ne sont plus la source de vérité sur ces points.
- Logos CSTB ou NF, garantie décennale, tiers de confiance sans droit : pastilles « exemple », bandeau « démonstrateur, aucune vente » sur chaque page.
- Données personnelles : les formulaires sont simulés, mais un visiteur peut y saisir de vraies données. Mention visible sur chaque formulaire, aucune donnée envoyée ni conservée au-delà de la session. Une version réelle exigerait un service externe et la conformité RGPD, hors de ce démonstrateur.
- Diagnostic : un score ou une carte, même schématique, peut être pris pour un avis officiel ; mentions « illustratif » et « exemple » obligatoires, lien vers la source officielle.
- Carte réelle (lot 4b) : l'adresse d'un particulier est une donnée personnelle envoyée à des tiers ; tuiles OpenStreetMap soumises à une politique d'usage ; CORS, quotas, clé éventuelle et licence non vérifiés.
- Textes injectés par JavaScript : invisibles sans lui, et risque de décalage de mise en page (réserve de hauteur des listes remplies, surveillée par le CLS ; mesuré à 0,0051 au maximum aux lots 3b et 3c).
- La page des lots dépend du workflow : la détection des lots fusionnés demande l'historique Git complet ; une ancienne branche de lot qui reçoit un push régénérerait l'ancienne page.
- Relief décoratif : un texte posé sur un motif peut passer en « à vérifier » plutôt qu'en réussite dans l'outil d'accessibilité ; positions en pourcentage de la hauteur de page.
- Export Figma : résultat non garanti conforme (composants, auto-layout strict, variables) ; compte Figma nécessaire ; plugin non testé.

## Plan en lots
| Lot | Sujet | État |
|---|---|---|
| 0 | Socle, jetons, page d'attente en ligne | fait |
| 1 | Wireframes Lo-Fi des 4 écrans, aperçu par lot | fait |
| 1b | Correctifs d'agencement : accueil (avis) et diagnostic (équipements et carte) | fait |
| 2 | Hi-Fi accueil, partie haute : en-tête, hero, recherche, bandeau d'avis | fait |
| 1c | Wireframes Lo-Fi : écrans 5 à 13 (professionnel, connexion, compte, achats, détail d'achat, SAV avec et sans compte, suivi, informations) ; navigation commune ; parcours cliqués | fait |
| 2b | Page « Lots » (`/lots/`) : accès wireframes, page Hi-Fi, anciens lots ; génération automatique ; redirection de `/apercus/` | fait |
| 3a | Hi-Fi accueil : aléas (carrousel dès 1200 px), protection de la personne, comment ça marche ; navigation Hi-Fi | fait |
| 3b | Hi-Fi accueil : réassurance, preuve crash-test, pied de page complet ; `accueil.html` devient `index.html`, la page d'attente devient `attente.html` | fait |
| 3c | Fond de page unique, hero fondu dans le fond, relief décoratif, correction du vide dans la carte de recherche ; preuve placée avant l'avis | fait (fusion à confirmer) |
| 4 | Diagnostic Hi-Fi : adresse, filtre par aléa (depuis les cartes de l'accueil), équipements recommandés, score illustratif, carte schématique à quatre calques, lien vers Géorisques | prochain |
| 4b | Optionnel, après le lot 8 : carte réelle (fond OpenStreetMap et calques WMS Géorisques) avec consentement, précédée d'un test de faisabilité | à décider |
| 5 | Fiche produit : zone haute et bascule DIY / pose | à faire |
| 6 | Configurateur de cotes et tests de sa logique | à faire |
| 7 | Spécifications d'ingénierie et téléchargements fictifs | à faire |
| 8 | Panier, validation de responsabilité, test de bout en bout du parcours principal | à faire |
| 8b | Hi-Fi : espace professionnel (écran 5), formulaire simulé avec validation, confirmation | à faire |
| 8c | Hi-Fi : connexion simulée, compte, achats, détail, SAV avec compte (depuis un achat) et sans compte, suivi, informations ; `data/compte.json` | à faire |
| 9 | Optionnel : comparateur de 2 à 3 produits, sélecteur de niveau de risque | à faire |
| 10 | Performance, accessibilité, SEO (fin du `noindex`), mentions légales et texte RGPD, nom de marque définitif, relecture des mentions « simulé » | à faire |
| 11 | Optionnel, sur ordinateur : export Figma des écrans, puis reprise manuelle | à faire |

## Idées en attente (hors lot en cours)
Index des projets sur `nowyyy.github.io` (autre dépôt, accord requis) ; pose manuelle des tags `lot-N` (facultatif) ; remplacement du nom de marque provisoire, du schéma du hero et des pictogrammes ; bouton « Menu » du Hi-Fi qui passe à la ligne sous 350 px ; message d'erreur unique de la recherche d'adresse ; « Mes diagnostics » dans le compte ; page de détail d'une demande de SAV ; page « À propos du démonstrateur » (aucun lot prévu) ; suppression de `Docs/apercus.txt`, devenu inutile depuis le lot 2b (à faire dans un lot d'outillage) ; éventuellement une section en bleu marine (le crash-test) pour ancrer la page avant le pied ; lot de correctif pour réaligner les wireframes sur le Hi-Fi (navigation, ordre preuve et avis) ; consolidation de `CLAUDE.md` si elle n'est pas faite au lot 4.
