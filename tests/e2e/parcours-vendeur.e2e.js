import { test, expect } from '@playwright/test';

// Parcours vendeur de bout en bout, de vrais clics : accueil, « Vendre sur la plateforme », saisie au clavier, validation, confirmation, retour.
for (const largeur of [375, 1440]) {
  test(`parcours vendeur à ${largeur} px : accueil, candidature, confirmation, retour à l'accueil`, async ({ page }) => {
    const debut = Date.now();
    const messages = [];
    const adresses = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    page.on('pageerror', (e) => messages.push(e.message));
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) adresses.push(f.url()); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });

    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.getByRole('navigation').getByRole('link', { name: 'Vendre sur la plateforme', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/pro.html');
    await page.waitForSelector('html[data-formulaire="pret"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Vendre sur la plateforme' })).toBeVisible();

    // saisie au clavier jusqu'au dernier champ texte, puis Entrée : la validation signale ce qui manque
    await page.getByLabel('Société', { exact: true }).click();
    await page.keyboard.type('Zorglub Exemple SARL');
    await page.keyboard.press('Tab');
    await page.keyboard.type('000 000 000 00000');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Claire');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Exemple');
    await page.keyboard.press('Tab');
    await page.keyboard.type('claire@exemple.fr');
    await page.keyboard.press('Tab');
    await page.keyboard.type('06 12 34 56 78');
    await page.keyboard.press('Enter');
    const resume = page.locator('[data-resume]');
    await expect(resume).toBeFocused();
    await expect(resume).toContainText('3 erreurs à corriger');

    // les liens du récapitulatif ramènent aux champs ; saisie des champs restants au clavier
    await resume.getByRole('link', { name: 'Aléas couverts par vos produits' }).click();
    await page.keyboard.press('Space');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    await expect(page.getByLabel('Description de vos produits')).toBeFocused();
    await page.keyboard.type('Des batardeaux modulables et des clapets (exemple).');
    await expect(resume).toContainText('1 erreur à corriger');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(resume).toBeHidden();

    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();
    const confirmation = page.locator('[data-role="confirmation"]');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText('Candidature reçue (exemple)');
    await expect(confirmation).toContainText('PRO-000 (exemple)');
    await confirmation.getByRole('link', { name: "Retour à l'accueil" }).click();
    await page.waitForURL((u) => u.pathname === '/index.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    for (const adresse of adresses) {
      const url = new URL(adresse);
      expect(url.search + url.hash, adresse).toBe('');
    }
    expect(messages).toEqual([]);
    console.log(`parcours vendeur ${largeur} px : ${Date.now() - debut} ms`);
  });
}
