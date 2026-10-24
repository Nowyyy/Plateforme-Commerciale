import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler } from './faisabilite-simulation.js';

const PAGE = '/assets/outils/faisabilite.html';
const LARGEURS = [375, 768, 1440];
const IDS = ['geocodage', 'osm-tuile', 'ign-tuile', 'georisques-api', 'georisques-api-www', 'georisques-wms', 'georisques-wms-www', 'georisques-wms-image'];
const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const etat = (page, id) => page.locator(`tr[data-sonde="${id}"]`).getAttribute('data-etat');

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(PAGE);
  await expect(page.locator('#contenu')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of LARGEURS) {
  test(`avant le clic à ${largeur} px : console propre, aucun débordement, axe sans violation, aucune requête vers un autre site, huit sondes à lancer`, async ({ page }, info) => {
    const erreurs = [];
    const externes = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('request', (r) => !['localhost', '127.0.0.1'].includes(new URL(r.url()).hostname) && externes.push(r.url()));
    const { journal } = await simuler(page);
    await ouvrir(page, largeur);
    await expect(page.getByRole('heading', { level: 1, name: 'Test de faisabilité de la carte réelle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lancer le test' })).toBeVisible();
    const lignes = page.locator('#sondes tr');
    await expect(lignes).toHaveCount(8);
    for (const id of IDS) expect(await etat(page, id)).toBe('a-lancer');
    await expect(lignes.first().locator('td').first()).toContainText('À lancer');
    expect(await sansDebordement(page)).toBe(true);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(externes).toEqual([]);
    expect(journal).toEqual([]);
    expect(erreurs).toEqual([]);
    if (largeur !== 768) {
      await page.screenshot({ path: `test-results/faisabilite-avant-${largeur}.png`, fullPage: true });
      info.annotations.push({ type: 'capture', description: `faisabilite-avant-${largeur}.png` });
    }
  });
}

for (const largeur of [375, 1440]) {
  test(`test simulé réussi à ${largeur} px : huit requêtes séquentielles, tableau complet, verdict « carte possible », rapport rempli, focus sur le titre des résultats`, async ({ page }, info) => {
    const { journal, etat: suivi } = await simuler(page);
    await ouvrir(page, largeur);
    await page.getByRole('button', { name: 'Lancer le test' }).click();
    await expect(page.locator('#titre-resultats')).toBeFocused();
    expect(journal.map((j) => `${j.hote}${j.chemin}`)).toEqual([
      'data.geopf.fr/geocodage/search',
      expect.stringMatching(/^tile\.openstreetmap\.org\/12\/\d+\/\d+\.png$/),
      'data.geopf.fr/wmts',
      'georisques.gouv.fr/api/v1/gaspar/risques',
      'www.georisques.gouv.fr/api/v1/gaspar/risques',
      'georisques.gouv.fr/services',
      'www.georisques.gouv.fr/services',
      'georisques.gouv.fr/services',
    ]);
    expect(journal[5].parametres.REQUEST).toBe('GetCapabilities');
    expect(journal[7].parametres).toMatchObject({ REQUEST: 'GetMap', LAYERS: 'PPRN_COMMUNE_RISQINOND', CRS: 'EPSG:3857', WIDTH: '256', HEIGHT: '256', VERSION: '1.3.0' });
    expect(journal[0].parametres.q).toBe("4 place de l'Hôtel de Ville 75004 Paris");
    expect(suivi.maxSimultanees).toBe(1);
    for (const id of IDS) expect(await etat(page, id), id).toBe('ok');
    await expect(page.locator('#sondes tr').nth(5).locator('td').nth(2)).toContainText('4 couches');
    await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : oui');
    await expect(page.locator('#liste-conclusions')).toContainText('Fonds de carte disponibles : osm, ign');
    const rapport = await page.locator('#texte-rapport').inputValue();
    for (const id of IDS) expect(rapport).toContain(`- ${id} : ok`);
    expect(rapport).toContain('Origine de la page : http://localhost:4173');
    await expect(page.locator('#progression')).toContainText('Test terminé');
    expect(await sansDebordement(page)).toBe(true);
    await page.screenshot({ path: `test-results/faisabilite-reussi-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `faisabilite-reussi-${largeur}.png` });
  });
}

for (const largeur of [375, 1440]) {
  test(`test simulé avec échecs à ${largeur} px : bloqué, HTTP 404 lisible, délai dépassé, verdicts cohérents`, async ({ page }, info) => {
    await page.clock.install();
    const { journal } = await simuler(page, (r) => {
      if (r.hote === 'tile.openstreetmap.org') return 'abort';
      if (r.hote === 'www.georisques.gouv.fr') return 'abort';
      if (r.hote === 'georisques.gouv.fr' && r.chemin.startsWith('/api/')) return 'attendre';
      if (r.hote === 'georisques.gouv.fr') return { status: 404 };
      return undefined;
    });
    await ouvrir(page, largeur);
    await page.getByRole('button', { name: 'Lancer le test' }).click();
    await expect.poll(() => journal.length).toBe(4);
    await page.clock.runFor(10500);
    await expect(page.locator('#titre-resultats')).toBeFocused();
    expect(await etat(page, 'osm-tuile')).toBe('image-echec');
    expect(await etat(page, 'ign-tuile')).toBe('ok');
    expect(await etat(page, 'georisques-api')).toBe('delai');
    expect(await etat(page, 'georisques-api-www')).toBe('bloque');
    expect(await etat(page, 'georisques-wms')).toBe('http');
    await expect(page.locator('tr[data-sonde="georisques-wms"] td').nth(2)).toContainText('HTTP 404');
    expect(await etat(page, 'georisques-wms-www')).toBe('bloque');
    expect(await etat(page, 'georisques-wms-image')).toBe('non-testee');
    expect(journal).toHaveLength(7);
    await expect(page.locator('#liste-conclusions')).toContainText('Tuiles OpenStreetMap : échec de l\'image');
    await expect(page.locator('#liste-conclusions')).toContainText('Fonds de carte disponibles : ign');
    await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : inconnu');
    expect(await page.locator('#texte-rapport').inputValue()).toContain('- georisques-api : délai dépassé');
    await page.screenshot({ path: `test-results/faisabilite-echecs-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `faisabilite-echecs-${largeur}.png` });
  });
}

