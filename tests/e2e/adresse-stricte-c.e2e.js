import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, SUGGESTIONS, reponseCompletion, reponseGaspar, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';

const BOUTON = 'Évaluer mon exposition';
const AIDE = 'Choisissez une adresse dans la liste pour continuer.';
const champ = (page) => page.getByLabel(/Entrez votre adresse/);
const bouton = (page) => page.getByRole('button', { name: BOUTON });
const options = (page) => page.locator('#adresse-liste [role="option"]');
const statut = (page) => page.locator('#adresse-statut');
const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];

async function ouvrirAccueil(page, largeur = 1440, simulation = {}) {
  const journal = await simuler(page, simulation);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  return journal;
}
const recherchesLibres = (journal) => journal.geocodage.filter((r) => new URL(r.url).pathname === '/geocodage/search' && !r.url.includes('limit=5'));

test('accueil : bouton inactif au chargement (aria-disabled, style neutre, relié à l\'aide visible) ; un clic ne navigue pas et l\'aide est annoncée', async ({ page }) => {
  await ouvrirAccueil(page);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(bouton(page)).not.toHaveAttribute('disabled', /.*/);
  await expect(bouton(page)).toHaveAttribute('aria-describedby', 'adresse-aide-validation');
  await expect(bouton(page)).not.toHaveClass(/bouton--action/);
  await expect(bouton(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)'); // pas d'ambre
  await expect(page.locator('#adresse-aide-validation')).toBeVisible();
  await expect(page.locator('#adresse-aide-validation')).toHaveText(AIDE);
  await bouton(page).focus();
  await expect(bouton(page)).toBeFocused(); // focalisable
  await bouton(page).click({ force: true });
  await expect(statut(page)).toHaveText(AIDE);
  await expect(champ(page)).toBeFocused();
  expect(new URL(page.url()).pathname).toBe('/index.html');
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBeNull();
});

test('« 2 rue » puis Entrée avant toute suggestion : le champ reste « 2 rue », aucune navigation, aucune recherche libre, phrase d\'aide annoncée', async ({ page }) => {
  const journal = await ouvrirAccueil(page);
  await champ(page).click();
  await page.keyboard.type('2 rue');
  await page.keyboard.press('Enter');
  await expect(statut(page)).toHaveText(AIDE);
  await expect(champ(page)).toHaveValue('2 rue');
  await page.waitForTimeout(700); // les suggestions arrivent : toujours rien de choisi
  await expect(champ(page)).toHaveValue('2 rue');
  expect(new URL(page.url()).pathname).toBe('/index.html');
  expect(recherchesLibres(journal)).toEqual([]);
  expect(journal.geocodage.every((r) => new URL(r.url).pathname === '/geocodage/completion/')).toBe(true);
});

test('suggestions sans surlignage : Entrée ne choisit rien ; flèche bas puis Entrée choisit, le bouton devient actif (ambre) ; Entrée sur l\'adresse valide navigue', async ({ page }) => {
  await ouvrirAccueil(page);
  await champ(page).click();
  await page.keyboard.type('12 rue des Til');
  await expect(options(page)).toHaveCount(5);
  await page.keyboard.press('Enter');
  await expect(champ(page)).toHaveValue('12 rue des Til');
  await expect(options(page)).toHaveCount(5);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(champ(page)).toHaveValue(SUGGESTIONS[0][0]);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(bouton(page)).toHaveClass(/bouton--action/);
  await expect(bouton(page)).not.toHaveClass(/bouton--secondaire/);
  await expect(bouton(page)).toHaveCSS('background-color', 'rgb(217, 119, 6)');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/diagnostic.html');
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(SUGGESTIONS[0][0]);
});

test('modifier un caractère après le choix : le bouton redevient inactif, sans classe d\'action', async ({ page }) => {
  await ouvrirAccueil(page);
  await choisirAdresse(page, champ(page));
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('End');
  await page.keyboard.type('x');
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(bouton(page)).not.toHaveClass(/bouton--action/);
  await page.keyboard.press('Backspace');
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true'); // retirer le caractère ne rétablit pas le choix
  await bouton(page).click({ force: true });
  await expect(statut(page)).toHaveText(AIDE);
  expect(new URL(page.url()).pathname).toBe('/index.html');
});

test('texte sans suggestion (3 caractères ou plus) : « Aucune adresse ne correspond. », bouton inactif', async ({ page }) => {
  await ouvrirAccueil(page, 1440, { completion: { corps: reponseCompletion([]) } });
  await champ(page).click();
  await page.keyboard.type('zzz fantaisiste 99');
  await expect(statut(page)).toHaveText('Aucune adresse ne correspond.');
  await expect(options(page)).toHaveCount(0);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(champ(page)).toHaveValue('zzz fantaisiste 99');
  expect(new URL(page.url()).pathname).toBe('/index.html');
});

test('clic à la souris à 1440 px et toucher à 375 px sur une option : adresse valide, bouton actif', async ({ page, browser }) => {
  await ouvrirAccueil(page);
  const libelle = await choisirAdresse(page, champ(page), '12 rue des Tilleuls', 2);
  expect(libelle).toBe(SUGGESTIONS[2][0]);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  const contexte = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 800 } });
  const tactile = await contexte.newPage();
  await ouvrirAccueil(tactile, 375);
  await champ(tactile).click();
  await tactile.keyboard.type('12 rue des Til');
  await expect(options(tactile)).toHaveCount(5);
  await options(tactile).nth(1).tap();
  await expect(champ(tactile)).toHaveValue(SUGGESTIONS[1][0]);
  await expect(bouton(tactile)).toHaveAttribute('aria-disabled', 'false');
  await expect(bouton(tactile)).toHaveClass(/bouton--action/);
  await contexte.close();
});

