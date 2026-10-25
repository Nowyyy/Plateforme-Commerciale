import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, SUGGESTIONS, reponseCompletion, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const BOUTON = 'Évaluer mon exposition';
const champ = (page) => page.getByLabel(/Entrez votre adresse/);
const options = (page) => page.locator('#adresse-liste [role="option"]');
const statut = (page) => page.locator('#adresse-statut');

async function ouvrirAccueil(page, largeur = 1440, simulation = {}) {
  const journal = await simuler(page, simulation);
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  return journal;
}
const taper = async (page, texte) => {
  await champ(page).click();
  await page.keyboard.type(texte);
};
const suggestions = async (page, texte = '12 rue des Til') => {
  await taper(page, texte);
  await expect(options(page)).not.toHaveCount(0);
};
const adresseSession = (page) => page.evaluate(() => sessionStorage.getItem('adresse'));

test('accueil : aucune requête au chargement ni avec 2 caractères ; 3 caractères : une seule complétion après 300 ms, paramètres conformes', async ({ page }) => {
  await page.clock.install();
  const journal = await ouvrirAccueil(page);
  await page.waitForTimeout(100);
  expect(journal.externes).toEqual([]);
  await champ(page).click();
  await page.keyboard.type('12');
  await page.clock.runFor(1000);
  expect(journal.externes).toEqual([]);
  await page.keyboard.type(' r');
  await page.clock.runFor(299);
  expect(journal.completion).toHaveLength(0);
  await page.clock.runFor(10);
  await expect.poll(() => journal.completion.length).toBe(1);
  const u = new URL(journal.completion[0].url);
  expect(u.hostname).toBe('data.geopf.fr');
  expect(u.pathname).toBe('/geocodage/completion/');
  expect(u.searchParams.get('text')).toBe('12 r');
  expect(u.searchParams.get('type')).toBe('StreetAddress');
  expect(u.searchParams.get('maximumResponses')).toBe('5');
  expect(journal.externes.every((r) => r.referer === null || r.referer === 'http://localhost:4173/')).toBe(true);
});

test('rafale de frappes : une seule complétion ; frappes lentes : la requête précédente est annulée, seule la dernière aboutit', async ({ page }) => {
  const journal = await ouvrirAccueil(page);
  await champ(page).click();
  await page.keyboard.type('12 rue des Tilleuls', { delay: 20 });
  await expect(options(page)).toHaveCount(5);
  expect(journal.completion).toHaveLength(1);
  // frappes espacées de plus de 300 ms avec des réponses retenues : la première requête est annulée
  const retenues = [];
  await page.unroute('https://data.geopf.fr/geocodage/**');
  const echoues = [];
  page.on('requestfailed', (r) => echoues.push(r.url()));
  await page.route('https://data.geopf.fr/geocodage/**', (route) => { retenues.push(route); });
  await champ(page).fill('');
  await page.keyboard.type('8 av');
  await expect.poll(() => retenues.length).toBe(1);
  await page.keyboard.type('e');
  await expect.poll(() => retenues.length).toBe(2);
  await expect.poll(() => echoues.length).toBeGreaterThan(0); // la première requête est annulée
  await retenues[1].fulfill({ status: 200, contentType: 'application/json', body: reponseCompletion([['8 Avenue des Lilas 31000 Toulouse', 1.4437, 43.6047]]) }).catch(() => {});
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toHaveText('8 Avenue des Lilas 31000 Toulouse');
});

