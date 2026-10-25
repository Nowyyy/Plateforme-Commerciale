import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { simuler } from './carte-reelle-simulation.js';

const donnees = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    if (sessionStorage.getItem('__init')) return;
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
    sessionStorage.setItem('__init', '1');
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const lignes = (page) => page.locator('[data-role="specs"] tbody tr');

test('tableau du batardeau : 4 lignes, th de ligne, td, pictogramme décoratif, valeurs « (exemple) »', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(lignes(page)).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    const ligne = lignes(page).nth(i);
    await expect(ligne.locator('th[scope="row"]')).toHaveCount(1);
    await expect(ligne.locator('td')).toHaveCount(1);
    await expect(ligne.locator('th svg[aria-hidden="true"]')).toHaveCount(1);
    await expect(ligne.locator('td')).toContainText('(exemple)');
    await expect(ligne.locator('th')).toContainText(donnees.produits[0].specs[i].titre);
    await expect(ligne.locator('td')).toHaveText(donnees.produits[0].specs[i].valeur);
  }
  await expect(page.locator('[data-role="specs"] caption')).toHaveText(donnees.specifications.caption);
  await expect(page.getByRole('columnheader')).toHaveText(['Caractéristique', 'Valeur']);
  await expect(page.locator('[data-role="specs"] tbody')).toHaveAttribute('aria-busy', 'false');
});

test('valeur de 120 caractères : le tableau tient dans la largeur à 375 px ; 64 rem au plus à 1440 px', async ({ page }) => {
  await page.route('**/data/produit.json', async (route) => {
    const reponse = await route.fetch();
    const json = await reponse.json();
    json.produits[0].specs[3].valeur = `${'Valeur-longue-'.repeat(9)}(exemple)`.slice(0, 120);
    await route.fulfill({ response: reponse, json });
  });
  await ouvrir(page, 375);
  const mesure = await page.evaluate(() => {
    const table = document.querySelector('.specs__table');
    const cadre = document.querySelector('.specs__tableau');
    return {
      tableScroll: table.scrollWidth, tableLarg: table.clientWidth, cadreScroll: cadre.scrollWidth, cadreLarg: cadre.clientWidth,
      page: document.documentElement.scrollWidth, fenetre: window.innerWidth,
    };
  });
  expect(mesure.tableScroll).toBeLessThanOrEqual(mesure.tableLarg);
  expect(mesure.cadreScroll).toBeLessThanOrEqual(mesure.cadreLarg);
  expect(mesure.page).toBeLessThanOrEqual(mesure.fenetre);
  await ouvrir(page, 1440);
  const boite = await page.locator('.specs__tableau').boundingBox();
  const intro = await page.locator('.specs__intro').boundingBox();
  console.log(`tableau à 1440 px : x=${boite.x}, largeur=${boite.width}`);
  expect(boite.width).toBeLessThanOrEqual(1024);
  expect(boite.x).toBeCloseTo(intro.x, 0);
});

test('produit non complet : aucune ligne de tableau ni lien de document visibles', async ({ page }) => {
  await ouvrir(page, 375, { produit: 'sprinkler-de-toiture' });
  await expect(page.locator('[data-role="specs"] tr:visible')).toHaveCount(0);
  await expect(page.locator('[data-role="documents"] a:visible')).toHaveCount(0);
  await expect(page.locator('[data-role="specs"] tbody tr')).toHaveCount(0);
  await expect(page.locator('[data-role="documents"] a')).toHaveCount(0);
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : recherche, diagnostic, fiche, spécifications, documents, téléchargement, retour`, async ({ page }) => {
    const messages = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    await simuler(page); // services de l'adresse et de la carte simulés
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.goBack();
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.getByRole('link', { name: 'Voir les solutions Inondations et crues' }).click();
    await page.waitForURL('**/diagnostic.html');
    const carte = page.locator('#liste-equipements > li').filter({ has: page.getByRole('heading', { level: 3, name: 'Batardeau modulable' }) });
    await carte.getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="specs"]').scrollIntoViewIfNeeded();
    await expect(lignes(page)).toHaveCount(4);
    await page.locator('[data-role="documents"]').scrollIntoViewIfNeeded();
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'PV d\'essais en laboratoire (PDF, exemple)' }).click(),
    ]);
    expect(telechargement.suggestedFilename()).toBe('pv-essais-exemple.pdf');
    await expect(page.locator('[data-role="documents"] .documents__lien')).toHaveCount(2);
    expect(new URL(page.url()).search).toBe('');
    expect(messages).toEqual([]);
  });
}

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px, DIY et pose, états à saisir et compatible : console propre, axe, aucune requête externe, aucun débordement`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    for (const mode of [/Matériel seul/, /Matériel \+ pose/]) {
      await page.getByRole('radio', { name: mode }).check({ force: true });
      for (const [largeurMm, hauteurMm] of [['', ''], ['1200', '400']]) {
        await page.locator('#cote-largeur').fill(largeurMm);
        await page.locator('#cote-hauteur').fill(hauteurMm);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
        expect(defilement).toBeLessThanOrEqual(fenetre);
      }
    }
    expect(messages).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
    await page.screenshot({ path: `test-results/lot7-C-page-${largeur}.png`, fullPage: true });
  });
}

test('JavaScript désactivé : seul le message noscript est visible, specs et documents invisibles', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/produit.html');
  expect((await page.locator('body').innerText()).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  for (const role of ['specs', 'documents']) await expect(page.locator(`[data-role="${role}"]`)).toBeHidden();
  await contexte.close();
});
