import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LIGNE, TROIS_LIGNES, UNE_LIGNE, ouvrirPanier, panierAvec } from '../outils/panier-aide.mjs';

const sansEspaces = (t) => t.replace(/\s/g, ' ');
const lignes = (page) => page.locator('.ligne');
const session = async (page) => JSON.parse(await page.evaluate(() => sessionStorage.getItem('panier')));
const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const etat = (page) => page.locator('#recap-etat');
const texte = async (loc) => sansEspaces(await loc.innerText());

test('trois lignes : nom, référence, mode, prix unitaire × quantité et total conformes aux données ; détails fermés ; sous-titre', async ({ page }) => {
  const suivi = await ouvrirPanier(page, 1440, TROIS_LIGNES);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Votre panier');
  await expect(lignes(page)).toHaveCount(3);
  await expect(page.locator('#recap-sous-titre')).toHaveText('3 lignes · 6 articles');
  await expect(page.locator('#recap-sous-titre')).toHaveAttribute('aria-live', 'polite');
  const [pose, diy, clapet] = await Promise.all([0, 1, 2].map((i) => texte(lignes(page).nth(i))));
  for (const [t, attendu] of [
    [pose, ['Batardeau modulable', 'Réf. BAT-120', 'Mode : Matériel + pose par un artisan partenaire', 'Sur mesure : 1 200 × 400 mm', '970 € × 2', 'Total de la ligne : 1 940 €']],
    [diy, ['Réf. BAT-120', 'Mode : Matériel seul (DIY)', 'Sur mesure : 900 × 350 mm', '690 € × 1', 'Total de la ligne : 690 €']],
    [clapet, ['Clapet anti-retour', 'Mode : Matériel seul (DIY)', 'Prêt à poser, sans mesure', '149 € × 3', 'Total de la ligne : 447 €']],
  ]) for (const morceau of attendu) expect(t).toContain(morceau);
  for (const details of await page.locator('.ligne__details').all()) expect(await details.evaluate((el) => el.open)).toBe(false);
  await expect(page.locator('.ligne__details')).toHaveCount(3);
  await expect(page.locator('.ligne__retirer')).toHaveCount(3);
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).not.toMatch(/prix|total|titre|delai/);
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
});

test('quantités : « + » et « − » mettent à jour le total de ligne, le sous-titre, la session et l\'annonce ; bornes 1 et 10', async ({ page }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  const ligne = lignes(page).nth(2);
  const plus = () => lignes(page).nth(2).getByRole('button', { name: 'Augmenter la quantité : Clapet anti-retour' });
  const moins = () => lignes(page).nth(2).getByRole('button', { name: 'Diminuer la quantité : Clapet anti-retour' });
  await plus().click();
  await expect(ligne.locator('output')).toHaveText('4');
  await expect(ligne).toContainText('149 € × 4');
  expect(await texte(ligne)).toContain('Total de la ligne : 596 €');
  await expect(page.locator('#recap-sous-titre')).toHaveText('3 lignes · 7 articles');
  await expect(etat(page)).toContainText('Clapet anti-retour : quantité 4.');
  await expect(etat(page).getByRole('button', { name: 'Annuler' })).toHaveCount(0);
  expect((await session(page)).lignes[2].quantite).toBe(4);
  await expect(plus()).toBeFocused();
  for (let i = 0; i < 8; i += 1) await plus().click({ force: true });
  await expect(ligne.locator('output')).toHaveText('10');
  await expect(plus()).toHaveAttribute('aria-disabled', 'true');
  expect((await session(page)).lignes[2].quantite).toBe(10);
  for (let i = 0; i < 12; i += 1) await moins().click({ force: true });
  await expect(ligne.locator('output')).toHaveText('1');
  await expect(moins()).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#recap-sous-titre')).toHaveText('3 lignes · 4 articles');
  expect((await session(page)).lignes[2].quantite).toBe(1);
});

