// Lot 10a-B : CLS des pages corrigées, relief, empreinte, aide d'adresse, carte sans Leaflet, parcours, console, axe, JavaScript désactivé.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ouvrirDiagnostic, reponseGaspar, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';
import { mesurerClsPage } from '../outils/cls-matrice.mjs';
import { mesurerEmpreinte } from '../outils/empreinte.mjs';
import { mesurerReliefDansLaPage } from '../outils/relief.mjs';
import { LARGEURS_CLS, LARGEURS_EMPREINTE, PAGES, attendreEtatNominal, preparerPage } from '../outils/etats-pages.mjs';

const BASE = 'http://localhost:4173';
const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];

// 1. CLS des pages signalées sous seuil au départ (connexion : CLS Lighthouse de 0,348 ; diagnostic : bonnes pratiques 96)
for (const nom of ['connexion', 'diagnostic']) {
  test(`${nom}.html : CLS d'au plus 0,08 de 360 à 1440 px par pas de 20, JSON retardés de 400 ms`, async ({ browser }) => {
    test.setTimeout(400000);
    const etat = PAGES.find((p) => p.nom === nom);
    const resultat = await mesurerClsPage(browser, etat, LARGEURS_CLS, BASE);
    console.log(`${nom}.html : CLS maximal ${resultat.cls} à ${resultat.largeur} px`);
    expect(resultat.cls).toBeLessThanOrEqual(0.08);
  });
}

test('connexion.html : CLS d\'au plus 0,08 sur un réseau lent (1,6 Mbit/s, 150 ms) où connexion.js arrive après le rendu', async ({ browser }) => {
  test.setTimeout(120000);
  for (const largeur of [360, 412, 768, 1440]) {
    const contexte = await browser.newContext({ baseURL: BASE, viewport: { width: largeur, height: 900 } });
    const page = await contexte.newPage();
    const cdp = await contexte.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await page.addInitScript(() => {
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const e of liste.getEntries()) if (!e.hadRecentInput) globalThis.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/connexion.html');
    await page.waitForSelector('form:not([hidden])');
    await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => globalThis.__cls);
    expect(cls, `${largeur} px`).toBeLessThanOrEqual(0.08);
    await contexte.close();
  }
});

