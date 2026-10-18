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

for (const largeur of [375, 1440]) {
  test(`parcours SAV avec compte : accueil → connexion → compte → achat → sav, puis demandes et informations à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/wireframes/accueil.html');
    await ouvrirMenu(page, largeur);
    await page.getByRole('banner').getByRole('link', { name: 'Mon compte' }).click();
    await expect(page).toHaveURL(/\/wireframes\/connexion\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion à mon compte' })).toBeVisible();
    await page.getByRole('link', { name: 'Accéder au compte de démonstration' }).click();
    await expect(page).toHaveURL(/\/wireframes\/compte\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: /Bonjour/ })).toBeVisible();
    await page.getByRole('link', { name: 'Voir le détail' }).first().click();
    await expect(page).toHaveURL(/\/wireframes\/achat\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: /Batardeau modulable/ })).toBeVisible();
    await page.getByRole('link', { name: 'Demander une intervention' }).click();
    await expect(page).toHaveURL(/\/wireframes\/sav\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Demande de service après-vente' })).toBeVisible();

    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/wireframes\/compte\.html$/);
    await page.getByRole('navigation', { name: 'Mon compte' }).getByRole('link', { name: 'Mes demandes' }).click();
    await expect(page).toHaveURL(/\/wireframes\/demandes\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mes demandes de service après-vente' })).toBeVisible();
    await page.goBack();
    await page.getByRole('navigation', { name: 'Mon compte' }).getByRole('link', { name: 'Mes informations' }).click();
    await expect(page).toHaveURL(/\/wireframes\/informations\.html$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mes informations' })).toBeVisible();
  });
}
