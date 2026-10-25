import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ouvrirDiagnostic, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const COUCHES = {
  inondation: 'ALEA_SYNT_01_04FAI_FXX,PPRN_COMMUNE_RISQINOND_PRESCRIT',
  argile: 'ALEARG',
  feu: 'PPRN_COMMUNE_FEU_APPROUV',
};
const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const etat = (page) => page.locator('#carte-reelle-etat');
const calque = (page, nom) => page.getByRole('group', { name: 'Calques' }).getByRole('checkbox', { name: nom });
const couchesLeaflet = (page) => page.locator('#carte-reelle .leaflet-layer');
const parametres = (url) => Object.fromEntries([...new URL(url).searchParams].map(([cle, valeur]) => [cle.toUpperCase(), valeur]));

async function afficherCarte(page, largeur = 1440) {
  await ouvrirDiagnostic(page, largeur);
  await page.locator('#carte-reelle-ouvrir').click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
}

test('requêtes WMS conformes : hôte avec www, WMS 1.3.0, EPSG:3857, transparent, couches de l\'état initial', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  await expect.poll(() => new Set(journal.wms.map((r) => parametres(r.url).LAYERS)).size).toBe(3);
  for (const requete of journal.wms) {
    const url = new URL(requete.url);
    const p = parametres(requete.url);
    expect(url.hostname).toBe('www.georisques.gouv.fr');
    expect(url.pathname).toBe('/services');
    expect(p).toMatchObject({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', CRS: 'EPSG:3857', FORMAT: 'image/png', TRANSPARENT: 'TRUE' });
    expect(Object.values(COUCHES)).toContain(p.LAYERS);
  }
  expect([...new Set(journal.wms.map((r) => parametres(r.url).LAYERS))].sort()).toEqual(Object.values(COUCHES).sort());
});

test('cases : décocher retire les couches, recocher les remet, un changement de filtre réinitialise les cases', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  await expect(couchesLeaflet(page)).toHaveCount(4); // fond + trois calques
  await calque(page, 'Zone inondable').uncheck();
  await expect(couchesLeaflet(page)).toHaveCount(3);
  await page.locator('#carte-reelle').focus();
  const avant = journal.wms.length;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => journal.wms.length).toBeGreaterThan(avant);
  const apres = journal.wms.slice(avant).map((r) => parametres(r.url).LAYERS);
  expect(apres).not.toContain(COUCHES.inondation);
  await calque(page, 'Zone inondable').check();
  await expect(couchesLeaflet(page)).toHaveCount(4);
  await page.getByRole('radio', { name: 'Feux de forêt' }).check({ force: true });
  await expect(calque(page, 'Feux de forêt')).toBeChecked();
  for (const nom of ['Zone inondable', 'Retrait-gonflement des argiles', 'Chaleur extrême']) await expect(calque(page, nom)).not.toBeChecked();
  await expect(couchesLeaflet(page)).toHaveCount(2);
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await expect(couchesLeaflet(page)).toHaveCount(4);
});

test('« Chaleur extrême » : aria-disabled et description, aucune requête associée, rôle rendu au retour', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await expect(calque(page, 'Chaleur extrême')).toBeChecked();
  await page.locator('#carte-reelle-ouvrir').click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  const chaleur = calque(page, 'Chaleur extrême');
  await expect(chaleur).toHaveAttribute('aria-disabled', 'true');
  await expect(chaleur).not.toHaveAttribute('disabled', /.*/);
  await expect(chaleur).toHaveAccessibleDescription('Aucune donnée de chaleur disponible auprès de Géorisques.');
  await expect(chaleur).not.toBeChecked();
  await chaleur.click({ force: true });
  await expect(chaleur).not.toBeChecked();
  await page.getByRole('radio', { name: 'Canicule' }).check({ force: true });
  await expect(chaleur).not.toBeChecked();
  await expect(chaleur).toHaveAttribute('aria-disabled', 'true');
  await expect.poll(() => journal.wms.length).toBeGreaterThan(0);
  expect(journal.wms.filter((r) => /chaleur|canicule/i.test(r.url))).toEqual([]);
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await page.getByRole('button', { name: 'Revenir à la carte schématique' }).click();
  await expect(chaleur).not.toHaveAttribute('aria-disabled', /.*/);
  await expect(chaleur).toHaveAccessibleDescription('');
  await expect(chaleur).toBeChecked(); // état retrouvé : « Tous » coche les quatre calques
  await chaleur.uncheck();
  await expect(chaleur).not.toBeChecked();
});

