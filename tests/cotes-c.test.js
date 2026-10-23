import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { evaluerCotes } from '../assets/js/cotes-logique.js';
import { construireLigne } from '../assets/js/lignes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('produit.html');
const produits = JSON.parse(lire('data/produit.json')).produits;
const site = JSON.parse(lire('data/site.json'));

describe('bouton « Ajouter au panier »', () => {
  it('est un <button type="button"> jamais disabled, avec aria-disabled et aria-describedby, et le seul bouton d\'action', () => {
    const boutons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    const ajouter = boutons.filter((b) => b.includes('id="cotes-ajouter"'));
    expect(ajouter).toHaveLength(1);
    const [bouton] = ajouter;
    expect(bouton).toContain('type="button"');
    expect(bouton).toMatch(/aria-disabled="true"/);
    expect(bouton).not.toMatch(/\sdisabled(\s|=|>)/);
    const aide = bouton.match(/aria-describedby="([^"]+)"/)[1];
    expect(html).toContain(`id="${aide}"`);
    expect(bouton).toContain('data-texte="produit.configurateur.action.bouton"');
    // l'ambre n'est posé que par le script, à l'état actif : aucun autre bouton d'action dans la page
    expect(html).not.toContain('bouton--action');
    // autres boutons : menu, quatre boutons de quantité (« − », « + » x 2) et « Ajouter au panier » des produits non complets (lot 8a)
    expect(boutons.filter((b) => !b.includes('id="cotes-ajouter"'))).toHaveLength(6);
    expect(html).not.toMatch(/\sdisabled(\s|=|>)/);
  });
});

describe('ligne de panier construite depuis la fiche (remplace la commande du lot 8)', () => {
  const limites = produits.find((p) => p.complet).cotes;
  const compatible = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '10' }, limites);

  it('dix produits, deux modes : cotes null hors produit complet ; sinon cotes entiers et aucun prix', () => {
    expect(produits).toHaveLength(10);
    for (const produit of produits) {
      for (const mode of ['diy', 'pose']) {
        const ligne = construireLigne(produit, mode, compatible);
        expect(ligne, `${produit.id} ${mode}`).toMatchObject({ produit: produit.id, mode, quantite: 1 });
        if (!produit.complet) {
          expect(ligne.cotes).toBeNull();
          continue;
        }
        expect(ligne.cotes).toEqual({ largeur: 1200, hauteur: 400, tolerance: 10 });
        expect(JSON.stringify(ligne)).not.toMatch(/prix|total|materiel/);
        expect(JSON.parse(JSON.stringify(ligne))).toEqual(ligne);
      }
    }
  });

  it('les cotes non compatibles ne donnent jamais de cotes dans la ligne', () => {
    const complet = produits.find((p) => p.complet);
    for (const saisie of [{ largeur: '699', hauteur: '400', tolerance: '' }, { largeur: '', hauteur: '', tolerance: '' }, { largeur: 'x', hauteur: '400', tolerance: '' }]) {
      expect(construireLigne(complet, 'pose', evaluerCotes(saisie, limites)).cotes).toBeNull();
    }
  });
});

describe('liens et feuille de style', () => {
  it('liens.panier pointe vers un fichier existant et produit.css ne contient aucune couleur en dur', () => {
    expect(existsSync(site.liens.panier)).toBe(true);
    expect(lire('css/produit.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
  });
});
