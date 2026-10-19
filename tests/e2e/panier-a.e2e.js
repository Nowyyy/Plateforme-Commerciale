import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const COMMANDE = {
  v: 1, produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, prix: { materiel: 690, pose: null, total: 690 },
};

// Écoute console et requêtes, pose la session avant le chargement (une seule fois par onglet), ouvre panier.html.
export async function ouvrirPanier(page, largeur, session = null) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (session !== null) {
    await page.addInitScript((brut) => {
      if (sessionStorage.getItem('__init')) return;
      sessionStorage.setItem('commande', brut);
      sessionStorage.setItem('__init', '1');
    }, typeof session === 'string' ? session : JSON.stringify(session));
  }
  await page.goto('/panier.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.evaluate(() => document.fonts.ready);
  return suivi;
}

const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const visibles = (page, role) => page.locator(`[data-role="${role}"]`).isVisible();

for (const largeur of [375, 768, 1440]) {
  test(`commande valide à ${largeur} px : récapitulatif complet, console propre, sans débordement, axe, aucune requête externe`, async ({ page }) => {
    const suivi = await ouvrirPanier(page, largeur, COMMANDE);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Récapitulatif de votre commande');
    const recap = page.locator('[data-role="recapitulatif"]');
    await expect(recap.getByRole('heading', { level: 2 })).toHaveText('Batardeau modulable');
    await expect(recap).toContainText('Réf. BAT-120');
    await expect(recap).toContainText('Mode choisi : Matériel seul (DIY)');
    await expect(recap.locator('dt')).toHaveText(['Largeur du tableau (A)', 'Hauteur du seuil (B)', 'Tolérance de mesure (C)', 'Matériel', 'Livraison directe usine :']);
    const valeurs = (await recap.locator('dd').allInnerTexts()).map((t) => t.replace(/[\u202f\u00a0]/g, ' '));
    expect(valeurs).toEqual(['1 200 mm', '400 mm', '0 mm', '690 €', '2 à 3 semaines']);
    await expect(recap.getByRole('link', { name: 'Modifier mes cotes' })).toHaveAttribute('href', 'produit.html');
    await expect(page.locator('.etapes-commande__item')).toHaveText([/Panier\s*\(étape en cours\)/, /Validation/, /Paiement/]);
    await expect(page.locator('.etapes-commande__item[aria-current="step"]')).toHaveCount(1);
    expect(await debordement(page)).toBe(false);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    expect(new URL(page.url()).search).toBe('');
    await page.screenshot({ path: `test-results/panier-A-plein-${largeur}.png`, fullPage: true });
  });
}

test('commande valide en pose : délai d\'intervention présent', async ({ page }) => {
  await ouvrirPanier(page, 1440, { ...COMMANDE, mode: 'pose' });
  const recap = page.locator('[data-role="recapitulatif"]');
  await expect(recap).toContainText('Mode choisi : Matériel + pose par un artisan partenaire');
  await expect(recap.locator('dt', { hasText: "Intervention de l'artisan :" })).toBeVisible();
  await expect(recap.locator('dd', { hasText: 'sous 2 semaines après livraison' })).toBeVisible();
});

for (const largeur of [375, 1440]) {
  test(`sans commande à ${largeur} px : état vide, lien vers le diagnostic, blocs suivants non visibles`, async ({ page }) => {
    const suivi = await ouvrirPanier(page, largeur);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const etat = page.locator('#recap-etat');
    await expect(etat).toHaveAttribute('role', 'status');
    await expect(etat.getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
    await expect(etat).toContainText('Ajoutez un produit depuis sa fiche, après avoir saisi vos cotes.');
    await expect(etat.getByRole('link', { name: 'Retour au diagnostic' })).toHaveAttribute('href', 'diagnostic.html');
    for (const role of ['responsabilite', 'total', 'paiement']) expect(await visibles(page, role), role).toBe(false);
    expect(await debordement(page)).toBe(false);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(suivi.messages).toEqual([]);
    await page.screenshot({ path: `test-results/panier-A-vide-${largeur}.png`, fullPage: true });
  });
}

const INVALIDES = {
  'largeur 699': { ...COMMANDE, cotes: { ...COMMANDE.cotes, largeur: 699 } },
  'version 2': { ...COMMANDE, v: 2 },
  'texte non JSON': 'ceci n\'est pas du JSON',
};
for (const [nom, session] of Object.entries(INVALIDES)) {
  for (const largeur of [375, 1440]) {
    test(`commande invalide (${nom}) à ${largeur} px : état invalide, lien vers la fiche, console propre`, async ({ page }) => {
      const suivi = await ouvrirPanier(page, largeur, session);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const etat = page.locator('#recap-etat');
      await expect(etat.getByRole('heading', { level: 2 })).toHaveText('Commande à vérifier');
      await expect(etat).toContainText('Les cotes enregistrées ne conviennent plus ou la commande est illisible. Retournez à la fiche pour les saisir de nouveau.');
      await expect(etat.getByRole('link', { name: 'Retour à la fiche' })).toHaveAttribute('href', 'produit.html');
      for (const role of ['responsabilite', 'total', 'paiement']) expect(await visibles(page, role), role).toBe(false);
      expect(suivi.messages).toEqual([]);
      if (nom === 'largeur 699') {
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.screenshot({ path: `test-results/panier-A-invalide-${largeur}.png`, fullPage: true });
      }
    });
  }
}

test('prix mensonger en session : le prix affiché est celui des données', async ({ page }) => {
  const suivi = await ouvrirPanier(page, 1440, { ...COMMANDE, prix: { materiel: 1, pose: 1, total: 1 } });
  await expect(page.locator('#recap-prix')).toHaveText(/690/);
  await expect(page.locator('[data-role="recapitulatif"]')).not.toContainText(/\b1 €/);
  expect(suivi.messages).toEqual([]);
});

test('stockage indisponible : état vide sans erreur de console', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('refusé', 'SecurityError'); };
  });
  const suivi = await ouvrirPanier(page, 375);
  await expect(page.locator('#recap-etat').getByRole('heading', { level: 2 })).toHaveText('Votre panier est vide');
  expect(suivi.messages).toEqual([]);
});
