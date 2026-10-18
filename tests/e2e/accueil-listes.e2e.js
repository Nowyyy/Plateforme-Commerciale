import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NOMBRES = { aleas: 4, protection: 3, comment: 3 };

for (const largeur of [375, 768, 1440]) {
  test(`index.html à ${largeur} px : listes rendues, console propre, axe sans violation`, async ({ page }, info) => {
    const erreurs = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    const externes = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });

    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.evaluate(() => document.fonts.ready);

    for (const [role, nombre] of Object.entries(NOMBRES)) {
      const conteneur = page.locator(`[data-role="${role}"] [aria-busy]`).first();
      await expect(conteneur).toHaveAttribute('aria-busy', 'false');
      await expect(conteneur.locator(':scope > li')).toHaveCount(nombre);
    }
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
    await expect(page.locator('.erreur-chargement')).toHaveCount(0);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);

    await page.screenshot({ path: `test-results/accueil-listes-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `accueil-listes-${largeur}.png` });
  });
}

test('menu à 375 px : « Vendre sur la plateforme » et « Mon compte » dans le panneau, Panier dans la barre', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');

  const bouton = page.locator('[data-menu-bouton]');
  await bouton.click();
  const nav = page.getByRole('navigation');
  await expect(nav).toBeVisible();
  // Aléas et Comment ça marche ne sont plus dans l'en-tête (ancres, pas des pages)
  await expect(nav.getByRole('link')).toHaveText(['Vendre sur la plateforme', 'Mon compte']);
  await expect(page.locator('.entete__panier-barre')).toBeVisible();
  await page.screenshot({ path: 'test-results/accueil-375-menu-3.png' });
});
