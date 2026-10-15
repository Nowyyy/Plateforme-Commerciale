import { test, expect } from '@playwright/test';

const ROLES = ['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'reassurance', 'avis', 'preuve', 'pied'];

for (const largeur of [375, 1440]) {
  test(`accueil : les blocs se suivent dans l'ordre des data-role à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/wireframes/accueil.html');
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
