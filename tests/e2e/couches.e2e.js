import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler, CAPABILITIES } from './couches-simulation.js';
import { extraireCatalogue, grouperParFamille, tuilePourLieu, LIEUX } from '../../assets/outils/couches-logique.js';

const PAGE = '/assets/outils/couches.html';
const LARGEURS = [375, 768, 1440];
const HOTES = ['data.geopf.fr', 'georisques.gouv.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const CATALOGUE = extraireCatalogue(CAPABILITIES);
const GROUPES = grouperParFamille(CATALOGUE);
const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const getMap = (journal) => journal.filter((r) => r.parametres.REQUEST === 'GetMap');
const osm = (journal) => journal.filter((r) => r.hote === 'tile.openstreetmap.org');

function surveiller(page) {
  const messages = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type()) && !m.text().includes('Failed to load resource')) messages.push(m.text());
  });
  page.on('pageerror', (e) => messages.push(e.message));
  return messages;
}

async function ouvrir(page, largeur = 1440) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(PAGE);
  await expect(page.locator('#contenu')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

const lireCatalogue = async (page) => {
  await page.getByRole('button', { name: 'Lire le catalogue des couches' }).click();
  await expect(page.locator('#titre-catalogue')).toBeFocused();
};
const ouvrirFamille = (page, cle) => page.locator(`details[data-famille="${cle}"] > summary`).click();
const ligne = (page, nom) => page.locator('details[data-famille] input[data-nom]').and(page.locator(`[data-nom="${nom}"]`)).first();
const axe = async (page, etiquette) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), etiquette).toEqual([]);
};
const galerieAvec = async (page, noms) => {
  for (const [i, nom] of noms.entries()) {
    const famille = nom === 'ALEARG' ? 'argiles' : 'inondation';
    if (i === 0 || noms[i - 1] === 'ALEARG' !== (nom === 'ALEARG')) await ouvrirFamille(page, famille);
    await ligne(page, nom).check();
  }
  await page.getByRole('button', { name: "Afficher les tuiles d'essai" }).click();
  await expect(page.locator('#etat-galerie')).toContainText('Galerie terminée', { timeout: 20000 });
};

for (const largeur of LARGEURS) {
  test(`avant clic à ${largeur} px : console propre, aucun débordement, axe sans violation, aucune requête vers un autre site`, async ({ page }) => {
    const messages = surveiller(page);
    const { journal } = await simuler(page);
    await ouvrir(page, largeur);
    await expect(page.getByRole('button', { name: 'Lire le catalogue des couches' })).toBeVisible();
    expect(await sansDebordement(page)).toBe(true);
    await axe(page, `avant ${largeur}`);
    await page.waitForTimeout(300);
    expect(journal).toHaveLength(0);
    expect(messages).toEqual([]);
  });
}

