import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { evaluerCotes, construireCommande } from '../assets/js/cotes-logique.js';
import { lignesPrix } from '../assets/js/produit-logique.js';

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
    expect(boutons.filter((b) => !b.includes('id="cotes-ajouter"'))).toHaveLength(1); // bouton du menu
    expect(html).not.toMatch(/\sdisabled(\s|=|>)/);
  });
});

describe('commande', () => {
  const limites = produits.find((p) => p.complet).cotes;
  const compatible = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '10' }, limites);

  it('dix produits, deux modes : null hors produit complet ; sinon total égal à la somme des lignes', () => {
    expect(produits).toHaveLength(10);
    for (const produit of produits) {
      for (const mode of ['diy', 'pose']) {
        const commande = construireCommande(produit, mode, compatible);
        if (!produit.complet) {
          expect(commande, `${produit.id} ${mode}`).toBeNull();
          continue;
        }
        const lignes = lignesPrix(produit, mode).filter((l) => l.cle !== 'total');
        expect(commande.prix.total).toBe(lignes.reduce((somme, l) => somme + l.montant, 0));
        expect(commande.prix.materiel).toBe(produit.prix);
        expect(commande.prix.pose).toBe(mode === 'pose' ? produit.pose : null);
        expect(commande).toMatchObject({ v: 1, produit: produit.id, mode, cotes: { largeur: 1200, hauteur: 400, tolerance: 10 } });
        expect(JSON.parse(JSON.stringify(commande))).toEqual(commande);
      }
    }
  });

  it('les cotes non compatibles ne donnent jamais de commande', () => {
    const complet = produits.find((p) => p.complet);
    for (const saisie of [{ largeur: '699', hauteur: '400', tolerance: '' }, { largeur: '', hauteur: '', tolerance: '' }, { largeur: 'x', hauteur: '400', tolerance: '' }]) {
      expect(construireCommande(complet, 'pose', evaluerCotes(saisie, limites))).toBeNull();
    }
  });
});

describe('liens et feuille de style', () => {
  it('liens.panier pointe vers un fichier existant et produit.css ne contient aucune couleur en dur', () => {
    expect(existsSync(site.liens.panier)).toBe(true);
    expect(lire('css/produit.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/);
  });
});
