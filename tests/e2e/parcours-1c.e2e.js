import { test, expect } from '@playwright/test';

// À 375 px la navigation est repliée : on déplie d'abord le menu (case + label, sans JavaScript).
async function ouvrirMenu(page, largeur) {
  if (largeur >= 768) return;
  await page.locator('label.wf-menu-bouton').click();
  await expect(page.getByRole('checkbox', { name: 'Menu' })).toBeChecked();
}

for (const largeur of [375, 1440]) {
  test(`parcours vendeur : accueil → Vendre sur la plateforme → pro à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/wireframes/accueil.html');
    await ouvrirMenu(page, largeur);
    await page.getByRole('link', { name: 'Vendre sur la plateforme' }).click();
    await expect(page).toHaveURL(/\/wireframes\/pro\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Vendre sur la plateforme' })).toBeVisible();
  });

  test(`parcours SAV sans compte : pied → sav-acces → Continuer → sav à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/wireframes/accueil.html');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Service après-vente' }).click();
    await expect(page).toHaveURL(/\/wireframes\/sav-acces\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Service après-vente sans compte' })).toBeVisible();
    await page.getByRole('link', { name: 'Continuer' }).click();
    await expect(page).toHaveURL(/\/wireframes\/sav\.html$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}
