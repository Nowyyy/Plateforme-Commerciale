import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, reponseGaspar, reponseGeocodage, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const COUCHES = {
  inondation: 'ALEA_SYNT_01_04FAI_FXX,PPRN_COMMUNE_RISQINOND_PRESCRIT',
  argile: 'ALEARG',
  feu: 'PPRN_COMMUNE_FEU_APPROUV',
};
const TITRE = 'Aléas recensés à cette adresse';
const SANS_RESSOURCE = (m) => !m.includes('Failed to load resource');
const groupe = (page) => page.getByRole('group', { name: TITRE });
const cases = (page) => groupe(page).getByRole('checkbox');
const calque = (page, nom) => groupe(page).getByRole('checkbox', { name: nom });
const annonce = (page) => page.locator('#aleas-annonce');
const couchesDemandees = (journal) => new Set(journal.wms.map((r) => new URL(r.url).searchParams.get('LAYERS')));
const pret = async (page) => {
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  await expect(annonce(page)).not.toBeEmpty();
};
const SCENARIOS = {
  deux: { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Séisme']) }, rga: { corps: reponseRga(2) } } },
  aucun: { api: { gaspar: { corps: reponseGaspar(['Séisme']) }, rga: { corps: reponseRga(0) } } },
  secours: { api: { gaspar: { abandon: true }, rga: { abandon: true } } },
};

test('après le géocodage : deux lectures séquentielles de l\'API (hôte avec www, latlon en lon,lat), aucune ne contient l\'adresse', async ({ page }) => {
  const journal = await simuler(page);
  let liberer = () => {};
  const attente = new Promise((resolve) => { liberer = resolve; });
  await page.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', async (route) => {
    await attente;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseGaspar() });
  });
  await ouvrirDiagnostic(page, 1440);
  await expect.poll(() => journal.api.length).toBe(1);
  await page.waitForTimeout(500);
  expect(journal.api).toHaveLength(1); // la seconde lecture attend la fin de la première
  expect(new URL(journal.api[0].url).pathname).toBe('/api/v1/gaspar/risques');
  liberer();
  await expect.poll(() => journal.api.length).toBe(2);
  expect(new URL(journal.api[1].url).pathname).toBe('/api/v1/rga');
  for (const r of journal.api) {
    const u = new URL(r.url);
    expect(u.hostname).toBe('www.georisques.gouv.fr');
    expect(u.searchParams.get('latlon')).toBe('4.8357,45.764');
    expect(decodeURIComponent(r.url)).not.toMatch(/Tilleuls|Lyon|rue/i);
    expect(r.referer).toBe('http://localhost:4173/');
  }
  expect(new URL(journal.api[0].url).searchParams.get('rayon')).toBe('1000');
});

test('inondation et argiles recensées, feux absents : deux cases, libellés, annonce, couches WMS correspondantes', async ({ page }) => {
  const journal = await simuler(page, SCENARIOS.deux);
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  await expect(cases(page)).toHaveCount(2);
  await expect(calque(page, 'Zone inondable')).toBeChecked();
  await expect(groupe(page)).toContainText('Zone inondable');
  await expect(groupe(page)).toContainText('recensé');
  await expect(groupe(page)).toContainText('exposition moyenne');
  await expect(calque(page, 'Feux de forêt')).toHaveCount(0);
  await expect(annonce(page)).toHaveText('2 aléas recensés à cette adresse.');
  await expect(page.locator('#aleas-secours')).toBeHidden();
  await expect(groupe(page)).toContainText('Source : Géorisques (aléas recensés à l\'échelle de la commune pour l\'inondation et les feux de forêt, à l\'adresse pour les argiles).');
  await expect.poll(() => couchesDemandees(journal).size).toBe(2);
  expect([...couchesDemandees(journal)].sort()).toEqual([COUCHES.inondation, COUCHES.argile].sort());
  await expect(page.locator('#note-chaleur')).toBeVisible();
});

test('aucun aléa recensé : message, aucune case, aucune couche demandée', async ({ page }) => {
  const journal = await simuler(page, SCENARIOS.aucun);
  await ouvrirDiagnostic(page, 375);
  await pret(page);
  await expect(cases(page)).toHaveCount(0);
  await expect(page.locator('#aleas-message')).toHaveText('Aucun aléa recensé à cette adresse parmi ceux affichables sur la carte.');
  await expect(annonce(page)).toHaveText('Aucun aléa recensé à cette adresse parmi ceux affichables sur la carte.');
  await page.waitForTimeout(600);
  expect(journal.wms).toEqual([]);
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(1); // le fond seul
});

