# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 8, 23 octobre 2026 (remplace la version 7).

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif. S'y ajoutent un espace professionnel (candidature de vendeurs) et un espace client simulé (achats, service après-vente).

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif ou simulé (produits, avis, certifications, scores, cartes d'exemple, documents, connexion, formulaires, commandes) est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 375 et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers, comptes et formulaires simulés.

## Navigation commune
- Wireframes : en-tête à cinq libellés (Aléas, Comment ça marche, Vendre sur la plateforme, Mon compte, Panier). « Mon compte » mène à la connexion, ou au tableau de bord sur les pages connectées (écrans 7, 8, 9, 11, 12). Menu mobile : bouton « Menu » repliable sans JavaScript (case masquée et libellé), absent dès 768 px.
- En-tête Hi-Fi : Vendre sur la plateforme, Mon compte, Panier. À la demande du propriétaire, « Aléas » et « Comment ça marche » ont été retirés de l'en-tête et du pied ; les sections de l'accueil gardent leurs ancres `#aleas` et `#comment`. Le Panier reste dans la barre sous 1200 px ; le panneau du menu (replié jusqu'à 1199 px) contient les deux autres liens. « Vendre sur la plateforme » et « Mon compte » pointent provisoirement vers `wireframes/`, via `data/site.json`, jusqu'aux lots 8b et 8c. Le logo mène à `index.html`, « Panier » à `panier.html`. Le lot 8a pourra ajouter un compteur d'articles à « Panier ». Les wireframes gardent leurs cinq libellés : écart voulu, à réaligner un jour (idée en attente).
- Pied de page des wireframes : Mentions légales (lot 10), À propos du démonstrateur, Service après-vente (accès sans compte), rappel « aucune vente ».
- Pied de page Hi-Fi complet (lot 3b), piloté par `data/site.json` (clé `pied`), fond bleu marine, trois colonnes dès 1200 px : « Le site » (les liens de l'en-tête) ; « Aide et informations » (Service après-vente vers `wireframes/sav-acces.html`, Mentions légales et À propos du démonstrateur en texte « (à venir) », sans lien) ; marque et phrase de présentation. Bas de pied : « Démonstrateur : contenus fictifs, aucune vente ».
- Toutes les pages Hi-Fi (accueil, diagnostic, fiche produit, panier) copient à l'identique l'en-tête, le pied et le décor de relief d'`index.html` ; un test les compare.
- Navigation du compte (écrans 7, 8, 11, 12) : Tableau de bord, Mes achats, Mes demandes, Mes informations, Se déconnecter ; la page courante est repérée par du texte.

## Pages et parcours : écrans 1 à 4
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 1 Accueil | `index.html` (`accueil.html` est une redirection, l'ancienne page d'attente est `attente.html`) | E1-1 en-tête ; E1-2 hero ; E1-3 recherche d'adresse ; E1-4 les 4 aléas (cartes en 1 puis 2 colonnes, carrousel dès 1200 px avec 3 cartes visibles et des flèches) ; E1-5 protection de la personne (froid, chaleur, chutes) ; E1-6 comment ça marche (3 étapes) ; E1-7 réassurance (pastilles génériques marquées « exemple ») ; E1-8 preuve crash-test (emplacement vidéo sans lecteur, 3 chiffres d'exemple) ; E1-9 bandeau d'avis ; E1-10 pied complet. Dans les wireframes, l'avis précède la preuve : écart voulu du lot 3c |
| 2 Diagnostic | `diagnostic.html` (Hi-Fi depuis le lot 4 ; `wireframes/diagnostic.html` reste le wireframe) | E2-1 en-tête ; E2-2 adresse évaluée et filtre d'aléa ; E2-3 équipements recommandés (colonne principale) ; E2-4 score de vulnérabilité illustratif ; E2-5 carte schématique et calques (sous le score, même largeur) ; E2-6 pied |
| 3 Fiche produit | `produit.html` (Hi-Fi depuis les lots 5 à 7 ; `wireframes/produit.html` reste le wireframe) | E3-1 en-tête et fil d'Ariane ; E3-2 galerie (4 vues : éclaté, coupe, en situation, vidéo, toutes des espaces réservés) ; E3-3 achat (titre, référence, prix, délai, pastilles « exemple ») ; E3-4 mode de commande (DIY ou pose, estimation de pose d'exemple, total estimé) ; E3-5 configurateur de cotes (batardeau seul) ; E3-6 spécifications d'ingénierie (tableau, batardeau seul) ; E3-7 documents (deux PDF fictifs, batardeau seul) ; E3-8 pied |
| 4 Panier | `panier.html` (Hi-Fi depuis le lot 8 ; `wireframes/panier.html` reste le wireframe) | E4-1 en-tête et indicateur d'étapes ; E4-2 récapitulatif technique ; E4-3 validation de responsabilité (aperçu schématique des cotes, case à cocher) ; E4-4 total et bouton « Valider ma commande » ; E4-5 paiement sécurisé et service après-vente ; E4-6 pied |

Diagnostic Hi-Fi (lot 4) :
- L'adresse vient de la recherche de l'accueil (`sessionStorage`, clé `adresse`), jamais de l'URL. L'aléa choisi sur une carte d'aléa de l'accueil passe par `sessionStorage` (clé `alea`, lue une seule fois) ; sans aléa, le filtre est « Tous ». Les identifiants d'aléa sont ceux de `data/accueil.json`.
- Le score est illustratif : des niveaux fixes par aléa dans `data/diagnostic.json` (faible, modéré, élevé, très élevé), jamais calculés à partir de l'adresse ; « Tous » prend le niveau le plus élevé. Une mention le dit à l'écran.
- La carte est un schéma d'exemple en SVG : quatre calques (zone inondable, retrait-gonflement des argiles, feux de forêt, chaleur extrême) distingués par des motifs et pas seulement par la couleur, cochables. Sous la carte, un lien sortant vers le site officiel Géorisques, en nouvel onglet, sans paramètre.
- Les équipements recommandés (2 ou 3) sont fictifs ; leurs boutons « Voir la fiche » mènent à `produit.html` avec le produit choisi.
- Bureau : équipements en colonne principale et étirés à la hauteur de la colonne de droite (score puis carte), cartes horizontales.

Fiche produit Hi-Fi (lots 5 à 7) :
- Le produit affiché est celui choisi au diagnostic (`sessionStorage`, clé `produit`, lue sans être supprimée) ; absent ou inconnu : le batardeau modulable. `data/produit.json` reprend les `id`, titres et prix des dix équipements de `data/diagnostic.json` (un test les compare) ; seul le batardeau est « complet ».
- Mode de commande : « Matériel seul (DIY) » ou « Matériel + pose par un artisan partenaire » (`sessionStorage`, clé `mode`) ; l'estimation de pose est un pourcentage fictif du prix (entre 30 et 50 %, à la dizaine) ; garantie décennale et délais d'exemple. Tous les prix et totaux passent par `formaterPrix`.
- Configurateur (batardeau seul) : cotes en entiers de millimètres ; plage d'exemple de largeur 700 à 1 600 mm, de hauteur 300 à 600 mm, tolérance au plus 50 mm ; la tolérance est la marge d'erreur de la mesure du visiteur (valeur ± tolérance doit tenir dans la plage, bornes comprises ; vide = 0) — sens à confirmer avec le client ; faisabilité immédiate et chiffrée ; schéma interactif avec trois cotes A, B et C ; saisie conservée en session (`cotes`).
- Spécifications et documents (batardeau seul) : tableau sémantique à quatre lignes, valeurs d'exemple ; deux PDF fictifs générés sans dépendance par `scripts/documents/generer.mjs`, déterministes, marqués « DOCUMENT FICTIF — EXEMPLE ».
- Autres produits : message de renvoi au diagnostic, sans configurateur, spécifications ni documents (jusqu'au lot 8a, qui leur donne un ajout direct au panier).
- « Ajouter au panier » est actif seulement avec des cotes compatibles ; il n'est jamais `disabled` (`aria-disabled`).

Panier Hi-Fi (lot 8) :
- La commande écrite à la fiche (`sessionStorage`, clé `commande`, versionnée) est relue sans être supprimée, puis revalidée : cotes réévaluées, prix recalculés à partir des données (le prix de la session est ignoré). Trois états : plein, vide (« Votre panier est vide », retour au diagnostic), invalide (« Commande à vérifier », retour à la fiche).
- La case de responsabilité n'est jamais mémorisée. « Valider ma commande » (ambre seulement une fois la case cochée) affiche une confirmation simulée (« CMD-000 (exemple) », aucun paiement, rien d'enregistré) et supprime la commande de la session.
- Grille 60 / 40 dès 1200 px ; textes du panier dans `data/produit.json` (clé `panier`, une seule page de données).
- Parcours principal de bout en bout testé (accueil, adresse, diagnostic, fiche, cotes, pose, panier, validation) à 375 et 1440 px.

Panier à plusieurs lignes (lot 8a, valeurs d'exemple à confirmer au bilan) :
- Chaque ligne montre un aperçu : visuel de substitution, nom, référence, mode (DIY ou pose), résumé des cotes pour les lignes sur mesure, quantité, prix unitaire et total de ligne. Les cotes, les délais et l'aperçu schématique des cotes sont dans un détail repliable natif (`<details>`), avec « Tout déplier ».
- L'identité d'une ligne est : produit, mode, cotes et tolérance. Ajouter une configuration identique augmente la quantité ; une configuration différente crée une ligne. Limites proposées : 10 unités par ligne, 10 lignes.
- Les dix produits ont un bouton « Ajouter au panier » avec une quantité ; les produits sans configurateur s'ajoutent sans cotes. Après l'ajout, la fiche reste affichée avec une confirmation (« Voir le panier », « Continuer mes achats ») au lieu de rediriger.
- Une seule confirmation des mesures dans le récapitulatif, exigée seulement s'il y a au moins une ligne sur mesure ; un lien déplie les cotes de chaque ligne.
- Totaux : matériel, pose estimée, total TTC, délai le plus long ; un seul paiement simulé.
- « Retirer » annonce le retrait et propose « Annuler » ; une ligne dont les cotes ne conviennent plus est signalée seule, et la validation reste inactive tant qu'il en reste.
- Mobile : une colonne, barre fixe en bas avec le total et « Valider ».
- Session : la clé `commande` est remplacée par `panier` (lignes sans prix, versionnée, revalidée à chaque lecture).
- Option : compteur d'articles dans l'en-tête, à décider au lot.

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
- Principal : recherche d'adresse, diagnostic, sélection produit, saisie des cotes, choix de pose, panier, validation simulée (Hi-Fi complet depuis le lot 8).
- Vendeur : accueil, « Vendre sur la plateforme », formulaire, confirmation.
- SAV avec compte : connexion, tableau de bord, achats, détail d'un achat, demande de SAV, confirmation, suivi.
- SAV sans compte : pied de page, accès SAV, demande de SAV, confirmation.

Source de vérité de l'agencement : `wireframes/` (validé aux lots 1, 1b et 1c). Identifiants stables : les `data-role`. Les numéros suivent l'ordre de la page ; tout déplacement passe par un lot de correctif. Le Hi-Fi suit l'ordre des wireframes ; les écarts voulus sont listés ci-dessus (carrousel des aléas, familles d'équipements issues du cahier des charges, ordre preuve puis avis, navigation à trois libellés, tableau de spécifications conservé sur mobile, panier à plusieurs lignes). Une seule fiche produit est complète (un batardeau) ; les autres restent allégées.

## Carte réelle (lot 4b, optionnel)
Un lot optionnel pourra remplacer la carte schématique par une vraie carte : fond OpenStreetMap avec les calques des services cartographiques (WMS) de Géorisques. Il n'est lancé qu'après le lot 8a et après un court test de faisabilité. Règles à respecter :
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
| Fiches produit (dix produits) | Fictives, dans `data/produit.json` : références (par exemple BAT-120), délais de livraison et de pose, estimations de pose, pastilles, garantie ; marqués « exemple » ; seule la fiche du batardeau est complète |
| Spécifications et documents du batardeau | Valeurs d'exemple (60 cm d'eau retenue, 12 minutes, 10 ans, normes fictives) ; deux PDF générés par `scripts/documents/` à partir de `contenus.json`, marqués « DOCUMENT FICTIF — EXEMPLE », sans valeur contractuelle |
| Panier et commande | Textes d'exemple dans `data/produit.json` (clé `panier`) ; numéro « CMD-000 (exemple) » ; aucun paiement ni enregistrement |
| Client de démonstration, commandes, demandes SAV, candidatures | Fictifs, dans `data/compte.json` (à créer au lot 8c) ; aucune donnée réelle |
| Photos, rendus 3D, coupes, vidéo de crash-test réelle | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Pictogrammes | Sprite SVG géométrique de substitution (aléas, protection, bouclier, spécifications, téléchargement) |
| Certifications, assureurs, plateformes d'avis, tiers de confiance bancaire | Pastilles « exemple » sans vrai logo ni vrai nom |
| Facture, attestation de pose, garantie décennale, pièces jointes du compte | Emplacements « [Fichier exemple] » ou PDF fictifs marqués « exemple » (lot 8c) |
| Nom de marque | « Protection Habitat », provisoire, à remplacer |
| Schéma du hero | Schéma de substitution, à remplacer par celui du propriétaire |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine `#0F1D38` (structure), vert `#1B4332` (durabilité), fond `#F8FAFC`, accent ambre `#D97706`. Texte sur fond ambre en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair, ni pour les calques de carte. Bandeau démonstrateur vert, en-tête et pied de page bleu marine. Les liens de cartes ne sont pas des boutons d'action : bleu marine, soulignés au survol et au focus.
- Boutons d'action ambre : « Ajouter au panier » et « Valider ma commande », seulement à l'état actif, texte bleu marine ; à l'état inactif, ils restent focalisables (`aria-disabled`, jamais `disabled`) et neutres (contour marine). Les autres boutons sont secondaires (contour marine). Focus visible : contour marine à décalage sur les boutons d'action (comportement des lots 2 et 6), vert ailleurs.
- Fond de page unique (lot 3c) : toutes les sections partagent le jeton `--color-bg` ; les sections sont transparentes ; cartes, pastilles de réassurance et blocs de chiffres sont en fond blanc à bordure fine. Les espacements entre sections sont par jetons.
- Hero : dégradé vertical d'une teinte bleutée (jeton `--color-hero-debut`, `#d2e0f2`, tenue jusqu'à 20 % de la hauteur) qui se fond exactement dans le fond de page, sans arête ; sans grille ; sur mobile, ordre texte, illustration, puis recherche ; dès 1200 px, deux colonnes (texte et recherche environ 55 %, illustration environ 45 %).
- Relief décoratif (lot 3c) : courbes de niveau en SVG en ligne, très discrètes (jeton `--color-relief`, marine à 10 %, moitié sous 768 px), derrière le contenu, non interactives (`aria-hidden`, `pointer-events: none`) ; deux « collines » dès 768 px (à 38 % et 70 % de la hauteur de page), une seule en dessous. Les cartes blanches les masquent. Toutes les pages Hi-Fi reprennent le même décor et le même fond.
- Carte du diagnostic : schéma sobre, rapport 4:3 ; calques distingués par un motif propre (diagonales, points, croisillons, losanges) et un jeton de teinte `--calque-*` ; aucune couleur d'alerte, pas d'ambre ; légende avec le même motif ; l'état d'un calque est donné par la case et le texte.
- Pastilles de filtre (diagnostic) : boutons radio stylés, contour marine, état choisi repéré par un trait et du texte.
- Fiche produit : galerie 4:3 avec quatre vignettes, grille 60 / 40 dès 1200 px ; bascule DIY / pose en deux cartes radio ; schéma du configurateur avec cotes A, B et C mises en évidence au focus par un trait plus épais ; tableau de spécifications de 64 rem au plus.
- Panier : grille 60 / 40 dès 1200 px, indicateur d'étapes, aperçu schématique des cotes.
- Pictogrammes en traits dans des pastilles claires ; numéros d'étapes en ronds marine ; preuve crash-test : emplacement vidéo 16:9 et chiffres en grand, chiffres tabulaires.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes, prix), polices hébergées dans le dépôt.
- Tous les réglages vivent dans des variables CSS (`css/tokens.css`) ; aucune couleur en dur. Jetons d'espacement `--space-*` (le plus grand : `--space-8`, 72 px ; `--gap-lg` n'existe pas). Les wireframes restent en niveaux de gris (`--wf-*`).
- Les écrans de formulaires et de compte reprennent les composants existants (champs, boutons, cartes) ; aucun style hors jetons. Les erreurs de saisie se signalent par texte, icône et filet marine, sans rouge ; l'état d'un élément (actif, repéré, compatible, hors tolérance) est toujours donné par du texte, jamais par la couleur seule. Les messages d'erreur et de confirmation n'ont pas de réserve de hauteur (ils suivent une action de l'utilisateur).

## Stack et hébergement
HTML, CSS à variables, JavaScript en modules, sans compilation ni dépendance d'exécution. Textes et liens dans `data/*.json`, chargés par `rendu.js` d'après l'attribut `<html data-donnees>` (au plus deux requêtes de données par page) et injectés par clés (`data-texte`, `data-lien`) ; les listes (cartes, étapes, pastilles, chiffres, colonnes du pied, vues de galerie, lignes de spécifications) sont rendues par des gabarits `<template data-liste="…">` ou `data-liste-produit`, et leur nombre d'éléments n'est jamais figé dans le HTML ou le CSS ; une entrée sans lien est un texte simple. Outils de développement seulement : ESLint, Vitest, Playwright avec axe, Lighthouse. Chemins relatifs. Justification : peu d'état, aucun serveur possible. Alternative si le nombre de pages explose : Astro ou Vite.
Logique pure testée sans DOM : `diagnostic-logique.js`, `produit-logique.js`, `cotes-logique.js`, `panier-logique.js`. Générateur de PDF d'exemple sans dépendance : `scripts/documents/generer.mjs`, PDF versionnés dans `assets/documents/` et identiques octet à octet à ce que le générateur produit (un test le vérifie).
Données de session (`sessionStorage`, jamais dans l'URL, jamais envoyées) : `adresse`, `alea` (lu une fois), `produit` (lu sans suppression), `mode` (`diy` ou `pose`), `cotes` (saisie du configurateur, par produit), `commande` (versionnée, revalidée au panier, supprimée à la validation ; remplacée par `panier` au lot 8a), état de connexion et saisies des comptes et formulaires simulés. Aucune donnée lue en session n'est crue : elle est revalidée avant affichage. Chaque formulaire affiche « Démonstrateur : saisissez des données fictives, rien n'est envoyé ni enregistré ».
Liens externes : seuls les liens déclarés dans la clé `liensExternes` de `data/site.json` sont autorisés ; `https://` uniquement, domaine déclaré, ouverture en nouvel onglet avec `rel="noopener noreferrer"`, jamais de donnée du visiteur dans le lien. Aucune requête vers un autre site tant que le lot 4b n'existe pas.
Documentation du dépôt : `CLAUDE.md` (court, moins de 9 000 caractères) et `Docs/ref/conventions.md` (règles détaillées par page, lues avant de modifier le diagnostic, la fiche produit, le panier, le relief ou les listes) ; bilans dans `Docs/lots/`.
Hébergement : GitHub Pages (adresse `github.io`), publication par workflow GitHub Actions. Chaque branche `lot-N` est publiée en aperçu à `/lot-N/` (fichier `apercu.txt`) ; ne jamais supprimer ces branches. À la racine du site : `index.html` (accueil Hi-Fi, `noindex` jusqu'au lot 10), `diagnostic.html`, `produit.html`, `panier.html` (toutes `noindex` jusqu'au lot 10), `attente.html` (ancienne page d'attente), `accueil.html` (redirection vers `index.html`, pour les anciens liens), `lots/`, `apercus/` (redirection), `wireframes/`, `assets/` (publié en copie récursive). Le workflow publie les pages de la racine par liste explicite : chaque nouvelle page exige l'autorisation du prompt du lot.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code cloud, relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit sans retouche humaine ; vrai paiement et page de paiement ; vraie authentification (connexion réelle, mot de passe) ; création de compte ; vrai envoi des formulaires professionnel et SAV ; vrai stockage de pièces jointes ; vraie vérification du SIRET ; suivi réel de colis ; adresse de livraison saisie dans le panier ; codes promotionnels ; page de détail d'une demande de SAV ; messagerie avec l'artisan et favoris ; vraies données de risque, carte réelle et vrai calcul de vulnérabilité (sauf
