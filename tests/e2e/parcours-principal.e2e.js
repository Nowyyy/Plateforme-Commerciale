import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';
import { UNE_LIGNE, ouvrirPanier, panierAvec } from '../outils/panier-aide.mjs';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const AMBRE = 'rgb(217, 119, 6)';
const sansEspaces = (t) => t.replace(/[\u202f\u00a0]/g, ' ');

// Suit la console, les requêtes et chaque URL visitée ; aucune donnée du visiteur ne doit figurer dans une URL.
function surveiller(page) {
  const suivi = { messages: [], externes: [], urls: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) suivi.urls.push(f.url()); });
  return suivi;
}

function controlerUrls(suivi) {
  expect(suivi.urls.length).toBeGreaterThan(4);
  for (const adresse of suivi.urls) {
    const url = new URL(adresse);
    expect(url.search, adresse).toBe('');
    expect(url.hash, adresse).toBe('');
    expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|1200|1 200|400|690|970|batardeau/i);
  }
}

async function saisir(page, largeur, hauteur) {
  await page.locator('#cote-largeur').fill(largeur);
  await page.locator('#cote-hauteur').fill(hauteur);
  await page.locator('#cote-tolerance').fill('');
}

// Parcours complet cliqué : accueil, adresse, diagnostic, fiche, cotes, mode, panier, validation, retour à l'accueil.
async function parcourir(page, largeur, mode) {
  const suivi = surveiller(page);
  const debut = Date.now();
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
  await expect(page.getByLabel('Adresse évaluée')).toHaveValue(ADRESSE);
  await page.waitForSelector('html[data-rendu="pret"]');
  const carte = page.locator('#liste-equipements > li').filter({ has: page.getByRole('heading', { level: 3, name: 'Batardeau modulable' }) });
  await carte.getByRole('link', { name: /Voir la fiche/ }).click();
  await page.waitForURL('**/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
  await saisir(page, '1 200', '400');
  const radio = mode === 'pose' ? /Matériel \+ pose/ : /Matériel seul/;
  await page.getByRole('radio', { name: radio }).check({ force: true });
  const totalFiche = sansEspaces(await page.locator('#mode-prix dd').last().innerText());
  const ajouter = page.getByRole('button', { name: 'Ajouter au panier' });
  await expect(ajouter).toHaveAttribute('aria-disabled', 'false');
  await ajouter.click();
  await expect(page.locator('#cotes-action .ajout__confirmation')).toContainText('Ajouté au panier : Batardeau modulable × 1.');
  await page.getByRole('link', { name: 'Voir le panier' }).click();
  await page.waitForURL((u) => u.pathname === '/panier.html');
  await page.waitForSelector('#recap[aria-busy="false"]');

  // récapitulatif conforme, case décochée
  const recap = page.locator('[data-role="recapitulatif"]');
  await expect(recap).toContainText('Batardeau modulable');
  await expect(recap).toContainText('Réf. BAT-120');
  await page.locator('#recap-deplier').click();
  expect((await recap.locator('.ligne__liste-cotes dd').allInnerTexts()).map(sansEspaces)).toEqual(['1 200 mm', '400 mm', '0 mm']);
  const caseConfirmation = page.getByLabel("Je confirme l'exactitude des mesures fournies.");
  await expect(caseConfirmation).not.toBeChecked();
  const total = page.locator('[data-role="total"]');
  const totalPanier = sansEspaces(await total.locator('dd').last().innerText());
  expect(totalPanier).toBe(totalFiche);
  expect(totalPanier).toBe(sansEspaces(formaterPrix(mode === 'pose' ? 970 : 690)));
  if (mode === 'pose') {
    await expect(total.locator('dt', { hasText: 'Pose estimée' })).toBeVisible();
    await expect(total).toContainText('Intervention estimée : sous 2 semaines après livraison');
  } else {
    await expect(total.locator('dt', { hasText: 'Pose estimée' })).toHaveCount(0);
  }

  // validation
  const valider = page.getByRole('button', { name: 'Valider ma commande' });
  await expect(valider).toHaveAttribute('aria-disabled', 'true');
  await caseConfirmation.check();
  await expect(valider).toHaveAttribute('aria-disabled', 'false');
  expect(await valider.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(AMBRE);
  await valider.click();
  const confirmation = page.locator('#total-etat');
  await expect(confirmation).toContainText('Commande simulée (exemple)');
  await expect(confirmation).toContainText('CMD-000 (exemple)');
  await expect(confirmation).toBeFocused();
  await confirmation.getByRole('link', { name: "Retour à l'accueil" }).click();
  await page.waitForURL((u) => u.pathname === '/index.html');
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();

  controlerUrls(suivi);
  expect(suivi.externes).toEqual([]);
  expect(suivi.messages).toEqual([]);
  console.log(`parcours ${mode} à ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s, ${suivi.urls.length} URL`);
}

for (const mode of ['diy', 'pose']) {
  for (const largeur of [375, 1440]) {
    test(`parcours principal ${mode === 'pose' ? 'pose' : 'DIY'} à ${largeur} px : accueil, adresse, diagnostic, fiche, cotes, panier, validation`, async ({ page }) => {
      await parcourir(page, largeur, mode);
    });
  }
}

test('aller-retour : cotes restaurées, cotes hors tolérance, panier tel qu\'enregistré, puis ligne écrasée refusée', async ({ page }) => {
  const suivi = surveiller(page);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await saisir(page, '1 200', '400');
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await page.getByRole('link', { name: 'Voir le panier' }).click();
  await page.waitForURL((u) => u.pathname === '/panier.html');
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.locator('#recap-deplier').click();
  await page.getByRole('button', { name: 'Reprendre ces cotes à la fiche' }).click();
  await page.waitForURL((u) => u.pathname === '/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#cote-largeur')).toHaveValue('1200'); // la reprise écrit les entiers de la ligne
  await expect(page.locator('#cote-hauteur')).toHaveValue('400');
  const ajouter = page.getByRole('button', { name: 'Ajouter au panier' });
  await expect(ajouter).toHaveAttribute('aria-disabled', 'false');
  await page.locator('#cote-largeur').fill('1700');
  await expect(ajouter).toHaveAttribute('aria-disabled', 'true');
  // retour au panier par l'en-tête : le panier enregistré est inchangé
  await page.locator('header .entete__panier-barre').click();
  await page.waitForURL((u) => u.pathname === '/panier.html');
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.locator('#recap-deplier').click();
  expect((await page.locator('[data-role="recapitulatif"] .ligne__liste-cotes dd').allInnerTexts()).map(sansEspaces).slice(0, 2)).toEqual(['1 200 mm', '400 mm']);
  // ligne écrasée par des cotes invalides (non forcé : le test écrit la session) : ligne à vérifier, validation neutre
  await page.evaluate(() => sessionStorage.setItem('panier', JSON.stringify({
    v: 2, lignes: [{ produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 699, hauteur: 400, tolerance: 0 }, quantite: 1 }],
  })));
  await page.reload();
  await page.waitForSelector('#recap[aria-busy="false"]');
  await expect(page.locator('.ligne')).toContainText('À vérifier');
  await expect(page.getByRole('button', { name: 'Valider ma commande' })).toHaveAttribute('aria-disabled', 'true');
  controlerUrls(suivi);
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
});

