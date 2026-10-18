# Lot 2b — Page « Lots » : accès aux wireframes, à la page Hi-Fi et à l'historique
**Livré** : `scripts/lots/` (`logique.mjs`, `rendu.mjs`, `collecte.mjs`, `generer.mjs`, `lots.css`, `textes.json`), page générée `lots/index.html`, redirection `apercus/index.html`, étape tolérante dans `.github/workflows/pages.yml` (génération `/apercus/` retirée), `apercu.txt` du lot, `Docs/ref/apercus.md`, `CLAUDE.md`. Commits 2b-A, 2b-B, 2b-C.
**Choix** : logique pure séparée de la lecture Git ; textes dans `textes.json` (exceptions en dur : page de dernier recours si `textes.json` est illisible, message de repli dans cette page) ; état en texte (« État : en cours / fusionné »).
**Critères** :
- Lint propre ; 106 tests Vitest (60 avant, 46 nouveaux : 28 + 8 + 10) ; 104 tests Playwright (89 avant, 15 nouveaux), tous verts ; aucun test supprimé.
- Page à 375, 768 et 1440 px (3 scénarios) : console propre, aucun débordement, axe sans violation, aucune requête externe, aucun script ; menu au clavier ; boutons ≥ 44 px (48 px) ; captures vues.
- Données réelles : « Accès Wireframe » vers `../wireframes/index.html` (lot 1c, fusionné), « Page Hi-Fi » vers `../accueil.html` (lot 2, fusionné), « Anciens lots » vide avec son message ; lot 2b (technique) absent.
- Workflow : `fetch-depth: 0` déjà présent, aucune ligne `uses:` modifiée (identiques à `origin/main`), aucun droit ni secret ajouté ; génération en échec : page de repli, `::warning::`, code de sortie 0, étape `continue-on-error`.
- Lighthouse mobile (SEO exclu, `noindex`) : scénario normal 99 / 100 / 100, données réelles 100 / 100 / 100 (performance / accessibilité / bonnes pratiques).
- Aucune couleur hexadécimale hors `css/tokens.css`, aucune dépendance, aucun fichier de plus de 5 Mo.
**Points ouverts** : adresse publiée non ouverte depuis la session (déploiement non vérifié) ; une ancienne branche de lot qui reçoit un push régénérerait l'ancienne page avec son ancien workflow (règle ajoutée à `CLAUDE.md`) ; `tests/workflow.test.js` : l'assertion « le workflow lit `Docs/apercus.txt` » est retirée (la génération qui le lisait est supprimée), le test du format du fichier reste ; `Docs/apercus.txt` laissé en place, devenu inutile ; le job `deployer` s'appuie sur le Node du runner (pas de `setup-node`, pour ne pas toucher aux `uses:`) ; tag `lot-2b` : push tenté une fois.
## Choix à valider
- Type inconnu dans `apercu.txt` : lot ignoré avec avertissement ; cible limitée à `A-Za-z0-9._/-`, sans `..` ni `/` initial (règle du workflow).
- Lot sans `apercu.txt` ignoré sans bruit ; fusion indéterminée (historique tronqué) : « en cours » avec avertissement.
- Libellé « Lot 1c » seul quand aucun titre n'existe ; focus du bouton ambre en bleu marine (comme le reste du site), vert ailleurs.
- États vides : menu ouvrable avec message ; bouton remplacé par un texte non lié. Textes provisoires de la spécification, inchangés.
## À tester par moi
Sur un vrai téléphone et au moins deux navigateurs, après publication : `/lots/` s'affiche ; « Accès Wireframe » mène à la dernière version des wireframes ; « Page Hi-Fi » mène à l'accueil Hi-Fi ; « Anciens lots » s'ouvre et affiche son message vide ; `/apercus/` redirige vers `/lots/` ; les aperçus `/lot-1c/`, `/lot-2/` et `/lot-2b/` répondent toujours ; la page est lisible et reste calme.
## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-2b` vers `main` (https://github.com/Nowyyy/Plateforme-Commerciale/compare/main...lot-2b?expand=1), fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/lots/`, `/apercus/`, `/wireframes/` et `/accueil.html` sur le site, puis ne plus pousser sur les anciennes branches de lot.
