import { test, expect } from '@playwright/test';

const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};

const ouvrir = async (page, largeur) => {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/wireframes/diagnostic.html');
  await page.evaluate(() => document.fonts.ready);
};

test('diagnostic à 1440 px : carte à la largeur du score, équipements large et alignés en haut', async ({ page }) => {
  await ouvrir(page, 1440);
  const [carte, score, equip] = [await boite(page, 'carte'), await boite(page, 'score'), await boite(page, 'equipements')];
  console.log(`1440 px : carte ${carte.width} px, score ${score.width} px, equipements ${equip.width} px`);
  expect(Math.abs(carte.width - score.width)).toBeLessThanOrEqual(1);
  expect(equip.width).toBeGreaterThanOrEqual(1.8 * score.width);
  expect(Math.abs(equip.y - score.y)).toBeLessThanOrEqual(2);
  expect(carte.y).toBeGreaterThanOrEqual(score.y + score.height);
});

test('diagnostic à 1440 px : le bas des équipements est proche du bas de la carte (80 px)', async ({ page }) => {
  await ouvrir(page, 1440);
  const [carte, equip] = [await boite(page, 'carte'), await boite(page, 'equipements')];
  const ecart = Math.abs(equip.y + equip.height - (carte.y + carte.height));
  console.log(`1440 px : bas equipements ${equip.y + equip.height} px, bas carte ${carte.y + carte.height} px, écart ${ecart} px ; hauteurs ${equip.height} / ${carte.height}`);
  expect(ecart).toBeLessThanOrEqual(80);
});

test('diagnostic à 375 px : adresse, équipements, score, carte dans cet ordre', async ({ page }) => {
  await ouvrir(page, 375);
  const hauts = [];
  for (const role of ['adresse', 'equipements', 'score', 'carte']) hauts.push((await boite(page, role)).y);
  for (let i = 1; i < hauts.length; i++) expect(hauts[i]).toBeGreaterThan(hauts[i - 1]);
});

test('diagnostic à 768 px : pas de débordement, image à gauche du texte dans une carte d\'équipement', async ({ page }) => {
  await ouvrir(page, 768);
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
  const carte = page.locator('[data-role="equipements"] .wf-carte').first();
  const image = await carte.locator('.wf-emplacement').boundingBox();
  const titre = await carte.locator('h3').boundingBox();
  const cadre = await carte.boundingBox();
  expect(image.x + image.width).toBeLessThanOrEqual(titre.x);
  expect(image.width / cadre.width).toBeGreaterThan(0.3);
  expect(image.width / cadre.width).toBeLessThan(0.5);
});
