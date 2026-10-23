import { test, expect } from '@playwright/test';

const AMBRE = 'rgb(217, 119, 6)';
const BATARDEAU = 'batardeau-modulable';

// Ouvre la fiche avec une session éventuelle (posée une seule fois par onglet) ; console et requêtes suivies.
async function ouvrir(page, largeur, session = {}) {
  const suivi = { messages: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); // défilement doux désactivé : clics forcés stables
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    if (sessionStorage.getItem('__init')) return;
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
    sessionStorage.setItem('__init', '1');
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
  return suivi;
}

const saisir = async (page, largeur, hauteur, tolerance = '') => {
  await page.locator('#cote-largeur').fill(largeur);
  await page.locator('#cote-hauteur').fill(hauteur);
  await page.locator('#cote-tolerance').fill(tolerance);
};
const panier = async (page) => JSON.parse(await page.evaluate(() => sessionStorage.getItem('panier')));
const zoneConfigurateur = (page) => page.locator('#cotes-action');
const confirmation = (page) => page.locator('.ajout__confirmation:visible');
const ligneBatardeau = (cotes, mode = 'diy', quantite = 1) => ({ produit: BATARDEAU, mode, cotes, quantite });
const cotesDe = (largeur, hauteur, tolerance = 0) => ({ largeur, hauteur, tolerance });

test('quantité du batardeau : 1 par défaut, « − » sans effet à 1, « + » jusqu\'à 10 puis sans effet, la sortie suit', async ({ page }) => {
  await ouvrir(page, 1440);
  const zone = zoneConfigurateur(page);
  const sortie = zone.locator('output');
  const moins = zone.getByRole('button', { name: 'Diminuer la quantité : Batardeau modulable' });
  const plus = zone.getByRole('button', { name: 'Augmenter la quantité : Batardeau modulable' });
  await expect(zone.getByRole('group', { name: 'Quantité : Batardeau modulable' })).toBeVisible();
  await expect(sortie).toHaveText('1');
  await expect(sortie).toHaveAttribute('aria-live', 'polite');
  await moins.click({ force: true });
  await expect(sortie).toHaveText('1');
  await expect(moins).toHaveAttribute('aria-disabled', 'true');
  for (let i = 0; i < 12; i += 1) await plus.click({ force: true });
  await expect(sortie).toHaveText('10');
  await expect(plus).toHaveAttribute('aria-disabled', 'true');
  await expect(plus).not.toHaveAttribute('disabled', /.*/);
  await moins.click({ force: true });
  await expect(sortie).toHaveText('9');
  await expect(moins).toHaveAttribute('aria-disabled', 'false');
});

test('ajout du batardeau : la fiche reste affichée, confirmation focalisée, session v 2 sans prix, deux liens', async ({ page }) => {
  const suivi = await ouvrir(page, 375);
  await saisir(page, '1 200', '400', '10');
  const url = page.url();
  await zoneConfigurateur(page).getByRole('button', { name: 'Augmenter la quantité : Batardeau modulable' }).click();
  await zoneConfigurateur(page).getByRole('button', { name: 'Augmenter la quantité : Batardeau modulable' }).click();
  const bouton = page.getByRole('button', { name: 'Ajouter au panier' });
  await expect(bouton).toHaveAttribute('aria-disabled', 'false');
  expect(await bouton.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(AMBRE);
  await bouton.click();
  const region = confirmation(page);
  await expect(region).toContainText('Ajouté au panier : Batardeau modulable × 3.');
  await expect(region).toContainText('3 articles dans le panier.');
  await expect(region).toBeFocused();
  await expect(region).toHaveAttribute('role', 'status');
  expect(page.url()).toBe(url);
  await page.waitForTimeout(400);
  expect(page.url()).toBe(url);
  expect(await panier(page)).toEqual({ v: 2, lignes: [ligneBatardeau(cotesDe(1200, 400, 10), 'diy', 3)] });
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).not.toMatch(/prix|total|titre|delai/);
  await expect(region.getByRole('link', { name: 'Voir le panier' })).toHaveAttribute('href', 'panier.html');
  await expect(region.getByRole('link', { name: 'Continuer mes achats' })).toHaveAttribute('href', 'diagnostic.html');
  await page.screenshot({ path: 'test-results/lignes-A-batardeau-apres-375.png', fullPage: true });
  expect(suivi.messages).toEqual([]);
});

test('même configuration ajoutée deux fois : une ligne cumulée ; autre cote ou mode pose : lignes distinctes', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '1200', '400');
  const bouton = page.getByRole('button', { name: 'Ajouter au panier' });
  await bouton.click();
  await bouton.click();
  await expect(confirmation(page)).toContainText('Quantité mise à jour : Batardeau modulable × 2.');
  expect((await panier(page)).lignes).toEqual([ligneBatardeau(cotesDe(1200, 400), 'diy', 2)]);
  await saisir(page, '1300', '400');
  await bouton.click();
  await expect(confirmation(page)).toContainText('Ajouté au panier : Batardeau modulable × 1.');
  expect((await panier(page)).lignes).toHaveLength(2);
  await page.getByRole('radio', { name: /Matériel \+ pose/ }).check({ force: true });
  await bouton.click();
  const lignes = (await panier(page)).lignes;
  expect(lignes).toHaveLength(3);
  expect(lignes[2]).toEqual(ligneBatardeau(cotesDe(1300, 400), 'pose', 1));
  await saisir(page, '1200', '400');
  await page.getByRole('radio', { name: /Matériel seul/ }).check({ force: true });
  await bouton.click();
  expect((await panier(page)).lignes[0].quantite).toBe(3);
  expect((await panier(page)).lignes).toHaveLength(3);
});

