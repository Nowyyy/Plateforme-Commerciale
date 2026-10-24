import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const produit = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const LARGEURS = [375, 768, 1440];
const RADIOS = '.pastille-alea input';
const CASES = '.carte-produit input';
const ETAT = '#comparateur-etat';

async function ouvrir(page, largeur, session = null, indisponible = false) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript(([valeur, sansStockage]) => {
    if (sansStockage) {
      Storage.prototype.getItem = () => { throw new Error('indisponible'); };
      Storage.prototype.setItem = () => { throw new Error('indisponible'); };
    } else if (valeur !== null && sessionStorage.getItem('comparaison') === null) sessionStorage.setItem('comparaison', valeur);
  }, [session, indisponible]);
  await page.goto('/comparateur.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const cochees = (page) => page.locator(CASES).evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value));
const sessionLue = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('comparaison')));

for (const largeur of LARGEURS) {
  test(`comparateur à ${largeur} px : console propre, sans débordement, axe sans violation, aucune requête externe`, async ({ page }, info) => {
    const erreurs = [];
    const externes = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && !['data:', 'blob:'].includes(url.protocol)) externes.push(r.url());
    });
    await ouvrir(page, largeur);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
    await page.screenshot({ path: `test-results/comparateur-a-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `comparateur-a-${largeur}.png` });
  });
}

test('sans session : aléa de niveau maximal, deux produits cochés, indicateurs et textes de niveau, session en identifiants seulement', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(page.locator(RADIOS)).toHaveCount(4);
  await expect(page.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'inondations');
  expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
  await expect(page.locator(CASES)).toHaveCount(3);
  for (const alea of produit.comparateur.aleas) {
    const pastille = page.locator('.pastille-alea', { has: page.locator(`input[value="${alea.id}"]`) });
    await expect(pastille.locator('.pastille-alea__niveau')).toHaveText(`Exposition : ${produit.comparateur.niveaux[alea.niveau - 1]} (exemple)`);
    await expect(pastille.locator('.jauge')).toHaveAttribute('aria-hidden', 'true');
    await expect(pastille.locator('.jauge__segment')).toHaveCount(4);
    await expect(pastille.locator('.jauge__segment.est-plein')).toHaveCount(alea.niveau);
    await expect(pastille.locator('.pastille-alea__niveau')).toBeVisible();
  }
  expect(await sessionLue(page)).toEqual({ v: 1, alea: 'inondations', produits: ['batardeau-modulable', 'clapet-anti-retour'] });
  expect(await page.evaluate(() => location.search + location.hash)).toBe('');
  await expect(page.locator('input[name]:not([name="alea-comparateur"])')).toHaveCount(0);
});

test('flèches dans le groupe d\'aléas : la sélection est remplacée ; aléa à deux produits : les deux cochés et texte d\'aide visible', async ({ page }) => {
  await ouvrir(page, 1440);
  await page.locator(`${RADIOS}:checked`).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'grele-vents');
  expect(await cochees(page)).toEqual(['bouclier-de-baie', 'volet-extrude']);
  await expect(page.locator('#comparateur-aide-alea')).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'feux-de-foret');
  await expect(page.locator(CASES)).toHaveCount(2);
  expect(await cochees(page)).toEqual(['sprinkler-de-toiture', 'grille-pare-braises']);
  await expect(page.locator('#comparateur-aide-alea')).toBeVisible();
  await expect(page.locator('#comparateur-aide-alea')).toHaveText(produit.comparateur.aleaDeuxProduits);
  expect(await sessionLue(page)).toEqual({ v: 1, alea: 'feux-de-foret', produits: ['sprinkler-de-toiture', 'grille-pare-braises'] });
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#comparateur-aide-alea')).toBeHidden();
});

test('3e produit ajouté avec annonce ; 4e refusé avec message et focus conservé ; décochage sous 2 refusé', async ({ page }) => {
  const quatre = structuredClone(produit);
  quatre.produits.push({ ...quatre.produits.find((p) => p.id === 'pompe-de-relevage'), id: 'produit-extra', titre: 'Quatrième produit', reference: 'EXT-001', performances: { principale: 75, montage: 30, poids: 8 } });
  await page.route('**/data/produit.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(quatre) }));
  await ouvrir(page, 375);
  await expect(page.locator(CASES)).toHaveCount(4);
  const case3 = page.locator('.carte-produit input[value="pompe-de-relevage"]');
  await case3.check();
  await expect(page.locator(ETAT)).toHaveText('3 produits comparés.');
  expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']);
  expect((await sessionLue(page)).produits).toHaveLength(3);

  const case4 = page.locator('.carte-produit input[value="produit-extra"]');
  await case4.focus();
  await page.keyboard.press('Space');
  await expect(page.locator(ETAT)).toHaveText(produit.comparateur.messages.max);
  await expect(case4).not.toBeChecked();
  await expect(case4).toBeFocused();
  await expect(case4).toBeEnabled();
  expect(await cochees(page)).toHaveLength(3);
  expect((await sessionLue(page)).produits).toHaveLength(3);

  await page.locator('.carte-produit input[value="pompe-de-relevage"]').uncheck();
  await expect(page.locator(ETAT)).toHaveText('2 produits comparés.');
  const restante = page.locator('.carte-produit input[value="clapet-anti-retour"]');
  await restante.focus();
  await page.keyboard.press('Space');
  await expect(page.locator(ETAT)).toHaveText(produit.comparateur.messages.min);
  await expect(restante).toBeChecked();
  await expect(restante).toBeFocused();
  await expect(restante).toBeEnabled();
  expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
  await expect(page.locator('#comparateur-etat')).toHaveAttribute('role', 'status');
  await expect(page.locator('#comparateur-etat')).toHaveAttribute('aria-live', 'polite');
});

test('session valide : sélection restaurée après rechargement ; session invalide ou stockage indisponible : sélection par défaut sans erreur', async ({ page, browser }) => {
  const valide = JSON.stringify({ v: 1, alea: 'grele-vents', produits: ['filet-de-toiture', 'volet-extrude', 'bouclier-de-baie'] });
  await ouvrir(page, 1440, valide);
  await expect(page.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'grele-vents');
  expect(await cochees(page)).toEqual(['bouclier-de-baie', 'volet-extrude', 'filet-de-toiture']);
  await page.locator('.carte-produit input[value="bouclier-de-baie"]').uncheck();
  await page.reload();
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'grele-vents');
  expect(await cochees(page)).toEqual(['volet-extrude', 'filet-de-toiture']);

  for (const [session, indisponible] of [['{pas du json', false], [JSON.stringify({ v: 9, alea: 'canicule', produits: [] }), false], [null, true]]) {
    const contexte = await browser.newContext();
    const autre = await contexte.newPage();
    const erreurs = [];
    autre.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    autre.on('pageerror', (e) => erreurs.push(e.message));
    await ouvrir(autre, 1440, session, indisponible);
    await expect(autre.locator(`${RADIOS}:checked`)).toHaveAttribute('value', 'inondations');
    expect(await cochees(autre)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
    expect(erreurs).toEqual([]);
    await contexte.close();
  }
});

test('pied : « Comparer des solutions » existe (menu déplié si nécessaire) et mène à comparateur.html', async ({ page }) => {
  for (const largeur of [375, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    const lien = page.locator('footer').getByRole('link', { name: 'Comparer des solutions', exact: true });
    await expect(lien).toHaveCount(1);
    await expect(lien).toHaveAttribute('href', 'comparateur.html');
    await lien.click();
    await expect(page).toHaveURL(/\/comparateur\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Comparer des solutions' })).toBeVisible();
    await expect(page.locator('.fil__courant')).toHaveAttribute('aria-current', 'page');
  }
});
