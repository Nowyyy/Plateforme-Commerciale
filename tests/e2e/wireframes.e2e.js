import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['index', 'accueil', 'diagnostic', 'produit', 'panier'];
const LARGEURS = [375, 768, 1440];

for (const nom of PAGES) {
  for (const largeur of LARGEURS) {
    test(`wireframes/${nom}.html à ${largeur} px`, async ({ page }, info) => {
      const erreurs = [];
      page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
      page.on('pageerror', (e) => erreurs.push(e.message));
      const externes = [];
      page.on('request', (r) => {
        const url = new URL(r.url());
        if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
      });

      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(`/wireframes/${nom}.html`);
      await page.evaluate(() => document.fonts.ready);

      expect(erreurs).toEqual([]);
      expect(externes).toEqual([]);

      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(client);

      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations).toEqual([]);

      await page.screenshot({ path: `test-results/wf-${nom}-${largeur}.png`, fullPage: true });
      info.annotations.push({ type: 'capture', description: `wf-${nom}-${largeur}.png` });
    });
  }
}
