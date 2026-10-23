// Mesure du CLS de pro.html de 360 à 1440 px, JSON retardés de 400 ms ; affiche aussi la hauteur de la carte du formulaire.
// Usage : node tests/outils/cls-pro.mjs (serveur local sur le port 4173 : node tests/outils/serveur.mjs)
import { chromium } from '@playwright/test';

const LARGEURS = [360, 375, 390, 414, 600, 768, 900, 1024, 1199, 1200, 1280, 1440];
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
  await page.goto('http://localhost:4173/pro.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => globalThis.__cls);
  const hauteur = await page.locator('.pro__carte--formulaire').evaluate((el) => Math.round(el.getBoundingClientRect().height / 16 * 10) / 10);
  pire = Math.max(pire, cls);
  console.log(`CLS ${largeur} px : ${cls.toFixed(3)} (carte du formulaire : ${hauteur} rem)`);
  await page.close();
}
console.log(`CLS maximum : ${pire.toFixed(3)}`);
await navigateur.close();
