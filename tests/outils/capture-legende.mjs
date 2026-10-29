// Captures de la légende officielle (images et échec simulés) à 375, 768 et 1440 px dans test-results/legende-10c/.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { ouvrirDiagnostic, simuler } from '../e2e/carte-reelle-simulation.js';

const BASE = process.env.BASE ?? 'http://localhost:4173';
mkdirSync('test-results/legende-10c', { recursive: true });
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
for (const largeur of [375, 768, 1440]) {
  for (const [nom, legende] of [['images', {}], ['echec', { mode: '404' }]]) {
    const contexte = await navigateur.newContext({ baseURL: BASE });
    const page = await contexte.newPage();
    await simuler(page, { legende });
    await ouvrirDiagnostic(page, largeur);
    await page.waitForSelector(nom === 'images' ? '#legende-reelle img:not([hidden])' : '.legende__echec:not([hidden])');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/legende-10c/${nom}-${largeur}.png`, fullPage: true });
    await contexte.close();
  }
}
await navigateur.close();
