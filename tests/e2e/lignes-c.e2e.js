import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler } from './carte-reelle-simulation.js';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';
import { LIGNE, TROIS_LIGNES, UNE_LIGNE, ouvrirPanier, panierAvec } from '../outils/panier-aide.mjs';

const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const AMBRE = 'rgb(217, 119, 6)';
const sansEspaces = (t) => t.replace(/\s/g, ' ');
const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const valider = (page) => page.getByRole('button', { name: 'Valider ma commande' });
const caseConfirmation = (page) => page.getByLabel("Je confirme l'exactitude des mesures fournies.");
const sessionPanier = async (page) => page.evaluate(() => sessionStorage.getItem('panier'));

const HOTES_CARTE = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];

function surveiller(page) {
  const suivi = { messages: [], externes: [], urls: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:') && !HOTES_CARTE.includes(new URL(r.url()).hostname)) suivi.externes.push(r.url()); });
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) suivi.urls.push(f.url()); });
  return suivi;
}

async function ouvrirFiche(page, titre) {
  const carte = page.locator('#liste-equipements > li').filter({ has: page.getByRole('heading', { level: 3, name: titre }) });
  await carte.getByRole('link', { name: /Voir la fiche/ }).click();
  await page.waitForURL('**/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
}

const saisir = async (page, largeur, hauteur) => {
  await page.locator('#cote-largeur').fill(largeur);
  await page.locator('#cote-hauteur').fill(hauteur);
  await page.locator('#cote-tolerance').fill('');
};

// Parcours multi-lignes cliqué : accueil, adresse, diagnostic, fiche (batardeau), ajouts, autre produit, panier, validation.
async function parcours(page, largeur) {
  await simuler(page); // services de la carte simulés
  const suivi = surveiller(page);
  const debut = Date.now();
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  await page.getByLabel(/Entrez votre adresse/).fill(ADRESSE);
  await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
  await page.waitForURL('**/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await ouvrirFiche(page, 'Batardeau modulable');
  await saisir(page, '1 200', '400');
  await page.getByRole('radio', { name: /Matériel seul/ }).check({ force: true });
  const ajouter = page.getByRole('button', { name: 'Ajouter au panier' });
  await page.getByRole('button', { name: 'Augmenter la quantité : Batardeau modulable' }).click();
  await ajouter.click();
  const confirmation = page.locator('#cotes-action .ajout__confirmation');
  await expect(confirmation).toContainText('Ajouté au panier : Batardeau modulable × 2.');
  await confirmation.getByRole('link', { name: 'Continuer mes achats' }).click();
  await page.waitForURL('**/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  // retour à la même fiche : cotes et mode conservés ; la même configuration cumule la quantité sur une seule ligne
  await ouvrirFiche(page, 'Batardeau modulable');
  await expect(page.locator('#cote-largeur')).toHaveValue('1 200');
  await expect(page.getByRole('radio', { name: /Matériel seul/ })).toBeChecked();
  await ajouter.click();
  await expect(confirmation).toContainText('Quantité mise à jour : Batardeau modulable × 3.');
  // mode pose avec d'autres cotes : deuxième ligne
  await saisir(page, '800', '400');
  await page.getByRole('radio', { name: /Matériel \+ pose/ }).check({ force: true });
  await ajouter.click();
  await expect(confirmation).toContainText('Ajouté au panier : Batardeau modulable × 1.');
  await confirmation.getByRole('link', { name: 'Continuer mes achats' }).click();
  await page.waitForURL('**/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  // produit non complet : quantité 3
  await ouvrirFiche(page, 'Bouclier de baie');
  const bouton = page.locator('[data-role="mode"]').getByRole('button', { name: 'Ajouter au panier' });
  for (let i = 0; i < 2; i += 1) await page.getByRole('button', { name: 'Augmenter la quantité : Bouclier de baie' }).click();
  await page.getByRole('radio', { name: /Matériel seul/ }).check({ force: true });
  await bouton.click();
  const confirmationMode = page.locator('[data-ajout="mode"] .ajout__confirmation');
  await expect(confirmationMode).toContainText('Ajouté au panier : Bouclier de baie × 3.');
  await confirmationMode.getByRole('link', { name: 'Voir le panier' }).click();
  await page.waitForURL((u) => u.pathname === '/panier.html');
  await page.waitForSelector('#recap[aria-busy="false"]');

  // panier : 3 lignes, 7 articles, totaux calculés indépendamment à partir des données
  await expect(page.locator('.ligne')).toHaveCount(3);
  await expect(page.locator('#recap-sous-titre')).toHaveText('3 lignes · 7 articles');
  const total = page.locator('[data-role="total"]');
  const materiel = 690 * 3 + 690 + 1250 * 3;
  const pose = 280;
  // assertions avec nouvelle tentative : avec « reduce », base.css donne 0,01 ms de transition à toute propriété et une lecture immédiate rend l'ancien style
  await expect(total.locator('dd')).toHaveText([formaterPrix(materiel), formaterPrix(pose), formaterPrix(materiel + pose)]);
  await expect(total.locator('dt')).toHaveText(['Matériel (7 articles)', 'Pose estimée (1 article)', 'Total estimé TTC']);
  await expect(total).toContainText('Livraison estimée : 3 à 4 semaines (délai le plus long)');
  await expect(total).toContainText('Intervention estimée : sous 2 semaines après livraison');
  await page.locator('#recap-deplier').click();
  await expect(page.locator('.ligne__liste-cotes dd')).toHaveText(['1 200 mm', '400 mm', '0 mm', '800 mm', '400 mm', '0 mm']);
  await expect(page.locator('.ligne').nth(0)).toContainText('690 € × 3'.replace(/ /g, ' '));
  // case exigée, puis validation
  await expect(valider(page)).toHaveAttribute('aria-disabled', 'true');
  await caseConfirmation(page).check();
  await expect(valider(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(valider(page)).toHaveCSS('background-color', AMBRE);
  await valider(page).click();
  const etat = page.locator('#total-etat');
  await expect(etat).toContainText('Commande simulée (exemple)');
  await expect(etat).toBeFocused();
  expect(await sessionPanier(page)).toBeNull();

  for (const adresse of suivi.urls) {
    const url = new URL(adresse);
    expect(url.search, adresse).toBe('');
    expect(url.hash, adresse).toBe('');
    expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|1200|1 200|800|690|970|batardeau|clapet/i);
  }
  expect(suivi.externes).toEqual([]);
  expect(suivi.messages).toEqual([]);
  console.log(`parcours multi-lignes à ${largeur} px : ${((Date.now() - debut) / 1000).toFixed(1)} s, ${suivi.urls.length} URL`);
}

for (const largeur of [375, 1440]) {
  test(`parcours multi-lignes à ${largeur} px : ajouts cumulés, trois lignes, totaux, case, validation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await parcours(page, largeur);
  });
}

test('compteur d\'en-tête : « Panier (7) » sur les quatre pages, aucun compteur à 0, « 99+ », mises à jour', async ({ page }) => {
  const suivi = surveiller(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const sept = { v: 2, lignes: [TROIS_LIGNES.lignes[0], TROIS_LIGNES.lignes[1], TROIS_LIGNES.lignes[2]] }; // 2 + 1 + 3 = 6
  sept.lignes[1] = { ...sept.lignes[1], quantite: 2 }; // 7 articles
  await page.addInitScript((brut) => { if (!sessionStorage.getItem('__i')) { sessionStorage.setItem('panier', brut); sessionStorage.setItem('__i', '1'); } }, JSON.stringify(sept));
  for (const chemin of ['/index.html', '/diagnostic.html', '/produit.html', '/panier.html']) {
    await page.goto(chemin);
    await page.waitForSelector('html[data-rendu="pret"]');
    const lien = page.locator('header .entete__panier-barre, header .nav__panier a');
    await expect(lien.locator('.compteur')).toHaveCount(2);
    await expect(page.locator('header .nav__panier a').getByText('(7)')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Panier (7) articles dans le panier' }).first()).toBeAttached();
  }
  // mise à jour après un changement de quantité dans le panier, puis après la validation
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.locator('.ligne').nth(2).getByRole('button', { name: /Augmenter/ }).click();
  await expect(page.locator('header .nav__panier a .compteur__nombre')).toHaveText('(8)');
  await page.getByLabel("Je confirme l'exactitude des mesures fournies.").check();
  await valider(page).click();
  await expect(page.locator('.compteur')).toHaveCount(0);
  // « 99+ » : session de plus de 99 articles préparée en contournant les limites
  await page.evaluate(() => sessionStorage.setItem('panier', JSON.stringify({ v: 2, lignes: [{ produit: 'clapet-anti-retour', mode: 'diy', cotes: null, quantite: 60 }, { produit: 'volet-extrude', mode: 'diy', cotes: null, quantite: 60 }] })));
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('header .nav__panier a .compteur__nombre')).toHaveText('(99+)');
  // panier vide ou illisible : aucun compteur
  for (const brut of ['{"v":2,"lignes":[]}', 'pas du json', '{"v":1}']) {
    await page.evaluate((b) => sessionStorage.setItem('panier', b), brut);
    await page.reload();
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('.compteur')).toHaveCount(0);
  }
  expect(suivi.messages).toEqual([]);
});

test('compteur d\'en-tête à 375 px : bouton Menu sur la ligne, axe sans violation (contraste du compteur)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.addInitScript((brut) => sessionStorage.setItem('panier', brut), JSON.stringify({ v: 2, lignes: [{ produit: 'clapet-anti-retour', mode: 'diy', cotes: null, quantite: 12 }] }));
  await page.goto('/index.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('header .entete__panier-barre .compteur__nombre')).toHaveText('(12)');
  const [menu, marque] = await Promise.all([page.locator('.entete__menu').boundingBox(), page.locator('.marque').boundingBox()]);
  expect(Math.abs(menu.y + menu.height / 2 - (marque.y + marque.height / 2))).toBeLessThanOrEqual(12);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('responsabilité conditionnelle : masquée sans ligne sur mesure (bouton actif d\'emblée) ; visible avec une ligne sur mesure (bouton neutre tant que la case n\'est pas cochée)', async ({ page, browser }) => {
  await ouvrirPanier(page, 1440, { v: 2, lignes: [{ produit: 'clapet-anti-retour', mode: 'diy', cotes: null, quantite: 2 }, { produit: 'volet-extrude', mode: 'pose', cotes: null, quantite: 1 }] });
  await expect(page.locator('[data-role="responsabilite"]')).toBeHidden();
  await expect(valider(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(valider(page)).toHaveCSS('background-color', AMBRE);
  await expect(page.locator('#total-etat')).toHaveText('');
  await expect(page.locator('.ligne__aide')).toHaveCount(0);
  const contexte = await browser.newContext();
  const autre = await contexte.newPage();
  await ouvrirPanier(autre, 1440, TROIS_LIGNES);
  await expect(autre.locator('[data-role="responsabilite"]')).toBeVisible();
  await expect(autre.locator('#responsabilite-phrase')).toHaveText('2 lignes sur mesure : vérifiez les cotes de chaque ligne avant de valider (exemple).');
  await expect(valider(autre)).toHaveAttribute('aria-disabled', 'true');
  await expect(valider(autre)).not.toHaveCSS('background-color', AMBRE);
  await expect(autre.locator('#total-etat')).toContainText('Cochez la case de confirmation pour continuer.');
  await valider(autre).click({ force: true });
  await expect(caseConfirmation(autre)).toBeFocused();
  await caseConfirmation(autre).check();
  await expect(valider(autre)).toHaveAttribute('aria-disabled', 'false');
  await expect(valider(autre)).toHaveCSS('background-color', AMBRE);
  await caseConfirmation(autre).uncheck();
  await expect(valider(autre)).toHaveAttribute('aria-disabled', 'true');
  await autre.getByRole('button', { name: 'Voir les cotes de chaque ligne' }).click();
  const ouverts = await autre.locator('.ligne__details').evaluateAll((els) => els.map((e) => e.open));
  expect(ouverts).toEqual([true, true, false]);
  await expect(autre.locator('.ligne').first().locator('.ligne__resume')).toBeFocused();
  // un seul sur mesure : phrase au singulier
  await autre.locator('.ligne').nth(0).getByRole('button', { name: 'Retirer' }).click();
  await autre.locator('.ligne').nth(0).getByRole('button', { name: 'Retirer' }).click();
  await expect(autre.locator('[data-role="responsabilite"]')).toBeHidden();
  await contexte.close();
});

test('lignes invalides : validation neutre avec l\'aide « Corrigez ou retirez… » ; retirer la ligne invalide la rend active (case cochée si nécessaire)', async ({ page }) => {
  await ouvrirPanier(page, 1440, { v: 2, lignes: [LIGNE, { ...LIGNE, cotes: { largeur: 699, hauteur: 400, tolerance: 0 } }] });
  await caseConfirmation(page).check();
  await expect(valider(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(valider(page)).not.toHaveCSS('background-color', AMBRE);
  await expect(page.locator('#total-etat')).toContainText('Corrigez ou retirez les lignes à vérifier pour continuer.');
  await valider(page).click({ force: true });
  await expect(page.locator('#total-etat')).toContainText('Corrigez ou retirez');
  await expect(page.locator('#total-etat')).not.toContainText('CMD-000');
  await page.locator('.ligne').nth(1).getByRole('button', { name: 'Retirer' }).click();
  await expect(valider(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(valider(page)).toHaveCSS('background-color', AMBRE);
});

test('confirmation : lignes affichées sans contrôles, panier supprimé, case désactivée ; rechargement : panier vide, aucun compteur', async ({ page }) => {
  const suivi = await ouvrirPanier(page, 375, TROIS_LIGNES);
  await caseConfirmation(page).check();
  await valider(page).click();
  const etat = page.locator('#total-etat');
  await expect(etat).toContainText('Commande simulée (exemple)');
  await expect(etat).toContainText('Numéro : CMD-000 (exemple)');
  await expect(etat).toBeFocused();
  await expect(valider(page)).toBeHidden();
  await expect(caseConfirmation(page)).toBeDisabled();
  await expect(page.locator('.ligne')).toHaveCount(3);
  expect(await page.locator('.quantite').count()).toBe(0);
  expect(await page.locator('.ligne__retirer').count()).toBe(0);
  expect(await page.locator('.ligne__reprendre').count()).toBe(0);
  await expect(page.locator('#recap-deplier')).toBeHidden();
  await expect(page.locator('.ligne').first()).toContainText('970 € × 2'.replace(/ /g, ' '));
  expect(await sessionPanier(page)).toBeNull();
  await expect(page.locator('.compteur')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.reload();
  await page.waitForSelector('#recap[aria-busy="false"]');
  await expect(page.locator('#recap-vide').getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
  await expect(page.locator('.compteur')).toHaveCount(0);
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
});

test('totaux : ligne de pose et délai d\'intervention avec de la pose ; en DIY seul, aucune ligne de pose', async ({ page, browser }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  const total = page.locator('[data-role="total"]');
  await expect(total.locator('dt')).toHaveText(['Matériel (6 articles)', 'Pose estimée (2 articles)', 'Total estimé TTC']);
  expect((await total.locator('dd').allInnerTexts()).map(sansEspaces)).toEqual([2 * 690 + 690 + 3 * 149, 2 * 280, 2 * 690 + 690 + 3 * 149 + 2 * 280].map((n) => sansEspaces(formaterPrix(n))));
  await expect(total).toContainText('Intervention estimée : sous 2 semaines après livraison');
  const contexte = await browser.newContext();
  const diy = await contexte.newPage();
  await ouvrirPanier(diy, 1440, { v: 2, lignes: [TROIS_LIGNES.lignes[1], TROIS_LIGNES.lignes[2]] });
  const totalDiy = diy.locator('[data-role="total"]');
  await expect(totalDiy.locator('dt')).toHaveText(['Matériel (4 articles)', 'Total estimé TTC']);
  await expect(totalDiy).not.toContainText('Intervention estimée');
  await expect(totalDiy).toContainText('Livraison estimée : 2 à 3 semaines (délai le plus long)');
  await contexte.close();
});

const ETATS = {
  vide: { session: null },
  illisible: { session: 'ceci n\'est pas du JSON' },
  'une ligne': { session: UNE_LIGNE },
  'trois lignes repliées': { session: TROIS_LIGNES },
  'trois lignes dépliées': { session: TROIS_LIGNES, deplier: true, cocher: true },
  'dix lignes': { session: { v: 2, lignes: Array.from({ length: 10 }, (_, i) => ({ ...LIGNE, cotes: { largeur: 800 + i * 50, hauteur: 400, tolerance: 0 }, quantite: i + 1 })) }, deplier: true },
  invalide: { session: panierAvec({ cotes: { largeur: 699, hauteur: 400, tolerance: 0 } }) },
  confirmé: { session: TROIS_LIGNES, valider: true },
};
for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : tous les états du panier ; console propre, axe, sans débordement, aucune requête externe`, async ({ browser }) => {
    for (const [nom, etat] of Object.entries(ETATS)) {
      const contexte = await browser.newContext();
      const page = await contexte.newPage();
      const suivi = await ouvrirPanier(page, largeur, etat.session);
      if (etat.deplier) await page.locator('#recap-deplier').click();
      if (etat.cocher || etat.valider) await caseConfirmation(page).check();
      if (etat.valider) await valider(page).click();
      expect(await debordement(page), nom).toBe(false);
      expect((await new AxeBuilder({ page }).analyze()).violations, nom).toEqual([]);
      expect(suivi.messages, nom).toEqual([]);
      expect(suivi.externes, nom).toEqual([]);
      await page.screenshot({ path: `test-results/lignes-C-${nom.replace(/\W+/g, '-')}-${largeur}.png`, fullPage: true });
      await contexte.close();
    }
  });
}

test('JavaScript désactivé : seul le message noscript est visible sur les quatre pages Hi-Fi', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  for (const chemin of ['index.html', 'diagnostic.html', 'produit.html', 'panier.html']) {
    await page.goto(`http://localhost:4173/${chemin}`);
    expect((await page.evaluate(() => document.body.innerText)).trim(), chemin).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
