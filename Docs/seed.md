# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 5, 18 octobre 2026 (remplace la version 4).

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif. S'y ajoutent un espace professionnel (candidature de vendeurs) et un espace client simulé (achats, service après-vente).

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif ou simulé (produits, avis, connexion, formulaires) est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 375 et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers, comptes et formulaires simulés.

## Navigation commune
- En-tête : Aléas, Comment ça marche, Vendre sur la plateforme, Mon compte, Panier. « Mon compte » mène à la connexion, ou au tableau de bord sur les pages connectées (écrans 7, 8, 9, 11, 12).
- Dans les wireframes, « Aléas » et « Comment ça marche » sont du texte non lié. Dans le Hi-Fi (depuis le lot 3a), ce sont des ancres de l'accueil (`#aleas`, `#comment`) qui placent le focus sur la section. Les libellés dont la page n'existe pas encore en Hi-Fi (Vendre sur la plateforme, Mon compte) pointent provisoirement vers `wireframes/`, via `data/site.json`.
- Menu mobile : bouton « Menu » repliable sans JavaScript dans les wireframes (case masquée et libellé), absent dès 768 px. Dans le Hi-Fi, il reste visible jusqu'à 1199 px si les cinq libellés ne tiennent pas en ligne.
- Pied de page : Mentions légales (lot 10), À propos du démonstrateur, Service après-vente (accès sans compte), rappel « aucune vente ». Le pied complet du Hi-Fi arrive au lot 3b.
- Navigation du compte (écrans 7, 8, 11, 12) : Tableau de bord, Mes achats, Mes demandes, Mes informations, Se déconnecter ; la page courante est repérée par du texte.

