import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
}

for (const [nom, saisie] of [['champ vide', ''], ['adresse invalide', '1234567']]) {
  test(`${nom} : bouton inactif, aucune navigation, phrase d'aide annoncée, focus dans le champ`, async ({ page }, info) => {
    await simuler(page);
    await ouvrir(page, 375);
    const champ = page.getByLabel(/Entrez votre adresse/);
    if (saisie) {
      await champ.click();
      await page.keyboard.type(saisie);
    }
    const bouton = page.getByRole('button', { name: 'Évaluer mon exposition' });
    await expect(bouton).toHaveAttribute('aria-disabled', 'true');
    await bouton.click({ force: true }); // Playwright traite `aria-disabled` comme désactivé : le visiteur, lui, peut cliquer
    await expect(page.locator('#adresse-statut')).toHaveText('Choisissez une adresse dans la liste pour continuer.');
    await expect(champ).toBeFocused();
    await expect(page.locator('#adresse-erreur')).toBeHidden();
    expect(new URL(page.url()).pathname).toBe('/index.html');
    expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBeNull();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (nom === 'champ vide') await page.screenshot({ path: 'test-results/accueil-375-inactif.png', fullPage: true });
    info.annotations.push({ type: 'ok', description: nom });
  });
}

test('le formulaire est sans action et saisir ne crée aucune erreur', async ({ page }) => {
  await simuler(page);
  await ouvrir(page, 1440);
  await expect(page.locator('form.recherche')).not.toHaveAttribute('action', /.+/);
  await expect(page.getByLabel(/Entrez votre adresse/)).toHaveAttribute('autocomplete', 'off'); // la liste de suggestions remplace celle du navigateur
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click({ force: true });
  await expect(page.locator('#adresse-erreur')).toBeHidden();
  await page.keyboard.type('a');
  await expect(page.locator('#adresse-erreur')).toBeHidden();
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : accueil, adresse choisie dans la liste, diagnostic`, async ({ page }) => {
    await simuler(page);
    const requetes = [];
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);

    const libelle = await choisirAdresse(page, page.getByLabel(/Entrez votre adresse/));
    if (largeur === 1440) await page.screenshot({ path: 'test-results/accueil-1440-saisie.png', fullPage: true });
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();

    await page.waitForURL('**/diagnostic.html');
    expect(page.url()).not.toContain('Tilleuls');
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(libelle);
    // l'adresse n'apparaît que dans les requêtes de géocodage vers data.geopf.fr (suggestions, carte du diagnostic)
    for (const url of requetes) {
      const u = new URL(url);
      if (decodeURIComponent(url).includes('Tilleuls')) {
        expect(u.hostname).toBe('data.geopf.fr');
        expect(['/geocodage/search', '/geocodage/completion/']).toContain(u.pathname);
      } else {
        expect(['localhost', 'data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org']).toContain(u.hostname);
      }
    }
  });
}

test('stockage de session indisponible : la navigation a quand même lieu', async ({ page }) => {
  await simuler(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('indisponible'); } });
  });
  await ouvrir(page, 375);
  await choisirAdresse(page, page.getByLabel(/Entrez votre adresse/));
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
});