test('retrait et annulation : annonce avec « Annuler », ligne restaurée à sa place avec sa quantité ; plus d\'« Annuler » après une autre modification ; panier vidé : état vide', async ({ page }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  await lignes(page).nth(1).getByRole('button', { name: 'Retirer' }).click();
  await expect(lignes(page)).toHaveCount(2);
  await expect(etat(page)).toContainText('Batardeau modulable retiré du panier.');
  const annuler = etat(page).getByRole('button', { name: 'Annuler' });
  await expect(annuler).toBeFocused();
  expect((await session(page)).lignes).toHaveLength(2);
  await annuler.click();
  await expect(lignes(page)).toHaveCount(3);
  await expect(etat(page)).toContainText('Batardeau modulable remis dans le panier.');
  await expect(lignes(page).nth(1)).toContainText('Sur mesure : 900 × 350 mm');
  expect((await session(page)).lignes[1]).toEqual({ ...TROIS_LIGNES.lignes[1] });
  // retrait puis autre modification : « Annuler » disparaît
  await lignes(page).nth(2).getByRole('button', { name: 'Retirer' }).click();
  await expect(etat(page).getByRole('button', { name: 'Annuler' })).toBeVisible();
  await lignes(page).nth(0).getByRole('button', { name: /Augmenter/ }).click();
  await expect(etat(page).getByRole('button', { name: 'Annuler' })).toHaveCount(0);
  // tout retirer : état vide
  await lignes(page).nth(0).getByRole('button', { name: 'Retirer' }).click();
  await lignes(page).nth(0).getByRole('button', { name: 'Retirer' }).click();
  await expect(lignes(page)).toHaveCount(0);
  await expect(page.locator('#recap-vide').getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();
  for (const role of ['responsabilite', 'total', 'paiement']) await expect(page.locator(`[data-role="${role}"]`)).toBeHidden();
  await etat(page).getByRole('button', { name: 'Annuler' }).click();
  await expect(lignes(page)).toHaveCount(1);
});

test('« Tout déplier » ouvre tous les détails (cotes, délais, aperçu avec A et B) ; fermer un détail à la main remet « Tout déplier »', async ({ page }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  const bouton = page.locator('#recap-deplier');
  await expect(bouton).toHaveText('Tout déplier');
  await bouton.click();
  await expect(bouton).toHaveText('Tout replier');
  for (const details of await page.locator('.ligne__details').all()) expect(await details.evaluate((el) => el.open)).toBe(true);
  const premiere = lignes(page).nth(0);
  expect(await texte(premiere.locator('.ligne__liste-cotes'))).toContain('Largeur du tableau (A) 1 200 mm');
  await expect(premiere.locator('.ligne__liste-cotes dd')).toHaveText(['1 200 mm', '400 mm', '0 mm']);
  await expect(premiere.locator('.ligne__liste-delais dt')).toHaveText(['Livraison directe usine :', "Intervention de l'artisan :"]);
  await expect(premiere.locator('.ligne__liste-delais dd')).toHaveText(['2 à 3 semaines', 'sous 2 semaines après livraison']);
  expect(sansEspaces(await premiere.locator('.schema__valeur--a').textContent())).toBe('1 200 mm');
  expect(sansEspaces(await premiere.locator('.schema__valeur--b').textContent())).toBe('400 mm');
  await expect(premiere.getByRole('img')).toHaveAttribute('aria-label', /Aperçu des cotes : largeur 1.200 mm, hauteur 400 mm \(exemple\)/);
  await expect(lignes(page).nth(2).locator('.ligne__apercu')).toHaveCount(0);
  await expect(lignes(page).nth(2).locator('.ligne__liste-delais dt')).toHaveText(['Livraison directe usine :']);
  await premiere.locator('.ligne__resume').click();
  await expect(bouton).toHaveText('Tout déplier');
  await bouton.click();
  await bouton.click();
  await expect(bouton).toHaveText('Tout déplier');
  for (const details of await page.locator('.ligne__details').all()) expect(await details.evaluate((el) => el.open)).toBe(false);
});

test('ligne invalide (largeur 699) : « À vérifier » avec la raison, exclue du total, « Retirer » disponible ; produit inconnu : pas de lien vers la fiche ; session illisible : « Panier à vérifier »', async ({ page }) => {
  const suivi = await ouvrirPanier(page, 1440, {
    v: 2,
    lignes: [LIGNE, { ...LIGNE, cotes: { largeur: 699, hauteur: 400, tolerance: 0 } }, { produit: 'inconnu', mode: 'diy', cotes: null, quantite: 2 }],
  });
  await expect(lignes(page)).toHaveCount(3);
  const invalide = lignes(page).nth(1);
  await expect(invalide).toContainText('À vérifier : cotes absentes ou hors de la plage du produit.');
  await expect(invalide.locator('.quantite')).toHaveCount(0);
  await expect(invalide.locator('.ligne__details')).toHaveCount(0);
  await expect(invalide.getByRole('button', { name: 'Retirer' })).toBeVisible();
  await expect(invalide.getByRole('button', { name: 'Reprendre à la fiche' })).toBeVisible();
  const inconnu = lignes(page).nth(2);
  await expect(inconnu).toContainText('À vérifier : produit inconnu.');
  await expect(inconnu.getByRole('button', { name: /Reprendre/ })).toHaveCount(0);
  await expect(inconnu.getByRole('button', { name: /Retirer/ })).toBeVisible();
  await expect(page.locator('#recap-sous-titre')).toHaveText('3 lignes · 1 article');
  const total = page.locator('[data-role="total"]');
  expect((await total.locator('dd').allInnerTexts()).map(sansEspaces)).toEqual(['690 €', '690 €']);
  await expect(page.getByRole('button', { name: 'Valider ma commande' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#total-etat')).toContainText('Corrigez ou retirez les lignes à vérifier pour continuer.');
  await invalide.getByRole('button', { name: 'Retirer' }).click();
  await expect(lignes(page)).toHaveCount(2);
  expect(suivi.messages).toEqual([]);
});

test('session illisible : état « Panier à vérifier » sans erreur de console ; stockage indisponible : panier vide', async ({ page, browser }) => {
  const suivi = await ouvrirPanier(page, 375, 'ceci n\'est pas du JSON');
  const vide = page.locator('#recap-vide');
  await expect(vide.getByRole('heading', { level: 2 })).toHaveText('Panier à vérifier');
  await expect(vide.getByRole('link', { name: 'Retour au diagnostic' })).toHaveAttribute('href', 'diagnostic.html');
  for (const role of ['responsabilite', 'total', 'paiement']) await expect(page.locator(`[data-role="${role}"]`)).toBeHidden();
  expect(suivi.messages).toEqual([]);
  const contexte = await browser.newContext();
  const autre = await contexte.newPage();
  await autre.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('refusé', 'SecurityError'); };
  });
  const suivi2 = await ouvrirPanier(autre, 375);
  await expect(autre.locator('#recap-vide').getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
  expect(suivi2.messages).toEqual([]);
  await contexte.close();
});

test('prix mensonger en session : ignoré, les prix affichés sont ceux des données', async ({ page }) => {
  await ouvrirPanier(page, 1440, { v: 2, lignes: [{ ...LIGNE, prix: { materiel: 1, pose: 1, total: 1 } }] });
  await expect(lignes(page).first()).toContainText('690');
  await expect(lignes(page).first()).not.toContainText(/\b1 €/);
});

test('mode pose : le détail contient le délai d\'intervention, pas en DIY ; « Reprendre ces cotes à la fiche » rouvre la fiche avec produit, mode et cotes', async ({ page }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  await page.locator('#recap-deplier').click();
  await expect(lignes(page).nth(0).locator('.ligne__liste-delais')).toContainText("Intervention de l'artisan :");
  await expect(lignes(page).nth(1).locator('.ligne__liste-delais')).not.toContainText('Intervention');
  await expect(lignes(page).nth(0).locator('.ligne__aide')).toHaveText('Pour modifier, ajoutez la nouvelle configuration puis retirez cette ligne.');
  await lignes(page).nth(0).getByRole('button', { name: 'Reprendre ces cotes à la fiche' }).click();
  await page.waitForURL((u) => u.pathname === '/produit.html');
  expect(new URL(page.url()).search).toBe('');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#cote-largeur')).toHaveValue('1200');
  await expect(page.locator('#cote-hauteur')).toHaveValue('400');
  await expect(page.getByRole('radio', { name: /Matériel \+ pose/ })).toBeChecked();
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).not.toBeNull();
});

test('mesures à 1440 px : colonnes 60 / 40, haut de la liste égal au haut de « total » ; à 375 px une seule colonne', async ({ page, browser }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  const boite = (role) => page.locator(`[data-role="${role}"]`).boundingBox();
  const [recap, resp, total, paiement] = await Promise.all(['recapitulatif', 'responsabilite', 'total', 'paiement'].map(boite));
  expect(recap.x + recap.width).toBeLessThanOrEqual(total.x);
  const rapport = recap.width / total.width;
  expect(rapport).toBeGreaterThan(1.3);
  expect(rapport).toBeLessThan(1.7);
  expect(Math.abs(total.y - recap.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(paiement.x - total.x)).toBeLessThanOrEqual(1);
  expect(paiement.y).toBeGreaterThanOrEqual(total.y + total.height);
  expect(resp.y).toBeGreaterThanOrEqual(recap.y + recap.height);
  console.log(`1440 px : liste ${recap.width.toFixed(0)}x${recap.height.toFixed(0)} @${recap.x},${recap.y} ; total ${total.width.toFixed(0)} @${total.x},${total.y} ; rapport ${rapport.toFixed(2)}`);
  const contexte = await browser.newContext();
  const mobile = await contexte.newPage();
  await ouvrirPanier(mobile, 375, TROIS_LIGNES);
  const hauts = [];
  for (const role of ['recapitulatif', 'responsabilite', 'total', 'paiement']) hauts.push((await mobile.locator(`[data-role="${role}"]`).boundingBox()).y);
  for (let i = 1; i < hauts.length; i += 1) expect(hauts[i]).toBeGreaterThan(hauts[i - 1]);
  await contexte.close();
});

for (const largeur of [375, 768, 1440]) {
  test(`robustesse à ${largeur} px : titre de 120 caractères, quantité de 10 et prix de 7 chiffres, aucun débordement horizontal`, async ({ page }) => {
    const long = 'Batardeau '.repeat(12).trim().slice(0, 120);
    await page.route('**/data/produit.json', async (route) => {
      const reponse = await route.fetch();
      const donnees = await reponse.json();
      const p = donnees.produits.find((x) => x.id === 'batardeau-modulable');
      p.titre = long;
      p.prix = 1234567;
      await route.fulfill({ response: reponse, json: donnees });
    });
    await ouvrirPanier(page, largeur, { v: 2, lignes: [{ ...LIGNE, mode: 'pose', quantite: 10 }, TROIS_LIGNES.lignes[1]] });
    await page.locator('#recap-deplier').click();
    await expect(lignes(page).first().locator('.ligne__nom')).toHaveText(long);
    expect(await debordement(page)).toBe(false);
  });
}

test('clavier : Tab parcourt « − », « + », « Retirer » puis le résumé du détail ; Entrée et Espace ouvrent et ferment le détail', async ({ page }) => {
  await ouvrirPanier(page, 1440, TROIS_LIGNES);
  const ligne = lignes(page).first();
  await ligne.getByRole('button', { name: /Diminuer/ }).focus();
  await page.keyboard.press('Tab');
  await expect(ligne.getByRole('button', { name: /Augmenter/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(ligne.getByRole('button', { name: 'Retirer' })).toBeFocused();
  await page.keyboard.press('Tab');
  const resume = ligne.locator('.ligne__resume');
  await expect(resume).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await ligne.locator('.ligne__details').evaluate((el) => el.open)).toBe(true);
  await page.keyboard.press('Enter');
  expect(await ligne.locator('.ligne__details').evaluate((el) => el.open)).toBe(false);
  await page.keyboard.press('Space');
  expect(await ligne.locator('.ligne__details').evaluate((el) => el.open)).toBe(true);
  await page.keyboard.press('Space');
  expect(await ligne.locator('.ligne__details').evaluate((el) => el.open)).toBe(false);
});

for (const largeur of [375, 768, 1440]) {
  test(`trois lignes dépliées à ${largeur} px : console propre, axe sans violation, aucun débordement, aucune requête externe`, async ({ page }) => {
    const suivi = await ouvrirPanier(page, largeur, TROIS_LIGNES);
    await page.screenshot({ path: `test-results/lignes-B-repliees-${largeur}.png`, fullPage: true });
    await page.locator('#recap-deplier').click();
    expect(await debordement(page)).toBe(false);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/lignes-B-depliees-${largeur}.png`, fullPage: true });
    await ouvrirPanierInvalide(page, largeur);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
  });
}

async function ouvrirPanierInvalide(page, largeur) {
  await page.evaluate((brut) => sessionStorage.setItem('panier', brut), JSON.stringify(panierAvec({ cotes: { largeur: 699, hauteur: 400, tolerance: 0 } })));
  await page.reload();
  await page.waitForSelector('#recap[aria-busy="false"]');
  expect(await debordement(page)).toBe(false);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/lignes-B-invalide-${largeur}.png`, fullPage: true });
}

test('une ligne : le bloc de responsabilité est visible, la liste affiche un seul article', async ({ page }) => {
  await ouvrirPanier(page, 1440, UNE_LIGNE);
  await expect(page.locator('#recap-sous-titre')).toHaveText('1 ligne · 1 article');
  await expect(page.locator('[data-role="responsabilite"]')).toBeVisible();
});
