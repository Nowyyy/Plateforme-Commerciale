import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const LARGEURS = [375, 768, 1440];

async function verifier(page, chemin, largeur, capture) {
  const erreurs = [];
  const externes = [];
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
  });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(chemin);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect(erreurs).toEqual([]);
  expect(externes).toEqual([]);
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/${capture}-${largeur}.png`, fullPage: true });
}

for (const largeur of LARGEURS) {
  test(`index.html (accueil) à ${largeur} px : console, débordement, axe, requêtes`, async ({ page }) => {
    await verifier(page, '/index.html', largeur, 'index');
  });
  test(`attente.html à ${largeur} px : console, débordement, axe`, async ({ page }) => {
    await verifier(page, '/attente.html', largeur, 'attente-page');
  });
}

test('accueil.html redirige vers index.html', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/accueil.html');
  await page.waitForURL('**/index.html');
  await expect(page.locator('[data-role="hero"]')).toBeVisible();
});

test('accueil.html : texte et lien visibles, sans débordement à 375 px', async ({ page }) => {
  // le rafraîchissement est retiré pour pouvoir regarder la page avant qu'elle ne redirige
  const source = readFileSync('accueil.html', 'utf8').replace(/<meta http-equiv="refresh"[^>]*>/, '');
  await page.setViewportSize({ width: 375, height: 800 });
  await page.setContent(source);
  await expect(page.getByRole('heading', { level: 1, name: 'Accueil déplacé' })).toBeVisible();
  await expect(page.getByRole('link', { name: "Aller à l'accueil" })).toHaveAttribute('href', 'index.html');
  await page.screenshot({ path: 'test-results/redirection-375.png', fullPage: true });
});
