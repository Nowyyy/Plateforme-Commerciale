import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';

const donnees = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const batardeau = donnees.produits.find((p) => p.id === 'batardeau-modulable');
const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const diy = (page) => page.getByRole('radio', { name: /Matériel seul \(DIY\)/ });
const pose = (page) => page.getByRole('radio', { name: /Matériel \+ pose par un artisan partenaire/ });
const recap = (page) => page.locator('#mode-prix');

test('mode : DIY par défaut, total égal au prix ; la pose ajoute estimation, garantie et ligne ; retour au DIY', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(diy(page)).toBeChecked();
  await expect(recap(page).locator('dt')).toHaveText(['Matériel', 'Total estimé TTC']);
  await expect(recap(page).locator('dd')).toHaveText([formaterPrix(batardeau.prix), formaterPrix(batardeau.prix)]);
  await expect(page.locator('[data-role="mode"]')).toContainText('Estimation indicative, aucun achat n\'est possible dans ce démonstrateur.');
  await expect(page.locator('#mode-detail')).not.toContainText('Garantie décennale');

  await pose(page).check({ force: true });
  const detail = page.locator('#mode-detail');
  await expect(detail).toContainText(`Estimation du coût de pose : ${formaterPrix(batardeau.pose)} TTC (exemple)`);
  await expect(detail).toContainText('Garantie décennale incluse (exemple)');
  await expect(detail).toContainText(`Délai d'intervention : ${batardeau.delaiPose}`);
  await expect(recap(page).locator('dt')).toHaveText(['Matériel', 'Pose estimée', 'Total estimé TTC']);
  await expect(recap(page).locator('dd')).toHaveText([formaterPrix(batardeau.prix), formaterPrix(batardeau.pose), formaterPrix(batardeau.prix + batardeau.pose)]);

  await diy(page).check({ force: true });
  await expect(recap(page).locator('dt')).toHaveCount(2);
  await expect(detail).not.toContainText('Garantie décennale');
});

test('mode en session : écrit à chaque changement, restauré au rechargement ; valeur inconnue = DIY', async ({ page, browser }) => {
  await ouvrir(page, 375);
  expect(await page.evaluate(() => sessionStorage.getItem('mode'))).toBeNull();
  await pose(page).check({ force: true });
  expect(await page.evaluate(() => sessionStorage.getItem('mode'))).toBe('pose');
  await page.reload();
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(pose(page)).toBeChecked();
  await expect(recap(page).locator('dd').last()).toHaveText(formaterPrix(batardeau.prix + batardeau.pose));
  await diy(page).check({ force: true });
  expect(await page.evaluate(() => sessionStorage.getItem('mode'))).toBe('diy');
  const contexte = await browser.newContext({ baseURL: 'http://localhost:4173/' });
  const autre = await contexte.newPage();
  await ouvrir(autre, 375, { mode: 'inconnu' });
  await expect(diy(autre)).toBeChecked();
  await expect(recap(autre).locator('dt')).toHaveCount(2);
  await contexte.close();
});

test('bascule au clavier : flèches ; la région aria-live annonce le mode et le total', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(page.locator('#mode-detail')).toHaveAttribute('aria-live', 'polite');
  await diy(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(pose(page)).toBeChecked();
  const attendu = `${donnees.modes.pose.titre} choisi. Total estimé : ${formaterPrix(batardeau.prix + batardeau.pose)}.`;
  await expect(page.locator('#mode-detail')).toContainText(attendu);
  await page.keyboard.press('ArrowLeft');
  await expect(diy(page)).toBeChecked();
  await expect(page.locator('#mode-detail')).toContainText(`${donnees.modes.diy.titre} choisi. Total estimé : ${formaterPrix(batardeau.prix)}.`);
});

test('mise en page : colonnes 60/40 à 1440 px, blocs empilés à 375 px, aucun débordement', async ({ page }) => {
  const boite = async (role) => {
    const b = await page.locator(`[data-role="${role}"]`).boundingBox();
    expect(b, role).not.toBeNull();
    return b;
  };
  const debordement = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await ouvrir(page, 1440);
  const [galerie, achat, mode] = [await boite('galerie'), await boite('achat'), await boite('mode')];
  console.log(`1440 px : galerie ${galerie.width} x ${galerie.height} à (${galerie.x}, ${galerie.y}) ; achat ${achat.width} à (${achat.x}, ${achat.y}) ; mode ${mode.width} à (${mode.x}, ${mode.y})`);
  expect(galerie.width / achat.width).toBeGreaterThanOrEqual(1.3);
  expect(galerie.width / achat.width).toBeLessThanOrEqual(1.7);
  expect(Math.abs(galerie.y - achat.y)).toBeLessThanOrEqual(2);
  expect(mode.y).toBeGreaterThanOrEqual(achat.y + achat.height - 1);
  expect(Math.abs(mode.width - achat.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(mode.x - achat.x)).toBeLessThanOrEqual(1);
  expect(await debordement()).toBe(true);
  await ouvrir(page, 375);
  const [g, a, m] = [await boite('galerie'), await boite('achat'), await boite('mode')];
  expect(g.y).toBeLessThan(a.y);
  expect(a.y).toBeLessThan(m.y);
  expect(await debordement()).toBe(true);
  for (const largeur of [768, 1440]) {
    await ouvrir(page, largeur);
    expect(await debordement(), `${largeur} px`).toBe(true);
  }
  // côte à côte dès 768 px, empilés en dessous
  await ouvrir(page, 768);
  const options = page.locator('.mode__option');
  const [o1, o2] = [await options.nth(0).boundingBox(), await options.nth(1).boundingBox()];
  expect(Math.abs(o1.y - o2.y)).toBeLessThanOrEqual(1);
  await ouvrir(page, 375);
  const [p1, p2] = [await options.nth(0).boundingBox(), await options.nth(1).boundingBox()];
  expect(p2.y).toBeGreaterThan(p1.y + p1.height - 1);
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : accueil, diagnostic, fiche, pose, fil d'Ariane vers le diagnostic`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    const carte = page.locator('#liste-equipements > li').first();
    const titre = await carte.getByRole('heading', { level: 3 }).textContent();
    const produit = donnees.produits.find((p) => p.titre === titre);
    await carte.getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
    await pose(page).check({ force: true });
    await expect(recap(page).locator('dd').last()).toHaveText(formaterPrix(produit.prix + produit.pose));
    expect(new URL(page.url()).search).toBe('');
    await page.getByRole('navigation', { name: 'Fil d\'Ariane' }).getByRole('link', { name: 'Diagnostic' }).click();
    await page.waitForURL('**/diagnostic.html');
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
  });
}

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ baseURL: 'http://localhost:4173/', javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/produit.html');
  const texte = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  expect(texte).toBe('Ce démonstrateur nécessite JavaScript');
  for (const cache of ['.fil__liste', '.produit']) expect(await page.locator(cache).first().evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  for (const mode of ['diy', 'pose']) {
    test(`page entière à ${largeur} px, mode ${mode} : console propre, axe, aucune requête externe`, async ({ page }) => {
      const messages = [];
      const requetes = [];
      page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
      page.on('pageerror', (e) => messages.push(e.message));
      page.on('request', (r) => requetes.push(r.url()));
      await ouvrir(page, largeur, { mode });
      expect(messages).toEqual([]);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
      await page.screenshot({ path: `test-results/produit-C-${largeur}-${mode}.png`, fullPage: true });
    });
  }
}