const ETATS = {
  vide: { session: null },
  invalide: { session: panierAvec({ cotes: { largeur: 699, hauteur: 400, tolerance: 0 } }) },
  'plein décoché': { session: UNE_LIGNE },
  'plein coché': { session: UNE_LIGNE, cocher: true },
  confirmé: { session: UNE_LIGNE, valider: true },
};
for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : états vide, invalide, plein (décoché, coché) et confirmé ; console propre, axe, sans débordement`, async ({ browser }) => {
    for (const [nom, etat] of Object.entries(ETATS)) {
      const contexte = await browser.newContext();
      const page = await contexte.newPage();
      const suivi = await ouvrirPanier(page, largeur, etat.session);
      if (etat.cocher || etat.valider) await page.getByLabel("Je confirme l'exactitude des mesures fournies.").check();
      if (etat.valider) await page.getByRole('button', { name: 'Valider ma commande' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), nom).toBe(false);
      expect((await new AxeBuilder({ page }).analyze()).violations, nom).toEqual([]);
      expect(suivi.messages, nom).toEqual([]);
      expect(suivi.externes, nom).toEqual([]);
      await page.screenshot({ path: `test-results/panier-C-${nom.replace(/\W+/g, '-')}-${largeur}.png`, fullPage: true });
      await contexte.close();
    }
  });
}

test('JavaScript désactivé : seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto('http://localhost:4173/panier.html');
  expect((await page.evaluate(() => document.body.innerText)).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});

// CLS de 360 à 1440 px, JSON retardés de 400 ms ; DIY, pose, vide, invalide
const CLS_MAX = 0.08;
const CLS_CAS = {
  'une ligne': UNE_LIGNE, pose: panierAvec({ mode: 'pose' }), vide: null, illisible: 'illisible',
};
for (const [nom, session] of Object.entries(CLS_CAS)) {
  test(`CLS du panier (${nom}) de 360 à 1440 px, JSON retardés de 400 ms : au plus ${CLS_MAX}`, async ({ browser }) => {
    const pires = [];
    for (const largeur of [360, 414, 768, 1024, 1200, 1440]) {
      const contexte = await browser.newContext({ viewport: { width: largeur, height: 800 } });
      const page = await contexte.newPage();
      await page.route('**/data/*.json', async (route) => { await new Promise((r) => setTimeout(r, 400)); await route.continue(); });
      await page.addInitScript((brut) => {
        if (brut !== null) sessionStorage.setItem('panier', brut);
        globalThis.__cls = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) globalThis.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      }, session === null ? null : (typeof session === 'string' ? session : JSON.stringify(session)));
      await page.goto('/panier.html');
      await page.waitForSelector('#recap[aria-busy="false"]');
      await page.waitForTimeout(300);
      pires.push([largeur, await page.evaluate(() => globalThis.__cls)]);
      await contexte.close();
    }
    console.log(`CLS ${nom} : ${pires.map(([l, c]) => `${l}=${c.toFixed(3)}`).join(' ')}`);
    for (const [largeur, cls] of pires) expect(cls, `${nom} ${largeur}`).toBeLessThanOrEqual(CLS_MAX);
  });
}
