import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ouvrirDiagnostic, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const COUCHES = {
  inondation: 'ALEA_SYNT_01_04FAI_FXX,PPRN_COMMUNE_RISQINOND_PRESCRIT',
  argile: 'ALEARG',
  feu: 'PPRN_COMMUNE_FEU_APPROUV',
};
const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const etat = (page) => page.locator('#carte-reelle-fond-etat');
const calque = (page, nom) => page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox', { name: nom });
const couchesLeaflet = (page) => page.locator('#carte-reelle .leaflet-layer');
const parametres = (url) => Object.fromEntries([...new URL(url).searchParams].map(([cle, valeur]) => [cle.toUpperCase(), valeur]));

async function afficherCarte(page, largeur = 1440) {
  await ouvrirDiagnostic(page, largeur);
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
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
  await page.keyboard.press('+'); // un nouveau niveau de zoom demande toujours de nouvelles tuiles
  await expect.poll(() => journal.wms.length).toBeGreaterThan(avant);
  const apres = journal.wms.slice(avant).map((r) => parametres(r.url).LAYERS);
  expect(apres).not.toContain(COUCHES.inondation);
  await calque(page, 'Zone inondable').check();
  await expect(couchesLeaflet(page)).toHaveCount(4);
  await page.getByRole('radio', { name: 'Feux de forêt' }).check({ force: true });
  await expect(calque(page, 'Feux de forêt')).toBeChecked();
  for (const nom of ['Zone inondable', 'Retrait-gonflement des argiles']) await expect(calque(page, nom)).not.toBeChecked();
  await expect(couchesLeaflet(page)).toHaveCount(2);
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await expect(couchesLeaflet(page)).toHaveCount(4);
});

test('« Chaleur extrême » : aucune case, aucune note, aucune requête associée', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  await expect(page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox')).toHaveCount(3);
  await expect(page.getByRole('checkbox', { name: 'Chaleur extrême' })).toHaveCount(0);
  await expect(page.locator('#note-chaleur, #mention-reelle')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Canicule' }).check({ force: true });
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(1); // fond seul : aucun calque pour la canicule
  await expect.poll(() => journal.osm.length).toBeGreaterThan(0);
  expect(journal.wms.filter((r) => /chaleur|canicule/i.test(r.url))).toEqual([]);
});

test('aucun choix de fond : aucune radio « Fond de carte », OpenStreetMap par défaut, jamais le Plan IGN sans repli', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  await expect(page.getByRole('radio', { name: 'OpenStreetMap' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Plan IGN' })).toHaveCount(0);
  await expect(page.getByText('Fond de carte', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-role="legende"]')).toContainText('Fond de carte : OpenStreetMap, repli automatique sur le Plan IGN.');
  await expect.poll(() => journal.osm.length).toBeGreaterThan(0);
  expect(journal.ign).toHaveLength(0);
});

test('repli automatique : tuiles OpenStreetMap refusées → annonce, Plan IGN, attribution IGN seule', async ({ page }) => {
  const journal = await simuler(page, { tuiles: { osm: 'abandon' } });
  await page.clock.install();
  await afficherCarte(page);
  await expect(etat(page)).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
  await expect(etat(page)).toHaveAttribute('role', 'status');
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
  const attributions = page.locator('#carte-reelle .leaflet-control-attribution');
  await expect(attributions).not.toContainText('© OpenStreetMap');
  await expect(attributions).toContainText('© IGN/Géoplateforme');
  const nIgn = journal.ign.length;
  await page.clock.fastForward(9000); // une seule bascule : le fond n'est plus le fond par défaut
  expect(journal.ign.length).toBeGreaterThanOrEqual(nIgn);
  await expect(etat(page)).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
});

test('repli automatique après huit secondes sans tuile chargée (réponses jamais reçues)', async ({ page }) => {
  const journal = await simuler(page);
  await page.route('https://tile.openstreetmap.org/**', () => {}); // aucune réponse
  await page.clock.install();
  await afficherCarte(page);
  await page.clock.fastForward(7000);
  await expect(etat(page)).toHaveText('');
  expect(journal.ign).toHaveLength(0);
  await page.clock.fastForward(1500);
  await expect(etat(page)).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
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
  expect(journal.externes.filter((r) => /openstreetmap\.org\/copyright|geoservices\.ign\.fr/.test(r.url))).toEqual([]);
});

test('clavier : la carte est atteignable par Tab, flèches et plus/moins, aucun piège de focus', async ({ page }) => {
  const journal = await simuler(page);
  await afficherCarte(page);
  const carte = page.locator('#carte-reelle');
  await expect(carte).toHaveAttribute('role', 'region');
  await expect(carte).toHaveAccessibleName('Carte autour de votre adresse');
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

test('aucune requête hors des trois hôtes, aucune écriture de stockage ni de cookie, CLS du chargement avec carte d\'au plus 0,02', async ({ page, context }) => {
  const journal = await simuler(page);
  await page.addInitScript(() => {
    globalThis.__cls = 0;
    new PerformanceObserver((liste) => {
      for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await afficherCarte(page, 375);
  await page.getByRole('radio', { name: 'Inondations' }).check({ force: true }); // une action du visiteur sur la page
  await page.waitForTimeout(500);
  const apres = await page.evaluate(() => ({ cles: Object.keys(sessionStorage).sort(), cls: globalThis.__cls, local: Object.keys(localStorage).length }));
  console.log(`CLS du chargement avec carte : ${apres.cls.toFixed(4)}`);
  expect(apres.cles).toEqual(['adresse']);
  expect(apres.local).toBe(0);
  expect(await context.cookies()).toEqual([]);
  expect(apres.cls).toBeLessThanOrEqual(0.02);
  expect(journal.externes.length).toBeGreaterThan(0);
  for (const { url } of journal.externes) expect(HOTES, url).toContain(new URL(url).hostname);
});
