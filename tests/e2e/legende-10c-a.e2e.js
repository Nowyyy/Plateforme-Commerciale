// Lot 10c-A : légende officielle de la carte (GetLegendGraphic). Services et images de légende simulés : aucun résultat réel.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ADRESSE, ouvrirDiagnostic, reponseGaspar, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const HOTES = ['localhost', '127.0.0.1', 'data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const COUCHES = ['ALEA_SYNT_01_04FAI_FXX', 'PPRN_COMMUNE_RISQINOND_PRESCRIT', 'ALEARG', 'PPRN_COMMUNE_FEU_APPROUV'];
const ROLES = ['legende', 'exposition', 'equipements', 'pied'];
const entrees = (page) => page.locator('#legende-reelle li[data-calque]:not([hidden])');
const carteAffichee = async (page) => {
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  await expect(page.locator('#liste-calques label')).toHaveCount(3);
};
const rectangles = (page) => page.evaluate((roles) => Object.fromEntries(roles.map((r) => {
  const b = globalThis.document.querySelector(`[data-role="${r}"]`).getBoundingClientRect();
  return [r, [b.x, b.y + globalThis.scrollY, b.width, b.height]];
})), ROLES);
const memes = (a, b) => { for (const r of ROLES) a[r].forEach((v, i) => expect(Math.abs(v - b[r][i]), `${r}[${i}]`).toBeLessThanOrEqual(1)); };
const sansBruitReseau = (messages) => messages.filter((m) => !/Failed to load resource/.test(m));

test('requêtes de légende : seulement les couches affichées (cochées), hôte www, paramètres attendus', async ({ page }) => {
  // Seule l'inondation est recensée : une seule case, donc deux couches (aléa, communes avec plan de prévention), jamais argiles ni feux.
  const journal = await simuler(page, { api: { gaspar: { corps: reponseGaspar(['Inondation']) }, rga: { corps: reponseRga(0) } } });
  await ouvrirDiagnostic(page, 1440);
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  await expect(page.locator('#liste-calques label')).toHaveCount(1);
  await expect.poll(() => journal.legende.length).toBe(2);
  await page.waitForTimeout(500);
  expect(journal.legende).toHaveLength(2);
  const urls = journal.legende.map((e) => new URL(e.url));
  expect(urls.map((u) => u.searchParams.get('LAYER')).sort()).toEqual(['ALEA_SYNT_01_04FAI_FXX', 'PPRN_COMMUNE_RISQINOND_PRESCRIT']);
  for (const u of urls) {
    expect(u.hostname).toBe('www.georisques.gouv.fr');
    expect(u.protocol).toBe('https:');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ language: 'fre', SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetLegendGraphic', SLD_VERSION: '1.1.0', FORMAT: 'image/png' });
  }
  await expect(entrees(page)).toHaveCount(2);
  await page.getByRole('checkbox', { name: 'Zone inondable' }).uncheck();
  await expect(entrees(page)).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(journal.legende).toHaveLength(2);
});

test('trois calques proposés : une requête par couche cochée, quatre au total', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect.poll(() => journal.legende.length).toBe(4);
  expect(journal.legende.map((e) => new URL(e.url).searchParams.get('LAYER')).sort()).toEqual([...COUCHES].sort());
  for (const e of journal.legende) expect(new URL(e.url).hostname).toBe('www.georisques.gouv.fr');
});

test('décocher masque l\'entrée sans nouvelle requête, recocher la réaffiche sans nouvelle requête (cache)', async ({ page }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(entrees(page)).toHaveCount(4);
  await expect.poll(() => journal.legende.length).toBe(4);
  await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(4);
  await page.getByRole('checkbox', { name: 'Retrait-gonflement des argiles' }).uncheck();
  await expect(entrees(page)).toHaveCount(3);
  await expect(page.locator('#legende-reelle li[data-couche="ALEARG"]')).toBeHidden();
  await expect(page.locator('#legende-reelle li[data-couche="ALEARG"] img')).toHaveCount(1); // masquée, pas détruite
  await page.getByRole('checkbox', { name: 'Retrait-gonflement des argiles' }).check();
  await expect(entrees(page)).toHaveCount(4);
  await expect(page.locator('#legende-reelle li[data-couche="ALEARG"] img')).toBeVisible();
  await page.waitForTimeout(500);
  expect(journal.legende).toHaveLength(4);
  await expect(page.locator('#legende-reelle')).not.toContainText('Votre adresse'); // retouche client : entrée retirée
  await expect(page.locator('.legende__repere')).toHaveCount(0);
});

