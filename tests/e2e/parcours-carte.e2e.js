import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const ORIGINE = 'http://localhost:4173/';
const etat = (page) => page.locator('#carte-reelle-etat');
const accepter = async (page) => {
  await page.locator('#carte-reelle-ouvrir').click();
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
};
const calque = (page, nom) => page.getByRole('group', { name: 'Calques' }).getByRole('checkbox', { name: nom });

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
  test(`parcours de la carte réelle à ${largeur} px : accueil, adresse, filtre, accord, calque, fond, retour, fiche`, async ({ page }) => {
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
    // retour à l'accueil, puis filtre « Inondations » depuis la carte d'aléa
    await page.locator('.marque').first().click();
    await page.waitForURL((u) => u.pathname === '/index.html' || u.pathname === '/');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="aleas"] .cartes > li').first().getByRole('link', { name: /Voir les solutions Inondations/ }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('#carte-reelle-ouvrir[aria-disabled]');
    await expect(page.getByRole('radio', { name: 'Inondations' })).toBeChecked();
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
    expect(externes.externes).toEqual([]);
    // panneau, accord, carte réelle
    await page.locator('#carte-reelle-ouvrir').click();
    await expect(page.locator('#carte-reelle-consentement')).toBeVisible();
    expect(externes.externes).toEqual([]);
    await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
    await expect(etat(page)).toHaveText('Carte réelle affichée.');
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
    await calque(page, 'Zone inondable').uncheck();
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(1);
    await page.getByRole('radio', { name: 'Plan IGN' }).check({ force: true });
    await expect.poll(() => externes.ign.length).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Revenir à la carte schématique' }).click();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    await expect(page.locator('.schema')).toBeVisible();
    // fiche d'un équipement
    await page.locator('#liste-equipements > li').first().getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    // aucune donnée du parcours dans les URL ; l'adresse n'apparaît que dans la requête de géocodage
    expect(journal.urls.length).toBeGreaterThan(4);
    for (const adresse of journal.urls) {
      const url = new URL(adresse);
      expect(url.search, adresse).toBe('');
      expect(url.hash, adresse).toBe('');
      expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|inondation/i);
    }
    const contenant = (await journal.lire()).filter((r) => decodeURIComponent(r.url).includes('Tilleuls') || r.corps.includes('Tilleuls'));
    expect(contenant.map((r) => new URL(r.url).pathname)).toEqual(['/geocodage/search']);
    expect(console_).toEqual([]);
    console.log(`${largeur} px : parcours de ${((Date.now() - debut) / 1000).toFixed(1)} s, ${journal.urls.length} pages, une requête portant l'adresse (géocodage)`);
  });
}

test('confidentialité : aucun hôte externe avant l\'accord, trois hôtes après, adresse dans une seule requête, Referer = origine', async ({ page }) => {
  await simuler(page);
  const journal = journaliser(page);
  await ouvrirDiagnostic(page, 1440);
  const hors = async () => (await journal.lire()).filter((r) => !['localhost', '127.0.0.1'].includes(new URL(r.url).hostname));
  expect(await hors()).toEqual([]);
  await page.locator('#carte-reelle-ouvrir').click();
  expect(await hors()).toEqual([]);
  await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
  await expect(etat(page)).toHaveText('Carte réelle affichée.');
  await page.getByRole('radio', { name: 'Plan IGN' }).check({ force: true });
  await expect.poll(async () => (await hors()).length).toBeGreaterThan(6);
  const externes = await hors();
  for (const r of externes) expect(HOTES, r.url).toContain(new URL(r.url).hostname);
  expect(new Set(externes.map((r) => new URL(r.url).hostname))).toEqual(new Set(HOTES));
  const avecAdresse = (await journal.lire()).filter((r) => `${decodeURIComponent(r.url)} ${r.corps} ${r.referer ?? ''}`.includes('Tilleuls'));
  expect(avecAdresse).toHaveLength(1);
  expect(new URL(avecAdresse[0].url).pathname).toBe('/geocodage/search');
  const tuiles = externes.filter((r) => !r.url.includes('/geocodage/'));
  expect(tuiles.length).toBeGreaterThan(3);
  for (const r of externes) expect(r.referer === null || r.referer === ORIGINE, `${r.url} → ${r.referer}`).toBe(true);
  expect(externes.some((r) => r.referer === ORIGINE)).toBe(true);
  for (const r of externes) expect(r.url, r.url).not.toMatch(/\/api\/v1|\/reverse|\/completion|gaspar|rga/);
});

for (const largeur of [375, 768, 1440]) {
  test(`états de la page entière à ${largeur} px : initial, panneau, carte réelle, retour au schéma, échec`, async ({ page }, info) => {
    const externes = await simuler(page);
    const console_ = surveillerConsole(page);
    await ouvrirDiagnostic(page, largeur);
    const controler = async (nom) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${nom} : débordement`).toBe(true);
      const violations = (await new AxeBuilder({ page }).analyze()).violations;
      expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`), `${nom} : axe`).toEqual([]);
      await page.screenshot({ path: info.outputPath(`${nom}-${largeur}.png`), fullPage: true });
    };
    await controler('initial');
    expect(externes.externes).toEqual([]);
    await page.locator('#carte-reelle-ouvrir').click();
    await expect(page.locator('#carte-reelle-consentement')).toBeVisible();
    await controler('panneau');
    expect(externes.externes).toEqual([]);
    await page.getByRole('button', { name: "J'accepte et j'affiche la carte réelle" }).click();
    await expect(etat(page)).toHaveText('Carte réelle affichée.');
    await page.waitForTimeout(400);
    await controler('carte-reelle');
    await page.getByRole('button', { name: 'Revenir à la carte schématique' }).click();
    await expect(page.locator('.schema')).toBeVisible();
    await controler('retour-schema');
    expect(console_).toEqual([]);
    // échec : le géocodeur répond par une erreur (message, schéma conservé)
    await page.unroute('https://data.geopf.fr/geocodage/**');
    await page.route('https://data.geopf.fr/geocodage/**', (route) => route.fulfill({ status: 504, body: '' }));
    await accepter(page);
    await expect(etat(page)).toContainText("n'a pas pu être affichée");
    await controler('echec');
    expect(console_.filter((m) => !m.includes('Failed to load resource'))).toEqual([]);
  });
}

test('accueil : le micro-texte annonce la carte réelle avec accord, la recherche d\'adresse fonctionne comme avant', async ({ page }) => {
  const externes = await simuler(page);
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  const micro = page.locator('.recherche__microtexte');
  await expect(micro).toBeVisible();
  await expect(micro).toHaveText("Démonstrateur : l'adresse reste dans votre navigateur. Elle n'est envoyée à un service externe que si vous demandez la carte réelle, avec votre accord.");
  const champ = page.getByLabel(/Entrez votre adresse/);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await expect(page.locator('#adresse-erreur')).not.toBeEmpty();
  await expect(page).toHaveURL(/index\.html$|\/$/);
  await champ.fill(ADRESSE);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
  expect(new URL(page.url()).search).toBe('');
  expect(externes.externes).toEqual([]);
});

test('JavaScript désactivé sur le diagnostic : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  await expect(page.locator('.noscript')).toBeVisible();
  expect(((await page.evaluate(() => document.body.innerText)) ?? '').trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});
