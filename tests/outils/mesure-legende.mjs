// Mesure de la hauteur maximale du cadre de légende (quatre couches affichées, images en attente donc réserves pleines, aléas en mode de secours) par largeur,
// avec le plancher de hauteur neutralisé : sert à fixer les `min-block-size` de `.diag__legende .bloc-carte` (CLS).
// Usage : PORT=4173 node tests/outils/serveur.mjs & puis BASE=http://localhost:4173 node tests/outils/mesure-legende.mjs
import { chromium } from '@playwright/test';
import { ADRESSE, ouvrirDiagnostic, simuler } from '../e2e/carte-reelle-simulation.js';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
// LARGEURS="400,405" pour des largeurs précises ; sinon de 360 à 1440 px par pas de 10, plus 1199 et 1200.
const largeurs = process.env.LARGEURS ? process.env.LARGEURS.split(',').map(Number) : [];
if (largeurs.length === 0) {
  for (let l = 360; l <= 1440; l += 10) largeurs.push(l);
  largeurs.push(1199, 1200);
  largeurs.sort((a, b) => a - b);
}
for (const largeur of largeurs) {
  const contexte = await navigateur.newContext({ baseURL: BASE });
  const page = await contexte.newPage();
  await simuler(page, { api: { gaspar: { abandon: true }, rga: { abandon: true } }, legende: { mode: 'attente' } }); // état le plus haut : images en attente, réserves pleines
  await ouvrirDiagnostic(page, largeur, { adresse: ADRESSE });
  await page.waitForSelector('#liste-calques input');
  await page.addStyleTag({ content: '.diag__legende .bloc-carte { min-block-size: 0 !important; }' });
  await page.waitForSelector('#legende-reelle li:not([hidden]) .legende__image', { state: 'attached' });
  await page.waitForTimeout(300);
  const h = await page.evaluate(() => globalThis.document.querySelector('.diag__legende .bloc-carte').getBoundingClientRect().height / parseFloat(globalThis.getComputedStyle(globalThis.document.documentElement).fontSize));
  console.log(`${largeur} ${h.toFixed(2)}`);
  await contexte.close();
}
await navigateur.close();
