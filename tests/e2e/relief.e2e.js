import { test, expect } from '@playwright/test';

const LARGEURS = [375, 768, 1440];
const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

test('relief : conteneur non interactif, couleur transparente, deux groupes à 1440 px, un seul à 375 px', async ({ page }) => {
  await ouvrir(page, 1440);
  const relief = page.locator('body > .relief:first-child');
  await expect(relief).toHaveAttribute('aria-hidden', 'true');
  expect(await relief.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  const alpha = await relief.evaluate((e) => {
    const c = getComputedStyle(e).color.match(/[\d.]+/g).map(Number);
    return c.length > 3 ? c[3] : 1;
  });
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(0.2);
  await expect(page.locator('.relief svg:visible')).toHaveCount(2);
  const pied = await page.locator('[data-role="pied"]').boundingBox();
  const g2 = await page.locator('.relief__groupe--2').boundingBox();
  expect(g2.y + g2.height / 2).toBeLessThan(pied.y);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator('.relief svg:visible')).toHaveCount(1);
});

for (const largeur of LARGEURS) {
  test(`relief à ${largeur} px : aucun débordement horizontal`, async ({ page }) => {
    await ouvrir(page, largeur);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
  });
}

for (const largeur of [375, 1440]) {
  test(`carte de recherche à ${largeur} px : vide réduit, message d'erreur accessible`, async ({ page }) => {
    await ouvrir(page, largeur);
    const espace = () => page.evaluate(() => {
      const b = document.querySelector('.recherche .bouton').getBoundingClientRect();
      const m = document.querySelector('.recherche__microtexte').getBoundingClientRect();
      return m.top - b.bottom;
    });
    const plafond = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize) * parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--space-8')));
    expect(await espace()).toBeLessThanOrEqual(plafond);
    expect(await espace()).toBeLessThanOrEqual(24);

    await page.click('.recherche button[type="submit"]');
    const erreur = page.locator('#adresse-erreur');
    await expect(erreur).toBeVisible();
    await expect(page.locator('#adresse')).toHaveAttribute('aria-describedby', /adresse-erreur/);
    await expect(page.locator('#adresse')).toBeFocused();
    const [e, m] = await Promise.all([erreur.boundingBox(), page.locator('.recherche__microtexte').boundingBox()]);
    expect(e.y + e.height).toBeLessThanOrEqual(m.y);
  });

  test(`parcours cliqué à ${largeur} px : adresse valide, diagnostic, adresse absente de l'URL`, async ({ page }) => {
    await ouvrir(page, largeur);
    await page.fill('#adresse', ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/wireframes/diagnostic.html');
    expect(page.url()).not.toContain('Tilleuls');
    expect(decodeURIComponent(page.url())).not.toContain('Lyon');
  });
}