test('panne du service (complétion et repli en échec) : message de non-vérification, bouton actif seulement pour un texte valide localement ; une seule panne : suggestions du repli, comportement strict', async ({ page }) => {
  await ouvrirAccueil(page, 1440, { completion: { status: 500, corps: '' }, geocodage: { status: 500, corps: '' } });
  await champ(page).click();
  await page.keyboard.type('12345'); // aucune lettre : refusé par la validation locale
  await expect(page.locator('#adresse-erreur')).toHaveText("Vérification impossible pour le moment : l'adresse sera utilisée telle quelle.");
  await expect(options(page)).toHaveCount(0);
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'true');
  await champ(page).fill('12 rue des Tilleuls, Lyon');
  await expect(page.locator('#adresse-erreur')).toHaveText("Vérification impossible pour le moment : l'adresse sera utilisée telle quelle.");
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  await bouton(page).click();
  await page.waitForURL('**/diagnostic.html');
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe('12 rue des Tilleuls, Lyon');
  // une seule panne : la complétion échoue, le repli répond
  const autre = await page.context().newPage();
  await ouvrirAccueil(autre, 1440, { completion: { status: 500, corps: '' } });
  await champ(autre).click();
  await autre.keyboard.type('12 rue des Til');
  await expect(options(autre)).toHaveCount(1);
  await expect(autre.locator('#adresse-erreur')).toHaveText('');
  await expect(bouton(autre)).toHaveAttribute('aria-disabled', 'true');
  await autre.keyboard.press('Enter');
  await expect(champ(autre)).toHaveValue('12 rue des Til');
  await options(autre).first().click();
  await expect(bouton(autre)).toHaveAttribute('aria-disabled', 'false');
});

