# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 2, 18 octobre 2026 (remplace la version 1).

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif.

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 375 et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers.

## Pages et parcours
| Écran | Page | Blocs, dans l'ordre de la page |
|---|---|---|
| 1 Accueil | `index.html` (`accueil.html` jusqu'au lot 3) | E1-1 en-tête ; E1-2 hero ; E1-3 recherche d'adresse ; E1-4 les 4 aléas ; E1-5 protection de la personne (froid, chaleur, chutes) ; E1-6 comment ça marche ; E1-7 réassurance ; E1-8 bandeau d'avis ; E1-9 preuve crash-test ; E1-10 pied |
| 2 Diagnostic | `diagnostic.html` | E2-1 en-tête ; E2-2 adresse et filtre d'aléa ; E2-3 équipements recommandés (colonne principale) ; E2-4 score de vulnérabilité ; E2-5 carte et calques (sous le score, même largeur) ; E2-6 pied |
| 3 Fiche produit | `produit.html` | E3-1 en-tête et fil d'Ariane ; E3-2 galerie et vidéo ; E3-3 achat ; E3-4 mode de commande (DIY ou pose) ; E3-5 configurateur de cotes ; E3-6 spécifications ; E3-7 documents ; E3-8 pied |
| 4 Panier | `panier.html` | E4-1 en-tête et étapes ; E4-2 récapitulatif technique et délai de livraison ; E4-3 validation de responsabilité ; E4-4 total ; E4-5 paiement sécurisé et SAV ; E4-6 pied |

Source de vérité de l'agencement : `wireframes/` (validé aux lots 1 et 1b). Identifiants stables : les `data-role`. Les numéros suivent l'ordre de la page ; tout déplacement passe par un lot de correctif.
Parcours principal : recherche d'adresse, diagnostic, sélection produit, saisie des cotes, choix de pose, panier. Les cartes d'aléas mènent au diagnostic. Une seule fiche produit est complète (un batardeau) ; les autres restent allégées.

## Contenus et source
| Contenu | Source |
|---|---|
| Textes, produits, prix, délais, cotes, avis | Fictifs, rédigés par l'agent, dans `data/*.json` ; avis marqués « exemple » |
| Photos, rendus 3D, coupes, vidéo de crash-test | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Certifications, assureurs, plateformes d'avis | Pastilles « exemple » sans vrai logo ni vrai nom |
| PV d'essais, notices | PDF fictifs marqués « exemple » |
| Nom de marque | « Protection Habitat », provisoire, à remplacer |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine `#0F1D38` (structure), vert `#1B4332` (durabilité), fond `#F8FAFC`, accent ambre `#D97706`. Texte sur fond ambre en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes), polices hébergées dans le dépôt.
- Tous les réglages vivent dans des variables CSS (`css/tokens.css`) ; aucune couleur en dur. Les wireframes restent en niveaux de gris (`--wf-*`).

## Stack et hébergement
HTML, CSS à variables, JavaScript en modules, sans compilation ni dépendance d'exécution. Textes et liens dans `data/*.json`, injectés par clés (`data-texte`, `data-lien`). Outils de développement seulement : ESLint, Vitest, Playwright avec axe, Lighthouse. Chemins relatifs. Justification : quatre pages, peu d'état, aucun serveur possible. Alternative si le nombre de pages explose : Astro ou Vite.
Hébergement : GitHub Pages (adresse `github.io`), publication par workflow GitHub Actions. Chaque branche `lot-N` est publiée en aperçu à `/lot-N/` (fichier `apercu.txt`) ; ne jamais supprimer ces branches.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code cloud, relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit sans retouche humaine ; vrai paiement, comptes, backend ; vraies données de risque, carte réelle, vrai calcul de vulnérabilité ; vrais logos, certifications, avis clients et notes ; vraies vidéos ; catalogue complet et page de liste ; CMS ; autre langue que le français ; analytique et cookies.

## Risques connus
- Constaté aux lots 0 à 1b : navigateur piloté, captures, Lighthouse, push de branches et de workflow fonctionnent ; le push de tags est refusé (HTTP 403) ; l'agent ne peut pas ouvrir l'adresse publiée, donc le déploiement se vérifie à la main.
- Logos CSTB ou NF, garantie décennale, tiers de confiance sans droit : pastilles « exemple », bandeau « démonstrateur, aucune vente » sur chaque page.
- Textes injectés par JavaScript : invisibles sans lui, et risque de décalage de mise en page (réserve de hauteur).
- Export Figma : résultat non garanti conforme (composants, auto-layout strict, variables) ; compte Figma nécessaire ; plugin non testé.

## Plan en lots
| Lot | Sujet | État |
|---|---|---|
| 0 | Socle, jetons, page d'attente en ligne | fait |
| 1 | Wireframes Lo-Fi des 4 écrans, aperçu par lot | fait |
| 1b | Correctifs d'agencement : accueil (avis) et diagnostic (équipements et carte) | validé |
| 2 | Hi-Fi accueil, partie haute : E1-1 à E1-3 et bandeau d'avis E1-8 | en cours |
| 3 | Hi-Fi accueil, suite : E1-4 à E1-7 entre la recherche et l'avis, E1-9 et E1-10 en dessous ; `accueil.html` devient `index.html` ; la page d'attente devient `attente.html` | à faire |
| 4 | Diagnostic : carte stylisée, calques, jauge, recommandations fictives ; régler l'espace libre des cartes d'équipements | à faire |
| 5 | Fiche produit : zone haute et bascule DIY / pose | à faire |
| 6 | Configurateur de cotes et tests de sa logique | à faire |
| 7 | Spécifications d'ingénierie et téléchargements fictifs | à faire |
| 8 | Panier, validation de responsabilité, test de bout en bout du parcours principal | à faire |
| 9 | Optionnel : comparateur de 2 à 3 produits, sélecteur de niveau de risque | à faire |
| 10 | Performance, accessibilité, SEO, mentions légales, nom de marque définitif | à faire |
| 11 | Optionnel, sur ordinateur : export Figma, puis reprise manuelle | à faire |

## Idées en attente (hors lot en cours)
Index des projets sur `nowyyy.github.io` (autre dépôt, accord requis) ; pose manuelle des tags `lot-N` (facultatif) ; remplacement du nom de marque provisoire.
