import { test, expect } from '@playwright/test';

const ROLES = ['en-tete', 'hero', 'recherche', 'avis'];

for (const largeur of [375, 1440]) {
  test(`accueil Hi-Fi : en-tete, hero, recherche et avis se suivent de haut en bas à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/accueil.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    const hauts = [];
    for (const role of ROLES) {
      const boite = await page.locator(`[data-role="${role}"]`).boundingBox();
      expect(boite, role).not.toBeNull();
      hauts.push(boite.y);
    }
    for (let i = 1; i < hauts.length; i++) {
      expect(hauts[i], `${ROLES[i]} sous ${ROLES[i - 1]}`).toBeGreaterThan(hauts[i - 1]);
    }
  });
}
