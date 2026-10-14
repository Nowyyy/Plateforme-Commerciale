import { test, expect } from '@playwright/test';

for (const largeur of [375, 1440]) {
  test(`parcours accueil → diagnostic → produit → panier à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/wireframes/accueil.html');

    await page.getByLabel(/Entrez votre adresse/).fill('1 rue Exemple, 00000 Ville');
    await page.getByRole('link', { name: 'Évaluer' }).click();
    await expect(page).toHaveURL(/\/wireframes\/diagnostic\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Voir la fiche' }).first().click();
    await expect(page).toHaveURL(/\/wireframes\/produit\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Ajouter au panier' }).click();
    await expect(page).toHaveURL(/\/wireframes\/panier\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}
