import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const LARGEURS = [375, 768, 1440];

for (const largeur of LARGEURS) {
  test(`index.html à ${largeur} px`, async ({ page }, info) => {
    const erreurs = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    const externes = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });

    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    await page.evaluate(() => document.fonts.ready);

    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
    await expect(page.locator('.erreur-chargement')).toHaveCount(0);

    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);

    await page.screenshot({ path: `test-results/accueil-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `accueil-${largeur}.png` });
  });
}

test('menu mobile : ouverture, aria-expanded, Échap et retour du focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');

  const bouton = page.locator('[data-menu-bouton]');
  const nav = page.getByRole('navigation');
  await expect(bouton).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();
  expect((await bouton.boundingBox()).height).toBeGreaterThanOrEqual(44);

  await bouton.click();
  await expect(bouton).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  await page.screenshot({ path: 'test-results/accueil-375-menu.png', fullPage: true });

  await page.keyboard.press('Escape');
  await expect(bouton).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();
  await expect(bouton).toBeFocused();

  await bouton.click();
  await expect(nav).toBeVisible();
});

test('desktop : navigation en ligne, bouton Menu absent, Panier en dernier', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('[data-menu-bouton]')).toBeHidden();
  const items = await page.locator('header nav li').allInnerTexts();
  expect(items.map((t) => t.trim())).toEqual(['Vendre sur la plateforme', 'Mon compte', 'Panier']);
  await expect(page.getByRole('link', { name: 'Panier' })).toHaveAttribute('href', 'wireframes/panier.html');
});

test('JavaScript désactivé : aucun texte visible hors message noscript', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto('http://localhost:4173/index.html');
  const visible = (await page.evaluate(() => document.body.innerText)).trim();
  expect(visible).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});

test('échec de chargement des données : alerte visible, page non cassée', async ({ page }) => {
  await page.route('**/data/accueil.json', (route) => route.fulfill({ status: 500, body: 'x' }));
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="erreur"]');
  await expect(page.getByRole('alert')).toBeVisible();
});

for (const largeur of [375, 1440]) {
  test(`illustration visible à ${largeur} px, légende affichée, aucune erreur de chargement`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    const svg = page.getByRole('img', { name: /mur avec seuil/ });
    await expect(svg).toBeVisible();
    const boite = await svg.boundingBox();
    expect(boite.width).toBeGreaterThan(250);
    expect(boite.height).toBeGreaterThan(150);
    await expect(page.getByText('Illustration schématique (exemple)')).toBeVisible();
    await expect(page.locator('.erreur-chargement')).toHaveCount(0);
    await expect(page.locator('.avis__carre')).toHaveCount(5);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('hero : deux colonnes à 1440 px, illustration sous le texte à 375 px', async ({ page }) => {
  await page.goto('/index.html');
  const pos = async () => page.evaluate(() => {
    const t = document.querySelector('.hero__texte').getBoundingClientRect();
    const v = document.querySelector('.hero__visuel').getBoundingClientRect();
    return { texteBas: t.bottom, visuelHaut: v.top, texteDroite: t.right, visuelGauche: v.left };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForSelector('html[data-rendu="pret"]');
  const bureau = await pos();
  expect(bureau.visuelGauche).toBeGreaterThanOrEqual(bureau.texteDroite);
  await page.setViewportSize({ width: 375, height: 900 });
  const mobile = await pos();
  expect(mobile.visuelHaut).toBeGreaterThanOrEqual(mobile.texteBas);
  // mobile : l'illustration fait partie du hero, elle précède la recherche
  await page.waitForSelector('.recherche:not([hidden])');
  const rechercheHaut = await page.evaluate(() => document.querySelector('.hero__recherche').getBoundingClientRect().top);
  const visuelBas = await page.evaluate(() => document.querySelector('.hero__visuel').getBoundingClientRect().bottom);
  expect(rechercheHaut).toBeGreaterThanOrEqual(visuelBas);
});
