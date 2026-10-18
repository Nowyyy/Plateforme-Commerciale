import { test, expect } from '@playwright/test';

// CLS de la fiche de 360 à 1440 px, JSON retardés de 400 ms (rendu tardif des textes et listes).
const LARGEURS = [360, 375, 390, 414, 600, 768, 900, 1024, 1199, 1200, 1280, 1440];
const PRODUITS = ['batardeau-modulable', 'sprinkler-de-toiture', 'cool-roofing'];

for (const produit of PRODUITS) {
  test(`CLS de produit.html (${produit}) de 360 à 1440 px, JSON retardés de 400 ms : au plus 0,1`, async ({ page }) => {
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.continue();
    });
      await page.addInitScript((id) => sessionStorage.setItem('produit', id), produit);
      await page.addInitScript(() => {
        window.__cls = 0;
        window.__sources = [];
        new PerformanceObserver((liste) => {
          for (const e of liste.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__cls += e.value;
            window.__sources.push(`${e.value.toFixed(3)} ${e.sources.map((s) => s.node?.className || s.node?.nodeName).join(',')}`);
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto('/produit.html');
      await page.waitForSelector('html[data-rendu="pret"]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const { cls, sources } = await page.evaluate(() => ({ cls: window.__cls, sources: window.__sources }));
      console.log(`CLS ${produit} ${largeur} px : ${cls.toFixed(3)} ${cls > 0.05 ? JSON.stringify(sources) : ''}`);
      expect(cls, `${produit} à ${largeur} px`).toBeLessThanOrEqual(0.1);
    }
  });
}
