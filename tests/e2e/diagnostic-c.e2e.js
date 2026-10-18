import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const site = JSON.parse(readFileSync('data/site.json', 'utf8'));

async function ouvrir(page, largeur, session = { adresse: ADRESSE }) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};
const groupe = (page, id) => page.locator(`.schema [data-calque="${id}"]`);

test('carte : rapport 4:3 à 375 et 1440 px ; à 1440 px, même largeur que le score', async ({ page }) => {
  for (const largeur of [375, 1440]) {
    await ouvrir(page, largeur);
    const svg = await page.locator('.schema').boundingBox();
    console.log(`${largeur} px : carte ${svg.width} × ${svg.height} px, rapport ${(svg.width / svg.height).toFixed(4)}`);
    expect(Math.abs(svg.width / svg.height - 4 / 3) / (4 / 3)).toBeLessThanOrEqual(0.02);
  }
  const [carte, score] = [await boite(page, 'carte'), await boite(page, 'score')];
  console.log(`1440 px : carte ${carte.width} px, score ${score.width} px`);
  expect(Math.abs(carte.width - score.width)).toBeLessThanOrEqual(1);
});

test('calques : cases à cocher, état initial selon le filtre, réinitialisation au changement de filtre', async ({ page }) => {
  await ouvrir(page, 1440);
  const calques = page.getByRole('group', { name: 'Calques' });
  await expect(calques.getByRole('checkbox')).toHaveCount(4);
  for (const id of ['inondation', 'argile', 'feu', 'chaleur']) await expect(groupe(page, id)).toBeVisible();
  const inondable = calques.getByRole('checkbox', { name: 'Zone inondable' });
  await expect(inondable).toBeChecked();
  await inondable.uncheck();
  await expect(groupe(page, 'inondation')).toBeHidden();
  await expect(groupe(page, 'argile')).toBeVisible();
  await inondable.check();
  await expect(groupe(page, 'inondation')).toBeVisible();

  await page.getByRole('radio', { name: 'Feux de forêt' }).check({ force: true });
  await expect(calques.getByRole('checkbox', { checked: true })).toHaveCount(1);
  await expect(groupe(page, 'feu')).toBeVisible();
  for (const id of ['inondation', 'argile', 'chaleur']) await expect(groupe(page, id)).toBeHidden();
  await calques.getByRole('checkbox', { name: 'Chaleur extrême' }).check();
  await expect(groupe(page, 'chaleur')).toBeVisible();
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await expect(calques.getByRole('checkbox', { checked: true })).toHaveCount(4);
});

test('calques : « Inondations » au départ, un seul calque', async ({ page }) => {
  await ouvrir(page, 375, { adresse: ADRESSE, alea: 'inondations' });
  await expect(page.getByRole('group', { name: 'Calques' }).getByRole('checkbox', { checked: true })).toHaveCount(1);
  await expect(groupe(page, 'inondation')).toBeVisible();
  for (const id of ['argile', 'feu', 'chaleur']) await expect(groupe(page, id)).toBeHidden();
  expect(await page.locator('.schema [style]').count()).toBe(0);
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
  expect(requetes.filter((u) => u.includes('georisques'))).toEqual([]);
});

test('enchaînement : bas des colonnes à 1440 px, ordre vertical à 375 px', async ({ page }) => {
  await ouvrir(page, 1440);
  const [equip, carte] = [await boite(page, 'equipements'), await boite(page, 'carte')];
  const ecart = Math.abs(equip.y + equip.height - (carte.y + carte.height));
  console.log(`1440 px : bas equipements ${equip.y + equip.height} px, bas carte ${carte.y + carte.height} px, écart ${ecart} px ; largeurs ${equip.width} / ${carte.width}`);
  expect(ecart).toBeLessThanOrEqual(8);
  await ouvrir(page, 375);
  const ys = [];
  for (const role of ['adresse', 'equipements', 'score', 'carte']) ys.push((await boite(page, role)).y);
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  expect(new Set(ys).size).toBe(4);
});

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  expect((await page.locator('body').innerText()).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await expect(page.locator('.noscript')).toBeVisible();
  for (const selecteur of ['.carte-schema', '.score', '.diag__panneau']) {
    await expect(page.locator(selecteur).first()).toBeHidden();
  }
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : console propre, sans débordement, axe, aucune requête externe`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    for (const nom of ['Inondations', 'Feux de forêt', 'Tous']) await page.getByRole('radio', { name: nom }).check({ force: true });
    await page.getByRole('checkbox', { name: 'Chaleur extrême' }).uncheck();
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
    await page.getByRole('checkbox', { name: 'Chaleur extrême' }).check();
    await page.screenshot({ path: `test-results/diagnostic-C-${largeur}.png`, fullPage: true });
  });
}
