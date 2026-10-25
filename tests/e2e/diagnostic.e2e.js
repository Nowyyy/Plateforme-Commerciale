import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { reponseCompletion, simuler } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

async function ouvrir(page, largeur, session = {}) {
  if (!page.__simule) page.__simule = await simuler(page); // services tiers simulés, jamais de requête réelle
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of [375, 768, 1440]) {
  test(`diagnostic.html à ${largeur} px : console propre, sans débordement, axe, aucune requête hors des trois hôtes`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur, { adresse: ADRESSE });
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    console.log(`${largeur} px : largeur de défilement ${defilement} px pour une fenêtre de ${fenetre} px`);
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:') && !/^https:\/\/(data\.geopf\.fr|www\.georisques\.gouv\.fr|tile\.openstreetmap\.org)\//.test(u))).toEqual([]);
    await page.screenshot({ path: `test-results/diagnostic-A-${largeur}.png`, fullPage: true });
  });
}

test('adresse de session : préremplie dans le champ', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE });
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
});

test('adresse hostile affichée comme texte, sans exécution', async ({ page }) => {
  const dialogues = [];
  page.on('dialog', async (d) => { dialogues.push(d.message()); await d.dismiss(); });
  const hostile = '<script>alert(1)</script>';
  await ouvrir(page, 375, { adresse: hostile });
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue(hostile);
  expect(await page.locator('main script').count()).toBe(0);
  expect(dialogues).toEqual([]);
});

test('sans adresse : champ vide et message d\'aide', async ({ page }) => {
  await ouvrir(page, 375);
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue('');
  await expect(page.locator('#adresse-aide')).toContainText('Aucune adresse enregistrée');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('« Mettre à jour » : inactif au chargement et pour un texte non choisi, aucune erreur, phrase d\'aide annoncée, focus dans le champ', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE });
  const champ = page.getByLabel('Adresse évaluée');
  const bouton = page.getByRole('button', { name: 'Mettre à jour' });
  await expect(champ).toHaveValue(ADRESSE);
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await expect(bouton).toHaveAttribute('aria-describedby', 'adresse-aide-validation');
  await expect(page.locator('#adresse-aide-validation')).toHaveText('Choisissez une adresse dans la liste pour continuer.');
  await champ.fill('1234567');
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await bouton.click({ force: true });
  await expect(page.locator('#adresse-statut')).toHaveText('Choisissez une adresse dans la liste pour continuer.');
  await expect(champ).toBeFocused();
  await expect(page.locator('#adresse-erreur')).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(ADRESSE);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('« Mettre à jour » : adresse choisie dans la liste, sessionStorage mis à jour, aucune navigation, URL sans adresse', async ({ page }) => {
  await ouvrir(page, 1440, { adresse: ADRESSE });
  const officiel = '5 Allée des Peupliers 44000 Nantes';
  await page.route('https://data.geopf.fr/geocodage/completion/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: reponseCompletion([[officiel, -1.5534, 47.2184]]) }));
  let navigations = 0;
  page.on('framenavigated', () => { navigations += 1; });
  const urlAvant = page.url();
  const champ = page.getByLabel('Adresse évaluée');
  const bouton = page.getByRole('button', { name: 'Mettre à jour' });
  await choisirAdresse(page, champ, '5 allée des Peupliers');
  await expect(bouton).toHaveAttribute('aria-disabled', 'false');
  await bouton.click();
  await expect(page.locator('#adresse-erreur')).toBeHidden();
  await expect(champ).toHaveValue(officiel);
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(officiel);
  await expect(bouton).toHaveAttribute('aria-disabled', 'true'); // identique à l'adresse affichée
  expect(navigations).toBe(0);
  expect(page.url()).toBe(urlAvant);
  expect(decodeURIComponent(page.url())).not.toContain('Peupliers');
});

test('pastilles d\'aléa : seulement les aléas recensés (« Tous », Inondations, Feux de forêt), dans un fieldset, « Tous » par défaut, flèches', async ({ page }) => {
  await ouvrir(page, 1440, { adresse: ADRESSE });
  const groupe = page.getByRole('group', { name: 'Aléa', exact: true });
  await expect(groupe).toBeVisible();
  expect(await groupe.evaluate((el) => el.tagName)).toBe('FIELDSET');
  const radios = groupe.getByRole('radio');
  await expect(radios).toHaveCount(3);
  await expect(groupe.getByRole('radio', { name: 'Tous' })).toBeChecked();
  await groupe.getByRole('radio', { name: 'Tous' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(groupe.getByRole('radio', { name: 'Inondations' })).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(groupe.getByRole('radio', { name: 'Feux de forêt' })).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await expect(groupe.getByRole('radio', { name: 'Inondations' })).toBeChecked();
  await expect(groupe.getByRole('radio', { name: /Grêle|Canicule/ })).toHaveCount(0);
  expect(page.url()).not.toContain('?');
});

test('aléa de session : pastille préchargée, clé supprimée après lecture', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE, alea: 'feux-de-foret' });
  await expect(page.getByRole('radio', { name: 'Feux de forêt' })).toBeChecked();
  expect(await page.evaluate(() => sessionStorage.getItem('alea'))).toBeNull();
  expect(page.url()).not.toContain('feux');
});

test('aléa de session inconnu : « Tous »', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE, alea: 'tremblement' });
  await expect(page.getByRole('radio', { name: 'Tous' })).toBeChecked();
  expect(await page.evaluate(() => sessionStorage.getItem('alea'))).toBeNull();
});