test('liste : cinq suggestions au plus, ARIA conforme, flèches, Entrée, Échap, clic ; le champ reçoit le libellé exact et l\'annonce est faite', async ({ page }) => {
  await ouvrirAccueil(page);
  await expect(champ(page)).toHaveAttribute('role', 'combobox');
  await expect(champ(page)).toHaveAttribute('aria-expanded', 'false');
  await suggestions(page);
  await expect(options(page)).toHaveCount(5);
  await expect(champ(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#adresse-liste')).toHaveAttribute('role', 'listbox');
  await expect(statut(page)).toHaveText('5 suggestions');
  const ids = await options(page).evaluateAll((els) => els.map((e) => e.id));
  expect(new Set(ids).size).toBe(5);
  await page.keyboard.press('ArrowDown');
  await expect(champ(page)).toHaveAttribute('aria-activedescendant', ids[0]);
  await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(champ(page)).toHaveAttribute('aria-activedescendant', ids[4]);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(options(page)).toHaveCount(0);
  await expect(champ(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(champ(page)).not.toHaveAttribute('aria-activedescendant', /.+/);
  await expect(champ(page)).toBeFocused();
  // Entrée choisit l'option active
  await champ(page).fill('');
  await suggestions(page, '12 rue des Tilleuls');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(champ(page)).toHaveValue(SUGGESTIONS[1][0]);
  await expect(statut(page)).toHaveText(`Adresse choisie : ${SUGGESTIONS[1][0]}`);
  await expect(options(page)).toHaveCount(0);
  await expect(champ(page)).toBeFocused();
  // clic choisit
  await champ(page).fill('');
  await suggestions(page, '12 rue des Tilleuls');
  await options(page).nth(3).click();
  await expect(champ(page)).toHaveValue(SUGGESTIONS[3][0]);
  await expect(champ(page)).toBeFocused();
});

test('repli : complétion en échec (500 ou CORS) → une requête search limit=5 et suggestions ; les deux en échec → message de panne, saisie possible', async ({ page }) => {
  const journal = await ouvrirAccueil(page, 1440, { completion: { status: 500, corps: '' } });
  await suggestions(page);
  expect(journal.completion).toHaveLength(1);
  const recherches = journal.geocodage.filter((r) => r.url.includes('/geocodage/search'));
  expect(recherches).toHaveLength(1);
  expect(new URL(recherches[0].url).searchParams.get('limit')).toBe('5');
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toHaveText(ADRESSE);
  // CORS simulé : la requête de complétion est abandonnée
  const autre = await page.context().newPage();
  const j2 = await ouvrirAccueil(autre, 1440, { completion: { abandon: true } });
  await suggestions(autre);
  expect(j2.geocodage.filter((r) => r.url.includes('/geocodage/search'))).toHaveLength(1);
  // les deux en échec
  const troisieme = await page.context().newPage();
  await ouvrirAccueil(troisieme, 1440, { completion: { status: 500, corps: '' }, geocodage: { status: 500, corps: '' } });
  await taper(troisieme, '12 rue des Til');
  await expect(statut(troisieme)).toHaveText('Suggestions indisponibles pour le moment.');
  await expect(options(troisieme)).toHaveCount(0);
  await troisieme.keyboard.type('leuls');
  await expect(champ(troisieme)).toHaveValue('12 rue des Tilleuls');
});

test('recherche par suggestion : aucune requête de vérification, session égale au libellé, arrivée sur le diagnostic', async ({ page }) => {
  const journal = await ouvrirAccueil(page);
  await suggestions(page);
  await options(page).first().click();
  const avant = journal.geocodage.length;
  await page.getByRole('button', { name: BOUTON }).click();
  await page.waitForURL('**/diagnostic.html');
  expect(await adresseSession(page)).toBe(SUGGESTIONS[0][0]);
  expect(new URL(page.url()).search).toBe('');
  // seul le géocodage de la carte du diagnostic suit : aucune requête limit=1 de vérification
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  const verifications = journal.geocodage.slice(avant).filter((r) => new URL(r.url).searchParams.get('limit') === '1');
  expect(verifications).toHaveLength(1); // celui de la carte (q = libellé choisi), pas de vérification supplémentaire
  expect(new URL(verifications[0].url).searchParams.get('q')).toBe(SUGGESTIONS[0][0]);
});

for (const largeur of [375, 768, 1440]) {
  test(`liste ouverte à ${largeur} px : axe sans violation, aucun décalage, aucun stockage ni cookie, adresse réservée à data.geopf.fr, console propre`, async ({ page, context }) => {
    const journal = await ouvrirAccueil(page, largeur);
    const console_ = surveillerConsole(page);
    const boites = () => page.evaluate(() => ['.recherche__microtexte', '.hero__recherche', '[data-role="aleas"]', '.bouton--action'].map((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y + scrollY), Math.round(b.width), Math.round(b.height)]; }));
    const avant = await boites();
    await suggestions(page);
    await expect(options(page)).toHaveCount(5);
    const apres = await boites();
    expect(apres).toEqual(avant); // la liste est superposée : rien ne bouge
    const liste = await page.locator('#adresse-liste').boundingBox();
    const saisie = await champ(page).boundingBox();
    expect(Math.abs(liste.width - saisie.width)).toBeLessThanOrEqual(2);
    expect(liste.y).toBeGreaterThanOrEqual(saisie.y + saisie.height);
    await page.waitForTimeout(300);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`)).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)))).toEqual([]);
    expect(await context.cookies()).toEqual([]);
    for (const r of journal.externes) {
      expect(new URL(r.url).hostname).toBe('data.geopf.fr');
    }
    expect(console_).toEqual([]);
    await page.screenshot({ path: `test-results/saisie-assistee-${largeur}.png`, fullPage: true });
  });
}

test('au toucher à 375 px, une option est choisissable ; l\'adresse (ou son début) n\'apparaît que dans les requêtes vers data.geopf.fr', async ({ browser }) => {
  const contexte = await browser.newContext({ hasTouch: true, viewport: { width: 375, height: 800 } });
  const page = await contexte.newPage();
  const journal = await ouvrirAccueil(page, 375);
  await suggestions(page);
  await options(page).nth(2).tap();
  await expect(champ(page)).toHaveValue(SUGGESTIONS[2][0]);
  await expect(options(page)).toHaveCount(0);
  for (const r of journal.externes) {
    if (decodeURIComponent(r.url).includes('Tilleuls') || decodeURIComponent(r.url).includes('12%20rue')) expect(new URL(r.url).hostname).toBe('data.geopf.fr');
  }
  expect(journal.externes.every((r) => new URL(r.url).hostname === 'data.geopf.fr')).toBe(true);
  await contexte.close();
});