test('fonds : Plan IGN par le choix du visiteur, retour à OpenStreetMap, flèches dans le groupe', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  const osm = page.getByRole('radio', { name: 'OpenStreetMap' });
  const ign = page.getByRole('radio', { name: 'Plan IGN' });
  await expect(osm).toBeChecked();
  await expect.poll(() => journal.osm.length).toBeGreaterThan(0);
  expect(journal.ign).toHaveLength(0);
  await ign.check({ force: true });
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
  expect(parametres(journal.ign[0].url)).toMatchObject({ SERVICE: 'WMTS', LAYER: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', TILEMATRIXSET: 'PM' });
  await page.waitForTimeout(300);
  const nOsm = journal.osm.length;
  await page.locator('#carte-reelle').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  expect(journal.osm.length).toBe(nOsm);
  await ign.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(ign).not.toBeChecked();
  await expect(osm).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(ign).toBeChecked();
  expect(await osm.getAttribute('name')).toBe(await ign.getAttribute('name'));
});

test('repli automatique : tuiles OpenStreetMap refusées → annonce, Plan IGN, radio mise à jour ; aucune bascule après un choix manuel', async ({ page }) => {
  const journal = await simuler(page, { tuiles: { osm: 'abandon' } });
  await page.clock.install();
  await afficherCarte(page);
  await expect(etat(page)).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
  await expect(page.getByRole('radio', { name: 'Plan IGN' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).not.toBeChecked();
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
  // choix manuel d'OpenStreetMap (toujours refusé) : plus aucune bascule, même après le délai de 8 s
  await page.getByRole('radio', { name: 'OpenStreetMap' }).check({ force: true });
  await page.clock.fastForward(9000);
  await page.waitForTimeout(400);
  await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).toBeChecked();
  await expect(etat(page)).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
  const nIgn = journal.ign.length;
  await page.clock.fastForward(9000);
  expect(journal.ign.length).toBe(nIgn);
});

test('repli automatique après huit secondes sans tuile chargée (réponses jamais reçues)', async ({ page }) => {
  const journal = await simuler(page);
  await page.route('https://tile.openstreetmap.org/**', () => {}); // aucune réponse
  await page.clock.install();
  await afficherCarte(page);
  await page.clock.fastForward(7000);
  await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).toBeChecked();
  await page.clock.fastForward(1500);
  await expect(page.getByRole('radio', { name: 'Plan IGN' })).toBeChecked();
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
});

test('attributions : trois textes, liens en nouvel onglet vers les hôtes attendus, jamais suivis', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  const attributions = page.locator('#carte-reelle .leaflet-control-attribution');
  await expect(attributions).toContainText('© OpenStreetMap');
  await expect(attributions).toContainText('© IGN/Géoplateforme');
  await expect(attributions).toContainText('Données : Géorisques');
  const liens = attributions.getByRole('link');
  await expect(liens).toHaveCount(3);
  const hotes = [];
  for (const lien of await liens.all()) {
    await expect(lien).toHaveAttribute('target', '_blank');
    const rel = (await lien.getAttribute('rel')) ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
    hotes.push(new URL(await lien.getAttribute('href')).hostname);
  }
  expect(hotes).toEqual(['www.openstreetmap.org', 'geoservices.ign.fr', 'www.georisques.gouv.fr']);
  await page.getByRole('radio', { name: 'Plan IGN' }).check({ force: true });
  await expect(attributions).not.toContainText('© OpenStreetMap');
  await expect(attributions).toContainText('© IGN/Géoplateforme');
  expect(journal.externes.filter((r) => /openstreetmap\.org\/copyright|geoservices\.ign\.fr/.test(r.url))).toEqual([]);
});

test('clavier : la carte est atteignable par Tab, flèches et plus/moins, aucun piège de focus', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  const carte = page.locator('#carte-reelle');
  await expect(carte).toHaveAttribute('role', 'region');
  await expect(carte).toHaveAccessibleName('Carte réelle autour de votre adresse');
  await expect(carte).toHaveAccessibleDescription('Flèches : déplacer la carte. Plus et moins : zoomer.');
  await calque(page, 'Zone inondable').focus();
  let atteinte = false;
  for (let i = 0; i < 12 && !atteinte; i += 1) {
    await page.keyboard.press('Shift+Tab');
    atteinte = await carte.evaluate((n) => document.activeElement === n);
  }
  expect(atteinte).toBe(true);
  const repere = page.locator('#carte-reelle .carte-reelle__repere');
  const x0 = (await repere.boundingBox()).x;
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await repere.boundingBox()).x).toBeLessThan(x0);
  const zoom = () => Number(new URL(journal.osm.at(-1).url).pathname.split('/')[1]);
  const z0 = zoom();
  await page.keyboard.press('+');
  await expect.poll(zoom).toBe(z0 + 1);
  await page.keyboard.press('-');
  await expect.poll(async () => (await repere.boundingBox()).width).toBeGreaterThan(0);
  // Tab sort de la carte (zoom, attributions, puis cases) sans piège
  let dehors = false;
  for (let i = 0; i < 12 && !dehors; i += 1) {
    await page.keyboard.press('Tab');
    dehors = await carte.evaluate((n) => !n.contains(document.activeElement));
  }
  expect(dehors).toBe(true);
});