test('produit non complet (clapet anti-retour) : zone dans le bloc mode, bouton ambre d\'emblée, cotes null, configurateur masqué', async ({ page }) => {
  const suivi = await ouvrir(page, 1440, { produit: 'clapet-anti-retour', mode: 'pose' });
  const mode = page.locator('[data-role="mode"]');
  const bouton = mode.getByRole('button', { name: 'Ajouter au panier' });
  await expect(bouton).toBeVisible();
  await expect(bouton).not.toHaveAttribute('aria-disabled', /.*/);
  expect(await bouton.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(AMBRE);
  await expect(page.locator('[data-role="configurateur"] .configurateur__outil')).toHaveCount(0);
  await expect(page.locator('#cotes-action')).toHaveCount(0);
  await expect(page.locator('.configurateur__indisponible')).toBeVisible();
  await page.screenshot({ path: 'test-results/lignes-A-clapet-avant-1440.png', fullPage: true });
  await mode.getByRole('button', { name: 'Augmenter la quantité : Clapet anti-retour' }).click();
  await bouton.click();
  await expect(confirmation(page)).toContainText('Ajouté au panier : Clapet anti-retour × 2.');
  expect(await panier(page)).toEqual({ v: 2, lignes: [{ produit: 'clapet-anti-retour', mode: 'pose', cotes: null, quantite: 2 }] });
  await expect(confirmation(page).getByRole('link', { name: 'Voir le panier' })).toBeVisible();
  await page.screenshot({ path: 'test-results/lignes-A-clapet-apres-1440.png', fullPage: true });
  expect(suivi.messages).toEqual([]);
  // chaque produit non complet est ajoutable
  for (const id of ['bouclier-de-baie', 'filet-de-toiture']) {
    await page.evaluate((valeur) => sessionStorage.setItem('produit', valeur), id);
    await page.reload();
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="mode"]').getByRole('button', { name: 'Ajouter au panier' }).click();
    expect((await panier(page)).lignes.at(-1)).toMatchObject({ produit: id, cotes: null, quantite: 1 });
  }
});

test('limites : onzième ligne refusée sans toucher à la session ; ligne à 10 : message de plafond', async ({ page }) => {
  const dix = Array.from({ length: 10 }, (_, i) => ligneBatardeau(cotesDe(800 + i, 400)));
  const brut = JSON.stringify({ v: 2, lignes: dix });
  await ouvrir(page, 1440, { panier: brut });
  await saisir(page, '1500', '400');
  const bouton = page.getByRole('button', { name: 'Ajouter au panier' });
  await bouton.click();
  await expect(confirmation(page)).toContainText('Le panier est plein (10 lignes). Retirez une ligne pour continuer.');
  await expect(confirmation(page).getByRole('link')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBe(brut);
  // ligne existante à 10 : plafond
  const pleine = JSON.stringify({ v: 2, lignes: [ligneBatardeau(cotesDe(1500, 400), 'diy', 10)] });
  await page.evaluate((valeur) => sessionStorage.setItem('panier', valeur), pleine);
  await bouton.click();
  await expect(confirmation(page)).toContainText('Limite de 10 par ligne atteinte pour Batardeau modulable.');
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBe(pleine);
});

test('cotes incompatibles : bouton neutre, focalisable, le clic n\'écrit rien et déplace le focus ; stockage indisponible : message dédié', async ({ page }) => {
  const suivi = await ouvrir(page, 375);
  await saisir(page, '600', '400');
  const bouton = page.getByRole('button', { name: 'Ajouter au panier' });
  await expect(bouton).toHaveAttribute('aria-disabled', 'true');
  await expect(bouton).not.toHaveAttribute('disabled', /.*/);
  expect(await bouton.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(AMBRE);
  await bouton.focus();
  await expect(bouton).toBeFocused();
  await bouton.click({ force: true });
  await expect(page.locator('#cote-largeur')).toBeFocused();
  await expect(page.locator('#cotes-faisabilite')).toContainText('Corrigez vos cotes pour continuer.');
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();
  // écriture refusée : message dédié, ni lien ni erreur de console
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('quota dépassé', 'QuotaExceededError'); };
  });
  await saisir(page, '1200', '400');
  await bouton.click();
  await expect(confirmation(page)).toContainText("Impossible d'enregistrer le panier dans ce navigateur.");
  await expect(confirmation(page).getByRole('link')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('panier'))).toBeNull();
  expect(suivi.messages).toEqual([]);
});
