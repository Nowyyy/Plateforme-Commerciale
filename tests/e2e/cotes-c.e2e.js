import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const AMBRE = 'rgb(217, 119, 6)';
const MARINE = 'rgb(15, 29, 56)';

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  if (Object.keys(session).length > 0) {
    await page.addInitScript((valeurs) => {
      if (sessionStorage.getItem('__init')) return;
      for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
      sessionStorage.setItem('__init', '1');
    }, session);
  }
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const bouton = (page) => page.getByRole('button', { name: 'Ajouter au panier' });
const saisir = async (page, largeur, hauteur, tolerance = '') => {
  await page.locator('#cote-largeur').fill(largeur);
  await page.locator('#cote-hauteur').fill(hauteur);
  await page.locator('#cote-tolerance').fill(tolerance);
};
const commande = async (page) => JSON.parse(await page.evaluate(() => sessionStorage.getItem('commande')));

test('bouton inactif au chargement : neutre, focalisable, sans navigation ; le clic annonce l\'indisponibilité et place le focus', async ({ page }) => {
  await ouvrir(page, 375);
  const b = bouton(page);
  await expect(b).toHaveAttribute('aria-disabled', 'true');
  await expect(b).not.toHaveAttribute('disabled', /.*/);
  const fond = await b.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fond).not.toBe(AMBRE);
  await page.locator('#cote-tolerance').focus();
  await page.keyboard.press('Tab'); // la tolérance est le dernier champ : le bouton suit dans l'ordre du clavier
  await expect(b).toBeFocused();
  const url = page.url();
  await b.click({ force: true });
  expect(page.url()).toBe(url);
  await expect(page.locator('#cotes-faisabilite')).toContainText('Corrigez vos cotes pour continuer.');
  await expect(page.locator('#cote-largeur')).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem('commande'))).toBeNull();
  // premier champ à corriger : la hauteur invalide, puis la tolérance
  await saisir(page, '800', 'abc');
  await expect(page.locator('#faisabilite-indisponible')).toHaveText('');
  await b.click({ force: true });
  await expect(page.locator('#cote-hauteur')).toBeFocused();
  await saisir(page, '800', '400', '51');
  await b.click({ force: true });
  await expect(page.locator('#cote-tolerance')).toBeFocused();
  await saisir(page, '800', '700');
  await b.click({ force: true });
  await expect(page.locator('#cote-hauteur')).toBeFocused();
  expect(page.url()).toBe(url);
});

test('bouton actif (cotes compatibles) : ambre, texte marine ; le clic écrit la commande et mène au panier', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '1 200', '400', '10');
  const b = bouton(page);
  await expect(b).toHaveAttribute('aria-disabled', 'false');
  const styles = await b.evaluate((el) => ({ fond: getComputedStyle(el).backgroundColor, texte: getComputedStyle(el).color }));
  expect(styles).toEqual({ fond: AMBRE, texte: MARINE });
  await page.screenshot({ path: 'test-results/cotes-C-actif-1440.png' });
  await b.click({ force: true });
  await page.waitForURL('**/wireframes/panier.html');
  expect(new URL(page.url()).search).toBe('');
  expect(await commande(page)).toEqual({
    v: 1, produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 10 },
    prix: { materiel: 690, pose: null, total: 690 },
  });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('mode pose : commande avec pose et total ; retour au mode DIY : pose nulle', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '1200', '400');
  await page.getByRole('radio', { name: /Matériel \+ pose/ }).check({ force: true });
  await bouton(page).click();
  await page.waitForURL('**/wireframes/panier.html');
  const pose = await commande(page);
  expect(pose.mode).toBe('pose');
  expect(pose.prix).toEqual({ materiel: 690, pose: 280, total: 970 });
  expect(pose.prix.total).toBe(pose.prix.materiel + pose.prix.pose);
  await page.goBack();
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#cote-largeur')).toHaveValue('1200');
  await page.getByRole('radio', { name: /Matériel seul/ }).check({ force: true });
  await bouton(page).click();
  await page.waitForURL('**/wireframes/panier.html');
  const diy = await commande(page);
  expect(diy.mode).toBe('diy');
  expect(diy.prix).toEqual({ materiel: 690, pose: null, total: 690 });
});

test('stockage indisponible : la navigation a lieu quand même, sans erreur de console', async ({ page }) => {
  const messages = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
  page.on('pageerror', (e) => messages.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('quota dépassé', 'QuotaExceededError'); };
  });
  await ouvrir(page, 375);
  await saisir(page, '1200', '400');
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  await bouton(page).click();
  await page.waitForURL('**/wireframes/panier.html');
  expect(messages).toEqual([]);
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : accueil, adresse, « Inondations et crues », diagnostic, fiche, cotes, pose, panier`, async ({ page }) => {
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
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
    const carte = page.locator('#liste-equipements > li').filter({ has: page.getByRole('heading', { level: 3, name: 'Batardeau modulable' }) });
    await carte.getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    await page.waitForSelector('html[data-rendu="pret"]');
    await saisir(page, '1 200', '400');
    await page.getByRole('radio', { name: /Matériel \+ pose/ }).check({ force: true });
    await bouton(page).click();
    await page.waitForURL('**/wireframes/panier.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await commande(page)).mode).toBe('pose');
    expect(new URL(page.url()).search).toBe('');
  });
}

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/produit.html');
  expect((await page.locator('body').innerText()).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await expect(page.locator('.noscript')).toBeVisible();
  for (const selecteur of ['.configurateur', '.schema', '#cotes-ajouter']) await expect(page.locator(selecteur).first()).toBeHidden();
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px, états à saisir, compatible et hors tolérance : console propre, axe, aucune requête externe`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    const etats = [['saisir', ['', '', '']], ['compatible', ['1200', '400', '']], ['hors', ['699', '400', '']]];
    for (const [nom, valeurs] of etats) {
      await saisir(page, ...valeurs);
      await expect(page.locator('#cotes-faisabilite')).toHaveAttribute('data-etat', nom);
      expect(await bouton(page).getAttribute('aria-disabled')).toBe(nom === 'compatible' ? 'false' : 'true');
      const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
      expect(defilement).toBeLessThanOrEqual(fenetre);
      const violations = (await new AxeBuilder({ page }).analyze()).violations;
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`), `axe, état ${nom}`).toEqual([]);
      await page.screenshot({ path: `test-results/cotes-C-page-${nom}-${largeur}.png`, fullPage: true });
    }
    // bouton actif puis inactif : captures de la page entière
    await saisir(page, '1200', '400');
    await bouton(page).focus();
    await page.screenshot({ path: `test-results/cotes-C-page-actif-${largeur}.png`, fullPage: true });
    expect(messages).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
  });
}