## Pages et parcours : écrans 1 à 4
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 1 Accueil | `index.html` (`accueil.html` jusqu'au lot 3b) | E1-1 en-tête ; E1-2 hero ; E1-3 recherche d'adresse ; E1-4 les 4 aléas ; E1-5 protection de la personne (froid, chaleur, chutes) ; E1-6 comment ça marche ; E1-7 réassurance ; E1-8 bandeau d'avis ; E1-9 preuve crash-test ; E1-10 pied |
| 2 Diagnostic | `diagnostic.html` | E2-1 en-tête ; E2-2 adresse et filtre d'aléa ; E2-3 équipements recommandés (colonne principale) ; E2-4 score de vulnérabilité ; E2-5 carte et calques (sous le score, même largeur) ; E2-6 pied |
| 3 Fiche produit | `produit.html` | E3-1 en-tête et fil d'Ariane ; E3-2 galerie et vidéo ; E3-3 achat ; E3-4 mode de commande (DIY ou pose) ; E3-5 configurateur de cotes ; E3-6 spécifications ; E3-7 documents ; E3-8 pied |
| 4 Panier | `panier.html` | E4-1 en-tête et étapes ; E4-2 récapitulatif technique et délai de livraison ; E4-3 validation de responsabilité ; E4-4 total ; E4-5 paiement sécurisé et SAV ; E4-6 pied |

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

Source de vérité de l'agencement : `wireframes/` (validé aux lots 1, 1b et 1c). Identifiants stables : les `data-role`. Les numéros suivent l'ordre de la page ; tout déplacement passe par un lot de correctif. Une seule fiche produit est complète (un batardeau) ; les autres restent allégées. Les cartes d'aléas de l'accueil mèneront au diagnostic filtré sur l'aléa (lot 4) ; chaque aléa porte déjà un identifiant stable dans les données.

## Page des lots (`/lots/`)
Page de relecture pour un téléphone, hors démonstrateur, publiée à `/lots/` depuis le lot 2b. L'ancienne adresse `/apercus/` est une page de redirection vers `/lots/`. Elle comporte :
- un bouton « Accès Wireframe » : le lot de wireframes le plus récent (lien vers son aperçu s'il est en cours, vers la version de `main` s'il est fusionné) ;
- un bouton « Page Hi-Fi » : même règle pour le lot Hi-Fi le plus récent. Chaque lot part de `main` à jour, donc cette page contient toutes les évolutions précédentes ;
- un menu déroulant « Anciens lots » : tous les lots Hi-Fi sauf le plus récent, du plus récent au plus ancien, chacun avec un lien vers son aperçu d'époque ; un message s'affiche quand la liste est vide. Ni wireframes ni lots techniques.
Règles :
- Générée automatiquement à chaque publication à partir des branches `lot-*` et de leur fichier `apercu.txt`, sans liste à maintenir à la main. Le nom du fichier `apercu.txt` ne change pas. La logique et le rendu vivent dans `scripts/lots/`, décrits dans `Docs/ref/apercus.md`.
- Format de `apercu.txt` : la cible sur la première ligne (caractères `A-Za-z0-9._/-`, sans `..` ni `/` initial) ; lignes optionnelles `type: wireframe`, `hifi` ou `technique`, et `titre: <court>`. Sans `type:`, une cible `wireframes/…` est un wireframe et toute autre cible un lot Hi-Fi. Un lot d'outillage s'écrit `type: technique` et n'apparaît pas sur la page. Un type inconnu ou une branche sans `apercu.txt` est ignoré.
- Le lot 3a et les suivants doivent régler `apercu.txt` : cible `accueil.html`, `type: hifi`, `titre: …`.
- Mêmes jetons et même police que le site ; lisible à 375 et 1440 px ; `noindex` ; aucun script (menu déroulant natif, utilisable au clavier) ; aucune ressource externe.
- Une panne de génération ne doit jamais empêcher la publication des aperçus `/lot-N/` : page de repli et avertissement dans les journaux.
- Toute modification du workflow exige l'autorisation explicite du prompt du lot.
- Ne plus pousser sur les anciennes branches de lot : leur ancien workflow régénérerait l'ancienne page.

## Contenus et source
| Contenu | Source |
|---|---|
| Textes, produits, prix, délais, cotes, avis | Fictifs, rédigés par l'agent, dans `data/*.json` ; avis marqués « exemple » |
| Familles d'équipements par aléa | Issues du cahier des charges (batardeaux, clapets, pompes ; boucliers, volets extrudés, filets de toiture ; sprinklers, grilles pare-braises ; cool roofing, isolants réflecteurs) ; familles de protection de la personne rédigées par l'agent, fictives |
| Client de démonstration, commandes, demandes SAV, candidatures | Fictifs, dans `data/compte.json` ; aucune donnée réelle |
| Photos, rendus 3D, coupes, vidéo de crash-test | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Pictogrammes des aléas | Sprite SVG géométrique de substitution |
| Certifications, assureurs, plateformes d'avis | Pastilles « exemple » sans vrai logo ni vrai nom |
| Facture, PV d'essais, notices, attestations, pièces jointes | Emplacements « [Fichier exemple] » ou PDF fictifs marqués « exemple » |
| Nom de marque | « Protection Habitat », provisoire, à remplacer |
| Schéma du hero | Schéma de substitution, à remplacer par celui du propriétaire |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine `#0F1D38` (structure), vert `#1B4332` (durabilité), fond `#F8FAFC`, accent ambre `#D97706`. Texte sur fond ambre en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair. Bandeau démonstrateur vert, en-tête bleu marine ; focus ambre sur les boutons d'action, vert ailleurs. Les liens de cartes ne sont pas des boutons d'action : bleu marine, soulignés au survol et au focus.
- Hero : dégradé vertical du fond clair vers une teinte bleutée dérivée du marine, sans grille ; sur mobile, ordre texte, illustration, puis recherche.
- Sections de l'accueil : fonds alternés par jetons (blanc, fond clair), pictogrammes en traits dans des pastilles claires, numéros d'étapes en ronds marine.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes), polices hébergées dans le dépôt.
- Tous les réglages vivent dans des variables CSS (`css/tokens.css`) ; aucune couleur en dur. Les wireframes restent en niveaux de gris (`--wf-*`).
- Les écrans de formulaires et de compte reprennent les composants existants (champs, boutons, cartes) ; aucun style hors jetons. Les erreurs de saisie se signalent par texte, icône et filet marine, sans rouge ; l'état d'un élément (actif, repéré) est toujours donné par du texte, jamais par la couleur seule.

## Stack et hébergement
HTML, CSS à variables, JavaScript en modules, sans compilation ni dépendance d'exécution. Textes et liens dans `data/*.json`, injectés par clés (`data-texte`, `data-lien`) ; les listes (cartes, étapes) sont rendues par des gabarits `<template data-liste="…">` et leur nombre d'éléments n'est jamais figé dans le HTML ou le CSS. Outils de développement seulement : ESLint, Vitest, Playwright avec axe, Lighthouse. Chemins relatifs. Justification : peu d'état, aucun serveur possible. Alternative si le nombre de pages explose : Astro ou Vite.
Comptes et formulaires simulés : l'état de connexion et les saisies vivent dans `sessionStorage` (effacés à la fermeture de l'onglet), jamais dans l'URL, jamais envoyés ; chaque formulaire affiche « Démonstrateur : saisissez des données fictives, rien n'est envoyé ni enregistré ».
Hébergement : GitHub Pages (adresse `github.io`), publication par workflow GitHub Actions. Chaque branche `lot-N` est publiée en aperçu à `/lot-N/` (fichier `apercu.txt`) ; ne jamais supprimer ces branches.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code cloud, relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit sans retouche humaine ; vrai paiement ; vraie authentification (connexion réelle, mot de passe) ; création de compte ; vrai envoi des formulaires professionnel et SAV ; vrai stockage de pièces jointes ; vraie vérification du SIRET ; suivi réel de colis ; page de détail d'une demande de SAV ; messagerie avec l'artisan et favoris ; vraies données de risque, carte réelle, vrai calcul de vulnérabilité ; vrais logos, certifications, avis clients et notes ; vraies vidéos ; catalogue complet et page de liste ; CMS ; autre langue que le français ; analytique et cookies.

