import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';

const donnees = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const batardeau = donnees.produits.find((p) => p.id === 'batardeau-modulable');

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const vignette = (page, nom) => page.getByRole('radio', { name: nom, exact: true });

test('galerie : 4 boutons radio dans un fieldset, légende mise à jour, vue vidéo sans <video>, flèches', async ({ page }) => {
  await ouvrir(page, 1440);
  const fieldset = page.locator('fieldset.galerie__vues');
  await expect(fieldset.getByRole('radio')).toHaveCount(4);
  const vues = donnees.galerie.vues;
  await expect(vignette(page, vues[0].court)).toBeChecked();
  await expect(page.locator('#galerie-legende')).toHaveText(vues[0].legende);
  for (const vue of vues) {
    await vignette(page, vue.court).check({ force: true });
    await expect(page.locator('#galerie-legende')).toHaveText(vue.legende);
    await expect(page.locator('#galerie-panneau')).toHaveAttribute('data-type', vue.type);
  }
  // vue vidéo : rectangle 16:9 et glyphe de lecture, sans élément <video>
  const rect = await page.locator('.galerie__video').boundingBox();
  expect(rect).not.toBeNull();
  expect(rect.width / rect.height).toBeGreaterThan(1.75);
  expect(rect.width / rect.height).toBeLessThan(1.8);
  const glyphe = await page.locator('.galerie__video').evaluate((el) => getComputedStyle(el, '::before').clipPath);
  expect(glyphe).toContain('polygon');
  expect(await page.locator('video, img').count()).toBe(0);
  // flèches : la sélection suit le focus
  await vignette(page, vues[0].court).check({ force: true });
  await vignette(page, vues[0].court).focus();
  await page.keyboard.press('ArrowRight');
  await expect(vignette(page, vues[1].court)).toBeChecked();
  await expect(page.locator('#galerie-legende')).toHaveText(vues[1].legende);
  await page.keyboard.press('ArrowLeft');
  await expect(vignette(page, vues[0].court)).toBeChecked();
});

test('achat : titre, prix par formaterPrix, référence, délai et 3 pastilles « (exemple) »', async ({ page }) => {
  await ouvrir(page, 1440);
  const achat = page.locator('[data-role="achat"]');
  await expect(achat.getByRole('heading', { level: 1 })).toHaveText(batardeau.titre);
  await expect(achat).toContainText('Produit fictif (exemple)');
  await expect(achat.locator('#achat-prix')).toHaveText(formaterPrix(batardeau.prix));
  await expect(achat).toContainText('Prix TTC du matériel :');
  await expect(achat).toContainText(`Réf. ${batardeau.reference} (exemple)`);
  await expect(achat).toContainText(`Livraison directe usine : ${batardeau.delaiLivraison} (exemple)`);
  const pastilles = achat.locator('.pastille');
  await expect(pastilles).toHaveCount(3);
  for (const p of await pastilles.all()) await expect(p).toContainText('(exemple)');
});

for (const largeur of [375, 768]) {
  test(`à ${largeur} px : galerie au-dessus de l'achat, aucun débordement horizontal`, async ({ page }) => {
    await ouvrir(page, largeur);
    const haut = async (role) => (await page.locator(`[data-role="${role}"]`).boundingBox()).y;
    expect(await haut('galerie')).toBeLessThan(await haut('achat'));
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
  });
}

test('robustesse : titre de 120 caractères et prix de 1 234 567, aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  await page.route('**/data/produit.json', async (route) => {
    const reponse = await route.fetch();
    const corps = await reponse.json();
    corps.produits[0].titre = 'T'.repeat(60) + ' ' + 'M'.repeat(59);
    corps.produits[0].prix = 1234567;
    await route.fulfill({ response: reponse, json: corps });
  });
  for (const largeur of [375, 768, 1440]) {
    await ouvrir(page, largeur);
    await expect(page.locator('#achat-prix')).toHaveText(formaterPrix(1234567));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^T{60} M{59}$/);
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement, `${largeur} px`).toBeLessThanOrEqual(fenetre);
  }
});

test('captures et CLS (vues Éclaté puis Vidéo)', async ({ page }) => {
  for (const largeur of [375, 768, 1440]) {
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const e of liste.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await ouvrir(page, largeur);
    await page.waitForTimeout(300);
    console.log(`CLS ${largeur} px : ${await page.evaluate(() => window.__cls)}`);
    await page.screenshot({ path: `test-results/produit-B-${largeur}-eclate.png`, fullPage: true });
    await vignette(page, 'Vidéo').check({ force: true });
    await page.screenshot({ path: `test-results/produit-B-${largeur}-video.png`, fullPage: true });
  }
});