test('catalogue : une requête, sections repliables aux bons effectifs, recherche libre, six couches puis refus de la septième', async ({ page }) => {
  const { journal } = await simuler(page);
  await ouvrir(page);
  await lireCatalogue(page);
  expect(journal).toHaveLength(1);
  expect(journal[0]).toMatchObject({ hote: 'www.georisques.gouv.fr', chemin: '/services', parametres: { SERVICE: 'WMS', REQUEST: 'GetCapabilities' } });
  await expect(page.locator('#etat-catalogue')).toContainText(`${CATALOGUE.length} couches lues`);
  expect(CATALOGUE.length).toBeGreaterThan(40);
  const libelles = { inondation: 'Inondation', argiles: 'Argiles', feux: 'Feux de forêt', chaleur: 'Chaleur' };
  for (const [cle, libelle] of Object.entries(libelles)) {
    const details = page.locator(`details[data-famille="${cle}"]`);
    await expect(details.locator('summary')).toHaveText(`${libelle} (${GROUPES[cle].length})`);
    expect(await details.evaluate((d) => d.open)).toBe(false);
    await ouvrirFamille(page, cle);
    await expect(details.locator('li')).toHaveCount(GROUPES[cle].length);
  }
  await expect(page.locator('details[data-famille="argiles"] li', { hasText: 'FEU_ET_ARGILES' })).toHaveCount(1);
  await expect(page.locator('details[data-famille="feux"] li', { hasText: 'FEU_ET_ARGILES' })).toHaveCount(1);
  // aucune case cochée, bouton de galerie inactif
  await expect(page.locator('input[data-nom]:checked')).toHaveCount(0);
  const galerie = page.getByRole('button', { name: "Afficher les tuiles d'essai" });
  await expect(galerie).toHaveAttribute('aria-disabled', 'true');
  expect(await galerie.getAttribute('disabled')).toBeNull();
  // recherche libre
  await page.locator('#tout-catalogue > summary').click();
  await expect(page.locator('#tout-catalogue summary')).toHaveText(`Tout le catalogue (${CATALOGUE.length})`);
  await expect(page.locator('#liste-tout li')).toHaveCount(CATALOGUE.length);
  await page.getByLabel('Rechercher dans tout le catalogue').fill('RETRAIT');
  await expect(page.locator('#liste-tout li')).toHaveCount(2);
  await expect(page.locator('#etat-recherche')).toContainText(`2 couches affichées sur ${CATALOGUE.length}`);
  await page.getByLabel('Rechercher dans tout le catalogue').fill('');
  // six couches, la septième est refusée sans disabled
  const cases = page.locator('#liste-tout input[data-nom]');
  for (let i = 0; i < 6; i++) await cases.nth(i).check();
  await expect(page.locator('#etat-selection')).toContainText('6 couches cochées');
  await expect(galerie).not.toHaveAttribute('aria-disabled', 'true');
  await cases.nth(6).check({ force: true }).catch(() => {});
  await expect(cases.nth(6)).not.toBeChecked();
  await expect(page.locator('#etat-selection')).toContainText('Six couches au plus');
  expect(await cases.nth(6).isDisabled()).toBe(false);
  await expect(page.locator('#liste-tout input:checked')).toHaveCount(6);
  // décocher revient à l'état inactif
  for (let i = 0; i < 6; i++) await cases.nth(i).uncheck();
  await expect(galerie).toHaveAttribute('aria-disabled', 'true');
  expect(journal).toHaveLength(1);
});

