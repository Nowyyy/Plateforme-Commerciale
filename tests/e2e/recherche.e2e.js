import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
}

for (const [nom, saisie] of [['champ vide', ''], ['adresse invalide', '1234567']]) {
  test(`${nom} : message visible, focus dans le champ, pas de navigation`, async ({ page }, info) => {
    await ouvrir(page, 375);
    const champ = page.getByLabel(/Entrez votre adresse/);
    if (saisie) {
      await champ.click();
      await page.keyboard.type(saisie);
    }
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();

    const erreur = page.locator('#adresse-erreur');
    await expect(erreur).toBeVisible();
    await expect(erreur).toHaveText('Saisissez une adresse d\'au moins 5 caractères.');
    await expect(champ).toBeFocused();
    await expect(champ).toHaveAttribute('aria-invalid', 'true');
    await expect(champ).toHaveAttribute('aria-describedby', /adresse-erreur/);
    await expect(erreur).toHaveAttribute('aria-live', 'polite');
    expect(new URL(page.url()).pathname).toBe('/index.html');
    expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBeNull();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (nom === 'champ vide') await page.screenshot({ path: 'test-results/accueil-375-erreur.png', fullPage: true });
    info.annotations.push({ type: 'ok', description: nom });
  });
}

test('le formulaire est sans action et saisir efface l\'erreur', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(page.locator('form.recherche')).not.toHaveAttribute('action', /.+/);
  await expect(page.getByLabel(/Entrez votre adresse/)).toHaveAttribute('autocomplete', 'street-address');
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await expect(page.locator('#adresse-erreur')).toBeVisible();
  await page.keyboard.type('a');
  await expect(page.locator('#adresse-erreur')).toBeHidden();
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : accueil, adresse, diagnostic`, async ({ page }) => {
    const requetes = [];
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);

    await page.getByLabel(/Entrez votre adresse/).click();
    await page.keyboard.type(`  ${ADRESSE}  `);
    if (largeur === 1440) await page.screenshot({ path: 'test-results/accueil-1440-saisie.png', fullPage: true });
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();

    await page.waitForURL('**/diagnostic.html');
    expect(page.url()).not.toContain(encodeURIComponent('Tilleuls'));
    expect(page.url()).not.toContain('Tilleuls');
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(ADRESSE);
    for (const url of requetes) {
      expect(decodeURIComponent(url)).not.toContain('Tilleuls');
      expect(new URL(url).hostname).toBe('localhost');
    }
  });
}

test('stockage de session indisponible : la navigation a quand même lieu', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('indisponible'); } });
  });
  await ouvrir(page, 375);
  await page.getByLabel(/Entrez votre adresse/).click();
  await page.keyboard.type(ADRESSE);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
});

