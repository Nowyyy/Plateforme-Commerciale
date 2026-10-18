import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NOMBRES = { aleas: 4, protection: 3, comment: 3 };

for (const largeur of [375, 768, 1440]) {
  test(`accueil.html à ${largeur} px : listes rendues, console propre, axe sans violation`, async ({ page }, info) => {
    const erreurs = [];
    page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
    page.on('pageerror', (e) => erreurs.push(e.message));
    const externes = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.protocol.startsWith('http')) externes.push(r.url());
    });

    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/accueil.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.evaluate(() => document.fonts.ready);

    for (const [role, nombre] of Object.entries(NOMBRES)) {
      const conteneur = page.locator(`[data-role="${role}"] [aria-busy]`).first();
      await expect(conteneur).toHaveAttribute('aria-busy', 'false');
      await expect(conteneur.locator(':scope > li')).toHaveCount(nombre);
    }
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

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

    await page.screenshot({ path: `test-results/accueil-listes-${largeur}.png`, fullPage: true });
    info.annotations.push({ type: 'capture', description: `accueil-listes-${largeur}.png` });
  });
}

for (const [libelle, id, role] of [['Aléas', 'aleas', 'aleas'], ['Comment ça marche', 'comment', 'comment']]) {
  test(`menu à 375 px : cinq libellés atteignables, « ${libelle} » ferme le menu et place le focus`, async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/accueil.html');
    await page.waitForSelector('html[data-rendu="pret"]');

    const bouton = page.locator('[data-menu-bouton]');
    await bouton.click();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    // quatre libellés dans le panneau, le Panier reste dans la barre : cinq au total
    await expect(nav.getByRole('link')).toHaveText(['Aléas', 'Comment ça marche', 'Vendre sur la plateforme', 'Mon compte']);
    await expect(page.locator('.entete__panier-barre')).toBeVisible();
    if (id === 'aleas') await page.screenshot({ path: 'test-results/accueil-375-menu-5.png' });

    await nav.getByRole('link', { name: libelle, exact: true }).click();
    await expect(bouton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
    const section = page.locator(`#${id}`);
    await expect(section).toHaveAttribute('data-role', role);
    await expect(section).toBeFocused();
    await expect(section).toBeInViewport();
    const haut = await section.evaluate((el) => el.getBoundingClientRect().top);
    expect(haut).toBeGreaterThanOrEqual(-1);
    info.annotations.push({ type: 'haut', description: String(haut) });
  });
}