test('galerie (ordre du catalogue) : 2 × 2 requêtes WMS, tuiles OSM de mêmes z/x/y, cartes complètes, jugements aux flèches, échec simulé', async ({ page }) => {
  const { journal } = await simuler(page, (r) => (r.parametres.LAYERS === 'ALEARG' ? 'abort' : undefined));
  await ouvrir(page);
  await lireCatalogue(page);
  await galerieAvec(page, ['TRI_ZONE_SUBM', 'ALEARG']);
  const wms = getMap(journal);
  expect(wms).toHaveLength(4);
  expect(wms.filter((r) => r.parametres.LAYERS === 'TRI_ZONE_SUBM')).toHaveLength(2);
  expect(wms.filter((r) => r.parametres.LAYERS === 'ALEARG')).toHaveLength(2);
  for (const r of wms) {
    expect(r.hote).toBe('www.georisques.gouv.fr');
    expect(r.parametres).toMatchObject({ VERSION: '1.3.0', CRS: 'EPSG:3857', WIDTH: '256', HEIGHT: '256', TRANSPARENT: 'TRUE', FORMAT: 'image/png' });
  }
  const essais = (couche) => wms.filter((r) => r.parametres.LAYERS === couche).map((r) => r.parametres.essai);
  expect(new Set(essais('TRI_ZONE_SUBM')).size).toBe(2);
  // les tuiles OSM demandées sont celles des lieux (Paris z12 pour l'inondation, Toulouse z11 pour les argiles)
  const attendus = [LIEUX.inondation, LIEUX.argiles].map((l) => tuilePourLieu(l)).map((t) => `/${t.z}/${t.x}/${t.y}.png`);
  const demandees = new Set(osm(journal).map((r) => r.chemin));
  for (const chemin of attendus) expect(demandees).toContain(chemin);
  expect(demandees.size).toBe(2);
  const cartes = page.locator('#galerie .carte');
  await expect(cartes).toHaveCount(2);
  const ok = cartes.nth(1);
  await expect(ok.locator('h3')).toHaveText('TRI_ZONE_SUBM');
  await expect(ok).toContainText('Lieu : Paris (zoom 12)');
  await expect(ok).toContainText(/Durées : \d+ ms ; \d+ ms/);
  await expect(ok.locator('.carte__etat')).toContainText('OK');
  await expect(ok.locator('img')).toHaveCount(2);
  await expect(ok.locator('img').first()).toHaveAttribute('alt', /Fond OpenStreetMap de Paris/);
  await expect(ok.locator('img').nth(1)).toHaveAttribute('alt', /Calque Géorisques TRI_ZONE_SUBM/);
  const tailles = await ok.locator('img').evaluateAll((imgs) => imgs.map((i) => [i.getBoundingClientRect().width, i.getBoundingClientRect().height]));
  expect(tailles[0]).toEqual(tailles[1]);
  await expect(ok.locator('fieldset legend')).toHaveText('Votre jugement');
  for (const nom of ['Montre bien la zone', 'Ne montre rien', 'Illisible']) await expect(ok.getByRole('radio', { name: nom })).toHaveCount(1);
  // radios : une seule tabulation, flèches
  await ok.getByRole('radio', { name: 'Montre bien la zone' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(ok.getByRole('radio', { name: 'Ne montre rien' })).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(ok.getByRole('radio', { name: 'Illisible' })).toBeChecked();
  // couche en échec
  const echec = cartes.nth(0);
  await expect(echec.locator('h3')).toHaveText('ALEARG');
  await expect(echec).toContainText('Lieu : Toulouse (zoom 11)');
  await expect(echec.locator('.carte__etat')).toContainText('Image non chargée');
  await expect(echec).toContainText('Durées : - ; -');
  await expect(echec.locator('img').nth(1)).toBeHidden();
});

test('API : deux requêtes avec latlon conforme, lignes aplaties affichées, 404 lisible tel quel', async ({ page }) => {
  const { journal } = await simuler(page);
  await ouvrir(page);
  await page.getByRole('button', { name: "Lire l'API Géorisques" }).click();
  await expect(page.locator('#etat-api')).toHaveText("Lecture de l'API terminée.");
  expect(journal).toHaveLength(2);
  expect(journal[0]).toMatchObject({ hote: 'www.georisques.gouv.fr', chemin: '/api/v1/gaspar/risques', parametres: { latlon: '2.3522,48.8566', rayon: '1000' } });
  expect(journal[1]).toMatchObject({ hote: 'www.georisques.gouv.fr', chemin: '/api/v1/rga', parametres: { latlon: '1.4442,43.6047' } });
  const blocs = page.locator('#resultats-api .api');
  await expect(blocs).toHaveCount(2);
  await expect(blocs.nth(0)).toContainText('OK : HTTP 200');
  await expect(blocs.nth(0).locator('pre')).toContainText('data[0].commune.nom: PARIS');
  await expect(blocs.nth(0).locator('pre')).toContainText('data: … 5 éléments');
  await expect(blocs.nth(0).locator('pre')).toContainText('results: 5');
  await expect(blocs.nth(1)).toContainText('HTTP 404');
  await expect(blocs.nth(1).locator('pre')).toContainText('(contenu non JSON) Not Found');
});

test('rapport : contenu égal à la zone, jugements présents, copie par le bouton, presse-papiers indisponible : message', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await simuler(page);
  await ouvrir(page);
  await lireCatalogue(page);
  await galerieAvec(page, ['TRI_ZONE_SUBM']);
  await page.getByRole('radio', { name: 'Montre bien la zone' }).check();
  await page.getByRole('button', { name: "Lire l'API Géorisques" }).click();
  await expect(page.locator('#etat-api')).toHaveText("Lecture de l'API terminée.");
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  await expect(page.locator('#copie-statut')).toHaveText("Générez d'abord le rapport.");
  await page.getByRole('button', { name: 'Générer le rapport' }).click();
  const zone = page.locator('#texte-rapport');
  const rapport = await zone.inputValue();
  expect(rapport).toContain('Rapport du catalogue des couches Géorisques');
  expect(rapport).toContain(`Couches lues : ${CATALOGUE.length}`);
  expect(rapport).toMatch(/TRI_ZONE_SUBM \| Zones inondables du TRI \| lieu : Paris \| durées : \d+ ms ; \d+ ms \| état : ok \| jugement : Montre bien la zone/);
  expect(rapport).toContain('Risques de la commune (Gaspar), Paris : ok, HTTP 200');
  expect(rapport).toContain('data[0].commune.nom: PARIS');
  expect(rapport).toContain('HTTP 404');
  expect(rapport).toContain('Navigateur : ');
  await expect(zone).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  await expect(page.locator('#copie-statut')).toHaveText('Rapport copié.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(rapport);
  // presse-papiers indisponible
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  await expect(page.locator('#copie-statut')).toContainText('Copiez-le manuellement');
  expect(await page.evaluate(() => ({ actif: document.activeElement.id, fin: document.getElementById('texte-rapport').selectionEnd }))).toEqual({ actif: 'texte-rapport', fin: rapport.length });
});

for (const largeur of LARGEURS) {
  test(`page entière à ${largeur} px (avant, catalogue, galerie, API, rapport) : console propre, axe sans violation, aucun débordement, quatre hôtes seulement`, async ({ page }) => {
    const messages = surveiller(page);
    const { journal } = await simuler(page, (r) => (r.parametres.LAYERS === 'OLD_DEBROUSSAILLEMENT' ? 'abort' : undefined));
    await page.addInitScript(() => {
      window.__ecritures = 0;
      for (const cible of [Storage.prototype]) {
        const original = cible.setItem;
        cible.setItem = function (...a) { window.__ecritures += 1; return original.apply(this, a); };
      }
      const descripteur = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      Object.defineProperty(document, 'cookie', { get: () => descripteur.get.call(document), set: (v) => { window.__ecritures += 1; descripteur.set.call(document, v); }, configurable: true });
    });
    await ouvrir(page, largeur);
    await axe(page, `avant ${largeur}`);
    await lireCatalogue(page);
    for (const cle of ['inondation', 'argiles', 'feux', 'chaleur']) await ouvrirFamille(page, cle);
    await page.locator('#tout-catalogue > summary').click();
    expect(await sansDebordement(page)).toBe(true);
    await axe(page, `catalogue ${largeur}`);
    for (const nom of ['TRI_ZONE_SUBM', 'ALEARG', 'OLD_DEBROUSSAILLEMENT', 'ILOT_CHALEUR', 'SANS_FAMILLE']) await page.locator('#liste-tout').locator(`input[data-nom="${nom}"]`).check();
    await page.getByRole('button', { name: "Afficher les tuiles d'essai" }).click();
    await expect(page.locator('#etat-galerie')).toContainText('Galerie terminée', { timeout: 30000 });
    await expect(page.locator('#galerie .carte')).toHaveCount(5);
    expect(await sansDebordement(page)).toBe(true);
    await axe(page, `galerie ${largeur}`);
    await page.getByRole('button', { name: "Lire l'API Géorisques" }).click();
    await expect(page.locator('#etat-api')).toHaveText("Lecture de l'API terminée.");
    expect(await sansDebordement(page)).toBe(true);
    await axe(page, `API ${largeur}`);
    await page.getByRole('button', { name: 'Générer le rapport' }).click();
    await expect(page.locator('#texte-rapport')).not.toHaveValue('');
    expect(await sansDebordement(page)).toBe(true);
    await axe(page, `rapport ${largeur}`);
    expect(await page.evaluate(() => window.__ecritures)).toBe(0);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
    expect(journal.length).toBeGreaterThan(10);
    for (const r of journal) expect(HOTES, r.url).toContain(r.hote);
    expect(journal.filter((r) => r.hote === 'georisques.gouv.fr')).toHaveLength(0);
    expect(messages).toEqual([]);
  });
}

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  const { journal } = await simuler(page);
  await page.goto(`http://localhost:4173${PAGE}`);
  await expect(page.locator('.outil__noscript')).toBeVisible();
  await expect(page.locator('#contenu')).toBeHidden();
  expect(journal).toHaveLength(0);
  await contexte.close();
});

test('catalogue illisible ou bloqué : état affiché et la page s\'arrête là', async ({ page }) => {
  const { journal } = await simuler(page, () => 'abort');
  await ouvrir(page);
  await page.getByRole('button', { name: 'Lire le catalogue des couches' }).click();
  await expect(page.locator('#etat-catalogue')).toContainText('Bloquée');
  await expect(page.locator('#catalogue')).toBeHidden();
  expect(journal).toHaveLength(1);
});
