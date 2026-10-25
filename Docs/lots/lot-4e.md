# Lot 4e — Mise en page du diagnostic, niveau calculé, équipements selon les aléas, saisie stricte
Aperçu : `/lot-4e/` (publié par le workflow ; non vérifiable depuis la session). Tous les services tiers sont simulés dans les tests.
## Livré
- A : blocs `en-tete`, `adresse`, `carte`, `legende`, `exposition`, `equipements`, `pied` (E2-1 à E2-7), légende et exposition en cadres blancs, choix du fond supprimé (repli automatique conservé), équipements en cartes verticales (1, 2, 3 colonnes).
- B : niveau d'exposition calculé (inondation et feux = modéré, argiles selon l'exposition), pastilles limitées aux aléas recensés, répartition à tour de rôle sous « Tous », exploration, valeur `alea`, comparateur.
- C : saisie stricte (adresse choisie dans la liste, bouton `aria-disabled`, Entrée sans choix automatique), plus aucune recherche libre, panne gérée, utilitaire `tests/outils/choisir-adresse.js`.
## Critères
- Vitest : 738 tests (665 sur `main`), dont 78 nouveaux (14 + 42 + 22). Playwright : 648 (612 sur `main`), dont 42 nouveaux (12 + 14 + 16). Lint propre.
- 1440 px : cadre 818 × 480 ; exposition 350 px, haut égal à celui de la carte, bas égal à celui de la légende (1 px) ; 375 px : cadre 343 × 544, ordre `adresse`, `carte`, `legende`, `exposition`, `equipements` ; aucun débordement à 375, 768, 1440 px.
- Lighthouse diagnostic (5 passes, médianes) `main` / `lot-4e` : performance 94 / 93, accessibilité 100 / 100, bonnes pratiques 100 / 96 ; accueil (3 passes) : 98 / 97, 100 / 100, 100 / 100. CLS (JSON retardés de 400 ms, 360 à 1440 px) : diagnostic 0,005 / 0,005, accueil 0,005 / 0,005.
- Parcours `parcours-adresse-stricte` : 1,8 s à 375 px, 1,9 s à 1440 px. `CLAUDE.md` : 8 991 caractères (`wc -m`) ; `conventions.md` : 172 lignes.
## Tests supprimés ou réécrits (avant / après / raison)
- Ordre et codes E2-1..E2-6 avec `score` / cadre 36 rem / panneau → E2-1..E2-7, 30 rem, légende et exposition : maquette validée.
- Notes de chaleur et de score, radios de fond, fond choisi puis repli → absentes ; repli annoncé sans radio : choix du fond supprimé.
- Colonnes `score | équipements`, niveau fixe provisoire, pastille qui réinitialise les cases → pleine largeur, niveau calculé, cases indépendantes : lot B.
- `decisionVerification`, texte libre reconnu ou refusé, service injoignable, « Mettre à jour » avec libellé officiel → `etatValidation`, `actionEntree`, panne ; clic inactif : phrase d'aide : saisie stricte.
- Parcours qui remplissaient l'adresse puis cliquaient (cotes-c, diagnostic-b, lignes-c, parcours-carte, -comparateur, -principal, produit-a, -c, relief, specs-c, recherche) → `choisirAdresse` + `simuler` ; recherche et relief : message d'erreur → aide du bouton inactif.
- lignes-c : « Bouclier de baie » ouvert par la session (grêle jamais proposée). Garanties reportées : console propre, axe, débordements, noscript, confidentialité, un seul stockage `adresse`.
## Points ouverts
- Formats de l'autocomplétion IGN et de l'API Géorisques inférés, jamais confirmés par un échantillon réel.
- Si la carte échoue (géocodage, Leaflet), les aléas sont traités comme « présence non déterminée » même si l'API aurait répondu.
- L'aide « Choisissez une adresse… » reste visible même quand l'adresse est valide ; bonnes pratiques Lighthouse du diagnostic 96 (seuil 95).
- Le comparateur garde ses niveaux fixes ; les données d'inondation et de feux sont communales.
## Choix à valider
- Niveau = plus élevé des aléas recensés, jamais « aucun risque », indicatif ; limites communales dites dans « Comment est-il calculé ? ».
- Aléas proposés : inondation et feux seulement ; exploration (niveaux d'exemple) quand rien n'est proposé ; « Tous » à tour de rôle.
- Pastilles indépendantes des calques ; `aria-disabled` plutôt que `disabled` (focalisable, aide annoncée) ; Entrée : option surlignée, sinon validation si valide, sinon rien.
- Panne : adresse utilisée telle quelle si `valider` l'accepte ; retirer un caractère ajouté ne rétablit pas le choix.
## À tester par moi
Sur `/lot-4e/`, téléphone en données mobiles (Safari puis Chrome), puis ordinateur : à l'accueil, taper « 2 rue » + Entrée (rien de choisi, bouton grisé) ; flèches puis Entrée ou au doigt (bouton actif) ; modifier une lettre (grisé). Au diagnostic, trois adresses (zone inondable, argiles, sans risque connu) : niveau, cases, pastilles, équipements ; une pastille ne change pas la carte ; « Explorer tous les aléas » ; « Comment est-il calculé ? » ; légende qui suit les cases ; alignement carte, légende, panneau. Blocs à ajuster : `E1-3`, `E2-2` à `E2-6`. Sur `/lots/`, « Page Hi-Fi » mène à `/lot-4e/`.
## Fusion (à faire par moi)
Pull Request `lot-4e` vers `main` (déjà ouverte : #23), « Create a merge commit », ne pas supprimer la branche, vérifier `/`, `/diagnostic.html` et `/lots/`.
