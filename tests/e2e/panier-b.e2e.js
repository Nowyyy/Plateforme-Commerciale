import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { UNE_LIGNE, ouvrirPanier, panierAvec } from '../outils/panier-aide.mjs';

const AMBRE = 'rgb(217, 119, 6)';
const MARINE = 'rgb(15, 29, 56)';
const bouton = (page) => page.getByRole('button', { name: 'Valider ma commande' });
const caseConfirmation = (page) => page.getByLabel("Je confirme l'exactitude des mesures fournies.");
const etat = (page) => page.locator('#total-etat');
const styles = (loc) => loc.evaluate((el) => ({ fond: getComputedStyle(el).backgroundColor, texte: getComputedStyle(el).color }));
const sansEspaces = (t) => t.replace(/[\u202f\u00a0]/g, ' ');

test('bouton inactif au chargement : aria-disabled, neutre, focalisable ; le clic n\'a pas d\'effet, l\'aide reste visible et le focus passe à la case', async ({ page }) => {
  await ouvrirPanier(page, 375, UNE_LIGNE);
  const b = bouton(page);
  await expect(b).toHaveAttribute('aria-disabled', 'true');
  await expect(b).not.toHaveAttribute('disabled', /.*/);
  expect((await styles(b)).fond).not.toBe(AMBRE);
  await b.focus();
  await expect(b).toBeFocused();
  await b.click({ force: true });
  await expect(etat(page)).toContainText('Cochez la case de confirmation pour continuer.');
  await expect(etat(page)).not.toContainText('CMD-000');
  await expect(caseConfirmation(page)).toBeFocused();
  await expect(caseConfirmation(page)).not.toBeChecked();
  await expect(b).toBeVisible();
});

test('cocher la case : bouton actif ambre, texte marine ; décocher : retour à l\'état inactif', async ({ page }) => {
  await ouvrirPanier(page, 1440, UNE_LIGNE);
  const b = bouton(page);
  await caseConfirmation(page).check();
  await expect(b).toHaveAttribute('aria-disabled', 'false');
  expect(await styles(b)).toEqual({ fond: AMBRE, texte: MARINE });
  await caseConfirmation(page).uncheck();
  await expect(b).toHaveAttribute('aria-disabled', 'true');
  expect((await styles(b)).fond).not.toBe(AMBRE);
  await expect(b).not.toHaveClass(/bouton--action/);
});

