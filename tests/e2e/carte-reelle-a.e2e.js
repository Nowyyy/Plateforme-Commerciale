import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, reponseGeocodage, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const boite = async (page, selecteur) => {
  const b = await page.locator(selecteur).first().boundingBox();
  expect(b, selecteur).not.toBeNull();
  return b;
};
const etat = (page) => page.locator('#carte-reelle-etat');
const reessayer = (page) => page.getByRole('button', { name: 'Réessayer' });
const SANS_RESSOURCE = (m) => !m.includes('Failed to load resource');
const carteAffichee = async (page) => {
  await expect(page.locator('#carte-reelle')).toBeVisible();
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
};

test('sans adresse : message dans le cadre, aucune requête tierce, aucun chargement de Leaflet', async ({ page }) => {
  const journal = await simuler(page);
  const locales = [];
  page.on('request', (r) => { if (r.url().includes('/assets/vendor/leaflet/')) locales.push(r.url()); });
  await ouvrirDiagnostic(page, 1440, {});
  await expect(etat(page)).toHaveText('Saisissez une adresse pour afficher la carte.');
  await expect(page.locator('#carte-reelle')).toBeHidden();
  await expect(reessayer(page)).toBeHidden();
  await page.waitForTimeout(600);
  expect(journal.externes).toEqual([]);
  expect(locales).toEqual([]);
});

test('adresse valide : géocodage avec l\'adresse, puis Leaflet local, tuiles OpenStreetMap, carte et repère sans aucune action', async ({ page }) => {
  const journal = await simuler(page);
  const console_ = surveillerConsole(page);
  const locales = [];
  page.on('request', (r) => { if (r.url().includes('/assets/vendor/leaflet/')) locales.push(new URL(r.url()).pathname); });
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(etat(page)).toBeHidden();
  await expect.poll(() => journal.osm.length).toBeGreaterThan(0);
  expect(journal.geocodage).toHaveLength(1);
  expect(new URL(journal.geocodage[0].url).searchParams.get('q')).toBe(ADRESSE);
  expect(locales).toEqual(expect.arrayContaining(['/assets/vendor/leaflet/leaflet.js', '/assets/vendor/leaflet/leaflet.css']));
  expect(journal.externes.filter((r) => !r.url.startsWith('https://data.geopf.fr/geocodage/') && decodeURIComponent(r.url).includes('Tilleuls'))).toEqual([]);
  expect(page.url()).not.toContain('Tilleuls');
  expect(console_).toEqual([]);
});

test('mise en page à 1440 px : cadre 800 × 460 au moins, exposition à droite sur la hauteur de la carte et de la légende, équipements dessous', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  const m = await page.evaluate(() => {
    const lire = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return { cadre: lire('.carte-cadre'), carte: lire('[data-role="carte"]'), legende: lire('[data-role="legende"]'), expo: lire('[data-role="exposition"]'), equip: lire('[data-role="equipements"]') };
  });
  console.log(`1440 px : cadre ${m.cadre.width.toFixed(0)} × ${m.cadre.height.toFixed(0)}, exposition ${m.expo.width.toFixed(0)} px à ${m.expo.x.toFixed(0)}`);
  expect(m.cadre.width).toBeGreaterThanOrEqual(800);
  expect(m.cadre.height).toBeGreaterThanOrEqual(460);
  expect(m.expo.x).toBeGreaterThanOrEqual(m.cadre.x + m.cadre.width);
  expect(Math.abs(m.expo.y - m.carte.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(m.expo.y + m.expo.height - (m.legende.y + m.legende.height))).toBeLessThanOrEqual(8);
  expect(m.equip.y).toBeGreaterThanOrEqual(Math.max(m.expo.y + m.expo.height, m.legende.y + m.legende.height) - 1);
});