for (const largeur of [375, 768, 1440]) {
  test(`axe sans violation avec la carte réelle, calques cochés et légende visible à ${largeur} px`, async ({ page }) => {
    await simuler(page);
    const console_ = surveillerConsole(page);
    await afficherCarte(page, largeur);
    await expect(page.locator('#legende-reelle')).toBeVisible();
    await expect(calque(page, 'Zone inondable')).toBeChecked();
    await page.waitForTimeout(500);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(console_).toEqual([]);
  });
}

test('mesures à 1440 px : même cadre que le schéma, critères de colonne du lot 4 ; à 375 px aucun débordement', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  const schema = await page.locator('.schema').boundingBox();
  await page.locator('#carte-reelle-ouvrir').click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  await page.waitForTimeout(500); // fin du défilement vers la carte (focus), puis une seule lecture de toutes les boîtes
  const { carte, score, equip, cadre } = await page.evaluate(() => {
    const lire = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
    return { carte: lire('[data-role="carte"]'), score: lire('[data-role="score"]'), equip: lire('[data-role="equipements"]'), cadre: lire('#carte-reelle') };
  });
  const ecart = Math.abs(equip.y + equip.height - (carte.y + carte.height));
  console.log(`1440 px : cadre ${cadre.width.toFixed(1)} × ${cadre.height.toFixed(1)} (schéma ${schema.width.toFixed(1)} × ${schema.height.toFixed(1)}), carte ${carte.width.toFixed(1)}, score ${score.width.toFixed(1)}, équipements ${equip.width.toFixed(1)}, écart des bas ${ecart.toFixed(1)}`);
  expect(Math.abs(cadre.width - schema.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cadre.height - schema.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(cadre.width / cadre.height - 4 / 3) / (4 / 3)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(carte.width - score.width)).toBeLessThanOrEqual(1);
  expect(equip.width).toBeGreaterThanOrEqual(1.8 * score.width);
  expect(ecart).toBeLessThanOrEqual(8);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(page.locator('#legende-reelle')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const attribution = await page.locator('#carte-reelle .leaflet-control-attribution').boundingBox();
  const petit = await page.locator('#carte-reelle').boundingBox();
  expect(attribution.x + attribution.width).toBeLessThanOrEqual(petit.x + petit.width + 1);
});

test('aucune requête hors des trois hôtes, aucune écriture de stockage ni de cookie, CLS de l\'ouverture d\'au plus 0,02', async ({ page, context }) => {
  const journal = await simuler(page);
  await page.addInitScript(() => {
    globalThis.__cls = 0;
    new PerformanceObserver((liste) => {
      for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await ouvrirDiagnostic(page, 375);
  await page.waitForTimeout(300);
  const avant = await page.evaluate(() => ({ cles: Object.keys(sessionStorage).sort(), cls: globalThis.__cls }));
  await page.locator('#carte-reelle-ouvrir').click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  await page.getByText('Plan IGN', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Plan IGN' })).toBeChecked();
  await calque(page, 'Zone inondable').uncheck();
  await page.waitForTimeout(500);
  const apres = await page.evaluate(() => ({ cles: Object.keys(sessionStorage).sort(), cls: globalThis.__cls, local: Object.keys(localStorage).length }));
  console.log(`CLS avant ouverture ${avant.cls.toFixed(4)}, après ouverture ${apres.cls.toFixed(4)}`);
  expect(apres.cles).toEqual(avant.cles);
  expect(apres.local).toBe(0);
  expect(await context.cookies()).toEqual([]);
  expect(apres.cls - avant.cls).toBeLessThanOrEqual(0.02);
  expect(journal.externes.length).toBeGreaterThan(0);
  for (const { url } of journal.externes) expect(HOTES, url).toContain(new URL(url).hostname);
});
