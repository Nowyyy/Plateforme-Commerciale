import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lignesPrix, totalEstime } from '../assets/js/produit-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const html = lire('produit.html');

describe('data/produit.json : pose et délais', () => {
  it('pose strictement positive, délais non vides pour les dix produits ; textes de pose marqués « exemple »', () => {
    expect(produit.produits).toHaveLength(10);
    for (const p of produit.produits) {
      expect(p.pose, p.id).toBeGreaterThan(0);
      expect(p.delaiPose.trim().length, p.id).toBeGreaterThan(0);
      expect(p.delaiLivraison.trim().length, p.id).toBeGreaterThan(0);
    }
    expect(produit.modes.pose.garantie).toContain('exemple');
    expect(produit.modes.pose.garantie).toContain('décennale');
    expect(produit.textes.mode.estimationSuffixe).toContain('exemple');
    expect(produit.modes.pose.aide).toContain('exemple');
  });
});

describe('totalEstime et lignesPrix', () => {
  it('pour les dix produits et les deux modes, le total est la somme des lignes de matériel et de pose', () => {
    for (const p of produit.produits) {
      for (const mode of ['diy', 'pose']) {
        const lignes = lignesPrix(p, mode);
        const total = lignes.find((l) => l.cle === 'total').montant;
        const somme = lignes.filter((l) => l.cle !== 'total').reduce((n, l) => n + l.montant, 0);
        expect(total, `${p.id} ${mode}`).toBe(somme);
        expect(total, `${p.id} ${mode}`).toBe(totalEstime(p, mode));
        expect(lignes.length).toBe(mode === 'pose' ? 3 : 2);
      }
      expect(totalEstime(p, 'diy')).toBe(p.prix);
      expect(totalEstime(p, 'pose')).toBe(p.prix + p.pose);
    }
  });
});

describe('produit.html : mode de commande', () => {
  it('contient un fieldset avec 2 boutons radio dans le bloc mode, et le bloc mode n\'a aucun bouton d\'action', () => {
    const mode = html.slice(html.indexOf('data-role="mode"'), html.indexOf('data-role="configurateur"'));
    expect(mode).toMatch(/<h2[^>]*data-texte="produit\.textes\.mode\.titre"/);
    expect(mode).toMatch(/<fieldset[\s\S]*<legend[\s\S]*<\/fieldset>/);
    expect(mode.match(/<input[^>]*type="radio"[^>]*name="mode"/g)).toHaveLength(2);
    expect(mode).toMatch(/aria-live="polite"/);
    // le bouton « Menu » de l'en-tête partagé n'est pas un bouton d'action : seul le contenu de <main> est contrôlé
    const principal = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    // lot 6 : le configurateur apporte « Ajouter au panier » ; lot 8a : quatre boutons de quantité et l'ajout des produits non complets
    // (type="button", jamais submit)
    expect(principal.match(/<button[\s>]/g)).toHaveLength(6);
    expect(principal.match(/class="bouton bouton--secondaire quantite__bouton"/g)).toHaveLength(4);
    expect(principal).toMatch(/<button type="button"[^>]*id="cotes-ajouter"/);
    expect(principal).not.toMatch(/type="submit"/);
    expect(html).not.toContain('bouton--action');
    expect(lire('css/produit.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
