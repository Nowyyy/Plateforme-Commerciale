import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { ADRESSE, simuler } from './carte-reelle-simulation.js';

const produit = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const LARGEURS = [375, 768, 1440];
const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const cochees = (page) => page.locator('.carte-produit input').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value));

async function ouvrirDiagnostic(page, largeur) {
  if (!page.__simule) page.__simule = await simuler(page); // lot 4e-B : sans adresse, aucun équipement n'est proposé
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((a) => sessionStorage.setItem('adresse', a), ADRESSE);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#liste-equipements > li').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const largeur of LARGEURS) {
  test(`diagnostic à ${largeur} px : « Comparer ces solutions » visible sous les cartes, sans débordement, axe sans violation`, async ({ page }, info) => {
    const erreurs = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    await ouvrirDiagnostic(page, largeur);
    const lien = page.getByRole('link', { name: 'Comparer ces solutions' });
    await expect(lien).toBeVisible();
    await expect(lien).toHaveAttribute('href', 'comparateur.html');
    const [boiteLien, derniere] = await Promise.all([lien.boundingBox(), page.locator('#liste-equipements > li').last().boundingBox()]);
    expect(boiteLien.y).toBeGreaterThanOrEqual(derniere.y + derniere.height);
    expect(boiteLien.height).toBeGreaterThanOrEqual(44);
    expect(await sansDebordement(page)).toBe(true);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    expect(erreurs).toEqual([]);
    await page.screenshot({ path: `test-results/diagnostic-c9-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `diagnostic-c9-${largeur}.png` });
  });
}

test('filtre « Tous » : le clic mène au comparateur avec l\'aléa de niveau maximal ; filtre « Feux de forêt » : aléa à deux produits', async ({ page }) => {
  await ouvrirDiagnostic(page, 1440);
  await page.getByRole('link', { name: 'Comparer ces solutions' }).click();
  await page.waitForURL('**/comparateur.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('.pastille-alea input:checked')).toHaveAttribute('value', 'inondations');
  expect(await cochees(page)).toEqual(['batardeau-modulable', 'clapet-anti-retour']);

  await ouvrirDiagnostic(page, 1440);
  await page.locator('.pastille-choix', { hasText: 'Feux de forêt' }).click();
  await page.getByRole('link', { name: 'Comparer ces solutions' }).click();
  await page.waitForURL('**/comparateur.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('.pastille-alea input:checked')).toHaveAttribute('value', 'feux-de-foret');
  expect(await cochees(page)).toEqual(['sprinkler-de-toiture', 'grille-pare-braises']);
  await expect(page.locator('#comparateur-aide-alea')).toBeVisible();
  await expect(page.locator('.comp__table thead th[scope="col"]:not(:first-child)')).toHaveCount(2);
});

test('diagnostic à 1440 px : exposition à droite de la carte (hauts alignés), équipements en pleine largeur dessous (lot 4e)', async ({ page }) => {
  await ouvrirDiagnostic(page, 1440);
  const boite = async (role) => (await page.locator(`[data-role="${role}"]`).boundingBox());
  const [carte, expo, equipements] = await Promise.all([boite('carte'), boite('exposition'), boite('equipements')]);
  console.log(`1440 px : exposition ${expo.width} px, equipements ${equipements.width} px, hauts ${carte.y} / ${expo.y}`);
  expect(Math.abs(carte.y - expo.y)).toBeLessThanOrEqual(2);
  expect(equipements.width).toBeGreaterThanOrEqual(3 * expo.width);
  expect(equipements.y).toBeGreaterThanOrEqual(expo.y + expo.height - 1);
});

const ETATS = [
  { nom: '2 produits', session: { alea: 'inondations', produits: ['batardeau-modulable', 'clapet-anti-retour'] }, colonnes: 2 },
  { nom: '3 produits', session: { alea: 'inondations', produits: ['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage'] }, colonnes: 3 },
  { nom: 'aléa à 2 produits', session: { alea: 'feux-de-foret', produits: ['sprinkler-de-toiture', 'grille-pare-braises'] }, colonnes: 2 },
  { nom: 'message de refus', session: { alea: 'canicule', produits: ['cool-roofing', 'isolant-reflecteur'] }, colonnes: 2, refus: true },
];

for (const largeur of LARGEURS) {
  for (const etat of ETATS) {
    test(`comparateur entier à ${largeur} px, état « ${etat.nom} » : console propre, axe sans violation, aucune requête externe, aucun débordement`, async ({ page }, info) => {
      const erreurs = [];
      const externes = [];
      page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
      page.on('pageerror', (e) => erreurs.push(e.message));
      page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) externes.push(r.url()); });
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.addInitScript((valeur) => sessionStorage.setItem('comparaison', JSON.stringify({ v: 1, ...valeur })), etat.session);
      await page.goto('/comparateur.html');
      await page.waitForSelector('html[data-rendu="pret"]');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('.comp__table thead th[scope="col"]:not(:first-child)')).toHaveCount(etat.colonnes);
      if (etat.refus) {
        await page.locator('.carte-produit input').first().focus();
        await page.keyboard.press('Space');
        await expect(page.locator('#comparateur-etat')).toHaveText(produit.comparateur.messages.min);
      }
      if (etat.nom === 'aléa à 2 produits') await expect(page.locator('#comparateur-aide-alea')).toBeVisible();
      const resultats = await new AxeBuilder({ page }).analyze();
      expect(resultats.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      expect(await sansDebordement(page)).toBe(true);
      expect(erreurs).toEqual([]);
      expect(externes).toEqual([]);
      await page.screenshot({ path: `test-results/comparateur-c9-${etat.nom.replace(/\W+/g, '-')}-${largeur}.png`, fullPage: true });
      info.annotations.push({ type: 'capture', description: `comparateur-c9-${largeur}.png` });
    });
  }
}

test('JavaScript désactivé : seul le message noscript est visible sur le comparateur et sur le diagnostic', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  for (const adresse of ['/comparateur.html', '/diagnostic.html']) {
    await page.goto(adresse);
    await expect(page.locator('.noscript')).toBeVisible();
    const visibles = await page.locator('body *:not(script):not(style):not(template):not(noscript):not(noscript *)').evaluateAll((els) => els
      .filter((e) => {
        const style = getComputedStyle(e);
        const boite = e.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && boite.width > 0 && boite.height > 0 && /\S/.test([...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''));
      })
      .map((e) => `${e.tagName}.${e.className}`));
    expect(visibles, adresse).toEqual([]);
  }
  await contexte.close();
});
