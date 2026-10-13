# Lot 0 — Socle, jetons et page d'attente
**Livré** : dépôt (`main` « Init », branche `lot-0`), seed, CLAUDE.md, ESLint, Vitest, Playwright, axe, Lighthouse, jetons CSS, polices OFL hébergées, page d'attente, workflow Pages.
**Choix** : outils de développement seulement ; polices @fontsource (OFL 1.1) copiées en woff2 latin ; workflow poussé tel quel (droit « workflows » accepté) ; serveur statique de test sans dépendance.
**Critères** : lint sans avertissement ; 7 tests Vitest (2 + 4 + 1) verts ; 3 tests Playwright (375, 768, 1440 px) : console propre, aucun débordement, axe sans violation, aucune requête externe ; Lighthouse mobile 100 / 100 / 100 / 100 (seuils 90 / 95 / 95 / 90) ; captures vues et décrites en partie B.
**Pushs** : branche `lot-0` acceptée, y compris le fichier de workflow. Tag `lot-0` : refusé (HTTP 403), tag créé en local seulement ; je n'ai pas insisté.
**Points ouverts** : le workflow n'est pas encore exécuté (premier run à la fusion) ; tag à poser par toi ; le bilan est dans un commit après le commit C, car un force-push a été refusé.

## À tester par moi
Après activation de Pages : ouvrir l'adresse sur un vrai téléphone et dans au moins deux navigateurs ; vérifier bandeau, titre et polices.

## Fusion (à faire par moi)
1. Ouvrir la Pull Request `lot-0` vers `main` sur GitHub.
2. Fusionner avec « Create a merge commit ».
3. Settings, Pages, source « GitHub Actions ».
4. Attendre le déploiement.
5. Vérifier `https://<compte>.github.io/<dépôt>/`.
6. Optionnel : poser le tag `lot-0` sur `lot-0` (le push du tag est refusé depuis la session).