test('blocage de la tuile OSM par abandon réseau : état bloqué ou image non chargée selon le type de sonde, géocodage bloqué : carte impossible', async ({ page }) => {
  await simuler(page, (r) => (r.hote === 'data.geopf.fr' && r.chemin.startsWith('/geocodage') ? 'abort' : undefined));
  await ouvrir(page, 1440);
  await page.getByRole('button', { name: 'Lancer le test' }).click();
  await expect(page.locator('#titre-resultats')).toBeFocused();
  expect(await etat(page, 'geocodage')).toBe('bloque');
  await expect(page.locator('tr[data-sonde="geocodage"] td').nth(2)).toContainText('TypeError');
  await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : non');
});

test('aucune écriture de stockage ni de cookie ; bouton inactif pendant l\'exécution ; clavier : Tab atteint le bouton, Entrée le déclenche', async ({ page }) => {
  await page.addInitScript(() => {
    window.__ecritures = [];
    const noter = (nom) => window.__ecritures.push(nom);
    for (const nom of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[nom];
      Storage.prototype[nom] = function (...a) { noter(nom); return original.apply(this, a); };
    }
    const descripteur = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', { get: () => descripteur.get.call(document), set: (v) => { noter('cookie'); descripteur.set.call(document, v); } });
    const ouvrirBase = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...a) => { noter('indexedDB'); return ouvrirBase(...a); };
  });
  let liberer;
  const barriere = new Promise((resolve) => { liberer = resolve; });
  const { journal } = await simuler(page, (r) => (r.chemin === '/geocodage/search' ? barriere : undefined));
  await ouvrir(page, 1440);
  await page.keyboard.press('Tab');
  const bouton = page.getByRole('button', { name: 'Lancer le test' });
  await expect(bouton).toBeFocused();
  await expect(bouton).not.toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#progression')).toHaveText('Sonde 1 sur 8 : Géocodage IGN');
  await bouton.click({ force: true });
  await page.keyboard.press('Enter');
  expect(journal).toHaveLength(1);
  liberer();
  await expect(page.locator('#titre-resultats')).toBeFocused();
  await expect(bouton).not.toHaveAttribute('aria-disabled', 'true');
  expect(journal).toHaveLength(8);
  const bilan = await page.evaluate(() => ({ ecritures: window.__ecritures, cookie: document.cookie, local: localStorage.length, session: sessionStorage.length }));
  expect(bilan).toEqual({ ecritures: [], cookie: '', local: 0, session: 0 });
});