test('tous les appels en échec : mode de secours (trois cases, mention), console propre ; un seul appel en échec : présence non déterminée', async ({ page }) => {
  const console_ = surveillerConsole(page);
  const journal = await simuler(page, SCENARIOS.secours);
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  await expect(cases(page)).toHaveCount(3);
  await expect(page.locator('#aleas-secours')).toHaveText("Les aléas de cette adresse n'ont pas pu être déterminés ; tous les calques disponibles sont proposés.");
  await expect(groupe(page)).toContainText('présence non déterminée');
  await expect.poll(() => couchesDemandees(journal).size).toBe(3);
  expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
  // un seul appel en échec (gaspar en erreur 500) : rga lu, mode de secours inactif
  const autre = await page.context().newPage();
  await simuler(autre, { api: { gaspar: { status: 500, corps: '' }, rga: { corps: reponseRga(3) } } });
  await ouvrirDiagnostic(autre, 1440);
  await pret(autre);
  await expect(cases(autre)).toHaveCount(3);
  await expect(autre.locator('#aleas-secours')).toBeHidden();
  await expect(calque(autre, 'Zone inondable')).toHaveAccessibleName(/présence non déterminée/);
  await expect(calque(autre, 'Feux de forêt')).toHaveAccessibleName(/présence non déterminée/);
  await expect(calque(autre, 'Retrait-gonflement des argiles')).toHaveAccessibleName(/exposition forte/);
  await expect(annonce(autre)).toHaveText('1 aléa recensé à cette adresse.');
});

test('cases : décocher retire les couches, recocher les remet ; le filtre « Inondations » ne coche que l\'inondation ; un changement de filtre réinitialise', async ({ page }) => {
  const journal = await simuler(page, SCENARIOS.deux);
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(3);
  await calque(page, 'Zone inondable').uncheck();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
  await page.locator('#carte-reelle').focus();
  const avant = journal.wms.length;
  await page.keyboard.press('+');
  await expect.poll(() => journal.wms.length).toBeGreaterThan(avant);
  expect(journal.wms.slice(avant).map((r) => new URL(r.url).searchParams.get('LAYERS'))).not.toContain(COUCHES.inondation);
  await calque(page, 'Zone inondable').check();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(3);
  await page.getByRole('radio', { name: 'Inondations' }).check({ force: true });
  await expect(calque(page, 'Zone inondable')).toBeChecked();
  await expect(calque(page, 'Retrait-gonflement des argiles')).not.toBeChecked();
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
  await calque(page, 'Retrait-gonflement des argiles').check();
  await page.getByRole('radio', { name: 'Feux de forêt' }).check({ force: true }); // calque absent de l'adresse : rien n'est coché
  await expect(groupe(page).getByRole('checkbox', { checked: true })).toHaveCount(0);
  await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(1);
  await page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  await expect(groupe(page).getByRole('checkbox', { checked: true })).toHaveCount(2);
});

test('changement d\'adresse : nouvelle lecture des aléas, cases recalculées', async ({ page }) => {
  const journal = await simuler(page, SCENARIOS.deux);
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  await expect(cases(page)).toHaveCount(2);
  expect(journal.api).toHaveLength(2);
  await page.unroute('https://www.georisques.gouv.fr/api/v1/rga**');
  await page.route('https://www.georisques.gouv.fr/api/v1/rga**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseRga(0) }));
  await page.unroute('https://www.georisques.gouv.fr/api/v1/gaspar/**');
  await page.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseGaspar(['Feu de forêt', 'Crue']) }));
  await page.locator('#adresse-evaluee').fill('8 avenue des Lilas, 31000 Toulouse');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  await expect.poll(() => journal.api.length).toBe(4);
  await expect(cases(page)).toHaveCount(2);
  await expect(calque(page, 'Retrait-gonflement des argiles')).toHaveCount(0);
  await expect(calque(page, 'Feux de forêt')).toBeVisible();
  await expect(calque(page, 'Zone inondable')).toBeVisible();
  await expect(annonce(page)).toHaveText('2 aléas recensés à cette adresse.');
});

