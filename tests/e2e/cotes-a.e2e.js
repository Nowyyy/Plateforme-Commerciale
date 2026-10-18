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
  test(`configurateur (batardeau) à ${largeur} px : bloc visible, console propre, sans débordement, axe, aucune requête externe`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    const bloc = page.locator('[data-role="configurateur"]');
    await expect(bloc).toBeVisible();
    await expect(bloc.getByRole('heading', { level: 2, name: 'Configurateur de cotes' })).toBeVisible();
    await expect(bloc.getByText('Mesurez votre ouverture pour vérifier que ce produit convient.')).toBeVisible();
    await expect(bloc).toHaveAttribute('data-bloc', 'E3-5');
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
    await page.screenshot({ path: `test-results/cotes-A-batardeau-${largeur}.png`, fullPage: true });
  });
}

test('produit non complet : message et lien « Retour au diagnostic », ni champ ni bouton d\'action', async ({ page }) => {
  const messages = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
  await ouvrir(page, 375, { produit: 'bouclier-de-baie' });
  const bloc = page.locator('[data-role="configurateur"]');
  await expect(bloc).toBeVisible();
  await expect(bloc.getByText('Configurateur disponible seulement pour la fiche complète du batardeau modulable dans ce démonstrateur.')).toBeVisible();
  await expect(bloc.locator('input, button, fieldset, svg')).toHaveCount(0);
  const lien = bloc.getByRole('link', { name: 'Retour au diagnostic' });
  await expect(lien).toHaveAttribute('href', 'diagnostic.html');
  expect(messages).toEqual([]);
  await page.screenshot({ path: 'test-results/cotes-A-non-complet-375.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'test-results/cotes-A-non-complet-1440.png', fullPage: true });
  await lien.click();
  await page.waitForURL('**/diagnostic.html');
});

test('ordre vertical à 375 px : galerie, achat, mode, configurateur', async ({ page }) => {
  await ouvrir(page, 375);
  const tops = [];
  for (const role of ['galerie', 'achat', 'mode', 'configurateur', 'pied']) {
    tops.push(await page.locator(`[data-role="${role}"]`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY));
  }
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  expect(new Set(tops).size).toBe(5);
});
