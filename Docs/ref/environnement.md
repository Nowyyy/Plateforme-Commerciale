# Capacités de la session cloud (sondées au lot 0-A)
- Node v22.22.0, npm 10.9.4 : ok.
- Registre npm : ok (npm ping, installation de 7 paquets).
- Navigateur Playwright : ok. Chromium préinstallé dans /opt/pw-browsers/chromium ; ne pas lancer « playwright install » ; lancer avec `executablePath: '/opt/pw-browsers/chromium'`.
- Lighthouse en ligne de commande : ok sur http://localhost (échoue sur file://) ; `CHROME_PATH=/opt/pw-browsers/chromium` et `--no-sandbox`.
- Push de branche : ok (main « Init », puis lot-0). Push de tag : refusé (HTTP 403). Push de fichier de workflow : ok.
- Réseau sortant filtré par un proxy (www.google.com refusé) : aucun appel externe fiable.

## Dépendances de développement (versions exactes)
- eslint 10.12.0, @eslint/js 10.0.1, globals 17.13.0 : lint (configuration plate).
- vitest 5.0.4 : tests unitaires.
- @playwright/test 1.64.0 : pilotage du navigateur, captures, tests de parcours.
- @axe-core/playwright 4.13.0 : contrôle d'accessibilité.
- lighthouse 13.5.0 : audit de performance, accessibilité, bonnes pratiques, SEO.

## Polices (partie B)
- Source : paquets npm @fontsource/inter 5.3.0 et @fontsource/plus-jakarta-sans 5.3.0, téléchargés hors dépôt (non ajoutés à package.json).
- Licence relevée dans chaque paquet : SIL Open Font License 1.1 (champ `license` et fichier LICENSE), libre ; les deux textes sont copiés dans `assets/fonts/`.
- Fichiers versionnés : woff2 latin seulement (Inter 400 et 600 ; Plus Jakarta Sans 600 et 800), 12 à 24 Ko chacun.

## Contraintes retenues (design)
- Aucune couleur hors `css/tokens.css` ; ambre réservé à l'action, texte sur ambre en bleu marine ; aucun rouge.
- Polices hébergées (woff2 latin, `font-display: swap`, repli système), aucun appel externe, aucun script.
- Mobile 375/390 px et bureau 1440 px à égalité ; sobre, typographique, données en chiffres tabulaires.

## Contrôles (partie B)
- Playwright : 3 passes (375, 768, 1440 px), console propre, aucune requête externe, aucun débordement, axe sans violation.
- Lighthouse mobile : performance 100, accessibilité 100, bonnes pratiques 100, SEO 100.
- Contraste calculé : marine sur ambre 5,26:1 ; blanc sur ambre 3,19:1 ; ambre sur fond clair 3,04:1 (donc jamais de texte courant en ambre) ; texte secondaire sur fond 7,24:1.
