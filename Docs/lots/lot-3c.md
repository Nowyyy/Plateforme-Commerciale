# Lot 3c — Fond de page unique, hero fondu et relief décoratif
**Livré** : A fond unique (`body` sur `--color-bg`, sections transparentes, pastilles, chiffres et logo d'avis en blanc à bordure fine), hero en dégradé vers le fond ; note de la preuve placée entre le bloc et le pied (demande hors lot) ; B relief `.relief`, carte de recherche resserrée, bilan. Aperçu : `/lot-3c/`.
**Choix** : `--color-hero-fin` renommé `--color-hero-debut`, teinte `#d2e0f2` (un peu plus bleue que `#dde6f2`, sur demande) tenue jusqu'à 20 % du hero puis fondue vers `--color-bg` ; relief `--color-relief` = marine à 10 %, ×0,5 sous 768 px ; groupe 1 à 10 rem sous 768 px ; erreur de recherche sans réserve (`:empty` sans marge ni bordure), réserves `.hero__recherche` recalculées (19,6 / 18,2 / 16,8 / 13,23 rem).
**Critères** : Vitest 150 (144 sur `main`, +6) ; Playwright 160 (145, +18 nouveaux, −3 remplacés) ; lint propre. 375, 768, 1440 px : console propre, aucun débordement, axe 0, aucune requête externe. Lighthouse mobile `index.html` (2 passes identiques) : perf 99, accessibilité 100, bonnes pratiques 100 (SEO exclu). CLS max 0,0051 (1 200 px) de 360 à 1 440 px par pas de 20, JSON retardés de 400 ms. Vide de la carte (bouton → mention) : 75,2 px avant, 12 px après, à 375 et 1 440 px ; plafond retenu `--space-8` (72 px, plus grand jeton d'espacement : `--gap-lg` n'existe pas).
**Écarts** : « Aléas » et « Comment ça marche » retirés du pied (demande après coup ; réserves du pied recalculées : 36,2 / 24,25 / 14,95 rem) ; les 3 tests « l'apparition du message d'erreur ne déplace pas l'illustration ni l'avis » (`recherche.e2e.js`) sont retirés : ils exigeaient la réserve que la spécification supprime ; remplacés par le test du message (visible, relié au champ, sans chevauchement, focus). Groupe 2 du relief à 70 % au lieu de 88 % : à 88 %, sa partie visible était sous le pied de page (opaque) et il n'apparaissait pas. `CLAUDE.md` : 2 puces condensées pour rester sous 10 000 caractères.
**Points ouverts** : déploiement `/lot-3c/` non vérifié depuis la session ; `index.html` reste `noindex` jusqu'au lot 10.

## Choix à valider
- Teinte de départ du hero `#d2e0f2`, tenue jusqu'à 20 % puis dégradé : plus ou moins bleue, plateau plus ou moins long ?
- Relief : 10 % d'opacité, 5 ou 6 courbes par groupe, groupe 1 à 38 % à droite (derrière les cartes d'aléas à 1 440 px), groupe 2 à 70 % au lieu de 88 %.
- Sous 768 px : un seul groupe, 10 rem de large, opacité ×0,5.
- Pastilles, chiffres et logo d'avis en blanc à bordure fine sur le fond unique.
- Vide de la carte : cause = `min-block-size: 2lh` du message d'erreur (hypothèse confirmée par la mesure, 51 px + marges) ; le message pousse désormais la mention à son apparition.

## À tester par moi
Sur un vrai téléphone et deux navigateurs, sur `/lot-3c/` : fond uniforme du haut en bas ? hero fondu sans arête ? courbes visibles sans gêner la lecture ? carte de recherche bien proportionnée (message d'erreur compris) ? impression « calme et technique » ? Sur `/lots/`, « Page Hi-Fi » mène à `/lot-3c/`.

## Fusion (à faire par moi)
Ouvrir la Pull Request `lot-3c` vers `main`, fusionner avec « Create a merge commit », **ne pas supprimer la branche**, vérifier `/` et `/lots/` sur le site.
