import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, reponseCompletion, reponseGaspar, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';

const SCENARIOS = {
  inondationArgiles: { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Séisme']) }, rga: { corps: reponseRga(2) } } },
  inondationFeux: { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Feu de forêt']) }, rga: { corps: reponseRga(0) } } },
  argilesSeules: { api: { gaspar: { corps: reponseGaspar(['Séisme']) }, rga: { corps: reponseRga(3) } } },
  aucun: { api: { gaspar: { corps: reponseGaspar(['Séisme']) }, rga: { corps: reponseRga(0) } } },
  secours: { api: { gaspar: { abandon: true }, rga: { abandon: true } } },
  gasparEnEchec: { api: { gaspar: { abandon: true }, rga: { corps: reponseRga(2) } } },
};
const niveau = (page) => page.locator('#exposition-niveau');
const pastilles = (page) => page.locator('[data-role="equipements"] fieldset').getByRole('radio');
const cases = (page) => page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox');
const titres = (page) => page.locator('#liste-equipements > li h3');
const pret = (page) => expect(page.locator('#aleas-annonce')).not.toBeEmpty();
async function ouvrir(page, largeur, scenario, session) {
  const journal = await simuler(page, SCENARIOS[scenario] ?? {});
  await ouvrirDiagnostic(page, largeur, session);
  await pret(page);
  return journal;
}
const noms = async (locator) => (await locator.evaluateAll((els) => els.map((e) => e.closest('label')?.textContent.trim() ?? e.value))).map((t) => t.trim());

test('inondation et argiles moyennes recensées, feux absents : niveau modéré, deux segments, deux cases, pastilles « Tous » et « Inondations », trois équipements d\'inondation', async ({ page }) => {
  await ouvrir(page, 1440, 'inondationArgiles');
  await expect(niveau(page)).toHaveText("Niveau d'exposition : modéré (indicatif)");
  await expect(page.locator('#jauge .est-plein')).toHaveCount(2);
  await expect(page.locator('#jauge > li')).toHaveCount(4);
  await expect(cases(page)).toHaveCount(2);
  expect(await noms(pastilles(page))).toEqual(['Tous', 'Inondations']);
  await expect(titres(page)).toHaveText(['Batardeau modulable', 'Clapet anti-retour', 'Pompe de relevage']);
  await expect(page.locator('#exposition-non-evalues')).toHaveText('Feux de forêt : non recensé. Grêle, vents, canicule : non évalués.');
  await expect(page.locator('[data-role="exposition"]')).toContainText("Indicatif : ce niveau ne remplace ni l'état des risques réglementaire ni l'avis d'un professionnel.");
});

test('« Comment est-il calculé ? » : fermé au départ, s\'ouvre au clavier, texte alimenté par les données', async ({ page }) => {
  await ouvrir(page, 375, 'inondationArgiles');
  const details = page.locator('details.exposition__calcul');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(details.locator('p').first()).toBeHidden();
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('p')).toHaveCount(3);
  await expect(details).toContainText('données d\'inondation et de feux de forêt sont communales');
});

test('inondation et feux recensés : pastilles « Tous », « Inondations », « Feux de forêt » ; « Tous » alterne les deux aléas', async ({ page }) => {
  await ouvrir(page, 1440, 'inondationFeux');
  expect(await noms(pastilles(page))).toEqual(['Tous', 'Inondations', 'Feux de forêt']);
  await expect(titres(page)).toHaveText(['Batardeau modulable', 'Sprinkler de toiture', 'Clapet anti-retour']);
  await expect(page.locator('#exposition-non-evalues')).toHaveText('Grêle, vents, canicule : non évalués.');
  await expect(niveau(page)).toHaveText("Niveau d'exposition : modéré (indicatif)");
});

test('argiles seules : niveau selon l\'exposition, « Tous » seule, message, « Explorer tous les aléas » affiche les quatre aléas, la mention et déplace le focus', async ({ page }) => {
  await ouvrir(page, 1440, 'argilesSeules');
  await expect(niveau(page)).toHaveText("Niveau d'exposition : élevé (indicatif)");
  await expect(page.locator('#jauge .est-plein')).toHaveCount(3);
  expect(await noms(pastilles(page))).toEqual(['Tous']);
  await expect(page.locator('#equipements-message')).toHaveText('Aucun aléa recensé à cette adresse ne correspond à un équipement du catalogue.');
  await expect(titres(page)).toHaveCount(0);
  const bouton = page.getByRole('button', { name: 'Explorer tous les aléas' });
  await expect(bouton).toBeVisible();
  await expect(bouton).not.toHaveClass(/bouton--action/);
  await bouton.click();
  expect(await noms(pastilles(page))).toEqual(['Tous', 'Inondations', 'Grêle et vents', 'Feux de forêt', 'Canicule']);
  await expect(page.locator('#equipements-ligne')).toHaveText("Aléas non recensés à cette adresse : équipements présentés à titre d'exemple.");
  await expect(bouton).toBeHidden();
  await expect(pastilles(page).first()).toBeFocused();
  await expect(titres(page)).toHaveCount(3);
  await expect(niveau(page)).toHaveText("Niveau d'exposition : élevé (indicatif)"); // le niveau ne change pas
});

test('aucun aléa recensé : « Aucun aléa recensé parmi ceux évalués », jauge vide, jamais « aucun risque »', async ({ page }) => {
  await ouvrir(page, 1440, 'aucun');
  await expect(niveau(page)).toHaveText('Aucun aléa recensé parmi ceux évalués (indicatif)');
  await expect(page.locator('#jauge .est-plein')).toHaveCount(0);
  await expect(page.locator('#jauge .jauge__repere')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/aucun risque/i);
  await expect(cases(page)).toHaveCount(0);
  await expect(page.locator('#exposition-non-evalues')).toHaveText('Inondations, Feux de forêt : non recensés. Grêle, vents, canicule : non évalués.');
  await expect(page.getByRole('button', { name: 'Explorer tous les aléas' })).toBeVisible();
});

test('lectures en échec : « Niveau non déterminé », mode de secours, aléas « présence non déterminée » proposés ; un seul appel en échec : niveau des aléas lus et mention', async ({ page }) => {
  await ouvrir(page, 1440, 'secours');
  await expect(niveau(page)).toHaveText("Niveau non déterminé : les aléas de cette adresse n'ont pas pu être lus");
  await expect(page.locator('#jauge .est-plein')).toHaveCount(0);
  await expect(page.locator('#exposition-inconnus')).toBeHidden();
  expect(await noms(pastilles(page))).toEqual(['Tous', 'Inondations (présence non déterminée)', 'Feux de forêt (présence non déterminée)']);
  await expect(page.locator('#aleas-secours')).toBeVisible();
  await expect(titres(page)).toHaveText(['Batardeau modulable', 'Sprinkler de toiture', 'Clapet anti-retour']);
  const autre = await page.context().newPage();
  await ouvrir(autre, 1440, 'gasparEnEchec');
  await expect(niveau(autre)).toHaveText("Niveau d'exposition : modéré (indicatif)");
  await expect(autre.locator('#exposition-inconnus')).toHaveText('Présence non déterminée : Zone inondable, Feux de forêt');
  expect(await noms(pastilles(autre))).toEqual(['Tous', 'Inondations (présence non déterminée)', 'Feux de forêt (présence non déterminée)']);
});

test('pastille : change équipements et annonce, jamais les cases ni le niveau ; cocher et décocher ne changent ni le niveau ni les équipements', async ({ page }) => {
  await ouvrir(page, 1440, 'inondationFeux');
  const avant = await niveau(page).textContent();
  await page.getByRole('radio', { name: 'Feux de forêt', exact: true }).check({ force: true });
  await expect(titres(page)).toHaveText(['Sprinkler de toiture', 'Grille pare-braises']);
  await expect(page.locator('#annonce-diagnostic')).toHaveText('2 équipements pour Feux de forêt');
  await expect(cases(page)).toHaveCount(2);
  await expect(page.getByRole('group', { name: 'Aléas recensés à cette adresse' }).getByRole('checkbox', { checked: true })).toHaveCount(2);
  await expect(niveau(page)).toHaveText(avant);
  await page.getByRole('radio', { name: 'Tous', exact: true }).check({ force: true });
  await expect(page.locator('#annonce-diagnostic')).toHaveText('3 équipements pour tous les aléas proposés');
  const equipements = await titres(page).allTextContents();
  await page.getByRole('checkbox', { name: 'Zone inondable' }).uncheck();
  await page.getByRole('checkbox', { name: 'Feux de forêt' }).uncheck();
  await expect(niveau(page)).toHaveText(avant);
  expect(await titres(page).allTextContents()).toEqual(equipements);
  await expect(page.getByRole('radio', { name: 'Tous', exact: true })).toBeChecked();
});

test('valeur « alea » de session : aléa proposé présélectionné ; aléa non proposé : « Tous » et ligne d\'état ; la clé est lue une seule fois', async ({ page }) => {
  await ouvrir(page, 375, 'inondationFeux', { adresse: ADRESSE, alea: 'feux-de-foret' });
  await expect(page.getByRole('radio', { name: 'Feux de forêt', exact: true })).toBeChecked();
  await expect(page.locator('#equipements-ligne')).toHaveText('');
  expect(await page.evaluate(() => sessionStorage.getItem('alea'))).toBeNull();
  const autre = await page.context().newPage();
  await ouvrir(autre, 375, 'inondationFeux', { adresse: ADRESSE, alea: 'grele-vents' });
  await expect(autre.getByRole('radio', { name: 'Tous', exact: true })).toBeChecked();
  await expect(autre.locator('#equipements-ligne')).toHaveText("L'aléa choisi sur l'accueil n'est pas recensé à cette adresse.");
  expect(await autre.evaluate(() => sessionStorage.getItem('alea'))).toBeNull();
});

test('« Comparer ces solutions » : comparaison écrite avec l\'aléa de la pastille, l\'aléa proposé le plus élevé sous « Tous », l\'aléa par défaut sans aléa proposé', async ({ page }) => {
  const lire = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('comparaison')));
  await ouvrir(page, 1440, 'inondationFeux');
  await page.getByRole('link', { name: 'Comparer ces solutions' }).click({ trial: true });
  await page.locator('.diag__comparer a').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true })); // pas de navigation : on lit la session
  await page.getByRole('link', { name: 'Comparer ces solutions' }).click();
  expect((await lire()).alea).toBe('inondations');
  await page.getByRole('radio', { name: 'Feux de forêt', exact: true }).check({ force: true });
  await page.locator('.diag__comparer a').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await page.getByRole('link', { name: 'Comparer ces solutions' }).click();
  expect((await lire()).alea).toBe('feux-de-foret');
  const autre = await page.context().newPage();
  await ouvrir(autre, 1440, 'aucun');
  await autre.locator('.diag__comparer a').evaluate((a) => a.addEventListener('click', (e) => e.preventDefault(), { once: true }));
  await autre.getByRole('link', { name: 'Comparer ces solutions' }).click();
  expect((await autre.evaluate(() => JSON.parse(sessionStorage.getItem('comparaison')))).alea).toBe('inondations'); // aleaParDefaut du lot 9
});

