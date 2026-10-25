import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { simuler } from './carte-reelle-simulation.js';

const produit = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const FINE = ' ';
const euro = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, FINE)}${FINE}€`;
const trouver = (id) => produit.produits.find((p) => p.id === id);
const CASES = '.carte-produit input';
const ETAT = '#comparateur-etat';

// Console, requêtes et URL visitées : rien d'externe, aucune donnée du comparateur ni de l'adresse dans une URL.
function surveiller(page) {
  const suivi = { messages: [], externes: [], urls: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:') && !['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'].includes(new URL(r.url()).hostname)) suivi.externes.push(r.url()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) suivi.urls.push(f.url()); });
  return suivi;
}

function controler(suivi) {
  expect(suivi.urls.length).toBeGreaterThanOrEqual(2);
  for (const adresse of suivi.urls) {
    const url = new URL(adresse);
    expect(url.search, adresse).toBe('');
    expect(url.hash, adresse).toBe('');
    expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|inondations|batardeau|clapet|pompe|grele|comparaison/i);
  }
  expect(suivi.externes).toEqual([]);
  expect(suivi.messages).toEqual([]);
}

const cochees = (page) => page.locator(CASES).evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value));
const colonnes = (page) => page.locator('.comp__table thead th[scope="col"]:not(:first-child)');

for (const largeur of [375, 1440]) {
  test(`parcours (a) à ${largeur} px : diagnostic, filtre Inondations, « Comparer ces solutions », tableau, fiche`, async ({ page }) => {
    await simuler(page); // services de la carte simulés
    const suivi = surveiller(page);
    const debut = Date.now();
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('.pastille-choix', { hasText: 'Inondations' }).click();
    const affiches = await page.locator('#liste-equipements > li').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
    expect(affiches).toEqual(['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']);
    const lien = page.getByRole('link', { name: 'Comparer ces solutions' });
    await expect(lien).toBeVisible();
    await lien.click();
    await page.waitForURL('**/comparateur.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('.pastille-alea input:checked')).toHaveAttribute('value', 'inondations');
    expect(await cochees(page)).toEqual(affiches);
    await expect(colonnes(page)).toHaveCount(3);
    for (const [i, id] of affiches.entries()) {
      const p = trouver(id);
      await expect(colonnes(page).nth(i)).toContainText(p.titre);
      await expect(page.locator('.comp__table tbody tr').nth(0).locator('td').nth(i)).toHaveText(`${p.performances.principale} cm`);
      await expect(page.locator('.comp__table tbody tr').nth(3).locator('td').nth(i)).toHaveText(euro(p.prix));
    }
    await colonnes(page).nth(1).getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clapet anti-retour');
    controler(suivi);
    console.log(`parcours comparateur (a) à ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s, ${suivi.urls.length} URL`);
  });

  test(`parcours (b) à ${largeur} px : pied de page, sélection par défaut, aléa, 3e produit, 4e refusé, retour à 2`, async ({ page }) => {
    const quatre = structuredClone(produit);
    quatre.produits.push({ ...trouver('pompe-de-relevage'), id: 'produit-extra', titre: 'Quatrième produit', reference: 'EXT-001', performances: { principale: 75, montage: 30, poids: 8 } });
    await page.route('**/data/produit.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(quatre) }));
    await simuler(page); // services de la carte simulés
    const suivi = surveiller(page);
    const debut = Date.now();
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('footer').getByRole('link', { name: 'Comparer des solutions', exact: true }).click();
    await page.waitForURL('**/comparateur.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('.pastille-alea input:checked')).toHaveAttribute('value', 'inondations');
    expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
    await expect(colonnes(page)).toHaveCount(2);

    await page.locator('.pastille-alea', { hasText: 'Grêle et vents' }).click();
    expect(await cochees(page)).toEqual(['bouclier-de-baie', 'volet-extrude']);
    await page.locator('.carte-produit input[value="filet-de-toiture"]').check();
    await expect(page.locator(ETAT)).toHaveText('3 produits comparés.');
    await expect(colonnes(page)).toHaveCount(3);

    await page.locator('.pastille-alea', { hasText: 'Inondations' }).click();
    await expect(page.locator(CASES)).toHaveCount(4);
    await page.locator('.carte-produit input[value="pompe-de-relevage"]').check();
    await expect(colonnes(page)).toHaveCount(3);
    const quatrieme = page.locator('.carte-produit input[value="produit-extra"]');
    await quatrieme.click();
    await expect(page.locator(ETAT)).toHaveText(produit.comparateur.messages.max);
    await expect(quatrieme).not.toBeChecked();
    await expect(colonnes(page)).toHaveCount(3);

    await page.locator('.carte-produit input[value="pompe-de-relevage"]').uncheck();
    await expect(colonnes(page)).toHaveCount(2);
    await expect(page.locator(ETAT)).toHaveText('2 produits comparés.');
    expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
    controler(suivi);
    console.log(`parcours comparateur (b) à ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s, ${suivi.urls.length} URL`);
  });
}