test('clic actif : confirmation focalisée, bouton masqué, case désactivée, panier supprimé, aucune requête externe ; rechargement : panier vide', async ({ page }) => {
  const suivi = await ouvrirPanier(page, 375, UNE_LIGNE);
  await caseConfirmation(page).check();
  await bouton(page).click();
  const e = etat(page);
  await expect(e).toContainText('Commande simulée (exemple)');
  await expect(e).toContainText('Numéro : CMD-000 (exemple)');
  await expect(e).toContainText("Aucun paiement n'a été demandé et rien n'a été enregistré.");
  await expect(e).toBeFocused();
  await expect(e.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', 'index.html');
  await expect(bouton(page)).toBeHidden();
  await expect(caseConfirmation(page)).toBeDisabled();
  await expect(page.locator('[data-role="recapitulatif"]')).toBeVisible();
  await expect(page.locator('[data-role="responsabilite"]')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
  await page.reload();
  await page.waitForSelector('#recap[aria-busy="false"]');
  await expect(page.locator('#recap-vide').getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
});

test('mode pose : ligne de pose, délai d\'intervention, total = somme ; mode DIY : sans pose', async ({ page }) => {
  await ouvrirPanier(page, 1440, panierAvec({ mode: 'pose' }));
  const total = page.locator('[data-role="total"]');
  await expect(total.locator('dt')).toHaveText(['Matériel (1 article)', 'Pose estimée (1 article)', 'Total estimé TTC']);
  const montants = (await total.locator('dd').allInnerTexts()).map((t) => Number(sansEspaces(t).replace(/[^\d]/g, '')));
  expect(montants).toEqual([690, 280, 970]);
  expect(montants[0] + montants[1]).toBe(montants[2]);
  await expect(total).toContainText('Livraison estimée : 2 à 3 semaines (délai le plus long)');
  await expect(total).toContainText('Intervention estimée : sous 2 semaines après livraison');
});

test('mode DIY : pas de ligne de pose, ni d\'intervention', async ({ page }) => {
  await ouvrirPanier(page, 1440, UNE_LIGNE);
  const total = page.locator('[data-role="total"]');
  await expect(total.locator('dt')).toHaveText(['Matériel (1 article)', 'Total estimé TTC']);
  await expect(total).toContainText('Livraison estimée :');
  await expect(total).not.toContainText('Intervention estimée');
  await expect(total).toContainText('Aucun paiement réel (exemple).');
});

test('aperçu : valeurs de la ligne dans le schéma du détail, avertissement et phrase de responsabilité', async ({ page }) => {
  await ouvrirPanier(page, 375, panierAvec({ cotes: { largeur: 1350, hauteur: 420, tolerance: 5 } }));
  const r = page.locator('[data-role="responsabilite"]');
  await page.getByRole('button', { name: 'Voir les cotes de chaque ligne' }).click();
  const ligne = page.locator('.ligne').first();
  expect(sansEspaces(await ligne.locator('.schema__valeur--a').textContent())).toBe('1 350 mm');
  expect(sansEspaces(await ligne.locator('.schema__valeur--b').textContent())).toBe('420 mm');
  await expect(ligne.getByRole('img')).toHaveAttribute('aria-label', /largeur 1.350 mm, hauteur 420 mm \(exemple\)/);
  await expect(r).toContainText('1 ligne sur mesure');
  await expect(r).toContainText('Les cotes saisies engagent votre responsabilité : vérifiez-les avant de valider (exemple).');
});

test('paiement : pastille « Logo exemple » et textes d\'exemple', async ({ page }) => {
  await ouvrirPanier(page, 375, UNE_LIGNE);
  const p = page.locator('[data-role="paiement"]');
  await expect(p.locator('.pastille')).toHaveText('Logo exemple');
  await expect(p).toContainText('Paiement sécurisé par un tiers de confiance bancaire (exemple).');
  await expect(p).toContainText('Garantie de prise en charge du service après-vente par la plateforme (exemple).');
});

test('mesures à 1440 px : colonnes 60 / 40, total aligné sur le récapitulatif, paiement sous total', async ({ page }) => {
  await ouvrirPanier(page, 1440, UNE_LIGNE);
  const boite = async (role) => page.locator(`[data-role="${role}"]`).boundingBox();
  const [recap, resp, total, paiement] = await Promise.all(['recapitulatif', 'responsabilite', 'total', 'paiement'].map(boite));
  expect(recap.x + recap.width).toBeLessThanOrEqual(total.x);
  const rapport = recap.width / total.width;
  expect(rapport).toBeGreaterThan(1.3);
  expect(rapport).toBeLessThan(1.7);
  expect(Math.abs(total.y - recap.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(paiement.width - total.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(paiement.x - total.x)).toBeLessThanOrEqual(1);
  expect(paiement.y).toBeGreaterThanOrEqual(total.y + total.height);
  expect(resp.y).toBeGreaterThanOrEqual(recap.y + recap.height);
  expect(Math.abs(resp.x - recap.x)).toBeLessThanOrEqual(1);
  console.log(`1440 px : recap ${recap.width}x${recap.height} @${recap.x},${recap.y} ; total ${total.width} @${total.x},${total.y} ; paiement ${paiement.width} @${paiement.y} ; rapport ${rapport.toFixed(2)}`);
});

test('mesures à 375 px : un seul flux, positions verticales croissantes', async ({ page }) => {
  await ouvrirPanier(page, 375, UNE_LIGNE);
  const hauts = [];
  for (const role of ['recapitulatif', 'responsabilite', 'total', 'paiement']) hauts.push((await page.locator(`[data-role="${role}"]`).boundingBox()).y);
  for (let i = 1; i < hauts.length; i++) expect(hauts[i]).toBeGreaterThan(hauts[i - 1]);
});

for (const largeur of [375, 768, 1440]) {
  test(`robustesse à ${largeur} px : titre de 120 caractères, aucun débordement horizontal`, async ({ page }) => {
    const long = 'Batardeau '.repeat(12).trim().slice(0, 120);
    await page.route('**/data/produit.json', async (route) => {
      const reponse = await route.fetch();
      const donnees = await reponse.json();
      donnees.produits.find((p) => p.id === 'batardeau-modulable').titre = long;
      await route.fulfill({ response: reponse, json: donnees });
    });
    await ouvrirPanier(page, largeur, panierAvec({ mode: 'pose' }));
    await expect(page.locator('.ligne__nom')).toHaveText(long);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test('clavier : Tab atteint la case puis le bouton ; Espace coche ; Entrée sur le bouton actif valide', async ({ page }) => {
  await ouvrirPanier(page, 1440, UNE_LIGNE);
  await page.getByRole('button', { name: 'Voir les cotes de chaque ligne' }).focus();
  await page.keyboard.press('Tab');
  await expect(caseConfirmation(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(caseConfirmation(page)).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(bouton(page)).toBeFocused();
  await expect(bouton(page)).toHaveAttribute('aria-disabled', 'false');
  await page.keyboard.press('Enter');
  await expect(etat(page)).toContainText('Commande simulée (exemple)');
  await expect(etat(page)).toBeFocused();
});

for (const largeur of [375, 768, 1440]) {
  test(`page entière à ${largeur} px : case décochée, cochée, confirmation ; console propre, axe, aucun débordement`, async ({ page }) => {
    const suivi = await ouvrirPanier(page, largeur, UNE_LIGNE);
    const controle = async (nom) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), nom).toBe(false);
      expect((await new AxeBuilder({ page }).analyze()).violations, nom).toEqual([]);
      await page.screenshot({ path: `test-results/panier-B-${nom}-${largeur}.png`, fullPage: true });
    };
    await controle('decoche');
    await caseConfirmation(page).check();
    await controle('coche');
    await bouton(page).click();
    await controle('confirme');
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
  });
}
