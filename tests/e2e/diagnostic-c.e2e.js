import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { simuler } from './carte-reelle-simulation.js';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const site = JSON.parse(readFileSync('data/site.json', 'utf8'));

async function ouvrir(page, largeur, session = { adresse: ADRESSE }) {
  if (!page.__simule) { page.__simule = await simuler(page); }
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
  if (session.adresse) await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
}

const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};
const calques = (page) => page.getByRole('group', { name: 'Aléas recensés à cette adresse' });

test('calques : trois cases (chaleur sans case), état initial selon le filtre, réinitialisation au changement de filtre', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(calques(page).getByRole('checkbox')).toHaveCount(3);
  await expect(calques(page).getByRole('checkbox', { name: 'Chaleur extrême' })).toHaveCount(0);
  const inondable = calques(page).getByRole('checkbox', { name: 'Zone inondable' });
  await expect(inondable).toBeChecked();
  await expect(calques(page).getByRole('checkbox', { checked: true })).toHaveCount(3);
  await inondable.uncheck();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(3);
  await inondable.check();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(4);
  await page.getByRole('radio', { name: 'Feux de forêt' }).check({ force: true });
  await expect(calques(page).getByRole('checkbox', { checked: true })).toHaveCount(1);
  await expect(calques(page).getByRole('checkbox', { name: 'Feux de forêt' })).toBeChecked();
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await expect(calques(page).getByRole('checkbox', { checked: true })).toHaveCount(3);
});

test('calques : « Inondations » au départ, un seul calque coché et une couche de calque', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE, alea: 'inondations' });
  await expect(calques(page).getByRole('checkbox', { checked: true })).toHaveCount(1);
  await expect(calques(page).getByRole('checkbox', { name: 'Zone inondable' })).toBeChecked();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
});

test('lien Géorisques : adresse déclarée, nouvel onglet, noopener noreferrer, texte masqué (non suivi)', async ({ page }) => {
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await ouvrir(page, 375);
  const lien = page.getByRole('link', { name: /Consulter la source officielle des risques \(Géorisques\)/ });
  await expect(lien).toBeVisible();
  await expect(lien).toHaveAttribute('href', site.liensExternes.georisques);
  await expect(lien).toHaveAttribute('target', '_blank');
  const rel = await lien.getAttribute('rel');
  expect(rel).toContain('noopener');
  expect(rel).toContain('noreferrer');
  await expect(lien).toContainText('(nouvel onglet)');
  await expect(page.getByText("Ce démonstrateur n'envoie pas votre adresse à ce site.")).toBeVisible();
  expect(await lien.getAttribute('href')).not.toContain('?');
  expect(requetes.filter((u) => u.includes('georisques') && !u.includes('/services?') && !u.includes('/api/v1/'))).toEqual([]);
});

test('enchaînement : carte, puis score et équipements en dessous à 1440 px ; ordre vertical à 375 px', async ({ page }) => {
  await ouvrir(page, 1440);
  const [carte, score, equip] = [await boite(page, 'carte'), await boite(page, 'score'), await boite(page, 'equipements')];
  expect(score.y).toBeGreaterThanOrEqual(carte.y + carte.height);
  expect(equip.y).toBeGreaterThanOrEqual(carte.y + carte.height);
  await ouvrir(page, 375);
  const ys = [];
  for (const role of ['adresse', 'carte', 'score', 'equipements']) ys.push((await boite(page, role)).y);
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  expect(new Set(ys).size).toBe(4);
});

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  expect((await page.locator('body').innerText()).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await expect(page.locator('.noscript')).toBeVisible();
  for (const selecteur of ['.carte-grille', '.score', '.diag__panneau']) {
    await expect(page.locator(selecteur).first()).toBeHidden();
  }
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : console propre, sans débordement, axe, aucune requête hors des trois hôtes`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    for (const nom of ['Inondations', 'Feux de forêt', 'Tous']) await page.getByRole('radio', { name: nom }).check({ force: true });
    await page.getByRole('checkbox', { name: 'Zone inondable' }).uncheck();
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:') && !/^https:\/\/(data\.geopf\.fr|www\.georisques\.gouv\.fr|tile\.openstreetmap\.org)\//.test(u))).toEqual([]);
    await page.getByRole('checkbox', { name: 'Zone inondable' }).check();
    await page.screenshot({ path: `test-results/diagnostic-C-${largeur}.png`, fullPage: true });
  });
}
