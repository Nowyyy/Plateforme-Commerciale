// Mesure du CLS de comparateur.html de 360 à 1440 px, JSON retardés de 400 ms, avec la hauteur de <main> avant et après le rendu.
// Usage : node tests/outils/cls-comparateur.mjs (serveur local sur le port 4173 : node tests/outils/serveur.mjs)
import { chromium } from '@playwright/test';

const CAS = [
  { nom: 'aléa par défaut', session: null },
  { nom: 'aléa à deux produits', session: '{"v":1,"alea":"feux-de-foret","produits":["sprinkler-de-toiture","grille-pare-braises"]}' },
];
const LARGEURS = [360, 375, 390, 414, 480, 600, 700, 768, 900, 1024, 1199, 1200, 1280, 1440];
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
for (const cas of CAS) {
  let pire = 0;
  for (const largeur of LARGEURS) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: 900 } });
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      await route.continue();
    });
    await page.addInitScript((session) => {
      if (session) sessionStorage.setItem('comparaison', session);
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
      }).observe({ type: 'layout-shift', buffered: true });
    }, cas.session);
    await page.goto(`http://localhost:4173/comparateur.html`, { waitUntil: 'commit' });
    await page.waitForSelector('main');
    await page.waitForTimeout(150);
    const avant = await page.evaluate(() => globalThis.document.querySelector('main').getBoundingClientRect().height);
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.waitForTimeout(700);
    const apres = await page.evaluate(() => globalThis.document.querySelector('main').getBoundingClientRect().height);
    const cls = await page.evaluate(() => globalThis.__cls);
    pire = Math.max(pire, cls);
    console.log(`  ${cas.nom} ${largeur} px : CLS ${cls.toFixed(3)} ; main ${avant.toFixed(0)} -> ${apres.toFixed(0)} px`);
    await page.close();
  }
  console.log(`CLS maximum ${cas.nom} : ${pire.toFixed(3)}`);
}
await navigateur.close();
