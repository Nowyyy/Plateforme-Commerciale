# Seed — Plateforme de protection de l'habitat (démonstrateur)
Modifiable par le seul propriétaire. Version 1, 13 octobre 2026.

## Le site en une phrase
Un démonstrateur en ligne, hébergé sur GitHub Pages, d'une place de marché d'équipements de protection de la maison contre quatre aléas climatiques (inondations, grêle et vents, feux de forêt, canicule), au parcours calme et technique : adresse, diagnostic, fiche produit, cotes, mode de pose, panier récapitulatif.

## Piliers (ils tranchent les décisions)
1. Calme et certitude : aucun rouge, aucune alarme visuelle ; l'ambre sert uniquement à l'action.
2. Honnêteté du démonstrateur : tout ce qui est fictif est marqué comme tel ; aucun vrai logo de certification, aucune fausse promesse.
3. La fiche produit prime : en cas d'arbitrage, l'écran 3 et son configurateur de cotes passent d'abord.
4. Mobile et desktop à égalité : 390 px et 1440 px pour chaque écran.
5. Simple d'abord : statique, sans serveur, sans traceur, données dans des fichiers.

## Pages et parcours
| Écran | Page | Contenu clé |
|---|---|---|
| 1 Accueil | index.html | Hero, barre d'adresse, bandeau de réassurance, 4 cartes d'aléas, « Comment ça marche », bloc crash-test |
| 2 Diagnostic | diagnostic.html | Carte stylisée avec calques, jauge de vulnérabilité, 2 ou 3 équipements recommandés |
| 3 Fiche produit | produit.html | Photos, lecteur vidéo, prix TTC, délai, bascule DIY / pose, configurateur de cotes, spécifications, PV et notices |
| 4 Panier | panier.html | Récapitulatif des cotes, case de responsabilité, bloc paiement sécurisé et SAV |

Parcours principal : recherche d'adresse, diagnostic, sélection produit, saisie des cotes, choix de pose, panier. Les cartes d'aléas mènent au diagnostic filtré sur l'aléa. Une seule fiche produit est complète (un batardeau) ; les autres restent en fiche allégée.

## Contenus et source
| Contenu | Source |
|---|---|
| Textes, produits, prix, délais, cotes | Fictifs, rédigés par l'agent, dans des fichiers JSON |
| Photos, rendus 3D, coupes, vidéo de crash-test | Emplacements et visuels de substitution ; vrais fichiers fournis plus tard par le propriétaire |
| Certifications, assureurs | Badges « exemple » sans vrai logo |
| PV d'essais, notices | PDF fictifs marqués « exemple » |

## Design
- Ton : sobre, typographique, axé données, inspiré de l'architecture et de la cartographie technique.
- Couleurs : bleu marine #0F1D38 (structure), vert #1B4332 (durabilité), fond #F8FAFC, accent ambre #D97706.
- Typographie : Plus Jakarta Sans (titres, labels), Inter avec chiffres tabulaires (données, cotes). Polices hébergées dans le dépôt, aucun appel à un service externe.
- Tous les réglages de design vivent dans des variables CSS (jetons) ; aucune couleur écrite en dur.
- Contraste : le texte sur fond ambre est en bleu marine ; l'ambre n'est pas utilisé pour du texte courant sur fond clair.

## Stack proposée et hébergement
HTML, CSS à variables et JavaScript en modules, sans étape de compilation ni dépendance d'exécution. Données dans des JSON. Outils de développement seulement : ESLint, Vitest (logique des cotes et du score), Playwright (parcours, captures), Lighthouse. Chemins relatifs (site servi sous /<dépôt>/).
Justification : quatre pages, peu d'état, aucun serveur possible ; moins il y a de couches, moins l'agent consomme de jetons et moins il casse.
Alternative si les pages ou composants explosent : Astro ou Vite (un build et des dépendances en plus).
Hébergement : GitHub Pages, adresse github.io, dépôt public (hypothèse à confirmer), publication par workflow GitHub Actions.
Flux : cadrage dans le chat Claude (téléphone), exécution par Claude Code sur le dépôt GitHub (sessions cloud), relecture et fusion par Pull Request (« Create a merge commit »). L'export Figma (lot 11) se fait sur ordinateur.

## Hors périmètre
Fichier Figma produit par l'agent sans retouche humaine ; vrai paiement, comptes, backend ; vraies données de risque et carte réelle ; vrai calcul de vulnérabilité ; vrais logos et certifications ; vraies vidéos ; catalogue complet et page de liste ; CMS ; autre langue que le français ; analytique et cookies.

## Risques connus
- Capacités de la session cloud (navigateur piloté, captures, Lighthouse, push de tags et de fichiers de workflow) inconnues : testées au lot 0.
- Logos CSTB ou NF et garantie décennale sans droit : évité par les badges « exemple ».
- Case de responsabilité et paiement affichés sans valeur réelle : bandeau « démonstrateur, aucune vente » sur chaque page.
- Le Lo-Fi puis le Hi-Fi doublent une partie du travail : le lot 1 reste mince.
- Export Figma : résultat non garanti conforme (composants, auto-layout strict, variables) ; compte Figma nécessaire ; plugin et authentification non testés.

## Plan en lots
| Lot | Sujet |
|---|---|
| 0 | Socle : dépôt, structure, lint, tests, CLAUDE.md, jetons de design, capacités de la session cloud, page d'attente en ligne |
| 1 | Wireframes Lo-Fi des 4 écrans (390 et 1440 px, niveaux de gris), validation d'agencement |
| 2 | Hi-Fi accueil : en-tête, hero, barre d'adresse, bandeau de réassurance |
| 3 | Hi-Fi accueil : cartes d'aléas, « Comment ça marche », bloc crash-test |
| 4 | Diagnostic : carte stylisée, calques, jauge, recommandations fictives |
| 5 | Fiche produit : zone haute et bascule DIY / pose |
| 6 | Configurateur de cotes et tests de sa logique |
| 7 | Spécifications d'ingénierie et téléchargements fictifs |
| 8 | Panier, validation de responsabilité, test de bout en bout du parcours principal |
| 9 | Optionnel : comparateur de 2 à 3 produits, sélecteur de niveau de risque |
| 10 | Performance, accessibilité, mentions légales, bandeau démonstrateur |
| 11 | Optionnel, sur ordinateur : export Figma (capture des 4 écrans à 390 et 1440 px dans un brouillon ; reprise manuelle des composants, de l'auto-layout et des variables) |
Premier jalon : lot 0 (site en ligne, même minimal). Accueil complet en ligne au lot 3.
