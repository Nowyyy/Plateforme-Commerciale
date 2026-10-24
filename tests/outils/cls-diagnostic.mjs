// Mesure du CLS de diagnostic.html de 360 à 1440 px, JSON retardés de 400 ms, pour comparer deux versions du site.
// Usage : BASE=http://localhost:4173 node tests/outils/cls-diagnostic.mjs (serveur : PORT=4173 node tests/outils/serveur.mjs)
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const LARGEURS = [360, 375, 390, 414, 480, 600, 700, 768, 900, 1024, 1199, 1200, 1280, 1440];
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
let pire = 0;
for (const largeur of LARGEURS) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: 900 } });
  await page.route('**/data/*.json', async (route) => {
    await new Promise((resolve) => { setTimeout(resolve, 400); });
    await route.continue();
  });
  await page.addInitScript(() => {
    globalThis.__cls = 0;
    new PerformanceObserver((liste) => {
      for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${BASE}/diagnostic.html`);
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForTimeout(700);
  const cls = await page.evaluate(() => globalThis.__cls);
  pire = Math.max(pire, cls);
  console.log(`  ${largeur} px : CLS ${cls.toFixed(3)}`);
  await page.close();
}
console.log(`CLS maximum diagnostic : ${pire.toFixed(3)}`);
await navigateur.close();
