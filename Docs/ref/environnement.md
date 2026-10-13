# Capacités de la session cloud (sondées au lot 0-A)
- Node v22.22.0, npm 10.9.4 : ok.
- Registre npm : ok (npm ping, installation de 7 paquets).
- Navigateur Playwright : ok. Chromium préinstallé dans /opt/pw-browsers/chromium ; ne pas lancer « playwright install » ; lancer avec `executablePath: '/opt/pw-browsers/chromium'`.
- Lighthouse en ligne de commande : ok sur http://localhost (échoue sur file://) ; `CHROME_PATH=/opt/pw-browsers/chromium` et `--no-sandbox`.
- Push de branche : ok (main « Init », puis lot-0). Push de tag : non testé. Push de fichiers de workflow : non testé.
- Réseau sortant filtré par un proxy (www.google.com refusé) : aucun appel externe fiable.

## Dépendances de développement (versions exactes)
- eslint 10.12.0, @eslint/js 10.0.1, globals 17.13.0 : lint (configuration plate).
- vitest 5.0.4 : tests unitaires.
- @playwright/test 1.64.0 : pilotage du navigateur, captures, tests de parcours.
- @axe-core/playwright 4.13.0 : contrôle d'accessibilité.
- lighthouse 13.5.0 : audit de performance, accessibilité, bonnes pratiques, SEO.
