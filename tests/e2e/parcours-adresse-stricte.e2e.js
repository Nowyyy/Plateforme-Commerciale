import { test, expect } from '@playwright/test';
import { SUGGESTIONS, reponseCompletion, simuler, surveillerConsole } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';

const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const TOULOUSE = '8 Avenue des Lilas 31000 Toulouse';

// Parcours cliqué de la saisie stricte : accueil, frappe de « 2 rue », Entrée (rien ne change), flèche bas puis Entrée (option choisie),
// bouton actif, clic, diagnostic, carte, niveau calculé, changement d'adresse, pastille d'aléa, « Voir la fiche ».
for (const largeur of [375, 1440]) {
  test(`parcours de la saisie stricte à ${largeur} px : accueil, Entrée sans effet, choix, diagnostic, changement d'adresse, pastille, fiche`, async ({ page }) => {
    const debut = Date.now();
    const journal = await simuler(page);
    const messages = surveillerConsole(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    const champ = page.getByLabel(/Entrez votre adresse/);
    const valider = page.getByRole('button', { name: 'Évaluer mon exposition' });
    await expect(valider).toHaveAttribute('aria-disabled', 'true');
    await champ.click();
    await page.keyboard.type('2 rue');
    await page.keyboard.press('Enter');
    await expect(champ).toHaveValue('2 rue');
    await expect(page.locator('#adresse-statut')).toHaveText('Choisissez une adresse dans la liste pour continuer.');
    expect(new URL(page.url()).pathname).toBe('/index.html');
    await expect(page.locator('#adresse-liste [role="option"]')).toHaveCount(5);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(champ).toHaveValue(SUGGESTIONS[0][0]);
    await expect(valider).toHaveAttribute('aria-disabled', 'false');
    await expect(valider).toHaveClass(/bouton--action/);
    await valider.click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(SUGGESTIONS[0][0]);
    await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
    await expect(page.locator('#exposition-niveau')).toHaveText("Niveau d'exposition : modéré (indicatif)");
    const maj = page.getByRole('button', { name: 'Mettre à jour' });
    await expect(maj).toHaveAttribute('aria-disabled', 'true');
    // changement d'adresse sur le diagnostic
    await page.route('https://data.geopf.fr/geocodage/completion/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: reponseCompletion([[TOULOUSE, 1.4442, 43.6047]]) }));
    await choisirAdresse(page, page.getByLabel('Adresse évaluée'), '8 avenue des Lilas');
    await maj.click();
    await expect(maj).toHaveAttribute('aria-disabled', 'true');
    expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(TOULOUSE);
    await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
    // pastille d'aléa puis fiche
    await page.locator('.pastille-choix', { hasText: 'Inondations' }).click();
    await expect(page.locator('#liste-equipements > li h3').first()).toHaveText('Batardeau modulable');
    await page.locator('#liste-equipements > li').first().getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    for (const url of journal.externes.map((r) => r.url)) expect(HOTES, url).toContain(new URL(url).hostname);
    expect(journal.externes.some((r) => new URL(r.url).pathname === '/geocodage/search' && new URL(r.url).searchParams.get('limit') === '5')).toBe(false);
    for (const r of journal.externes.filter((e) => new URL(e.url).hostname === 'www.georisques.gouv.fr')) expect(decodeURIComponent(r.url)).not.toMatch(/Tilleuls|Lilas|Lyon|Toulouse/);
    expect(new URL(page.url()).search).toBe('');
    expect(messages.filter((m) => !m.includes('Failed to load resource'))).toEqual([]);
    console.log(`parcours de la saisie stricte à ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  });
}
