import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { choisirAdresse } from '../outils/choisir-adresse.js';
import { simuler } from './carte-reelle-simulation.js';

const { produits } = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const titreDe = (id) => produits.find((p) => p.id === id).titre;

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of [375, 768, 1440]) {
  test(`produit.html à ${largeur} px : console propre, sans débordement, axe, aucune requête externe`, async ({ page }) => {
    const messages = [];
    const requetes = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('request', (r) => requetes.push(r.url()));
    await ouvrir(page, largeur);
    expect(messages).toEqual([]);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    console.log(`${largeur} px : largeur de défilement ${defilement} px pour une fenêtre de ${fenetre} px`);
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
    await page.screenshot({ path: `test-results/produit-A-${largeur}.png`, fullPage: true });
  });
}

test('fil d\'Ariane : Accueil et Diagnostic mènent aux bonnes pages, le dernier élément est le produit courant', async ({ page }) => {
  await ouvrir(page, 375);
  const fil = page.getByRole('navigation', { name: 'Fil d\'Ariane' });
  await expect(fil.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', 'index.html');
  await expect(fil.getByRole('link', { name: 'Diagnostic' })).toHaveAttribute('href', 'diagnostic.html');
  const dernier = fil.locator('li').last();
  await expect(dernier).toHaveAttribute('aria-current', 'page');
  await expect(dernier).toHaveText('Batardeau modulable');
  await expect(dernier.locator('a')).toHaveCount(0);
  await fil.getByRole('link', { name: 'Diagnostic' }).click();
  await page.waitForURL('**/diagnostic.html');
});

test('produit de session : titre du h1 et du fil ; absent ou inconnu = batardeau ; clé conservée', async ({ page, browser }) => {
  await ouvrir(page, 1440, { produit: 'bouclier-de-baie' });
  const titre = titreDe('bouclier-de-baie');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
  await expect(page.locator('#fil-produit')).toHaveText(titre);
  expect(await page.evaluate(() => sessionStorage.getItem('produit'))).toBe('bouclier-de-baie');
  await page.reload();
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
  for (const valeur of [{}, { produit: 'inconnu' }]) {
    const contexte = await browser.newContext({ baseURL: 'http://localhost:4173/' });
    const autre = await contexte.newPage();
    await ouvrir(autre, 1440, valeur);
    await expect(autre.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    await expect(autre.locator('#fil-produit')).toHaveText('Batardeau modulable');
    await contexte.close();
  }
});

for (const largeur of [375, 1440]) {
  test(`parcours à ${largeur} px : accueil, adresse, diagnostic, « Voir la fiche », produit.html`, async ({ page }) => {
    await simuler(page); // suggestions de l'IGN simulées : la saisie stricte exige un choix dans la liste
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    const libelle = await choisirAdresse(page, page.getByLabel(/Entrez votre adresse/));
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(libelle);
    const premiere = page.locator('#liste-equipements > li').first();
    const titre = await premiere.getByRole('heading', { level: 3 }).textContent();
    await premiere.getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
  });
}
