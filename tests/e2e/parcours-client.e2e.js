import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Parcours client cliqué de bout en bout (sessionStorage seulement) : accueil, connexion de démonstration, tableau de bord,
// achats filtrés, détail, document, demande d'intervention (wireframe), informations, déconnexion.
for (const largeur of [375, 1440]) {
  test(`parcours client à ${largeur} px : de l'accueil à la déconnexion, sans donnée dans les URL`, async ({ page }) => {
    const debut = Date.now();
    const suivi = { messages: [], externes: [], urls: [] };
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
    page.on('pageerror', (e) => suivi.messages.push(e.message));
    page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) suivi.urls.push(f.url()); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    const pret = () => page.waitForSelector('html[data-rendu="pret"]');

    await page.goto('/index.html');
    await pret();
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.locator('header').getByRole('link', { name: 'Mon compte', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/connexion.html');
    await pret();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await page.getByLabel('E-mail', { exact: true }).fill('camille@exemple.test');
    await page.getByLabel('Mot de passe', { exact: true }).fill('mot-de-passe-fictif');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL((u) => u.pathname === '/compte.html');
    await pret();
    await expect(page.getByRole('heading', { level: 1, name: 'Bonjour, Camille' })).toBeVisible();

    await page.getByRole('link', { name: 'Voir tous mes achats' }).click();
    await page.waitForURL((u) => u.pathname === '/achats.html');
    await pret();
    await page.getByRole('radio', { name: 'Pose planifiée', exact: true }).check({ force: true });
    await expect(page.locator('.commande')).toHaveCount(1);
    await page.getByRole('button', { name: 'Voir le détail' }).click();
    await page.waitForURL((u) => u.pathname === '/achat.html');
    await pret();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Commande n° CMD-1037 (exemple)');

    await page.locator('[data-role="lignes"] summary').first().click();
    await expect(page.locator('[data-role="lignes"] details').first()).toHaveAttribute('open', '');
    await expect(page.locator('svg.apercu__svg').first()).toBeVisible();
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Facture (PDF, exemple)' }).click(),
    ]);
    expect(readFileSync(await telechargement.path()).subarray(0, 5).toString('latin1')).toBe('%PDF-');

    await page.getByRole('link', { name: 'Demander une intervention' }).click();
    await page.waitForURL((u) => u.pathname === '/wireframes/sav.html');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === '/achat.html');
    await pret();
    await page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('link', { name: 'Mon compte' }).click();
    await page.waitForURL((u) => u.pathname === '/compte.html');
    await pret();
    await page.getByRole('navigation', { name: 'Mon compte' }).getByRole('link', { name: 'Mes informations' }).click();
    await page.waitForURL((u) => u.pathname === '/informations.html');
    await page.waitForSelector('html[data-formulaire="pret"]');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Enregistrement simulé' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Mon compte' }).getByRole('button', { name: 'Se déconnecter' }).click();
    await page.waitForURL((u) => u.pathname === '/connexion.html');
    await pret();
    expect(await page.evaluate(() => sessionStorage.getItem('compte'))).toBeNull();
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();

    for (const adresse of suivi.urls) {
      const url = new URL(adresse);
      expect(url.search, adresse).toBe('');
      expect(url.hash, adresse).toBe('');
      expect(adresse).not.toMatch(/camille|exemple\.test|CMD-|mot-de-passe/i);
    }
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    console.log(`parcours client ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  });
}
