import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const ORIGINE = 'http://localhost:4173/';
const carteAffichee = (page) => expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
const calque = (page, nom) => page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox', { name: nom });

// Journal de toutes les requêtes (locales et externes) avec leurs en-têtes complets.
function journaliser(page) {
  const attente = [];
  const journal = { toutes: attente, urls: [] };
  page.on('request', (r) => attente.push(r.allHeaders().then((h) => ({ url: r.url(), referer: h.referer ?? null, corps: r.postData() ?? '' }))));
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) journal.urls.push(f.url()); });
  journal.lire = () => Promise.all(attente);
  return journal;
}

for (const largeur of [375, 1440]) {
  test(`parcours de la carte réelle à ${largeur} px : accueil, adresse, filtre, carte automatique, calque, fond, fiche`, async ({ page }) => {
    const debut = Date.now();
    const externes = await simuler(page);
    const console_ = surveillerConsole(page);
    const journal = journaliser(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
    await carteAffichee(page);
    // retour à l'accueil, puis filtre « Inondations » depuis la carte d'aléa
    await page.locator('.marque').first().click();
    await page.waitForURL((u) => u.pathname === '/index.html' || u.pathname === '/');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="aleas"] .cartes > li').first().getByRole('link', { name: /Voir les solutions Inondations/ }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('radio', { name: 'Inondations' })).toBeChecked();
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
    // la carte s'affiche d'elle-même (filtre « Inondations » : fond et un seul calque)
    await carteAffichee(page);
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
    await calque(page, 'Zone inondable').uncheck();
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(1);
    await expect.poll(() => externes.osm.length).toBeGreaterThan(0);
    // fiche d'un équipement
    await page.locator('#liste-equipements > li').first().getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    // aucune donnée du parcours dans les URL ; l'adresse n'apparaît que dans les requêtes de géocodage
    expect(journal.urls.length).toBeGreaterThan(4);
    for (const adresse of journal.urls) {
      const url = new URL(adresse);
      expect(url.search, adresse).toBe('');
      expect(url.hash, adresse).toBe('');
      expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|inondation/i);
    }
    const contenant = (await journal.lire()).filter((r) => decodeURIComponent(r.url).includes('Tilleuls') || r.corps.includes('Tilleuls'));
    expect(contenant.length).toBeGreaterThan(0);
    for (const r of contenant) expect(new URL(r.url).pathname).toBe('/geocodage/search');
    expect(console_).toEqual([]);
    console.log(`${largeur} px : parcours de ${((Date.now() - debut) / 1000).toFixed(1)} s, ${journal.urls.length} pages, ${contenant.length} requêtes portant l'adresse (géocodage)`);
  });
}

test('confidentialité : aucune requête tierce hors diagnostic ni sans adresse, trois hôtes avec adresse, adresse dans les seules requêtes de géocodage, Referer = origine', async ({ page }) => {
  await simuler(page);
  const journal = journaliser(page);
  const hors = async () => (await journal.lire()).filter((r) => !['localhost', '127.0.0.1'].includes(new URL(r.url).hostname));
  for (const chemin of ['/index.html', '/produit.html', '/panier.html', '/comparateur.html']) {
    await page.goto(chemin);
    await page.waitForSelector('html[data-rendu="pret"]');
  }
  await ouvrirDiagnostic(page, 1440, {});
  await page.waitForTimeout(500);
  expect(await hors()).toEqual([]);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect.poll(async () => (await hors()).length).toBeGreaterThan(6);
  const externes = await hors();
  for (const r of externes) expect(HOTES, r.url).toContain(new URL(r.url).hostname);
  expect(new Set(externes.map((r) => new URL(r.url).hostname))).toEqual(new Set(HOTES));
  const avecAdresse = (await journal.lire()).filter((r) => `${decodeURIComponent(r.url)} ${r.corps} ${r.referer ?? ''}`.includes('Tilleuls'));
  expect(avecAdresse.length).toBeGreaterThan(0);
  for (const r of avecAdresse) expect(new URL(r.url).pathname).toBe('/geocodage/search');
  expect(externes.filter((r) => !r.url.includes('/geocodage/')).length).toBeGreaterThan(3);
  for (const r of externes) expect(r.referer === null || r.referer === ORIGINE, `${r.url} → ${r.referer}`).toBe(true);
  expect(externes.some((r) => r.referer === ORIGINE)).toBe(true);
});

for (const largeur of [375, 768, 1440]) {
  test(`états de la page entière à ${largeur} px : sans adresse, carte affichée, échec`, async ({ page }, info) => {
    const externes = await simuler(page);
    const console_ = surveillerConsole(page);
    const controler = async (nom) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${nom} : débordement`).toBe(true);
      const violations = (await new AxeBuilder({ page }).analyze()).violations;
      expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`), `${nom} : axe`).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${nom}-${largeur}.png`), fullPage: true });
    };
    await ouvrirDiagnostic(page, largeur, {});
    await expect(page.locator('#carte-reelle-etat')).toHaveText('Saisissez une adresse pour afficher la carte.');
    await controler('sans-adresse');
    expect(externes.externes).toEqual([]);
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    await page.waitForTimeout(400);
    await controler('carte-reelle');
    expect(console_).toEqual([]);
    // échec : le géocodeur répond par une erreur (message, « Réessayer »)
    await page.unroute('https://data.geopf.fr/geocodage/**');
    await page.route('https://data.geopf.fr/geocodage/**', (route) => route.fulfill({ status: 504, body: '' }));
    await ouvrirDiagnostic(page, largeur);
    await expect(page.locator('#carte-reelle-etat')).toContainText("n'a pas pu être affichée");
    await controler('echec');
    expect(console_.filter((m) => !m.includes('Failed to load resource'))).toEqual([]);
  });
}

test('accueil : la recherche d\'adresse fonctionne comme avant, aucune requête tierce avant le diagnostic', async ({ page }) => {
  const externes = await simuler(page);
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('.recherche__microtexte')).toBeVisible();
  const champ = page.getByLabel(/Entrez votre adresse/);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await expect(page.locator('#adresse-erreur')).not.toBeEmpty();
  await expect(page).toHaveURL(/index\.html$|\/$/);
  expect(externes.externes).toEqual([]);
  await champ.fill(ADRESSE);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
  expect(new URL(page.url()).search).toBe('');
});
