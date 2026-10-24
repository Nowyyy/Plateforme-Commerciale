import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler } from './faisabilite-simulation.js';

const PAGE = '/assets/outils/faisabilite.html';
const LARGEURS = [375, 768, 1440];
const HOTES = ['data.geopf.fr', 'georisques.gouv.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const etat = (page, id) => page.locator(`tr[data-sonde="${id}"]`).getAttribute('data-etat');
// aucune couche lisible : GetCapabilities en 404 sur les deux noms d'hôte
const sansCouche = (r) => (r.parametres.REQUEST === 'GetCapabilities' ? { status: 404 } : undefined);

async function ouvrir(page, largeur = 1440) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(PAGE);
  await expect(page.locator('#contenu')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const lancer = async (page) => {
  await page.getByRole('button', { name: 'Lancer le test' }).click();
  await expect(page.locator('#titre-resultats')).toBeFocused();
};

test('saisie d\'un nom de couche et relance de la sonde 8 : une seule requête, état mis à jour, verdicts recalculés', async ({ page }) => {
  const { journal } = await simuler(page, sansCouche);
  await ouvrir(page);
  await expect(page.locator('#zone-couche')).toBeHidden();
  await lancer(page);
  expect(await etat(page, 'georisques-wms-image')).toBe('non-testee');
  await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : inconnu');
  await expect(page.locator('#zone-couche')).toBeVisible();
  const relance = page.getByRole('button', { name: 'Relancer cette sonde' });
  // champ vide : message, aucune requête
  await relance.click();
  await expect(page.locator('#progression')).toContainText('Saisissez un nom de couche');
  expect(journal).toHaveLength(7);
  await page.getByLabel('Nom de couche à tester (facultatif)').fill('PPRI_TEST couche');
  await relance.click();
  await expect.poll(() => etat(page, 'georisques-wms-image')).toBe('ok');
  expect(journal).toHaveLength(8);
  expect(journal[7].parametres).toMatchObject({ REQUEST: 'GetMap', LAYERS: 'PPRI_TEST couche' });
  await expect(page.locator('tr[data-sonde="georisques-wms-image"] td').nth(2)).toContainText('PPRI_TEST couche');
  await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : oui');
  expect(await page.locator('#texte-rapport').inputValue()).toContain('- georisques-wms-image : ok');
  // couche inconnue : l'image échoue, verdict recalculé
  await page.getByLabel('Nom de couche à tester (facultatif)').fill('INCONNUE');
  await page.unroute('**/*');
  await simuler(page, (r) => (r.parametres.LAYERS === 'INCONNUE' ? 'abort' : undefined));
  await relance.click();
  await expect.poll(() => etat(page, 'georisques-wms-image')).toBe('image-echec');
  await expect(page.locator('#liste-conclusions')).toContainText('Carte réelle possible depuis ce navigateur : non');
});

test('« Copier le rapport » : le texte copié est égal au contenu de la zone', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await simuler(page);
  await ouvrir(page);
  await lancer(page);
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  await expect(page.locator('#copie-statut')).toHaveText('Rapport copié.');
  const copie = await page.evaluate(() => navigator.clipboard.readText());
  expect(copie).toBe(await page.locator('#texte-rapport').inputValue());
  expect(copie).toContain('Rapport du test de faisabilité de la carte réelle');
});

test('presse-papiers indisponible : message affiché, texte sélectionné', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await simuler(page);
  await ouvrir(page);
  await lancer(page);
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  await expect(page.locator('#copie-statut')).toContainText('Copiez-le manuellement');
  const selection = await page.evaluate(() => {
    const z = document.getElementById('texte-rapport');
    return { actif: document.activeElement === z, debut: z.selectionStart, fin: z.selectionEnd, longueur: z.value.length };
  });
  expect(selection).toMatchObject({ actif: true, debut: 0 });
  expect(selection.fin).toBe(selection.longueur);
  expect(selection.longueur).toBeGreaterThan(200);
});