test('changement d\'adresse : niveau, pastilles et équipements recalculés', async ({ page }) => {
  await ouvrir(page, 1440, 'inondationFeux');
  expect(await noms(pastilles(page))).toEqual(['Tous', 'Inondations', 'Feux de forêt']);
  const officiel = '5 Allée des Peupliers 44000 Nantes';
  await page.route('https://data.geopf.fr/geocodage/completion/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: reponseCompletion([[officiel, -1.5534, 47.2184]]) }));
  await page.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseGaspar(['Séisme']) }));
  await page.route('https://www.georisques.gouv.fr/api/v1/rga**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseRga(3) }));
  await choisirAdresse(page, page.getByLabel('Adresse évaluée'), '5 allée des Peupliers');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  await expect(niveau(page)).toHaveText("Niveau d'exposition : élevé (indicatif)");
  expect(await noms(pastilles(page))).toEqual(['Tous']);
  await expect(titres(page)).toHaveCount(0);
  await expect(page.locator('#equipements-message')).toContainText('Aucun aléa recensé à cette adresse');
});

test('sans adresse et pendant la lecture : messages dédiés, zone d\'équipements qui ne bouge pas entre le chargement et l\'affichage, aucun stockage ni cookie nouveau', async ({ page, context }) => {
  await simuler(page, SCENARIOS.inondationFeux);
  await ouvrirDiagnostic(page, 1440, {});
  await expect(niveau(page)).toHaveText('Niveau non déterminé : saisissez une adresse.');
  await expect(page.locator('#equipements-message')).toHaveText('Saisissez une adresse pour voir les équipements recommandés.');
  await expect(titres(page)).toHaveCount(0);
  const autre = await context.newPage();
  let liberer = () => {};
  const attente = new Promise((resolve) => { liberer = resolve; });
  await simuler(autre, SCENARIOS.inondationFeux);
  await autre.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', async (route) => {
    await attente;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: reponseGaspar(['Inondation', 'Feu de forêt']) });
  });
  await autre.addInitScript((a) => sessionStorage.setItem('adresse', a), ADRESSE);
  await autre.setViewportSize({ width: 1440, height: 900 });
  await autre.goto('/diagnostic.html');
  await autre.waitForSelector('html[data-rendu="pret"]');
  await expect(autre.locator('#equipements-message')).toHaveText('Chargement des équipements recommandés…');
  await expect(autre.locator('#exposition-niveau')).toHaveText("Calcul du niveau d'exposition en cours…");
  const avant = await autre.locator('[data-role="equipements"]').boundingBox();
  const pied = await autre.locator('[data-role="pied"]').boundingBox();
  liberer();
  await expect(titres(autre)).toHaveCount(3);
  const apres = await autre.locator('[data-role="equipements"]').boundingBox();
  const piedApres = await autre.locator('[data-role="pied"]').boundingBox();
  expect(apres.y).toBe(avant.y);
  expect(Math.abs(piedApres.y - pied.y)).toBeLessThanOrEqual(1);
  expect(await autre.evaluate(() => Object.keys(sessionStorage))).toEqual(['adresse']);
  expect(await autre.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

for (const largeur of [375, 768, 1440]) {
  test(`axe sans violation, console propre et aucun débordement à ${largeur} px : niveau, aucun aléa, exploration, secours`, async ({ page }) => {
    for (const [nom, scenario] of [['niveau', 'inondationArgiles'], ['aucun', 'aucun'], ['exploration', 'argilesSeules'], ['secours', 'secours']]) {
      const onglet = await page.context().newPage();
      const messages = surveillerConsole(onglet);
      await ouvrir(onglet, largeur, scenario);
      if (nom === 'exploration') await onglet.getByRole('button', { name: 'Explorer tous les aléas' }).click();
      await onglet.waitForTimeout(300);
      await onglet.locator('details.exposition__calcul summary').click();
      expect(await onglet.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${nom} : débordement`).toBe(true);
      const violations = (await new AxeBuilder({ page: onglet }).analyze()).violations;
      expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`), `${nom} : axe`).toEqual([]);
      expect(messages.filter((m) => !m.includes('Failed to load resource')), nom).toEqual([]);
      await onglet.screenshot({ path: `test-results/exposition-${nom}-${largeur}.png`, fullPage: true });
      await onglet.close();
    }
  });
}
