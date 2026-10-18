import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROLES = ['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'reassurance', 'preuve', 'avis', 'pied'];

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : console propre, aucun débordement, axe, ordre des 10 blocs`, async ({ page }, info) => {
    const erreurs = [];
    const externes = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(1);
    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(client);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    const hauts = [];
    for (const role of ROLES) hauts.push((await page.locator(`[data-role="${role}"]`).boundingBox()).y);
    for (let i = 1; i < hauts.length; i++) expect(hauts[i], `${ROLES[i]} sous ${ROLES[i - 1]}`).toBeGreaterThan(hauts[i - 1]);
    await page.screenshot({ path: `test-results/accueil-c-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `accueil-c-${largeur}.png` });
  });
}

test('pied : 1 colonne à 375 px, 3 colonnes à 1440 px, entrées « (à venir) » sans balise <a>', async ({ page }) => {
  const colonnes = () => page.locator('.pied__colonne').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  expect(await colonnes()).toBe(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await colonnes()).toBe(3);

  const pied = page.locator('footer');
  for (const libelle of ['Mentions légales (à venir)', 'À propos du démonstrateur (à venir)']) {
    const entree = pied.getByText(libelle, { exact: true });
    await expect(entree).toHaveCount(1);
    expect(await entree.evaluate((el) => el.tagName)).not.toBe('A');
    await expect(pied.getByRole('link', { name: libelle })).toHaveCount(0);
  }
  await expect(pied.getByRole('link')).toHaveText(['Vendre sur la plateforme', 'Mon compte', 'Panier', 'Service après-vente']);
  await expect(pied.getByText('Démonstrateur : contenus fictifs, aucune vente')).toBeVisible();
});

for (const largeur of [375, 1440]) {
  test(`parcours cliqués à ${largeur} px : pied et en-tête`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    const ouvrir = async () => {
      await page.goto('/index.html');
      await page.waitForSelector('html[data-rendu="pret"]');
    };
    for (const [libelle, cible] of [['Service après-vente', 'sav-acces.html'], ['Vendre sur la plateforme', 'pro.html'], ['Panier', 'panier.html']]) {
      await ouvrir();
      await page.locator('footer').getByRole('link', { name: libelle, exact: true }).click();
      await page.waitForURL(`**/wireframes/${cible}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }

    await ouvrir();
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.locator('header').getByRole('link', { name: 'Mon compte', exact: true }).click();
    await page.waitForURL('**/wireframes/connexion.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await ouvrir();
    for (const libelle of ['Aléas', 'Comment ça marche']) {
      await expect(page.locator('footer').getByRole('link', { name: libelle, exact: true })).toHaveCount(0);
    }
  });
}

test('JavaScript désactivé : seul le message noscript est visible, pied compris', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto('http://localhost:4173/index.html');
  expect((await page.evaluate(() => document.body.innerText)).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});