for (const largeur of LARGEURS) {
  test(`page entière à ${largeur} px (avant, réussi, échecs, relance) : console propre, axe sans violation, aucun débordement`, async ({ page }, info) => {
    const erreurs = [];
    let mode = 'reussi';
    // les 404 et abandons simulés sont consignés par le navigateur : seuls eux sont admis pendant les échecs
    page.on('console', (m) => ['error', 'warning'].includes(m.type())
      && !(mode === 'echecs' && /Failed to load resource/.test(m.text())) && erreurs.push(m.text()));
    await page.clock.install();
    await simuler(page, (r) => {
      if (mode === 'echecs') {
        if (r.hote === 'tile.openstreetmap.org' || r.hote === 'www.georisques.gouv.fr') return 'abort';
        if (r.hote === 'georisques.gouv.fr' && r.chemin.startsWith('/api/')) return 'attendre';
        if (r.hote === 'georisques.gouv.fr') return { status: 404 };
      }
      return undefined;
    });
    const verifier = async (nom) => {
      expect(await sansDebordement(page), `${nom} : débordement`).toBe(true);
      const resultats = await new AxeBuilder({ page }).analyze();
      expect(resultats.violations.map((v) => `${nom} ${v.id}: ${v.nodes.length}`)).toEqual([]);
      if (largeur !== 768) {
        await page.screenshot({ path: `test-results/faisabilite-b-${nom}-${largeur}.png`, fullPage: true });
        info.annotations.push({ type: 'capture', description: `faisabilite-b-${nom}-${largeur}.png` });
      }
    };
    await ouvrir(page, largeur);
    await verifier('avant');
    await lancer(page);
    await verifier('reussi');
    mode = 'echecs';
    await page.getByRole('button', { name: 'Lancer le test' }).click();
    await expect.poll(() => page.locator('tr[data-sonde="georisques-api"]').getAttribute('data-etat')).toBe('en-cours');
    await page.clock.runFor(10500);
    await expect(page.locator('#titre-resultats')).toBeFocused();
    await expect(page.locator('#zone-couche')).toBeVisible();
    await verifier('echecs');
    mode = 'reussi';
    await page.getByLabel('Nom de couche à tester (facultatif)').fill('PPRI_TEST');
    await page.getByRole('button', { name: 'Relancer cette sonde' }).click();
    await expect.poll(() => etat(page, 'georisques-wms-image')).toBe('ok');
    await verifier('relance');
    expect(erreurs).toEqual([]);
  });
}

test('à 375 px : le tableau reste lisible (page sans défilement horizontal, zone défilante focalisable, première colonne figée)', async ({ page }) => {
  await simuler(page);
  await ouvrir(page, 375);
  await lancer(page);
  expect(await sansDebordement(page)).toBe(true);
  const zone = page.getByRole('region', { name: 'Tableau des résultats' });
  await expect(zone).toHaveAttribute('tabindex', '0');
  const mesures = await zone.evaluate((el) => ({ defile: el.scrollWidth > el.clientWidth, largeur: el.clientWidth }));
  expect(mesures.defile).toBe(true);
  await zone.focus();
  await expect(zone).toBeFocused();
  const premiere = page.locator('#sondes tr').first().locator('th');
  const avant = await premiere.boundingBox();
  await zone.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  const apres = await premiere.boundingBox();
  expect(Math.abs(apres.x - avant.x)).toBeLessThan(1);
  expect(avant.width).toBeLessThan(mesures.largeur * 0.6);
  for (const l of await page.locator('#sondes tr').all()) expect((await l.boundingBox()).height).toBeLessThan(140);
});

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto(`http://localhost:4173${PAGE}`);
  await expect(page.locator('.outil__noscript')).toBeVisible();
  await expect(page.locator('.outil__noscript')).toHaveText('Cette page nécessite JavaScript.');
  await expect(page.locator('h1')).toBeHidden();
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.locator('#contenu')).toBeHidden();
  await contexte.close();
});

test('parcours complet : aucun appel hors des quatre hôtes simulés, aucune écriture de stockage, de cookie ni d\'IndexedDB', async ({ page }) => {
  await page.addInitScript(() => {
    window.__ecritures = [];
    const noter = (nom) => window.__ecritures.push(nom);
    for (const nom of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[nom];
      Storage.prototype[nom] = function (...a) { noter(nom); return original.apply(this, a); };
    }
    const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', { get: () => d.get.call(document), set: (v) => { noter('cookie'); d.set.call(document, v); } });
    const ouvrirBase = indexedDB.open.bind(indexedDB);
    indexedDB.open = (...a) => { noter('indexedDB'); return ouvrirBase(...a); };
    window.__sorties = [];
    const envoyer = navigator.sendBeacon?.bind(navigator);
    if (envoyer) navigator.sendBeacon = (...a) => { window.__sorties.push('beacon'); return envoyer(...a); };
  });
  const toutes = [];
  page.on('request', (r) => toutes.push(new URL(r.url()).hostname));
  const { journal } = await simuler(page, sansCouche);
  await ouvrir(page);
  await lancer(page);
  await page.getByLabel('Nom de couche à tester (facultatif)').fill('PPRI_TEST');
  await page.getByRole('button', { name: 'Relancer cette sonde' }).click();
  await expect.poll(() => etat(page, 'georisques-wms-image')).toBe('ok');
  await page.getByRole('button', { name: 'Copier le rapport' }).click();
  for (const hote of toutes) expect([...HOTES, 'localhost']).toContain(hote);
  for (const j of journal) expect(HOTES).toContain(j.hote);
  const bilan = await page.evaluate(() => ({
    ecritures: window.__ecritures, sorties: window.__sorties, cookie: document.cookie, local: localStorage.length, session: sessionStorage.length,
  }));
  expect(bilan).toEqual({ ecritures: [], sorties: [], cookie: '', local: 0, session: 0 });
});
