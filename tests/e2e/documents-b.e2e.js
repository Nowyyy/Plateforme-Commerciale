import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const donnees = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const documents = donnees.produits.find((p) => p.id === 'batardeau-modulable').documents;
const libelles = documents.map((d) => `${d.titre} (PDF, exemple)`);

async function ouvrir(page, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const liens = (page) => page.locator('[data-role="documents"] .documents__lien');

for (const largeur of [375, 768, 1440]) {
  test(`documents à ${largeur} px : 2 liens visibles, sans débordement, axe propre`, async ({ page }) => {
    const messages = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    await ouvrir(page, largeur);
    await expect(liens(page)).toHaveCount(2);
    for (const [i, libelle] of libelles.entries()) {
      await expect(liens(page).nth(i)).toBeVisible();
      await expect(liens(page).nth(i)).toHaveText(libelle);
      await expect(liens(page).nth(i)).toHaveAttribute('href', documents[i].fichier);
      await expect(liens(page).nth(i)).toHaveAttribute('download', '');
      await expect(liens(page).nth(i)).toHaveAttribute('type', 'application/pdf');
    }
    expect(await page.locator('[data-role="documents"] .documents__liste').getAttribute('aria-busy')).toBe('false');
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(messages).toEqual([]);
    await page.locator('[data-role="documents"]').screenshot({ path: `test-results/lot7-B-documents-${largeur}.png` });
  });
}

test('téléchargement de chaque lien : nom suggéré, contenu %PDF-, moins de 50 Ko, aucune requête externe', async ({ page }) => {
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await ouvrir(page, 1440);
  for (const [i, doc] of documents.entries()) {
    const [telechargement] = await Promise.all([page.waitForEvent('download'), liens(page).nth(i).click()]);
    expect(telechargement.suggestedFilename()).toBe(doc.fichier.split('/').pop());
    const chemin = await telechargement.path();
    const octets = readFileSync(chemin);
    expect(octets.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(octets.length).toBeLessThan(50 * 1024);
  }
  expect(requetes.filter((u) => !u.startsWith('http://localhost:4173/') && !u.startsWith('data:'))).toEqual([]);
});

test('liens empilés à 375 px, côte à côte à 1440 px', async ({ page }) => {
  await ouvrir(page, 375);
  let [a, b] = await Promise.all([liens(page).nth(0).boundingBox(), liens(page).nth(1).boundingBox()]);
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  expect(Math.abs(a.x - b.x)).toBeLessThan(1);
  expect(a.width).toBeGreaterThan(375 - 2 * 32 - 1);
  await ouvrir(page, 1440);
  [a, b] = await Promise.all([liens(page).nth(0).boundingBox(), liens(page).nth(1).boundingBox()]);
  expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
  expect(Math.abs(a.y - b.y)).toBeLessThan(1);
});

test('clavier : chaque lien est atteignable, son focus est visible, Entrée déclenche le téléchargement', async ({ page }) => {
  await ouvrir(page, 1440);
  for (const [i, doc] of documents.entries()) {
    await liens(page).nth(i).focus();
    await expect(liens(page).nth(i)).toBeFocused();
    const contour = await liens(page).nth(i).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) };
    });
    expect(contour.style).not.toBe('none');
    expect(contour.largeur).toBeGreaterThanOrEqual(2);
    const [telechargement] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(telechargement.suggestedFilename()).toBe(doc.fichier.split('/').pop());
  }
  await liens(page).nth(0).focus();
  await page.keyboard.press('Tab');
  await expect(liens(page).nth(1)).toBeFocused();
});