test('mise en page à 375 px : cadre 340 × 350 au moins, ordre adresse, carte, légende, exposition, équipements ; aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 375);
  await carteAffichee(page);
  const cadre = await boite(page, '.carte-cadre');
  console.log(`375 px : cadre ${cadre.width.toFixed(0)} × ${cadre.height.toFixed(0)}`);
  expect(cadre.width).toBeGreaterThanOrEqual(340);
  expect(cadre.height).toBeGreaterThanOrEqual(350);
  const hauts = [];
  for (const role of ['adresse', 'carte', 'legende', 'exposition', 'equipements']) hauts.push((await boite(page, `[data-role="${role}"]`)).y);
  for (let i = 1; i < hauts.length; i += 1) expect(hauts[i]).toBeGreaterThan(hauts[i - 1]);
  for (const largeur of [375, 768, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${largeur} px`).toBe(true);
  }
});

test('aucun décalage : le cadre garde ses dimensions entre « chargement » et la carte affichée', async ({ page }) => {
  await simuler(page);
  let liberer = () => {};
  let attente = Promise.resolve();
  await page.route('https://data.geopf.fr/geocodage/**', async (route) => {
    await attente;
    await route.fulfill({ status: 200, contentType: 'application/json', body: reponseGeocodage() });
  });
  for (const largeur of [375, 1440]) {
    attente = new Promise((resolve) => { liberer = resolve; });
    await ouvrirDiagnostic(page, largeur);
    await expect(etat(page)).toHaveText('Chargement de la carte…');
    const avant = await boite(page, '.carte-cadre');
    const expoAvant = await boite(page, '[data-role="exposition"]');
    liberer();
    await carteAffichee(page);
    const apres = await boite(page, '.carte-cadre');
    const expoApres = await boite(page, '[data-role="exposition"]');
    console.log(`${largeur} px : cadre ${avant.width} × ${avant.height} puis ${apres.width} × ${apres.height}`);
    expect(apres).toEqual(avant);
    expect(expoApres.y).toBe(expoAvant.y);
  }
});

const ECHECS = [
  ['géocodage en erreur 504', { geocodage: { status: 504, corps: '' } }, /n'a pas pu être affichée/],
  ['aucun résultat', { geocodage: { corps: JSON.stringify({ features: [] }) } }, /n'a pas pu être affichée/],
  ['score insuffisant (0,3)', { geocodage: { corps: reponseGeocodage(4.8, 45.7, 0.3) } }, /n'a pas pu être affichée/],
  ['adresse hors de France (La Réunion)', { geocodage: { corps: reponseGeocodage(55.45, -20.88, 0.95) } }, /que pour la France métropolitaine/],
];

for (const [nom, options, message] of ECHECS) {
  test(`échec : ${nom} → message adapté, « Réessayer » relance le géocodage, console propre`, async ({ page }) => {
    const journal = await simuler(page, options);
    const console_ = surveillerConsole(page);
    await ouvrirDiagnostic(page, 375);
    await expect(etat(page)).toContainText(message);
    await expect(etat(page)).toHaveAttribute('role', 'status');
    await expect(page.locator('#carte-reelle')).toBeHidden();
    await expect(reessayer(page)).toBeVisible();
    expect(journal.geocodage).toHaveLength(1);
    await page.unroute('https://data.geopf.fr/geocodage/**');
    await page.route('https://data.geopf.fr/geocodage/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: reponseGeocodage() }));
    await reessayer(page).click();
    await carteAffichee(page);
    expect(journal.geocodage).toHaveLength(2);
    expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
  });
}

test('échec : délai de 10 s dépassé (horloge simulée) → message et « Réessayer »', async ({ page }) => {
  await simuler(page, { geocodage: { attente: true } });
  const console_ = surveillerConsole(page);
  await page.clock.install();
  await ouvrirDiagnostic(page, 375);
  await expect(etat(page)).toHaveText('Chargement de la carte…');
  await page.clock.fastForward(10_500);
  await expect(etat(page)).toContainText("n'a pas pu être affichée");
  await expect(reessayer(page)).toBeVisible();
  expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
});

test('échec : leaflet.js impossible à charger → message, « Réessayer » charge la carte', async ({ page }) => {
  const journal = await simuler(page);
  const console_ = surveillerConsole(page);
  let echecs = 1;
  await page.route('**/assets/vendor/leaflet/leaflet.js', (route) => (echecs-- > 0 ? route.abort() : route.continue()));
  await ouvrirDiagnostic(page, 375);
  await expect(etat(page)).toContainText("n'a pas pu être affichée");
  await expect(reessayer(page)).toBeVisible();
  expect(journal.osm).toHaveLength(0);
  await reessayer(page).click();
  await carteAffichee(page);
  expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
});

test('« Mettre à jour » avec une autre adresse : carte recréée, un seul conteneur Leaflet, nouvelle adresse géocodée', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await page.locator('#adresse-evaluee').fill('8 avenue des Lilas, 31000 Toulouse');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  // vérification de l'adresse saisie (limit=1), puis géocodage de la carte avec le libellé accepté
  await expect.poll(() => journal.geocodage.length).toBeGreaterThanOrEqual(3);
  expect(new URL(journal.geocodage[1].url).searchParams.get('q')).toBe('8 avenue des Lilas, 31000 Toulouse');
  await carteAffichee(page);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
});

test('information visible sous le champ d\'adresse ; aucun stockage ni cookie écrit ; axe à 375, 768 et 1440 px', async ({ page, context }) => {
  await simuler(page);
  const console_ = surveillerConsole(page);
  for (const largeur of [375, 768, 1440]) {
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    const info = page.locator('#adresse-information');
    await expect(info).toBeVisible();
    await expect(info).toContainText('IGN');
    await expect(info).toContainText('Géorisques');
    await expect(info).toContainText('OpenStreetMap');
    await expect(info).toContainText('adresse IP');
    await expect(info).toContainText("Ce site n'enregistre rien.");
    const champ = await boite(page, '#adresse-evaluee');
    const texte = await boite(page, '#adresse-information');
    expect(texte.y).toBeGreaterThan(champ.y + champ.height);
    await page.waitForTimeout(400);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`), `${largeur} px`).toEqual([]);
  }
  expect(await page.evaluate(() => Object.keys(sessionStorage).sort())).toEqual(['adresse']);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
  expect(console_).toEqual([]);
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
