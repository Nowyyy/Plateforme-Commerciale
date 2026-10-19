import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { validerCommande } from '../assets/js/panier-logique.js';
import { construireCommande, evaluerCotes } from '../assets/js/cotes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const { produits } = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const batardeau = produits.find((p) => p.complet);
const cotesOk = { largeur: '1200', hauteur: '400', tolerance: '' };

describe('parcours : commande construite puis validée', () => {
  it('dix produits, deux modes : acceptée pour le produit complet, refusée « incomplet » pour les autres ; total = somme des lignes', () => {
    expect(produits).toHaveLength(10);
    let acceptees = 0;
    for (const produit of produits) {
      for (const mode of ['diy', 'pose']) {
        // les produits non complets n'ont pas de commande construite par le configurateur : on lui présente une copie complète
        const source = produit.complet ? produit : { ...produit, complet: true, cotes: batardeau.cotes };
        const commande = construireCommande(source, mode, evaluerCotes(cotesOk, batardeau.cotes));
        expect(commande, `${produit.id} ${mode}`).not.toBeNull();
        const r = validerCommande(commande, produits);
        if (produit.complet) {
          acceptees++;
          expect(r.ok).toBe(true);
          expect(r.commande.total).toBe(r.commande.lignes.filter((l) => l.cle !== 'total').reduce((s, l) => s + l.montant, 0));
          expect(r.commande.total).toBe(mode === 'pose' ? produit.prix + produit.pose : produit.prix);
        } else {
          expect(r, `${produit.id} ${mode}`).toEqual({ ok: false, raison: 'incomplet' });
        }
      }
    }
    expect(acceptees).toBe(2);
  });

  it('grille de cotes : validerCommande réussit exactement quand evaluerCotes renvoie « compatible »', () => {
    let compatibles = 0;
    let total = 0;
    for (let largeur = 650; largeur <= 1650; largeur += 25) {
      for (let hauteur = 250; hauteur <= 650; hauteur += 25) {
        for (const tolerance of [0, 10, 50]) {
          const saisie = { largeur: String(largeur), hauteur: String(hauteur), tolerance: String(tolerance) };
          const evaluation = evaluerCotes(saisie, batardeau.cotes);
          const commande = construireCommande(batardeau, 'diy', evaluation)
            ?? { v: 1, produit: batardeau.id, mode: 'diy', cotes: { largeur, hauteur, tolerance } };
          const attendu = evaluation.etat === 'compatible';
          expect(validerCommande(commande, produits).ok, `${largeur}x${hauteur} ±${tolerance}`).toBe(attendu);
          total++;
          if (attendu) compatibles++;
        }
      }
    }
    expect(total).toBe(41 * 17 * 3);
    expect(compatibles).toBeGreaterThan(0);
    expect(compatibles).toBeLessThan(total);
  });
});

describe('fichiers du lot 8', () => {
  it('css/panier.css sans valeur hexadécimale ; liens.* de site.json vers des fichiers existants, dont liens.panier', () => {
    expect(lire('css/panier.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(site.liens.panier).toBe('panier.html');
    for (const [nom, lien] of Object.entries(site.liens)) {
      if (!lien.startsWith('#')) expect(existsSync(lien), nom).toBe(true);
    }
  });
});
