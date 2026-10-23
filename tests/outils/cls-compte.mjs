// Mesure du CLS des pages de l'espace client de 360 à 1440 px, session connectée, JSON retardés de 400 ms.
// Usage : node tests/outils/cls-compte.mjs [page ...] (serveur local sur le port 4173 : node tests/outils/serveur.mjs)
import { chromium } from '@playwright/test';

const PAGES = process.argv.length > 2 ? process.argv.slice(2) : ['connexion', 'compte', 'achats', 'achat', 'informations'];
const LARGEURS = [360, 375, 390, 414, 600, 768, 900, 1024, 1199, 1200, 1280, 1440];
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
for (const nom of PAGES) {
  let pire = 0;
  for (const largeur of LARGEURS) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: 900 } });
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      await route.continue();
    });
    await page.addInitScript(() => {
      sessionStorage.setItem('compte', '{"v":1,"connecte":true}');
      sessionStorage.setItem('achat', 'CMD-1037');
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`http://localhost:4173/${nom}.html`);
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.waitForTimeout(700);
    const cls = await page.evaluate(() => globalThis.__cls);
    pire = Math.max(pire, cls);
    if (cls > 0.05) console.log(`  ${nom} ${largeur} px : ${cls.toFixed(3)}`);
    await page.close();
  }
  console.log(`CLS maximum ${nom} : ${pire.toFixed(3)}`);
}
await navigateur.close();
