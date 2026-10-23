import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const AMBRE = 'rgb(217, 119, 6)';
const MARINE = 'rgb(15, 29, 56)';

// Mouvement réduit : accueil.css active le défilement doux, et un clic forcé qui suit le défilement automatique de Playwright
// vise parfois une position périmée (échec intermittent sous charge) ; le comportement testé n'en dépend pas.
async function ouvrir(page, largeur, session = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
const panier = async (page) => JSON.parse(await page.evaluate(() => sessionStorage.getItem('panier')));

test('bouton inactif au chargement : neutre, focalisable, sans navigation ; le clic annonce l\'indisponibilité et place le focus', async ({ page }) => {
  await ouvrir(page, 375);
  const b = bouton(page);
  await expect(b).toHaveAttribute('aria-disabled', 'true');
  await expect(b).not.toHaveAttribute('disabled', /.*/);
  const fond = await b.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fond).not.toBe(AMBRE);
  await page.locator('#cote-tolerance').focus();
  // la tolérance est le dernier champ : « − », « + » (quantité, lot 8a) puis le bouton suivent dans l'ordre du clavier
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('Tab');
  await expect(b).toBeFocused();
  const url = page.url();
  await b.click({ force: true });
  expect(page.url()).toBe(url);
  await expect(page.locator('#cotes-faisabilite')).toContainText('Corrigez vos cotes pour continuer.');
  await expect(page.locator('#cote-largeur')).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();
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

test('bouton actif (cotes compatibles) : ambre, texte marine ; le clic écrit le panier, la fiche reste affichée, « Voir le panier » mène au panier', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '1 200', '400', '10');
  const b = bouton(page);
  await expect(b).toHaveAttribute('aria-disabled', 'false');
  const styles = await b.evaluate((el) => ({ fond: getComputedStyle(el).backgroundColor, texte: getComputedStyle(el).color }));
  expect(styles).toEqual({ fond: AMBRE, texte: MARINE });
  await page.screenshot({ path: 'test-results/cotes-C-actif-1440.png' });
  const url = page.url();
  await b.click({ force: true });
  await expect(page.locator('#cotes-action .ajout__confirmation')).toContainText('Ajouté au panier : Batardeau modulable × 1.');
  expect(page.url()).toBe(url);
  expect(await panier(page)).toEqual({
    v: 2, lignes: [{ produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 10 }, quantite: 1 }],
  });
  await page.getByRole('link', { name: 'Voir le panier' }).click();
  await page.waitForURL((u) => u.pathname === '/panier.html');
  expect(new URL(page.url()).search).toBe('');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('mode pose : ligne de pose, puis retour au mode DIY : ligne distincte sans pose', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '1200', '400');
  await page.getByRole('radio', { name: /Matériel \+ pose/ }).check({ force: true });
  await bouton(page).click();
  const pose = await panier(page);
  expect(pose.lignes).toEqual([{ produit: 'batardeau-modulable', mode: 'pose', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, quantite: 1 }]);
  expect(JSON.stringify(pose)).not.toMatch(/prix|total|materiel/);
  await page.getByRole('radio', { name: /Matériel seul/ }).check({ force: true });
  await bouton(page).click();
  const deux = await panier(page);
  expect(deux.lignes.map((l) => l.mode)).toEqual(['pose', 'diy']);
});

test('stockage indisponible : message dédié, sans erreur de console', async ({ page }) => {
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
  await expect(page.locator('#cotes-action .ajout__confirmation')).toContainText("Impossible d'enregistrer le panier dans ce navigateur.");
  expect(messages).toEqual([]);
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqué à ${largeur} px : accueil, adresse, « Inondations et crues », diagnostic, fiche, cotes, pose, panier`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    await page.getByRole('link', { name: 'Voir le panier' }).click();
    await page.waitForURL((u) => u.pathname === '/panier.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await panier(page)).lignes[0].mode).toBe('pose');
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
