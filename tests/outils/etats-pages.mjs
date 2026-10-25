// Les 14 pages Hi-Fi et leur état nominal de mesure : sessions de sessionStorage et services tiers simulés.
// Partagé par la matrice Lighthouse, la matrice de CLS, les poids, l'empreinte et les tests Playwright du lot 10a.
// Les mesures simulent les services tiers (le proxy refuse les vrais) : aucun score n'est un score réel.
import { ADRESSE, PNG, reponseCompletion, reponseGaspar, reponseGeocodage, reponseRga, simuler } from '../e2e/carte-reelle-simulation.js';
import { TROIS_LIGNES } from './panier-aide.mjs';

const COMPTE = { compte: '{"v":1,"connecte":true}', achat: 'CMD-1037' };
const TROIS = JSON.stringify({ v: 1, alea: 'inondations', produits: ['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage'] });

export const PAGES = [
  { nom: 'index', session: {} },
  { nom: 'diagnostic', session: { adresse: ADRESSE } },
  { nom: 'produit', session: { produit: 'batardeau-modulable', mode: 'diy' } },
  { nom: 'panier', session: { panier: JSON.stringify(TROIS_LIGNES) } },
  { nom: 'pro', session: {} },
  { nom: 'connexion', session: {} },
  { nom: 'compte', session: COMPTE },
  { nom: 'achats', session: COMPTE },
  { nom: 'achat', session: COMPTE },
  { nom: 'informations', session: COMPTE },
  { nom: 'sav-acces', session: {} },
  { nom: 'sav', session: { 'acces-sav': 'CMD-1037' } },
  { nom: 'demandes', session: COMPTE },
  { nom: 'comparateur', session: { comparaison: TROIS } },
].map((p) => ({ ...p, fichier: `${p.nom}.html` }));

export const LARGEURS_EMPREINTE = [375, 768, 1440];
export const LARGEURS_CLS = Array.from({ length: 55 }, (_, i) => 360 + i * 20); // 360 à 1440 par pas de 20

// Corps des réponses simulées, pour les outils qui interceptent les requêtes eux-mêmes (puppeteer).
export const REPONSES_SIMULEES = {
  png: PNG,
  completion: reponseCompletion(),
  geocodage: reponseGeocodage(),
  gaspar: reponseGaspar(),
  rga: reponseRga(),
};

// Pose la session avant le chargement (une fois par onglet) et simule les services tiers (Playwright).
export async function preparerPage(page, etat, { delaiJson = 0 } = {}) {
  const journal = await simuler(page);
  await page.addInitScript((valeurs) => {
    if (sessionStorage.getItem('__init')) return;
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
    sessionStorage.setItem('__init', '1');
  }, etat.session);
  if (delaiJson > 0) {
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, delaiJson); });
      await route.continue();
    });
  }
  return journal;
}

// Attend l'état nominal : rendu terminé, polices chargées, plus aucun conteneur occupé, requêtes simulées terminées.
export async function attendreEtatNominal(page, etat) {
  await page.waitForSelector('html[data-rendu="pret"]');
  if (etat.nom === 'comparateur') await page.waitForSelector('html[data-comparateur]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.waitForFunction(() => !globalThis.document.querySelector('[aria-busy="true"]'));
  await page.waitForLoadState('networkidle');
}