test('confidentialité : aucune requête tierce hors diagnostic ni sans adresse ; avec adresse, trois hôtes, Géorisques sans l\'adresse, tuiles par numéros, Referer = origine, session limitée à adresse', async ({ page, context }) => {
  const journal = await simuler(page, SCENARIOS.deux);
  const toutes = [];
  page.on('request', (r) => toutes.push(r.allHeaders().then((h) => ({ url: r.url(), referer: h.referer ?? null }))));
  const externes = async () => (await Promise.all(toutes)).filter((r) => !['localhost', '127.0.0.1'].includes(new URL(r.url).hostname));
  for (const chemin of ['/index.html', '/produit.html', '/panier.html', '/comparateur.html', '/pro.html', '/sav.html']) {
    await page.goto(chemin);
    await page.waitForSelector('html[data-rendu="pret"]');
  }
  await ouvrirDiagnostic(page, 1440, {});
  await page.waitForTimeout(500);
  expect(await externes()).toEqual([]);
  await page.evaluate(() => sessionStorage.clear()); // les autres pages écrivent leurs propres clés (comparaison, panier…) : repartir de zéro
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  await page.getByRole('radio', { name: 'Plan IGN' }).check({ force: true });
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
  const liste = await externes();
  expect(new Set(liste.map((r) => new URL(r.url).hostname))).toEqual(new Set(['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org']));
  for (const r of liste) {
    const u = new URL(r.url);
    expect(r.referer === null || r.referer === 'http://localhost:4173/', r.url).toBe(true);
    const decode = decodeURIComponent(r.url);
    if (u.hostname === 'www.georisques.gouv.fr') expect(decode, 'Géorisques ne reçoit que des coordonnées').not.toMatch(/Tilleuls|Lyon|rue des/i);
    if (u.hostname === 'tile.openstreetmap.org') expect(u.pathname, 'tuile OpenStreetMap').toMatch(/^\/\d+\/\d+\/\d+\.png$/);
    if (u.pathname === '/wmts') for (const cle of ['TILEMATRIX', 'TILEROW', 'TILECOL']) expect(u.searchParams.get(cle), cle).toMatch(/^\d+$/);
    if (u.hostname === 'data.geopf.fr' && !u.pathname.startsWith('/geocodage/')) expect(decode).not.toMatch(/Tilleuls|Lyon/);
  }
  expect(liste.filter((r) => decodeURIComponent(r.url).includes('Tilleuls')).every((r) => new URL(r.url).hostname === 'data.geopf.fr' && new URL(r.url).pathname === '/geocodage/search')).toBe(true);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['adresse']);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : sans adresse, calques dynamiques, mode de secours, aucun aléa - console propre, axe, aucun débordement`, async ({ page }, info) => {
    const etats = [
      ['sans-adresse', {}, {}],
      ['calques', SCENARIOS.deux, { adresse: ADRESSE }],
      ['secours', SCENARIOS.secours, { adresse: ADRESSE }],
      ['aucun-alea', SCENARIOS.aucun, { adresse: ADRESSE }],
    ];
    for (const [nom, simulation, session] of etats) {
      const onglet = await page.context().newPage();
      const messages = surveillerConsole(onglet);
      const journal = await simuler(onglet, simulation);
      await ouvrirDiagnostic(onglet, largeur, session);
      if (session.adresse) await pret(onglet);
      else await expect(onglet.locator('#carte-reelle-etat')).toHaveText('Saisissez une adresse pour afficher la carte.');
      await onglet.waitForTimeout(300);
      expect(await onglet.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${nom} : débordement`).toBe(true);
      const violations = (await new AxeBuilder({ page: onglet }).analyze()).violations;
      expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`), `${nom} : axe`).toEqual([]);
      if (!session.adresse) expect(journal.externes).toEqual([]);
      else for (const { url } of journal.externes) expect(['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'], url).toContain(new URL(url).hostname);
      await onglet.screenshot({ path: info.outputPath(`${nom}-${largeur}.png`), fullPage: true });
      expect(messages.filter(SANS_RESSOURCE), nom).toEqual([]);
      await onglet.close();
    }
  });
}

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  await expect(page.locator('.noscript')).toBeVisible();
  expect(((await page.evaluate(() => document.body.innerText)) ?? '').trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});

test('la carte du diagnostic reste inchangée par les aléas : score et équipements ne dépendent pas des aléas détectés', async ({ page }) => {
  await simuler(page, SCENARIOS.aucun);
  await ouvrirDiagnostic(page, 1440);
  await pret(page);
  const sans = await page.locator('#score-niveau').textContent();
  const equipementsSans = await page.locator('#liste-equipements > li h3').allTextContents();
  const autre = await page.context().newPage();
  await simuler(autre, SCENARIOS.deux);
  await ouvrirDiagnostic(autre, 1440);
  await pret(autre);
  expect(await autre.locator('#score-niveau').textContent()).toBe(sans);
  expect(await autre.locator('#liste-equipements > li h3').allTextContents()).toEqual(equipementsSans);
  expect(reponseGeocodage()).toContain(ADRESSE);
});
