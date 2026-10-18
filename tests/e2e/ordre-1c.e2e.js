import { test, expect } from '@playwright/test';

const PAGES = {
  pro: ['en-tete', 'intro', 'etapes', 'formulaire', 'confirmation', 'pied'],
  connexion: ['en-tete', 'connexion', 'demo', 'sav-sans-compte', 'pied'],
  'sav-acces': ['en-tete', 'acces', 'pied'],
  compte: ['en-tete', 'bienvenue', 'commandes', 'sav-en-cours', 'pied'],
  achats: ['en-tete', 'filtre', 'liste', 'pied'],
  achat: ['en-tete', 'resume', 'cotes', 'mode', 'livraison', 'documents', 'sav', 'pied'],
  sav: ['en-tete', 'intro', 'produit', 'demande', 'photos', 'coordonnees', 'envoi', 'confirmation', 'pied'],
  demandes: ['en-tete', 'filtre', 'liste', 'pied'],
  informations: ['en-tete', 'identite', 'adresse', 'preferences', 'pied'],
};

for (const [nom, roles] of Object.entries(PAGES)) {
  test(`wireframes/${nom}.html : les blocs se suivent dans l'ordre des data-role à 375 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/wireframes/${nom}.html`);
    const hauts = [];
    for (const role of roles) {
      const boite = await page.locator(`[data-role="${role}"]`).boundingBox();
      expect(boite, role).not.toBeNull();
      hauts.push(boite.y);
    }
    for (let i = 1; i < hauts.length; i++) {
      expect(hauts[i], `${roles[i]} sous ${roles[i - 1]}`).toBeGreaterThan(hauts[i - 1]);
    }
  });
}
