import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { formaterPrix } from '../assets/js/diagnostic-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const html = lire('produit.html');
// espace fine insécable (U+202F), séparateur de milliers et avant « € »
const FINE = String.fromCharCode(0x202f);
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('couleurs en dur', () => {
  it('css/produit.css et css/composants.css n\'ont aucune valeur hexadécimale', () => {
    for (const fichier of ['css/produit.css', 'css/composants.css']) expect(sansCommentaires(lire(fichier)), fichier).not.toMatch(HEX);
  });
});

describe('produit.html : galerie', () => {
  const galerie = html.slice(html.indexOf('data-role="galerie"'), html.indexOf('data-role="achat"'));

  it('est un fieldset avec legend, un gabarit de vignettes radio, et un panneau aria-live', () => {
    expect(galerie).toMatch(/<fieldset[^>]*>\s*<legend[^>]*data-texte="produit\.textes\.galerie\.legendeVues"/);
    expect(galerie).toContain('<template data-liste="galerie.vues">');
    expect(galerie.match(/<input[^>]*type="radio"/g)).toHaveLength(1); // un seul gabarit, rendu une fois par vue
    expect(produit.galerie.vues).toHaveLength(4);
    expect(galerie).toMatch(/<figure[^>]*id="galerie-panneau"[^>]*aria-live="polite"/);
  });

  it('ne contient ni <video> ni <img>', () => {
    expect(html).not.toMatch(/<video[\s>]/);
    expect(html).not.toMatch(/<img[\s>]/);
  });
});

describe('textes d\'exemple', () => {
  it('les légendes de la galerie et les pastilles contiennent « exemple »', () => {
    for (const v of produit.galerie.vues) expect(v.legende).toContain('exemple');
    for (const b of produit.badges) expect(b.titre).toContain('exemple');
    expect(produit.textes.galerie.placeholder).toContain('exemple');
    expect(produit.textes.achat.mention).toContain('exemple');
  });
});

describe('prix', () => {
  it('formaterPrix donne le prix des données pour les dix produits, séparateur de milliers français', () => {
    for (const p of produit.produits) {
      const attendu = `${String(p.prix).replace(/\B(?=(\d{3})+(?!\d))/g, FINE)}${FINE}€`;
      expect(formaterPrix(p.prix), p.id).toBe(attendu);
      expect(formaterPrix(p.prix).split(FINE).join(''), p.id).toBe(`${p.prix}€`);
    }
  });

  it('cas limites : 999, 1 000, 1 250, 1 234 567', () => {
    const f = (n) => formaterPrix(n).split(FINE).join('_');
    expect(f(999)).toBe('999_€');
    expect(f(1000)).toBe('1_000_€');
    expect(f(1250)).toBe('1_250_€');
    expect(f(1234567)).toBe('1_234_567_€');
  });
});
