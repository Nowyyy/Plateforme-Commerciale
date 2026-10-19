import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of [375, 768, 1440]) {
  test(`batardeau à ${largeur} px : specs et documents après le configurateur, console propre, sans débordement, axe, aucune requête externe`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    const roles = await page.locator('main [data-role]').evaluateAll((els) => els.map((e) => e.dataset.role));
    expect(roles.slice(-3)).toEqual(['configurateur', 'specs', 'documents']);
    for (const role of ['specs', 'documents']) await expect(page.locator(`[data-role="${role}"]`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Spécifications d\'ingénierie' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Documents officiels (exemples)' })).toBeVisible();
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
    await page.screenshot({ path: `test-results/lot7-A-batardeau-${largeur}.png`, fullPage: true });
  });
}

test('produit non complet : specs et documents masqués, message du configurateur visible', async ({ page }) => {
  await ouvrir(page, 375, { produit: 'bouclier-de-baie' });
  for (const role of ['specs', 'documents']) {
    const section = page.locator(`[data-role="${role}"]`);
    await expect(section).toHaveAttribute('hidden', '');
    await expect(section).not.toBeVisible();
  }
  const message = page.locator('[data-role="configurateur"]').locator('.configurateur__message');
  await expect(message).toBeVisible();
  await expect(message).toContainText('spécifications');
  await expect(message).toContainText('documents');
  await page.screenshot({ path: 'test-results/lot7-A-non-complet-375.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'test-results/lot7-A-non-complet-1440.png', fullPage: true });
});

test('ordre vertical à 375 px : galerie, achat, mode, configurateur, specs, documents', async ({ page }) => {
  await ouvrir(page, 375);
  const hauts = await page.evaluate(() => ['galerie', 'achat', 'mode', 'configurateur', 'specs', 'documents']
    .map((r) => document.querySelector(`[data-role="${r}"]`).getBoundingClientRect().top + window.scrollY));
  expect([...hauts].sort((a, b) => a - b)).toEqual(hauts);
  expect(new Set(hauts).size).toBe(6);
});