// 2. Relief
test('relief : à 375 et 768 px, aucun bloc de texte hors carte blanche ne chevauche le tracé visible (14 pages) ; à 1440 px le décor est présent', async ({ browser }) => {
  test.setTimeout(300000);
  const problemes = [];
  for (const etat of PAGES) {
    for (const largeur of [375, 768, 1440]) {
      const contexte = await browser.newContext({ baseURL: BASE, viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
      const page = await contexte.newPage();
      await preparerPage(page, etat);
      await page.goto(`/${etat.fichier}`);
      await attendreEtatNominal(page, etat);
      const m = await page.evaluate(mesurerReliefDansLaPage);
      if (largeur === 1440) {
        expect(m.groupes.length, `${etat.fichier} à 1440 px`).toBe(2);
        await expect(page.locator('.relief__groupe--1 use')).toHaveCount(6);
        await expect(page.locator('.relief')).toHaveCSS('pointer-events', 'none');
      } else {
        expect(m.groupes.length, `${etat.fichier} à ${largeur} px`).toBe(largeur === 375 ? 1 : 2);
        for (const t of m.textes) problemes.push(`${etat.fichier} à ${largeur} px : « ${t.texte} » chevauche ${t.groupe}`);
      }
      await contexte.close();
    }
  }
  expect(problemes).toEqual([]);
});

// 3. Empreinte : identique à l'état de départ, sauf la liste d'écarts autorisés (vide : aucune correction du lot ne déplace un bloc)
test('empreinte : les 14 pages égalent tests/empreintes (1 px) hors écarts autorisés, et la liste des écarts autorisés du lot 10a-B est vide', async ({ browser }) => {
  test.setTimeout(300000);
  const autorises = JSON.parse(readFileSync('tests/empreintes/ecarts-autorises-10a-b.json', 'utf8'));
  expect(autorises.ecarts).toEqual([]);
  for (const etat of PAGES) {
    const attendue = JSON.parse(readFileSync(`tests/empreintes/${etat.nom}.json`, 'utf8'));
    for (const largeur of LARGEURS_EMPREINTE) {
      const contexte = await browser.newContext({ baseURL: BASE, reducedMotion: 'reduce' });
      const page = await contexte.newPage();
      await preparerPage(page, etat);
      await expect.poll(async () => {
        const mesuree = await mesurerEmpreinte(page, etat, largeur);
        return Object.entries(attendue.largeurs[largeur]).filter(([cle, a]) => !mesuree[cle] || a.some((v, i) => Math.abs(v - mesuree[cle][i]) > 1)).map(([cle]) => cle);
      }, { message: `${etat.fichier} à ${largeur} px`, timeout: 15000, intervals: [500] }).toEqual([]);
      await contexte.close();
    }
  }
});

// 4. Aide de la saisie d'adresse
const AIDE = 'Choisissez une adresse dans la liste pour continuer.';
test('accueil : aide visible et bouton inactif tant que l\'adresse n\'est pas choisie ; aide masquée et bouton actif une fois choisie, visible de nouveau si le texte change', async ({ page }) => {
  await simuler(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  const aide = page.locator('#adresse-aide-validation');
  const bouton = page.getByRole('button', { name: 'Évaluer mon exposition' });
  const champ = page.getByLabel(/Entrez votre adresse/);
  await expect(aide).toBeVisible();
  await expect(aide).toHaveText(AIDE);
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await choisirAdresse(page, champ);
  await expect(aide).toBeHidden();
  await expect(bouton).toHaveAttribute('aria-disabled', 'false');
  await expect(bouton).toHaveClass(/bouton--action/);
  await expect(bouton).toHaveAttribute('aria-describedby', 'adresse-aide-validation');
  await expect(page.locator('#adresse-aide-validation')).toHaveCount(1);
  await champ.pressSequentially('x');
  await expect(aide).toBeVisible();
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
});

test('diagnostic : aide masquée pour l\'adresse de session, visible dès que le texte change, masquée de nouveau après un choix ; « Mettre à jour » actif ou non en conséquence', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  const aide = page.locator('#adresse-aide-validation');
  const bouton = page.getByRole('button', { name: 'Mettre à jour' });
  const champ = page.getByRole('combobox');
  await expect(aide).toBeHidden();
  await expect(bouton).toHaveAttribute('aria-disabled', 'true'); // adresse identique : rien à mettre à jour
  await expect(bouton).toHaveAttribute('aria-describedby', 'adresse-aide-validation');
  await champ.press('End');
  await champ.pressSequentially(' bis'); // le texte change : l'adresse n'est plus celle de la session
  await expect(aide).toBeVisible();
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await choisirAdresse(page, champ, '12 rue des Tilleuls', 1);
  await expect(aide).toBeHidden();
  await expect(bouton).toHaveAttribute('aria-disabled', 'false');
});

// 5 et 6. Carte : Leaflet bloqué, géocodage en échec
test('carte : Leaflet bloqué avec géocodage et API réussis → message d\'échec de la carte, aléas lus dans le panneau, niveau calculé', async ({ page }) => {
  const journal = await simuler(page, { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Séisme']) }, rga: { corps: reponseRga(2) } } });
  await page.route('**/assets/vendor/leaflet/leaflet.js', (route) => route.abort());
  await ouvrirDiagnostic(page, 1440);
  await expect(page.locator('#carte-reelle-etat')).toContainText("n'a pas pu être affichée");
  await expect(page.locator('#carte-reelle-reessayer')).toBeVisible();
  await expect(page.locator('#aleas-annonce')).not.toBeEmpty();
  await expect(page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox')).not.toHaveCount(0);
  await expect(page.locator('#exposition-niveau')).toHaveText("Niveau d'exposition : modéré (indicatif)");
  expect(journal.api.length).toBeGreaterThanOrEqual(2); // lecture des aléas (gaspar puis rga)
  expect(journal.osm).toHaveLength(0);
});

test('carte : géocodage en échec → message, aucune lecture de l\'API, panneau en « niveau non déterminé »', async ({ page }) => {
  const journal = await simuler(page, { geocodage: { status: 500, corps: '{}' } });
  await ouvrirDiagnostic(page, 1440);
  await expect(page.locator('#carte-reelle-etat')).toContainText("n'a pas pu être affichée");
  await expect(page.locator('#exposition-niveau')).toHaveText("Niveau non déterminé : les aléas de cette adresse n'ont pas pu être lus");
  expect(journal.api).toHaveLength(0);
});

// 7. Parcours existants après nettoyage (relance isolée)
test('parcours principal, vendeur, client, SAV, comparateur et adresse stricte : verts après le nettoyage', async () => {
  test.slow();
  test.setTimeout(900000);
  const sortie = execFileSync('npx', ['playwright', 'test', 'tests/e2e/parcours-principal.e2e.js', 'tests/e2e/parcours-vendeur.e2e.js', 'tests/e2e/parcours-client.e2e.js',
    'tests/e2e/parcours-sav.e2e.js', 'tests/e2e/parcours-comparateur.e2e.js', 'tests/e2e/parcours-adresse-stricte.e2e.js', '--workers=2', '--reporter=line', '--output=test-results/parcours-10a-b'],
  { encoding: 'utf8', env: { ...process.env, CI: '' }, timeout: 840000 });
  expect(sortie).toMatch(/\d+ passed/);
  expect(sortie).not.toMatch(/\d+ failed/);
});

// 8 et 9. Console, axe, requêtes externes
for (const etat of PAGES) {
  test(`${etat.fichier} : console propre, axe sans violation, aucune requête externe hors carte et saisie (375, 768 et 1440 px)`, async ({ browser }) => {
    test.setTimeout(120000);
    for (const largeur of [375, 768, 1440]) {
      const contexte = await browser.newContext({ baseURL: BASE, viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
      const page = await contexte.newPage();
      const messages = surveillerConsole(page);
      const journal = await preparerPage(page, etat);
      await page.goto(`/${etat.fichier}`);
      await attendreEtatNominal(page, etat);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id} : ${v.nodes.length}`), `${etat.fichier} à ${largeur} px`).toEqual([]);
      expect(messages, `${etat.fichier} à ${largeur} px`).toEqual([]);
      for (const e of journal.externes) expect(HOTES, e.url).toContain(new URL(e.url).hostname);
      await contexte.close();
    }
  });
}

// 10. JavaScript désactivé
test('JavaScript désactivé : seul le message noscript est visible sur les 14 pages', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  for (const etat of PAGES) {
    await page.goto(`${BASE}/${etat.fichier}`);
    expect((await page.evaluate(() => document.body.innerText)).trim(), etat.fichier).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
