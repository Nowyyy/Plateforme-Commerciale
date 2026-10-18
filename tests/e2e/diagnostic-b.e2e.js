import { test, expect } from '@playwright/test';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const diag = JSON.parse((await import('node:fs')).readFileSync('data/diagnostic.json', 'utf8'));

async function ouvrir(page, largeur, session = { adresse: ADRESSE }) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const cartes = (page) => page.locator('#liste-equipements > li');
const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};

test('équipements : « Tous » donne 3 cartes complètes ; « Inondations » des cartes liées à l\'aléa', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(cartes(page)).toHaveCount(3);
  for (const carte of await cartes(page).all()) {
    await expect(carte.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(carte).toContainText('Neutralise :');
    await expect(carte).toContainText('Prix indicatif TTC :');
    await expect(carte).toContainText('(exemple)');
    await expect(carte.getByRole('link', { name: /Voir la fiche/ })).toHaveAttribute('href', 'wireframes/produit.html');
  }
  await page.getByRole('radio', { name: 'Inondations' }).check({ force: true });
  const n = await cartes(page).count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(3);
  const titre = diag.aleas.find((a) => a.id === 'inondations').titre;
  for (const carte of await cartes(page).all()) await expect(carte).toContainText(`Neutralise : ${titre}`);
  await expect(page.locator('#annonce-diagnostic')).toContainText('équipements recommandés');
});

test('score : niveau en toutes lettres, jauge de 4 segments, repère sous le bon segment, pour chaque pastille', async ({ page }) => {
  await ouvrir(page, 1440);
  const attendus = [['Tous', Math.max(...diag.aleas.map((a) => a.niveau))], ...diag.aleas.map((a) => [a.court, a.niveau])];
  for (const [nom, niveau] of attendus) {
    await page.getByRole('radio', { name: nom, exact: true }).check({ force: true });
    await expect(page.locator('#score-niveau')).toHaveText(`Niveau d'exposition : ${diag.niveaux[niveau - 1]}`);
    const segments = page.locator('#jauge > li');
    await expect(segments).toHaveCount(4);
    await expect(page.locator('#jauge .est-plein')).toHaveCount(niveau);
    const repere = await page.locator('#jauge .jauge__repere').boundingBox();
    const segment = await segments.nth(niveau - 1).boundingBox();
    expect(repere.y).toBeGreaterThanOrEqual(segment.y + segment.height - 1);
    expect(repere.x).toBeGreaterThanOrEqual(segment.x);
    expect(repere.x + repere.width).toBeLessThanOrEqual(segment.x + segment.width);
  }
  await expect(page.locator('#jauge')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByText('Score illustratif')).toBeVisible();
});

test('mise en page : 1440 px (colonnes), 768 px (visuel à gauche), aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  await ouvrir(page, 1440);
  const [equip, score] = [await boite(page, 'equipements'), await boite(page, 'score')];
  console.log(`1440 px : equipements ${equip.width} px (haut ${equip.y}), score ${score.width} px (haut ${score.y})`);
  expect(equip.width).toBeGreaterThanOrEqual(1.8 * score.width);
  expect(Math.abs(equip.y - score.y)).toBeLessThanOrEqual(2);
  const hauteurs = await cartes(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(Math.max(...hauteurs) - Math.min(...hauteurs)).toBeLessThanOrEqual(2);
  const premiere = cartes(page).first();
  const [visuel, carte] = [await premiere.locator('.equipement__visuel').boundingBox(), await premiere.boundingBox()];
  expect(visuel.height).toBeGreaterThanOrEqual(carte.height - 40);

  for (const largeur of [375, 768, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement, `${largeur} px`).toBeLessThanOrEqual(fenetre);
  }

  await page.setViewportSize({ width: 768, height: 900 });
  const [v, texte] = [await premiere.locator('.equipement__visuel').boundingBox(), await premiere.locator('.equipement__corps').boundingBox()];
  expect(v.x + v.width).toBeLessThanOrEqual(texte.x + 1);
});

test('robustesse : 6 équipements pour un aléa, seulement 3 cartes, sans débordement', async ({ page }) => {
  await page.route('**/data/diagnostic.json', async (route) => {
    const donnees = await (await route.fetch()).json();
    for (let i = 0; i < 4; i += 1) donnees.equipements.push({ id: `extra-${i}`, titre: `Équipement supplémentaire au nom assez long pour passer à la ligne ${i}`, aleas: ['inondations'], priorite: 20 + i, prix: 1000 + i });
    await route.fulfill({ json: donnees });
  });
  await ouvrir(page, 375);
  await page.getByRole('radio', { name: 'Inondations' }).check({ force: true });
  expect(diag.equipements.filter((e) => e.aleas.includes('inondations')).length + 4).toBeGreaterThanOrEqual(6);
  await expect(cartes(page)).toHaveCount(3);
  const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
  expect(defilement).toBeLessThanOrEqual(fenetre);
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqués à ${largeur} px : accueil, adresse, diagnostic ; carte d'aléa ; fiche produit`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
    await expect(page.getByRole('radio', { name: 'Tous' })).toBeChecked();
    expect(decodeURIComponent(page.url())).not.toContain('Tilleuls');

    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.getByRole('link', { name: /Voir les solutions\s+Inondations et crues/ }).click();
    await page.waitForURL('**/diagnostic.html');
    await expect(page.getByRole('radio', { name: 'Inondations' })).toBeChecked();
    expect(new URL(page.url()).search).toBe('');
    expect(await page.evaluate(() => sessionStorage.getItem('alea'))).toBeNull();

    await page.getByRole('link', { name: /Voir la fiche/ }).first().click();
    await page.waitForURL('**/wireframes/produit.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}
