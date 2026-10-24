# Test de faisabilité de la carte réelle (lot 4b, outil jetable)

Page d'outil, exception aux règles des pages Hi-Fi : `assets/outils/faisabilite.html` (+ `.css`, `-logique.js` pur, `.js` DOM). Aperçu : `/lot-4b/assets/outils/faisabilite.html`. Lot non fusionné, absent de `/lots/` (`type: technique`).

## Règles
- Aucune requête vers un autre site avant le clic sur « Lancer le test » ; huit sondes, une à la fois, délai de 10 s chacune.
- Lieu fixe : hôtel de ville de Paris ; aucune saisie, aucune donnée personnelle, aucun stockage (ni session, ni cookie, ni IndexedDB).
- Textes écrits dans le HTML (ni `rendu.js` ni `data/*.json`) ; boutons « Copier le rapport » créés par JavaScript (un seul `<button>` dans le HTML).
- URL externes uniquement dans `faisabilite-logique.js`, hôtes de `HOTES` ; le rapport donne des états, jamais de recommandation.
- Les tests automatisés interceptent toutes les requêtes externes (`tests/e2e/faisabilite-simulation.js`) ; aucune requête réelle.

## Services visés
| Sonde | URL | Limite connue (pages publiques des services) |
|---|---|---|
| Géocodage | `https://data.geopf.fr/geocodage/search?q=…&limit=1` | 50 requêtes par seconde et par IP |
| Tuile OpenStreetMap | `https://tile.openstreetmap.org/z/x/y.png` | politique d'usage : attribution, pas d'usage intensif |
| Tuile Plan IGN | `https://data.geopf.fr/wmts?…LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2…` | non relevée |
| API Géorisques | `https://[www.]georisques.gouv.fr/api/v1/gaspar/risques?latlon=lon,lat&rayon=1000` | 1 000 requêtes par minute et par IP |
| WMS Géorisques | `https://[www.]georisques.gouv.fr/services?SERVICE=WMS&REQUEST=GetCapabilities` puis `GetMap` 1.3.0, EPSG:3857, 256 × 256 | non relevée |

## Vérifié / non vérifié
- Vérifié par tests simulés : construction des URL, Web Mercator, analyse des réponses, classement des états, verdicts, rapport, séquence des huit requêtes.
- Non vérifié : comportement réel des services (CORS, quotas, noms de couches), chemin exact de l'API Géorisques (à confirmer dans la documentation officielle), effet des bloqueurs. Un `TypeError` ne distingue pas réseau, CORS et extension ; un 404 lisible prouve seulement que la réponse est lisible par la page.
- La session de l'agent n'atteint pas ces services (proxy sortant, réponse 403 à l'essai de l'étape 0) : seuls les navigateurs du propriétaire mesurent.
