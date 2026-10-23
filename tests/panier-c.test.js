import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { ajouterLigne, besoinConfirmation, construireLigne, peutValider, validerPanier } from '../assets/js/lignes-logique.js';
import { evaluerCotes } from '../assets/js/cotes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const { produits, panier } = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const batardeau = produits.find((p) => p.complet);
const { limites } = panier;

describe('lignes construites depuis la fiche, puis validées', () => {
  it('grille de cotes : validerPanier accepte exactement les lignes dont evaluerCotes est « compatible »', () => {
    let compatibles = 0;
    let total = 0;
    for (let largeur = 650; largeur <= 1650; largeur += 25) {
      for (let hauteur = 250; hauteur <= 650; hauteur += 25) {
        for (const tolerance of [0, 10, 50]) {
          const evaluation = evaluerCotes({ largeur: String(largeur), hauteur: String(hauteur), tolerance: String(tolerance) }, batardeau.cotes);
          const ligne = construireLigne(batardeau, 'diy', evaluation);
          const { etat } = ajouterLigne({ lignes: [] }, ligne, 1, limites);
          const attendu = evaluation.etat === 'compatible';
          expect(validerPanier(etat, produits).valides, `${largeur}x${hauteur} ±${tolerance}`).toBe(attendu ? 1 : 0);
          total += 1;
          if (attendu) compatibles += 1;
        }
      }
    }
    expect(total).toBe(41 * 17 * 3);
    expect(compatibles).toBeGreaterThan(0);
    expect(compatibles).toBeLessThan(total);
  });

  it('dix produits, deux modes : les produits non complets sont valides sans cotes, le complet seulement avec des cotes compatibles', () => {
    const compatible = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '' }, batardeau.cotes);
    for (const produit of produits) {
      for (const mode of ['diy', 'pose']) {
        const { etat } = ajouterLigne({ lignes: [] }, construireLigne(produit, mode, compatible), 1, limites);
        expect(validerPanier(etat, produits).valides, `${produit.id} ${mode}`).toBe(1);
        const { etat: sans } = ajouterLigne({ lignes: [] }, construireLigne(produit, mode, null), 1, limites);
        expect(validerPanier(sans, produits).valides, `${produit.id} ${mode} sans cotes`).toBe(produit.complet ? 0 : 1);
      }
    }
  });
});

describe('confirmation et validation à travers validerPanier', () => {
  const compatible = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '' }, batardeau.cotes);
  const construire = (...lignes) => lignes.reduce((etat, l) => ajouterLigne(etat, l, 1, limites).etat, { lignes: [] });
  const etatDe = (etat) => {
    const v = validerPanier(etat, produits);
    return { v, besoin: besoinConfirmation(v.lignes) };
  };
  const peut = (etat, caseCochee) => {
    const { v, besoin } = etatDe(etat);
    return peutValider({ caseCochee, besoinConfirmation: besoin, valides: v.valides, invalides: v.invalides });
  };
  const clapet = produits.find((p) => p.id === 'clapet-anti-retour');
  it('panier sans mesure : pas de confirmation, validable sans case', () => {
    const etat = construire(construireLigne(clapet, 'diy', null), construireLigne(clapet, 'pose', null));
    expect(etatDe(etat).besoin).toBe(false);
    expect(peut(etat, false)).toBe(true);
  });
  it('avec une ligne sur mesure : case exigée', () => {
    const etat = construire(construireLigne(clapet, 'diy', null), construireLigne(batardeau, 'diy', compatible));
    expect(etatDe(etat).besoin).toBe(true);
    expect(peut(etat, false)).toBe(false);
    expect(peut(etat, true)).toBe(true);
  });
  it('avec une ligne invalide : jamais validable, même case cochée ; vide : jamais validable', () => {
    const etat = construire(construireLigne(clapet, 'diy', null), construireLigne(batardeau, 'diy', null));
    expect(etatDe(etat).v).toMatchObject({ valides: 1, invalides: 1 });
    expect(peut(etat, true)).toBe(false);
    expect(peut({ lignes: [] }, true)).toBe(false);
  });
});

describe('fichiers du lot', () => {
  it('css/panier.css et css/composants.css sans valeur hexadécimale ; liens.* de site.json vers des fichiers existants', () => {
    for (const f of ['css/panier.css', 'css/composants.css']) expect(lire(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(site.liens.panier).toBe('panier.html');
    for (const [nom, lien] of Object.entries(site.liens)) {
      if (!lien.startsWith('#')) expect(existsSync(lien.split('#')[0]), nom).toBe(true);
    }
  });
});
