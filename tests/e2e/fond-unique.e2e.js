import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LARGEURS = [375, 768, 1440];
const FOND = 'rgb(248, 250, 252)';
const SECTIONS = ['aleas', 'protection', 'comment', 'reassurance', 'avis', 'preuve'];

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of LARGEURS) {
  test(`fond unique à ${largeur} px : body sur le fond de page, sections transparentes`, async ({ page }) => {
    await ouvrir(page, largeur);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(FOND);
    for (const role of SECTIONS) {
      const fond = await page.locator(`[data-role="${role}"]`).evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(fond, role).toBe('rgba(0, 0, 0, 0)');
    }
  });

  test(`hero fondu à ${largeur} px : le dégradé arrive sur le fond de page`, async ({ page }) => {
    await ouvrir(page, largeur);
    const image = await page.locator('.hero').evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(image).toContain('linear-gradient');
    expect(image.trim().endsWith(`${FOND})`)).toBe(true);
    expect(image.indexOf('rgb(221, 230, 242)')).toBeGreaterThan(-1);
    expect(image.indexOf('rgb(221, 230, 242)')).toBeLessThan(image.indexOf(FOND));
  });

  test(`fond unique à ${largeur} px : console propre, sans débordement, axe sans violation, aucune requête externe`, async ({ page }) => {
    const erreurs = [];
    const externes = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });
    await ouvrir(page, largeur);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
  });
}
