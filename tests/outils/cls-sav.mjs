// Mesure du CLS des pages du SAV de 360 à 1440 px, JSON retardés de 400 ms.
// Usage : node tests/outils/cls-sav.mjs (serveur local sur le port 4173 : node tests/outils/serveur.mjs)
import { chromium } from '@playwright/test';

const CAS = [
  { nom: 'sav-acces', page: 'sav-acces.html', session: {} },
  { nom: 'sav (compte, plusieurs lignes)', page: 'sav.html', session: { compte: true, achat: 'CMD-1037' } },
  { nom: 'sav (compte, une ligne)', page: 'sav.html', session: { compte: true, achat: 'CMD-1044' } },
  { nom: 'sav (sans compte)', page: 'sav.html', session: { acces: 'CMD-1037' } },
  { nom: 'demandes', page: 'demandes.html', session: { compte: true } },
];
const LARGEURS = [360, 375, 390, 414, 600, 768, 900, 1024, 1199, 1200, 1280, 1440];
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
      if (session.compte) sessionStorage.setItem('compte', '{"v":1,"connecte":true}');
      if (session.achat) sessionStorage.setItem('achat', session.achat);
      if (session.acces) sessionStorage.setItem('acces-sav', session.acces);
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
      }).observe({ type: 'layout-shift', buffered: true });
    }, cas.session);
    await page.goto(`http://localhost:4173/${cas.page}`);
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.waitForTimeout(700);
    const cls = await page.evaluate(() => globalThis.__cls);
    pire = Math.max(pire, cls);
    if (cls > 0.05) console.log(`  ${cas.nom} ${largeur} px : ${cls.toFixed(3)}`);
    await page.close();
  }
  console.log(`CLS maximum ${cas.nom} : ${pire.toFixed(3)}`);
}
await navigateur.close();
