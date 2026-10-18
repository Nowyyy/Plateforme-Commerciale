# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 3, 18 octobre 2026 (remplace la version 2).

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif. S'y ajoutent un espace professionnel (candidature de vendeurs) et un espace client simulé (achats, service après-vente).

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif ou simulé (produits, avis, connexion, formulaires) est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 375 et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers, comptes et formulaires simulés.

## Navigation commune
- En-tête : Aléas, Comment ça marche, Vendre sur la plateforme, Mon compte, Panier. Les libellés dont la page n'existe pas encore en Hi-Fi pointent provisoirement vers `wireframes/`.
- Pied de page : Mentions légales (lot 10), À propos du démonstrateur, Service après-vente (accès sans compte), rappel « aucune vente ».
- Le lot 1c ajoute ces libellés aux blocs d'en-tête et de pied de page des écrans 1 à 4 ; les codes de blocs ne changent pas.

## Pages et parcours : écrans 1 à 4
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 1 Accueil | `index.html` (`accueil.html` jusqu'au lot 3b) | E1-1 en-tête ; E1-2 hero ; E1-3 recherche d'adresse ; E1-4 les 4 aléas ; E1-5 protection de la personne (froid, chaleur, chutes) ; E1-6 comment ça marche ; E1-7 réassurance ; E1-8 bandeau d'avis ; E1-9 preuve crash-test ; E1-10 pied |
| 2 Diagnostic | `diagnostic.html` | E2-1 en-tête ; E2-2 adresse et filtre d'aléa ; E2-3 équipements recommandés (colonne principale) ; E2-4 score de vulnérabilité ; E2-5 carte et calques (sous le score, même largeur) ; E2-6 pied |
| 3 Fiche produit | `produit.html` | E3-1 en-tête et fil d'Ariane ; E3-2 galerie et vidéo ; E3-3 achat ; E3-4 mode de commande (DIY ou pose) ; E3-5 configurateur de cotes ; E3-6 spécifications ; E3-7 documents ; E3-8 pied |
| 4 Panier | `panier.html` | E4-1 en-tête et étapes ; E4-2 récapitulatif technique et délai de livraison ; E4-3 validation de responsabilité ; E4-4 total ; E4-5 paiement sécurisé et SAV ; E4-6 pied |

## Pages et parcours : écrans 5 à 13 (propositions, fixées par le lot 1c)
| Écran | Page | Blocs proposés |
|---|---|---|
| 5 Espace professionnel | `pro.html` | en-tête ; introduction (vendre sur la plateforme) ; étapes (candidature, validation du catalogue et des certifications, mise en ligne) ; formulaire (société, SIRET en format seulement, contact, e-mail, téléphone, aléas couverts, description des produits, certifications en emplacements de fichiers, message, consentement) ; confirmation (variante) ; pied |
| 6 Connexion | `connexion.html` | en-tête ; champs e-mail et mot de passe fictifs ; accès au compte de démonstration ; lien « SAV sans compte » ; mention « aucun mot de passe réel » ; pied |
| 7 Tableau de bord | `compte.html` | en-tête ; bienvenue au client de démonstration ; dernières commandes ; demandes SAV en cours ; raccourcis (achats, demandes, informations) ; pied |
| 8 Mes achats | `achats.html` | en-tête ; filtre par statut ; liste (produit, date, numéro, statut, mode DIY ou pose) ; pied |
| 9 Détail d'un achat | `achat.html` | en-tête ; résumé ; cotes saisies et schéma de rappel ; mode de commande, artisan et date d'intervention fictifs ; livraison ; documents (facture, notice, PV d'essais, attestation de pose, garantie décennale) en emplacements de fichiers ; bouton « Demander une intervention » ; pied |
| 10 Demande de SAV | `sav.html` | en-tête ; produit concerné (prérempli depuis un achat, ou à choisir sans compte) ; motif ; description ; photos en emplacements de fichiers ; coordonnées (préremplies avec compte) ; confirmation avec numéro fictif (variante) ; pied |
| 11 Mes demandes | `demandes.html` | en-tête ; liste des demandes SAV avec statut (reçue, en analyse, intervention planifiée, clôturée) ; pied |
| 12 Mes informations | `informations.html` | en-tête ; identité ; coordonnées ; adresse de livraison ; préférences de communication ; mention RGPD en texte seulement (export et suppression non actifs) ; bouton d'enregistrement simulé ; pied |
| 13 SAV sans compte | `sav-acces.html` | en-tête ; numéro de commande et e-mail (valeurs de démonstration indiquées à l'écran, format vérifié seulement) ; pied |

Parcours :
- Principal : recherche d'adresse, diagnostic, sélection produit, saisie des cotes, choix de pose, panier.
- Vendeur : accueil, « Vendre sur la plateforme », formulaire, confirmation.
- SAV avec compte : connexion, tableau de bord, achats, détail d'un achat, demande de SAV, confirmation, suivi.
- SAV sans compte : pied de page, accès SAV, demande de SAV, confirmation.

Source de vérité de l'agencement : `wireframes/` (validé aux lots 1 et 1b, étendu au lot 1c). Identifiants stables : les `data-role`. Les numéros suivent l'ordre de la page ; tout déplacement passe par un lot de correctif. Une seule fiche produit est complète (un batardeau) ; les autres restent allégées.

## Page des aperçus (`/apercus/`)
Elle sert à relire le travail depuis un téléphone. Elle comporte :
- un bouton « Accès Wireframe » : la version la plus récente des wireframes, y compris celle d'un lot de wireframes en cours ;
- un bouton « Page Hi-Fi » : le lot Hi-Fi le plus récent, en cours ou terminé. Chaque lot part de `main` à jour, donc cette page contient toutes les évolutions précédentes. Quand aucun lot Hi-Fi n'est en cours, le bouton mène à la version de `main` ;
- un menu déroulant « Anciens lots » : tous les lots Hi-Fi précédents uniquement, du plus récent au plus ancien, avec numéro et titre. Ni wireframes ni lots techniques.
Règles : alimentée automatiquement à partir des fichiers `apercu.txt` (type du lot, titre), sans liste à maintenir à la main (faisabilité à vérifier au lot 2b) ; mêmes jetons et même police que le site ; lisible à 375 et 1440 px ; `noindex` ; menu déroulant utilisable au clavier ; aucune ressource externe. Sa refonte modifie le workflow : elle n'est autorisée que par le prompt du lot 2b.

## Contenus et source
| Contenu | Source |
|---|---|
| Textes, produits, prix, délais, cotes, avis | Fictifs, rédigés par l'agent, dans `data/*.json` ; avis marqués « exemple » |
| Client de démonstration, commandes, demandes SAV, candidatures | Fictifs, dans `data/compte.json` ; aucune donnée réelle |
| Photos, rendus 3D, coupes, vidéo de crash-test | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Certifications, assureurs, plateformes d'avis | Pastilles « exemple » sans vrai logo ni vrai nom |
| Facture, PV d'essais, notices, attestations, pièces jointes | Emplacements « [Fichier exemple] » ou PDF fictifs marqués « exemple » |
| Nom de marque | « Protection Habitat », provisoire, à remplacer |
| Schéma du hero | Schéma de substitution, à remplacer par celui du propriétaire |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine `#0F1D38` (structure), vert `#1B4332` (durabilité), fond `#F8FAFC`, accent ambre `#D97706`. Texte sur fond ambre en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair. Bandeau démonstrateur vert, en-tête bleu marine ; focus ambre sur les boutons d'action, vert ailleurs.
- Hero : dégradé vertical du fond clair vers une teinte bleutée dérivée du marine, sans grille ; sur mobile, ordre texte, illustration, puis recherche.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes), polices hébergées dans le dépôt.
- Tous les réglages vivent dans des variables CSS (`css/tokens.css`) ; aucune couleur en dur. Les wireframes restent en niveaux de gris (`--wf-*`).
- Les écrans de formulaires et de compte reprennent les composants existants (champs, boutons, cartes) ; aucun style hors jetons. Les erreurs de saisie se signalent par texte, icône et filet marine, sans rouge.

## Stack et hébergement
HTML, CSS à variables, JavaScript en modules, sans compilation ni dépendance d'exécution. Textes et liens dans `data/*.json`, injectés par clés (`data-texte`, `data-lien`). Outils de développement seulement : ESLint, Vitest, Playwright avec axe, Lighthouse. Chemins relatifs. Justification : peu d'état, aucun serveur possible. Alternative si le nombre de pages explose : Astro ou Vite.
Comptes et formulaires simulés : l'état de connexion et les saisies vivent dans `sessionStorage` (effacés à la fermeture de l'onglet), jamais dans l'URL, jamais envoyés ; chaque formulaire affiche « Démonstrateur : saisissez des données fictives, rien n'est envoyé ni enregistré ».
Hébergement : GitHub Pages (adresse `github.io`), publication par workflow GitHub Actions. Chaque branche `lot-N` est publiée en aperçu à `/lot-N/` (fichier `apercu.txt`) ; ne jamais supprimer ces branches.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code cloud, relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit sans retouche humaine ; vrai paiement ; vraie authentification (connexion réelle, création de compte, mot de passe) ; vrai envoi des formulaires professionnel et SAV ; vrai stockage de pièces jointes ; vraie vérification du SIRET ; suivi réel de colis ; messagerie avec l'artisan et favoris ; vraies données de risque, carte réelle, vrai calcul de vulnérabilité ; vrais logos, certifications, avis clients et notes ; vraies vidéos ; catalogue complet et page de liste ; CMS ; autre langue que le français ; analytique et cookies.

## Risques connus
- Constaté aux lots 0 à 2 : navigateur piloté, captures, Lighthouse, push de branches et de workflow fonctionnent ; le push de tags est refusé (HTTP 403) ; l'agent ne peut pas ouvrir l'adresse publiée, donc le déploiement se vérifie à la main ; Lighthouse exclut la catégorie SEO des pages `noindex`.
- Les lots 1 et 2 ont reçu des ajouts en cours de route (parties D à I) : le plafond de taille d'un lot n'est pas tenu. Préférer un lot de correctif (comme le 1b) à des parties ajoutées.
- Logos CSTB ou NF, garantie décennale, tiers de confiance sans droit : pastilles « exemple », bandeau « démonstrateur, aucune vente » sur chaque page.
- Données personnelles : les formulaires sont simulés, mais un visiteur peut y saisir de vraies données. Mention visible sur chaque formulaire, aucune donnée envoyée ni conservée au-delà de la session. Une version réelle exigerait un service externe et la conformité RGPD, hors de ce démonstrateur.
- Textes injectés par JavaScript : invisibles sans lui, et risque de décalage de mise en page (réserve de hauteur).
- La page des aperçus dépend du workflow : sa refonte peut casser les aperçus existants ; à vérifier à la main après fusion.
- Export Figma : résultat non garanti conforme (composants, auto-layout strict, variables) ; compte Figma nécessaire ; plugin non testé.

## Plan en lots
| Lot | Sujet | État |
|---|---|---|
| 0 | Socle, jetons, page d'attente en ligne | fait |
| 1 | Wireframes Lo-Fi des 4 écrans, aperçu par lot | fait |
| 1b | Correctifs d'agencement : accueil (avis) et diagnostic (équipements et carte) | fait |
| 2 | Hi-Fi accueil, partie haute : E1-1 à E1-3 et bandeau d'avis E1-8 | terminé, à fusionner |
| 1c | Wireframes Lo-Fi : écrans 5 à 13 (professionnel, connexion, compte, achats, détail d'achat, SAV avec et sans compte, suivi, informations) ; en-têtes et pieds des écrans 1 à 4 mis à jour ; parcours cliqués | à faire, avant 3a |
| 2b | Page des aperçus retravaillée (section dédiée) | à faire, après 1c |
| 3a | Hi-Fi accueil : E1-4 aléas, E1-5 protection de la personne, E1-6 comment ça marche, insérés entre la recherche et le bandeau d'avis (découpage proposé) | à faire |
| 3b | Hi-Fi accueil : E1-7 réassurance, E1-9 crash-test, E1-10 pied ; navigation liée ; `accueil.html` devient `index.html`, la page d'attente devient `attente.html` | à faire |
| 4 | Diagnostic : carte stylisée, calques, jauge, recommandations fictives ; régler l'espace libre des cartes d'équipements | à faire |
| 5 | Fiche produit : zone haute et bascule DIY / pose | à faire |
| 6 | Configurateur de cotes et tests de sa logique | à faire |
| 7 | Spécifications d'ingénierie et téléchargements fictifs | à faire |
| 8 | Panier, validation de responsabilité, test de bout en bout du parcours principal | à faire |
| 8b | Hi-Fi : espace professionnel (écran 5), formulaire simulé avec validation, confirmation | à faire |
| 8c | Hi-Fi : connexion simulée, compte, achats, détail, SAV avec compte (depuis un achat) et sans compte, suivi, informations ; `data/compte.json` | à faire |
| 9 | Optionnel : comparateur de 2 à 3 produits, sélecteur de niveau de risque | à faire |
| 10 | Performance, accessibilité, SEO, mentions légales et texte RGPD, nom de marque définitif, relecture des mentions « simulé » | à faire |
| 11 | Optionnel, sur ordinateur : export Figma des écrans, puis reprise manuelle | à faire |

## Idées en attente (hors lot en cours)
Index des projets sur `nowyyy.github.io` (autre dépôt, accord requis) ; pose manuelle des tags `lot-N` (facultatif) ; remplacement du nom de marque provisoire et du schéma du hero ; bouton « Menu » qui passe à la ligne sous 350 px ; message d'erreur unique de la recherche d'adresse ; « Mes diagnostics » dans le compte.
