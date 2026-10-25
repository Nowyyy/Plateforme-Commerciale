import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, reponseGeocodage, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};
const ouvrir = (page) => page.locator('#carte-reelle-ouvrir');
const panneau = (page) => page.locator('#carte-reelle-consentement');
const etat = (page) => page.locator('#carte-reelle-etat');
const accepter = async (page) => {
  await ouvrir(page).click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
};
const SANS_RESSOURCE = (m) => !m.includes('Failed to load resource');

test('état initial à 375, 768 et 1440 px : console propre, aucun débordement, axe, aucune requête externe, mise en page du lot 4', async ({ page }) => {
  const journal = await simuler(page);
  const console_ = surveillerConsole(page);
  for (const largeur of [375, 768, 1440]) {
    await ouvrirDiagnostic(page, largeur);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${largeur} px`).toBe(true);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.map((v) => v.id), `${largeur} px`).toEqual([]);
  }
  const [carte, score, equip] = [await boite(page, 'carte'), await boite(page, 'score'), await boite(page, 'equipements')];
  const ecart = Math.abs(equip.y + equip.height - (carte.y + carte.height));
  console.log(`1440 px : carte ${carte.width} px, score ${score.width} px, équipements ${equip.width} px, écart des bas ${ecart} px`);
  expect(Math.abs(carte.width - score.width)).toBeLessThanOrEqual(1);
  expect(equip.width).toBeGreaterThanOrEqual(1.8 * score.width);
  expect(ecart).toBeLessThanOrEqual(8);
  expect(journal.externes).toEqual([]);
  expect(console_).toEqual([]);
});

test('sans adresse : bouton aria-disabled avec son aide, le clic place le focus sur le champ', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440, {});
  await expect(ouvrir(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(ouvrir(page)).not.toHaveAttribute('disabled', /.*/);
  await expect(page.locator('#carte-reelle-aide')).toHaveText("Saisissez d'abord une adresse.");
  await ouvrir(page).click({ force: true }); // aria-disabled : Playwright attend sinon un bouton actif
  await expect(page.locator('#adresse-evaluee')).toBeFocused();
  await expect(panneau(page)).toBeHidden();
  expect(journal.externes).toEqual([]);
});

test('avec adresse : le panneau s\'ouvre sans requête ; « Garder la carte schématique » le ferme et rend le focus', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 375);
  await expect(ouvrir(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(page.locator('#carte-reelle-aide')).toContainText('avec votre accord');
  await ouvrir(page).click();
  await expect(panneau(page)).toBeVisible();
  const region = page.getByRole('region', { name: 'Afficher la carte réelle ?' });
  await expect(region).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Afficher la carte réelle ?' })).toBeFocused();
  await expect(panneau(page)).toContainText('data.geopf.fr');
  expect(journal.externes).toEqual([]);
  await page.getByRole('button', { name: 'Garder la carte schématique' }).click();
  await expect(panneau(page)).toBeHidden();
  await expect(ouvrir(page)).toBeFocused();
  expect(journal.externes).toEqual([]);
});

test('accord : un géocodage avec l\'adresse, Leaflet de la même origine, tuiles OpenStreetMap, carte dans le cadre 4:3', async ({ page }) => {
  const journal = await simuler(page);
  const console_ = surveillerConsole(page);
  const locales = [];
  page.on('request', (r) => { if (r.url().includes('/assets/vendor/leaflet/')) locales.push(new URL(r.url()).pathname); });
  await ouvrirDiagnostic(page, 1440);
  const schema = await page.locator('.schema').boundingBox();
  await accepter(page);
  await expect(page.locator('#carte-reelle')).toBeVisible();
  await expect(page.locator('.schema')).toBeHidden();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  await expect.poll(() => journal.osm.length).toBeGreaterThan(0);
  expect(journal.geocodage).toHaveLength(1);
  expect(new URL(journal.geocodage[0].url).searchParams.get('q')).toBe(ADRESSE);
  expect(locales).toEqual(expect.arrayContaining(['/assets/vendor/leaflet/leaflet.js', '/assets/vendor/leaflet/leaflet.css']));
  const carte = await page.locator('#carte-reelle').boundingBox();
  console.log(`1440 px : schéma ${schema.width} × ${schema.height} px, carte réelle ${carte.width} × ${carte.height} px`);
  expect(Math.abs(carte.width - schema.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(carte.height - schema.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(carte.width / carte.height - 4 / 3) / (4 / 3)).toBeLessThanOrEqual(0.02);
  const hors = journal.externes.filter((r) => !r.url.startsWith('https://data.geopf.fr/geocodage/'));
  expect(hors.filter((r) => decodeURIComponent(r.url).includes('Tilleuls'))).toEqual([]);
  expect(page.url()).not.toContain('Tilleuls');
  expect(console_).toEqual([]);
});

const ECHECS = [
  ['géocodage en erreur 504', { geocodage: { status: 504, corps: '' } }, /n'a pas pu être affichée/],
  ['aucun résultat', { geocodage: { corps: JSON.stringify({ features: [] }) } }, /n'a pas pu être affichée/],
  ['score insuffisant (0,3)', { geocodage: { corps: reponseGeocodage(4.8, 45.7, 0.3) } }, /n'a pas pu être affichée/],
  ['adresse hors de France (La Réunion)', { geocodage: { corps: reponseGeocodage(55.45, -20.88, 0.95) } }, /que pour la France métropolitaine/],
];

for (const [nom, options, message] of ECHECS) {
  test(`échec : ${nom} → message, schéma conservé, focus rendu`, async ({ page }) => {
    await simuler(page, options);
    const console_ = surveillerConsole(page);
    await ouvrirDiagnostic(page, 375);
    await accepter(page);
    await expect(etat(page)).toContainText(message);
    await expect(page.locator('.schema')).toBeVisible();
    await expect(page.locator('#carte-reelle')).toBeHidden();
    await expect(panneau(page)).toBeHidden();
    await expect(ouvrir(page)).toBeFocused();
    await expect(ouvrir(page)).toHaveAttribute('aria-disabled', 'false');
    expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
  });
}

test('échec : délai de 10 s dépassé (horloge simulée) → message et schéma conservé', async ({ page }) => {
  await simuler(page, { geocodage: { attente: true } });
  const console_ = surveillerConsole(page);
  await page.clock.install();
  await ouvrirDiagnostic(page, 375);
  await accepter(page);
  await expect(etat(page)).toHaveText('Chargement de la carte réelle…');
  await page.clock.fastForward(10_500);
  await expect(etat(page)).toContainText("n'a pas pu être affichée");
  await expect(page.locator('.schema')).toBeVisible();
  await expect(ouvrir(page)).toBeFocused();
  expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
});

test('échec : leaflet.js impossible à charger → message, schéma conservé, nouvel essai possible', async ({ page }) => {
  const journal = await simuler(page);
  const console_ = surveillerConsole(page);
  let echecs = 1;
  await page.route('**/assets/vendor/leaflet/leaflet.js', (route) => (echecs-- > 0 ? route.abort() : route.continue()));
  await ouvrirDiagnostic(page, 375);
  await accepter(page);
  await expect(etat(page)).toContainText("n'a pas pu être affichée");
  await expect(page.locator('.schema')).toBeVisible();
  await expect(ouvrir(page)).toBeFocused();
  expect(journal.osm).toHaveLength(0);
  await accepter(page);
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
});

test('« Revenir à la carte schématique » et « Mettre à jour » : retour au schéma, carte Leaflet détruite', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await accepter(page);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(ouvrir(page)).toBeHidden();
  await page.getByRole('button', { name: 'Revenir à la carte schématique' }).click();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.locator('.schema')).toBeVisible();
  await expect(ouvrir(page)).toBeFocused();
  await accepter(page);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await page.locator('#adresse-evaluee').fill('8 avenue des Lilas, 31000 Toulouse');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.locator('.schema')).toBeVisible();
  await expect(ouvrir(page)).toBeVisible();
});

test('rien n\'est écrit : session inchangée, aucun cookie, aucune base IndexedDB ; un rechargement redemande l\'accord', async ({ page, context }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 375);
  const avant = await page.evaluate(() => Object.keys(sessionStorage).sort());
  await accepter(page);
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  await page.getByRole('button', { name: 'Revenir à la carte schématique' }).click();
  expect(await page.evaluate(() => Object.keys(sessionStorage).sort())).toEqual(avant);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
  const requetes = journal.geocodage.length;
  await page.reload();
  await page.waitForSelector('#carte-reelle-ouvrir[aria-disabled]');
  await expect(page.locator('.schema')).toBeVisible();
  await expect(page.locator('#carte-reelle')).toBeHidden();
  expect(journal.geocodage).toHaveLength(requetes);
  await ouvrir(page).click();
  await expect(panneau(page)).toBeVisible();
});

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  await expect(page.locator('.noscript')).toBeVisible();
  const visible = await page.evaluate(() => (document.body.innerText || '').trim());
  expect(visible).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});