test('images affichées : hauteur maximale de 8 rem, alt issu des données, opacité de la couche, aucune pastille', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  const images = page.locator('#legende-reelle img');
  await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(4);
  for (const [i, couche] of COUCHES.entries()) {
    const img = page.locator(`#legende-reelle li[data-couche="${couche}"] img`);
    await expect(img, couche).toHaveCSS('max-height', '128px');
    await expect(img, couche).toHaveCSS('opacity', '0.7');
    const libelle = await page.locator(`#legende-reelle li[data-couche="${couche}"] .legende__libelle`).textContent();
    await expect(img).toHaveAttribute('alt', `Légende officielle Géorisques : ${libelle}`);
    expect(i).toBeGreaterThanOrEqual(0);
  }
  const sansAlt = await images.evaluateAll((els) => els.filter((e) => !e.getAttribute('alt')).length);
  expect(sansAlt).toBe(0);
  const taille = await images.first().evaluate((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]);
  expect(taille[0]).toBeCloseTo(200 * (taille[1] / 60) * 1, 0); // proportions conservées
  await expect(page.locator('.legende__motif, .legende__fond')).toHaveCount(0);
  await expect(page.locator('[data-role="legende"]')).not.toContainText('Les couleurs et les niveaux sont ceux du service Géorisques.'); // retouche client : note retirée
  await expect(page.locator('[data-role="exposition"]')).toContainText('Source officielle : Géorisques'); // le lien officiel reste sous les cases
});

test('argiles : la série répétée de l\'image officielle est rognée (moitié haute seule), les autres images restent entières', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(page.locator('#legende-reelle .legende__item--prete')).toHaveCount(4);
  await page.waitForTimeout(200);
  const mesure = (couche) => page.locator(`#legende-reelle li[data-couche="${couche}"]`).evaluate((li) => ({
    image: li.querySelector('.legende__image').getBoundingClientRect().height,
    img: li.querySelector('img').getBoundingClientRect().height,
    debord: globalThis.getComputedStyle(li.querySelector('.legende__image')).overflow,
  }));
  const argile = await mesure('ALEARG');
  expect(argile.debord).toBe('hidden');
  expect(Math.abs(argile.image - argile.img / 2)).toBeLessThanOrEqual(1);
  for (const couche of ['ALEA_SYNT_01_04FAI_FXX', 'PPRN_COMMUNE_RISQINOND_PRESCRIT', 'PPRN_COMMUNE_FEU_APPROUV']) {
    const m = await mesure(couche);
    expect(Math.abs(m.image - m.img), couche).toBeLessThanOrEqual(1);
  }
});

for (const [mode, options] of [
  ['404', { mode: '404' }],
  ['abandon réseau', { mode: 'abandon' }],
  ['réponse qui n\'est pas une image', { mode: 'texte' }],
  ['image de taille nulle', { mode: 'vide' }],
]) {
  test(`échec simulé (${mode}) : texte « indisponible », aucune pastille, réserve conservée, console propre`, async ({ page }) => {
    const messages = surveillerConsole(page);
    await simuler(page, { legende: options });
    await ouvrirDiagnostic(page, 1440);
    await carteAffichee(page);
    await expect(page.locator('#legende-reelle .legende__echec:not([hidden])')).toHaveCount(4);
    await expect(page.locator('#legende-reelle .legende__echec:not([hidden])').first()).toHaveText('Légende officielle indisponible pour cette couche.');
    await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(0);
    await expect(page.locator('#legende-reelle img:visible')).toHaveCount(0); // ni image cassée ni texte alternatif affiché
    await expect(page.locator('.legende__motif, .legende__fond')).toHaveCount(0);
    for (const hauteur of await entrees(page).evaluateAll((els) => els.map((e) => e.querySelector('.legende__image').getBoundingClientRect().height))) expect(hauteur).toBeGreaterThanOrEqual(80); // réserve de 5 rem
    await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1); // la carte n'est pas affectée
    expect(sansBruitReseau(messages)).toEqual([]);
  });
}

test('échec simulé : délai de 10 s dépassé (horloge simulée), puis une couche en échec n\'empêche pas les autres', async ({ page }) => {
  const messages = surveillerConsole(page);
  await page.clock.install();
  const journal = await simuler(page, { legende: { mode: 'ok', parCouche: { ALEARG: 'attente' } } });
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect.poll(() => journal.legende.length).toBe(4);
  await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(3);
  await expect(page.locator('#legende-etat')).toHaveText('Chargement de la légende…');
  await page.clock.fastForward(10500);
  await expect(page.locator('#legende-reelle li[data-couche="ALEARG"] .legende__echec')).toHaveText('Légende officielle indisponible pour cette couche.');
  await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(3);
  await expect(page.locator('#legende-etat')).toHaveText('');
  expect(sansBruitReseau(messages)).toEqual([]);
});

