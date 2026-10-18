import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { generer } from '../../scripts/lots/generer.mjs';

const SCENARIOS = ['normal', 'un-seul-hifi', 'aucun-hifi'];
const LARGEURS = [375, 768, 1440];
const racine = (s) => `test-results/lots-essai/${s}`;
const url = (s) => `/test-results/lots-essai/${s}/lots/`;

test.beforeAll(() => {
  for (const s of SCENARIOS) {
    rmSync(racine(s), { recursive: true, force: true });
    const { entrees } = JSON.parse(readFileSync(`tests/lots-essais/${s}.json`, 'utf8'));
    generer({ sortie: racine(s), entrees });
    cpSync('css', `${racine(s)}/css`, { recursive: true });
    cpSync('assets/fonts', `${racine(s)}/assets/fonts`, { recursive: true });
  }
});

for (const s of SCENARIOS) {
  for (const largeur of LARGEURS) {
    test(`lots (${s}) à ${largeur} px : console, débordement, axe, requêtes`, async ({ page }) => {
      const erreurs = [];
      page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
      page.on('pageerror', (e) => erreurs.push(e.message));
      const externes = [];
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (u.hostname !== 'localhost' && u.protocol.startsWith('http')) externes.push(r.url());
      });
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(url(s));
      await page.evaluate(() => document.fonts.ready);
      expect(erreurs).toEqual([]);
      expect(externes).toEqual([]);
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll).toBeLessThanOrEqual(client);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `test-results/lots-${s}-${largeur}.png`, fullPage: true });
    });
  }
}

test('menu déroulant au clavier', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(url('normal'));
  const resume = page.locator('summary');
  await resume.focus();
  await expect(resume).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('details')).toHaveAttribute('open', '');
  const liens = page.locator('details a');
  expect(await liens.count()).toBe(3);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    await expect(liens.nth(i)).toBeFocused();
  }
  await resume.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
});

test('boutons : hauteur, chevauchement, disposition', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(url('normal'));
  const boites = async () => ({
    wf: await page.locator('.lots-bouton--secondaire').boundingBox(),
    hi: await page.locator('.lots-bouton--principal').boundingBox(),
    resume: await page.locator('summary').boundingBox(),
  });
  let b = await boites();
  for (const x of [b.wf, b.hi, b.resume]) expect(x.height).toBeGreaterThanOrEqual(44);
  expect(b.wf.y + b.wf.height).toBeLessThanOrEqual(b.hi.y);
  expect(b.wf.width).toBeGreaterThan(300);
  await page.setViewportSize({ width: 1440, height: 900 });
  b = await boites();
  expect(Math.abs(b.wf.y - b.hi.y)).toBeLessThan(2);
  expect(b.wf.x + b.wf.width).toBeLessThanOrEqual(b.hi.x);
  expect(b.resume.y).toBeGreaterThan(b.hi.y + b.hi.height);
});

test('état vide : le menu s\'ouvre et affiche le message', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(url('un-seul-hifi'));
  await page.locator('summary').click();
  await expect(page.getByText('Aucun ancien lot Hi-Fi pour l\'instant.')).toBeVisible();
  await expect(page.locator('details a')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/lots-vide-375.png', fullPage: true });
  await page.goto(url('aucun-hifi'));
  await expect(page.getByText('Aucun lot Hi-Fi publié pour l\'instant.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Page Hi-Fi' })).toHaveCount(0);
});

test('menu ouvert (capture)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(url('normal'));
  await page.locator('summary').click();
  await page.screenshot({ path: 'test-results/lots-menu-375.png', fullPage: true });
});

test('apercus/ redirige vers lots/', async ({ page }) => {
  await page.goto('/test-results/lots-essai/normal/apercus/');
  await page.waitForURL('**/lots/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lots du démonstrateur');
});

test('href des boutons selon le scénario', async ({ page }) => {
  const href = (nom) => page.getByRole('link', { name: nom }).getAttribute('href');
  await page.goto(url('normal'));
  expect(await href('Accès Wireframe')).toBe('../wireframes/index.html');
  expect(await href('Page Hi-Fi')).toBe('../lot-4/accueil.html');
  await page.goto(url('un-seul-hifi'));
  expect(await href('Accès Wireframe')).toBe('../wireframes/index.html');
  expect(await href('Page Hi-Fi')).toBe('../accueil.html');
  await page.goto(url('aucun-hifi'));
  expect(await href('Accès Wireframe')).toBe('../lot-1c/wireframes/index.html');
});
