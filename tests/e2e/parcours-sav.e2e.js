import { test, expect } from '@playwright/test';

// Parcours SAV cliqués de bout en bout (sessionStorage seulement) : avec compte puis sans compte, à 375 et 1440 px.
function suivre(page) {
  const suivi = { messages: [], externes: [], urls: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) suivi.urls.push(f.url()); });
  return suivi;
}

function verifierUrls(suivi) {
  for (const adresse of suivi.urls) {
    const url = new URL(adresse);
    expect(url.search, adresse).toBe('');
    expect(url.hash, adresse).toBe('');
    expect(adresse).not.toMatch(/ZZ|zz\.secret|CMD-[0-9]|SAV-[0-9]|exemple\.test/);
  }
}

for (const largeur of [375, 1440]) {
  test(`parcours SAV avec compte à ${largeur} px : de l'accueil à la déconnexion, sans donnée dans les URL`, async ({ page }) => {
    const debut = Date.now();
    const suivi = suivre(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    const pret = () => page.waitForSelector('html[data-rendu="pret"]');

    await page.goto('/index.html');
    await pret();
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.locator('header').getByRole('link', { name: 'Mon compte', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/connexion.html');
    await pret();
    await page.getByRole('button', { name: 'Accéder au compte de démonstration' }).click();
    await page.waitForURL((u) => u.pathname === '/compte.html');
    await pret();
    await page.getByRole('link', { name: 'Voir tous mes achats' }).click();
    await page.waitForURL((u) => u.pathname === '/achats.html');
    await pret();
    await page.getByRole('radio', { name: 'Pose planifiée', exact: true }).check({ force: true });
    await expect(page.locator('.commande')).toHaveCount(1);
    await page.getByRole('button', { name: 'Voir le détail' }).click();
    await page.waitForURL((u) => u.pathname === '/achat.html');
    await pret();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Commande n° CMD-1037 (exemple)');
    await page.getByRole('link', { name: 'Demander une intervention' }).click();
    await page.waitForURL((u) => u.pathname === '/sav.html');
    await pret();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('listitem')).toHaveCount(4);
    await page.getByRole('radio', { name: /Grille pare-braises/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Défaut de fonctionnement' }).check({ force: true });
    await page.getByLabel('Description', { exact: true }).fill('ZZ : la grille ne se ferme plus complètement.');
    await page.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
    const region = page.locator('[data-confirmation]');
    await expect(region).toBeFocused();
    await expect(region).toContainText('Demande concernant : Grille pare-braises (commande CMD-1037)');
    await page.getByRole('link', { name: 'Retour à mes demandes' }).click();
    await page.waitForURL((u) => u.pathname === '/demandes.html');
    await pret();
    await expect(page.locator('.sav__demande')).toHaveCount(4);
    await page.getByRole('radio', { name: 'En analyse', exact: true }).check({ force: true });
    await expect(page.locator('.sav__demande')).toHaveCount(1);
    await expect(page.locator('.sav__demande')).toContainText('SAV-1002 (exemple)');
    await page.getByRole('navigation', { name: 'Mon compte' }).getByRole('button', { name: 'Se déconnecter' }).click();
    await page.waitForURL((u) => u.pathname === '/connexion.html');
    await pret();
    expect(await page.evaluate(() => [sessionStorage.getItem('compte'), sessionStorage.getItem('achat'), sessionStorage.getItem('acces-sav')])).toEqual([null, null, null]);
    verifierUrls(suivi);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    console.log(`parcours SAV avec compte ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  });

  test(`parcours SAV sans compte à ${largeur} px : du pied de l'accueil au retour à l'accueil, sans donnée dans les URL`, async ({ page }) => {
    const debut = Date.now();
    const suivi = suivre(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    const pret = () => page.waitForSelector('html[data-rendu="pret"]');

    await page.goto('/index.html');
    await pret();
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.locator('footer').getByRole('link', { name: 'Service après-vente', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/sav-acces.html');
    await pret();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await page.getByLabel('Numéro de commande', { exact: true }).fill('CMD-1037');
    await page.getByLabel('E-mail de la commande', { exact: true }).fill('zz.secret@exemple.test');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.waitForURL((u) => u.pathname === '/sav.html');
    await pret();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('listitem')).toHaveCount(3);
    await page.getByRole('radio', { name: /Batardeau modulable/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Problème de pose' }).check({ force: true });
    await page.getByLabel('Description', { exact: true }).fill('ZZ : le batardeau laisse passer l\'eau depuis la pose.');
    await page.getByLabel('Prénom', { exact: true }).fill('ZZPrénom');
    await page.getByLabel('Nom', { exact: true }).fill('ZZNom');
    await page.getByLabel('E-mail', { exact: true }).fill('zz.secret@exemple.test');
    await page.getByLabel("Adresse d'intervention").fill('9 rue ZZ');
    await page.getByLabel('Code postal').fill('75001');
    await page.getByLabel('Ville').fill('ZZVille');
    await page.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
    await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
    const region = page.locator('[data-confirmation]');
    await expect(region).toBeFocused();
    await expect(region).toContainText('Demande reçue (exemple)');
    await expect(page.getByRole('link', { name: 'Retour à mes demandes' })).toBeHidden();
    await page.getByRole('link', { name: "Retour à l'accueil" }).click();
    await page.waitForURL((u) => u.pathname === '/index.html');
    await pret();
    verifierUrls(suivi);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    console.log(`parcours SAV sans compte ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  });
}
