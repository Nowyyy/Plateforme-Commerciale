import { test, expect } from '@playwright/test';

const ATTENDU = { aleas: 4, protection: 3 };

// Nombre de colonnes déduit des positions (left) des cartes
// (seules les cartes visibles dans la piste comptent : les autres du carrousel défilent)
const colonnes = (page, role) => page.evaluate((r) => {
  const piste = document.querySelector(`[data-role="${r}"] .cartes`).getBoundingClientRect();
  const lefts = [...document.querySelectorAll(`[data-role="${r}"] .cartes > li`)]
    .map((li) => li.getBoundingClientRect())
    .filter((b) => b.left < piste.right - 1 && b.right > piste.left + 1)
    .map((b) => Math.round(b.left));
  return new Set(lefts).size;
}, role);

for (const largeur of [375, 1440]) {
  test(`cartes à ${largeur} px : h3, familles et lien vers le diagnostic`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    for (const [role, nombre] of Object.entries(ATTENDU)) {
      const cartes = page.locator(`[data-role="${role}"] .cartes > li`);
      await expect(cartes).toHaveCount(nombre);
      for (let i = 0; i < nombre; i++) {
        const carte = cartes.nth(i);
        await expect(carte.getByRole('heading', { level: 3 })).toBeVisible();
        expect(await carte.locator('.carte-bloc__familles li').count()).toBeGreaterThanOrEqual(role === 'protection' ? 3 : 2);
        const lien = carte.getByRole('link');
        await expect(lien).toHaveAttribute('href', 'diagnostic.html');
        const titre = await carte.getByRole('heading', { level: 3 }).innerText();
        await expect(lien).toHaveAccessibleName(`Voir les solutions ${titre}`);
        expect((await lien.boundingBox()).height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}

test('colonnes mesurées par les positions des cartes', async ({ page }) => {
  await page.goto('/index.html');
  const attendu = [[375, 1, 1], [768, 2, 1], [1440, 3, 3]];
  for (const [largeur, aleas, protection] of attendu) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForSelector('html[data-rendu="pret"]');
    expect(await colonnes(page, 'aleas'), `aléas à ${largeur}`).toBe(aleas);
    expect(await colonnes(page, 'protection'), `protection à ${largeur}`).toBe(protection);
  }
});

test('hauteurs égales, lien aligné en bas de carte à 1440 px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  for (const role of Object.keys(ATTENDU)) {
    const mesures = await page.evaluate((r) => [...document.querySelectorAll(`[data-role="${r}"] .cartes > li`)].map((li) => ({
      bas: Math.round(li.getBoundingClientRect().bottom),
      lienBas: Math.round(li.querySelector('a').getBoundingClientRect().bottom),
    })), role);
    expect(new Set(mesures.map((m) => m.bas)).size, role).toBe(1);
    expect(new Set(mesures.map((m) => m.lienBas)).size, role).toBe(1);
  }
});

test('robustesse : 5 aléas, aucun débordement et retour à la ligne', async ({ page }) => {
  await page.route('**/data/accueil.json', async (route) => {
    const reponse = await route.fetch();
    const donnees = await reponse.json();
    const liste = donnees.aleas.liste;
    donnees.aleas.liste = [...liste, { ...liste[0], id: 'cinquieme', titre: 'Cinquième aléa avec un titre assez long pour passer à la ligne' }];
    await route.fulfill({ response: reponse, json: donnees });
  });
  await page.goto('/index.html');
  for (const largeur of [375, 768, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('[data-role="aleas"] .cartes > li')).toHaveCount(5);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `débordement à ${largeur}`).toBeLessThanOrEqual(client);
    const rangees = await page.evaluate(() => new Set([...document.querySelectorAll('[data-role="aleas"] .cartes > li')].map((li) => Math.round(li.getBoundingClientRect().top))).size);
    expect(rangees, `rangées à ${largeur}`).toBe({ 375: 5, 768: 3, 1440: 1 }[largeur]);
    if (largeur === 768) await page.screenshot({ path: 'test-results/accueil-5-aleas-768.png', fullPage: true });
  }
});

for (const largeur of [375, 1440]) {
  test(`parcours à ${largeur} px : lien de la première carte d'aléa vers le diagnostic`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="aleas"] .cartes > li').first().getByRole('link').click();
    await expect(page).toHaveURL(/\/diagnostic\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('carrousel des aléas à 1440 px : 3 cartes visibles, flèches cycliques', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  const section = page.locator('[data-role="aleas"]');
  const precedent = section.getByRole('button', { name: 'Aléas précédents' });
  const suivant = section.getByRole('button', { name: 'Aléas suivants' });
  const cartes = section.locator('.cartes > li');
  await expect(cartes).toHaveCount(4);
  await section.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, window.scrollY + document.querySelector('#aleas').getBoundingClientRect().top));
  await expect(cartes.nth(2)).toBeInViewport({ ratio: 0.99 });
  await expect(cartes.nth(3)).not.toBeInViewport();
  await expect(precedent).toBeEnabled();
  await expect(suivant).toBeEnabled();
  expect((await suivant.boundingBox()).width).toBeGreaterThanOrEqual(44);
  await suivant.click();
  await expect(cartes.nth(3)).toBeInViewport({ ratio: 0.99 });
  await expect(cartes.nth(0)).not.toBeInViewport();
  // cyclique : la flèche de droite reste active en fin de piste et revient à la première carte
  await expect(suivant).toBeEnabled();
  await suivant.click();
  await expect(cartes.nth(0)).toBeInViewport({ ratio: 0.99 });
  await expect(cartes.nth(3)).not.toBeInViewport();
  // la flèche de gauche, au début, passe à la dernière carte
  await precedent.click();
  await expect(cartes.nth(3)).toBeInViewport({ ratio: 0.99 });
  await precedent.click();
  await expect(cartes.nth(0)).toBeInViewport({ ratio: 0.99 });
  await page.screenshot({ path: 'test-results/accueil-carrousel-1440.png' });
});

test('carrousel : flèches masquées sous 1200 px où toutes les cartes sont visibles', async ({ page }) => {
  for (const largeur of [375, 768]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    for (const fleche of await page.locator('.carrousel__fleche').all()) await expect(fleche).toBeHidden();
  }
});
