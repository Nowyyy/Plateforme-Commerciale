import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LARGEURS = [375, 768, 1440];

for (const largeur of LARGEURS) {
  test(`réassurance et preuve à ${largeur} px : console propre, axe, listes rendues`, async ({ page }, info) => {
    const erreurs = [];
    const externes = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator('[data-role="reassurance"] .pastilles')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-role="reassurance"] .pastille')).toHaveCount(5);
    await expect(page.locator('[data-role="preuve"] .chiffres')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-role="preuve"] .chiffre')).toHaveCount(3);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/accueil-b-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `accueil-b-${largeur}.png` });
  });
}

const tops = (page) => page.locator('.pastille').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));

test('pastilles : une seule rangée de 5 à 1440 px, retour à la ligne sans débordement à 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  const t = await tops(page);
  expect(t).toHaveLength(5);
  expect(Math.max(...t) - Math.min(...t)).toBeLessThanOrEqual(2);

  await page.setViewportSize({ width: 375, height: 900 });
  const mobile = await tops(page);
  expect(new Set(mobile).size).toBeGreaterThan(1);
  const largeurs = await page.locator('.pastille').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
  for (const droite of largeurs) expect(droite).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('preuve : empilé à 375 px, deux colonnes (2/3 – 1/3) et vidéo 16:9 à 1440 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  const boite = (sel) => page.locator(`[data-role="preuve"] ${sel}`).first().boundingBox();
  const [ecran, legende, chiffres] = [await boite('.preuve__ecran'), await boite('figcaption'), await boite('.chiffres')];
  expect(legende.y).toBeGreaterThanOrEqual(ecran.y + ecran.height - 1);
  expect(chiffres.y).toBeGreaterThanOrEqual(legende.y + legende.height - 1);

  await page.setViewportSize({ width: 1440, height: 900 });
  const [e2, c2] = [await boite('.preuve__ecran'), await boite('.chiffres')];
  expect(c2.x).toBeGreaterThan(e2.x + e2.width);
  expect(Math.abs(e2.y + e2.height / 2 - (c2.y + c2.height / 2))).toBeLessThan(e2.height);
  expect(e2.width / c2.width).toBeGreaterThan(2 * 0.85);
  expect(e2.width / c2.width).toBeLessThan(2 * 1.15);
  expect(Math.abs(e2.width / e2.height - 16 / 9) / (16 / 9)).toBeLessThan(0.02);
});

test('robustesse : 7 pastilles et 4 chiffres, aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  await page.route('**/data/accueil.json', async (route) => {
    const reponse = await route.fetch();
    const donnees = await reponse.json();
    donnees.reassurance.liste = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, titre: `Partenaire fictif numéro ${i + 1} avec un intitulé assez long (exemple)` }));
    donnees.preuve.chiffres = [...donnees.preuve.chiffres, { valeur: '1 234 567 unités', libelle: 'Quatrième chiffre avec un libellé volontairement long' }];
    await route.fulfill({ response: reponse, json: donnees });
  });
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('.pastille')).toHaveCount(7);
    await expect(page.locator('.chiffre')).toHaveCount(4);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `${largeur} px`).toBeLessThanOrEqual(client);
  }
});