## Risques connus
- Constaté aux lots 0 à 2b : navigateur piloté, captures, Lighthouse, push de branches et de workflow fonctionnent ; le push de tags est refusé (HTTP 403) ; l'agent ne peut pas ouvrir l'adresse publiée, donc le déploiement se vérifie à la main ; Lighthouse exclut la catégorie SEO des pages `noindex`.
- Les lots 1 et 2 ont reçu des ajouts en cours de route (parties D à I) : le plafond de taille d'un lot n'est pas tenu. Préférer un lot de correctif (comme le 1b) à des parties ajoutées ; les prompts interdisent désormais toute partie supplémentaire.
- Logos CSTB ou NF, garantie décennale, tiers de confiance sans droit : pastilles « exemple », bandeau « démonstrateur, aucune vente » sur chaque page.
- Données personnelles : les formulaires sont simulés, mais un visiteur peut y saisir de vraies données. Mention visible sur chaque formulaire, aucune donnée envoyée ni conservée au-delà de la session. Une version réelle exigerait un service externe et la conformité RGPD, hors de ce démonstrateur.
- Textes injectés par JavaScript : invisibles sans lui, et risque de décalage de mise en page (réserve de hauteur des listes remplies, surveillée par le CLS).
- La page des lots dépend du workflow : la détection des lots fusionnés demande l'historique Git complet ; une ancienne branche de lot qui reçoit un push régénérerait l'ancienne page.
- Navigation à cinq libellés : risque de ne pas tenir en ligne à 768 px (menu conservé jusqu'à 1199 px au besoin).
- Export Figma : résultat non garanti conforme (composants, auto-layout strict, variables) ; compte Figma nécessaire ; plugin non testé.

## Plan en lots
| Lot | Sujet | État |
|---|---|---|
| 0 | Socle, jetons, page d'attente en ligne | fait |
| 1 | Wireframes Lo-Fi des 4 écrans, aperçu par lot | fait |
| 1b | Correctifs d'agencement : accueil (avis) et diagnostic (équipements et carte) | fait |
| 2 | Hi-Fi accueil, partie haute : E1-1 à E1-3 et bandeau d'avis E1-8 | fait |
| 1c | Wireframes Lo-Fi : écrans 5 à 13 (professionnel, connexion, compte, achats, détail d'achat, SAV avec et sans compte, suivi, informations) ; navigation commune ; parcours cliqués | fait |
| 2b | Page « Lots » (`/lots/`) : accès wireframes, page Hi-Fi, anciens lots ; génération automatique ; redirection de `/apercus/` | fait |
| 3a | Hi-Fi accueil : E1-4 aléas, E1-5 protection de la personne, E1-6 comment ça marche, insérés entre la recherche et le bandeau d'avis ; navigation Hi-Fi à cinq libellés (« Aléas » et « Comment ça marche » en ancres, « Vendre sur la plateforme » et « Mon compte » vers les wireframes en attendant les lots 8b et 8c) | prochain |
| 3b | Hi-Fi accueil : E1-7 réassurance (entre « comment ça marche » et l'avis), E1-9 crash-test et E1-10 pied de page complet (navigation liée) en dessous ; `accueil.html` devient `index.html`, la page d'attente devient `attente.html` | à faire |
| 4 | Diagnostic : carte stylisée, calques, jauge, recommandations fictives ; filtrage par aléa ; régler l'espace libre des cartes d'équipements | à faire |
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
Index des projets sur `nowyyy.github.io` (autre dépôt, accord requis) ; pose manuelle des tags `lot-N` (facultatif) ; remplacement du nom de marque provisoire, du schéma du hero et des pictogrammes ; bouton « Menu » du Hi-Fi qui passe à la ligne sous 350 px ; message d'erreur unique de la recherche d'adresse ; « Mes diagnostics » dans le compte ; page de détail d'une demande de SAV ; suppression de `Docs/apercus.txt`, devenu inutile depuis le lot 2b (à faire dans un lot d'outillage).