for (const largeur of [375, 768, 1440]) {
  test(`aucun décalage à ${largeur} px : rectangles de legende, exposition, equipements et pied identiques avant et après l'arrivée des images (réponse retardée de 2 s)`, async ({ page }) => {
    await simuler(page, { legende: { retard: 2000 } });
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    await expect(entrees(page)).toHaveCount(4);
    await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(0);
    await expect(page.locator('#legende-etat')).toHaveText('Chargement de la légende…');
    await expect(page.locator('#legende-reelle img:visible')).toHaveCount(0); // chargement : réserve vide, pas de texte alternatif
    const avant = await rectangles(page);
    await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(4, { timeout: 15000 });
    await page.waitForTimeout(300);
    memes(avant, await rectangles(page));
  });
}

test('CLS de 360 à 1440 px, JSON retardés de 400 ms, adresse simulée et images affichées : au plus 0,09', async ({ browser }) => {
  test.setTimeout(240000);
  for (const largeur of [360, 375, 414, 600, 768, 900, 1024, 1199, 1200, 1440]) {
    const contexte = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    await simuler(page);
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      await route.continue();
    });
    await page.addInitScript((adresse) => {
      sessionStorage.setItem('adresse', adresse);
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => { for (const e of liste.getEntries()) if (!e.hadRecentInput) globalThis.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    }, ADRESSE);
    await page.goto('/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(4, { timeout: 15000 });
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => globalThis.__cls);
    console.log(`${largeur} px : CLS ${cls.toFixed(3)}`);
    expect(cls, `${largeur} px`).toBeLessThanOrEqual(0.09);
    await contexte.close();
  }
});

test('sans adresse valide ou avant l\'affichage de la carte : aucune requête de légende', async ({ page, browser }) => {
  const journal = await simuler(page);
  await ouvrirDiagnostic(page, 1440, {});
  await page.waitForTimeout(800);
  expect(journal.externes).toEqual([]);
  expect(journal.legende).toEqual([]);
  await expect(entrees(page)).toHaveCount(0);
  const contexte = await browser.newContext({ baseURL: 'http://localhost:4173' });
  const page2 = await contexte.newPage();
  const journal2 = await simuler(page2, { geocodage: { attente: true } }); // la carte ne s'affiche jamais
  await ouvrirDiagnostic(page2, 1440);
  await page2.waitForTimeout(1000);
  expect(journal2.legende).toEqual([]);
  await expect(page2.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(0);
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  test(`à ${largeur} px (chargement, images, échec, case décochée) : console propre, aucun débordement, axe sans violation, aucune requête hors règle`, async ({ page }) => {
    test.setTimeout(90000);
    const messages = surveillerConsole(page);
    const journal = await simuler(page, { legende: { parCouche: { ALEARG: 'attente', PPRN_COMMUNE_FEU_APPROUV: '404' } } });
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    const verifier = async (etat) => {
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id} : ${v.nodes.length}`), `${etat} à ${largeur} px`).toEqual([]);
      const debord = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth);
      expect(debord, `${etat} : débordement`).toBeLessThanOrEqual(0);
    };
    await expect(page.locator('#legende-etat')).toHaveText('Chargement de la légende…'); // ALEARG ne répond jamais
    await verifier('chargement');
    await expect(page.locator('#legende-reelle img:not([hidden])')).toHaveCount(2);
    await expect(page.locator('#legende-reelle .legende__echec:not([hidden])')).toHaveCount(1);
    await verifier('images et échec');
    await page.getByRole('checkbox', { name: 'Zone inondable' }).uncheck();
    await expect(entrees(page)).toHaveCount(2);
    await verifier('case décochée');
    expect(sansBruitReseau(messages)).toEqual([]);
    for (const e of journal.externes) expect(HOTES, e.url).toContain(new URL(e.url).hostname);
  });
}

test('JavaScript désactivé : seul le message noscript, aucune requête de légende', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  const requetes = [];
  page.on('request', (r) => { if (!['localhost', '127.0.0.1'].includes(new URL(r.url()).hostname)) requetes.push(r.url()); });
  await page.goto('http://localhost:4173/diagnostic.html');
  expect((await page.evaluate(() => globalThis.document.body.innerText)).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  expect(requetes).toEqual([]);
  await contexte.close();
});