test('diagnostic : « Mettre à jour » inactif au chargement et tant que l\'adresse n\'a pas changé et été choisie ; choix d\'une nouvelle adresse : carte, niveau, calques et équipements recalculés, session mise à jour', async ({ page }) => {
  const journal = await simuler(page, { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Feu de forêt']) }, rga: { corps: reponseRga(0) } } });
  await page.addInitScript((a) => sessionStorage.setItem('adresse', a), ADRESSE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  const maj = page.getByRole('button', { name: 'Mettre à jour' });
  const adresse = page.getByLabel('Adresse évaluée');
  await expect(adresse).toHaveValue(ADRESSE);
  await expect(maj).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#exposition-niveau')).toHaveText("Niveau d'exposition : modéré (indicatif)");
  await adresse.fill('8 avenue des Lilas, 31000 Toulouse'); // texte libre jamais choisi
  await expect(maj).toHaveAttribute('aria-disabled', 'true');
  await page.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseGaspar(['Séisme']) }));
  await page.route('https://www.georisques.gouv.fr/api/v1/rga**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseRga(3) }));
  await page.route('https://data.geopf.fr/geocodage/completion/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: reponseCompletion([['8 Avenue des Lilas 31000 Toulouse', 1.4442, 43.6047]]) }));
  const libelle = await choisirAdresse(page, adresse, '8 avenue des Lilas');
  await expect(maj).toHaveAttribute('aria-disabled', 'false');
  const avant = journal.api.length;
  await maj.click();
  await expect.poll(() => journal.api.length).toBe(avant + 2);
  await expect(page.locator('#exposition-niveau')).toHaveText("Niveau d'exposition : élevé (indicatif)");
  await expect(page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox')).toHaveCount(1);
  await expect(page.locator('[data-role="equipements"] fieldset').getByRole('radio')).toHaveCount(1);
  await expect(page.locator('#liste-equipements > li')).toHaveCount(0);
  await expect(maj).toHaveAttribute('aria-disabled', 'true');
  await expect(adresse).toHaveValue(libelle);
  expect(await page.evaluate(() => sessionStorage.getItem('adresse'))).toBe(libelle);
});

test('accessibilité : axe sans violation avec liste ouverte, bouton inactif et message de panne ; le focus revient dans le champ après un clic inactif', async ({ page }) => {
  await ouvrirAccueil(page, 375);
  await champ(page).click();
  await page.keyboard.type('12 rue des Til');
  await expect(options(page)).toHaveCount(5);
  await page.waitForTimeout(300);
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await bouton(page).click({ force: true });
  await expect(champ(page)).toBeFocused();
  const panne = await page.context().newPage();
  await ouvrirAccueil(panne, 375, { completion: { status: 500, corps: '' }, geocodage: { status: 500, corps: '' } });
  await champ(panne).click();
  await panne.keyboard.type('12 rue des Til');
  await expect(panne.locator('#adresse-erreur')).not.toBeEmpty();
  expect((await new AxeBuilder({ page: panne }).analyze()).violations.map((v) => v.id)).toEqual([]);
});

test('confidentialité : aucune requête tierce avant 3 caractères, aucune requête hors des trois hôtes pendant la saisie, aucun stockage hors « adresse », Entrée sans recherche libre', async ({ page, context }) => {
  const journal = await ouvrirAccueil(page);
  await page.waitForTimeout(300);
  expect(journal.externes).toEqual([]);
  await champ(page).click();
  await page.keyboard.type('2 r');
  await page.waitForTimeout(600);
  expect(journal.externes).toHaveLength(1); // 3 caractères : une seule complétion
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  expect(recherchesLibres(journal)).toEqual([]);
  for (const r of journal.externes) expect(HOTES).toContain(new URL(r.url).hostname);
  expect(await page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)))).toEqual([]);
  await choisirAdresse(page, champ(page));
  await bouton(page).click();
  await page.waitForURL('**/diagnostic.html');
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['adresse']);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  for (const r of journal.externes) expect(HOTES).toContain(new URL(r.url).hostname);
  expect(recherchesLibres(journal).filter((r) => !new URL(r.url).searchParams.get('q')?.includes('Tilleuls'))).toEqual([]);
});

for (const largeur of [375, 768, 1440]) {
  test(`pages entières à ${largeur} px (accueil et diagnostic) : console propre, aucun débordement, aucune requête externe hors règle`, async ({ page }) => {
    const messages = surveillerConsole(page);
    const journal = await ouvrirAccueil(page, largeur);
    await choisirAdresse(page, champ(page));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'accueil').toBe(true);
    await bouton(page).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'diagnostic').toBe(true);
    for (const r of journal.externes) expect(HOTES, r.url).toContain(new URL(r.url).hostname);
    expect(messages.filter((m) => !m.includes('Failed to load resource'))).toEqual([]);
  });
}

test('JavaScript désactivé : seul le message noscript sur l\'accueil et sur le diagnostic', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  for (const chemin of ['/index.html', '/diagnostic.html']) {
    await page.goto(chemin);
    await expect(page.locator('.noscript')).toBeVisible();
    expect(((await page.locator('body').innerText()) ?? '').trim(), chemin).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
