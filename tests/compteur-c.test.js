import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { libelleCompteur } from '../assets/js/compteur.js';
import { compterArticles } from '../assets/js/lignes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const PAGES = ['index.html', 'diagnostic.html', 'produit.html', 'panier.html'];
const entete = (html) => html.slice(html.indexOf('<header'), html.indexOf('</header>')).replace(/ data-bloc="E\d-\d+"/g, '');

describe('compteur d\'en-tête', () => {
  it('libellé : rien à 0, « (1) », « (99) », « (99+) » à 100 et au-delà ; nombres invalides : rien', () => {
    const t = site.compteur;
    expect(libelleCompteur(0, t)).toBeNull();
    expect(libelleCompteur(-3, t)).toBeNull();
    expect(libelleCompteur(1.5, t)).toBeNull();
    expect(libelleCompteur(NaN, t)).toBeNull();
    expect(libelleCompteur(1, t)).toBe('(1)');
    expect(libelleCompteur(99, t)).toBe('(99)');
    expect(libelleCompteur(100, t)).toBe('(99+)');
    expect(libelleCompteur(5000, t)).toBe('(99+)');
  });
  it('les textes viennent de site.json ; compterArticles(…, 100) distingue 99 de plus de 99', () => {
    expect(Object.keys(site.compteur).sort()).toEqual(['gabarit', 'libelle', 'plus']);
    for (const texte of Object.values(site.compteur)) expect(texte.trim().length).toBeGreaterThan(0);
    expect(site.compteur.gabarit).toContain('{n}');
    const session = (q) => JSON.stringify({ v: 2, lignes: [{ produit: 'x', mode: 'diy', cotes: null, quantite: q }] });
    expect(compterArticles(session(99), 100)).toBe(99);
    expect(compterArticles(session(100), 100)).toBe(100);
    expect(libelleCompteur(compterArticles(session(250), 100), site.compteur)).toBe('(99+)');
  });
  it('chaque page Hi-Fi charge compteur.js et son en-tête statique est identique à celui des autres (aucun compteur en dur)', () => {
    const pages = Object.fromEntries(PAGES.map((p) => [p, lire(p)]));
    for (const [nom, html] of Object.entries(pages)) {
      expect(html.match(/<script type="module" src="assets\/js\/compteur\.js"><\/script>/g), nom).toHaveLength(1);
      expect(entete(html), nom).not.toContain('compteur');
      expect(entete(html), nom).toBe(entete(pages['index.html']));
    }
  });
  it('compteur.js : aucun texte en dur, mise à jour sur pageshow, storage et panier:modifie', () => {
    const source = lire('assets/js/compteur.js');
    for (const evenement of ['pageshow', 'storage', 'panier:modifie']) expect(source).toContain(`'${evenement}'`);
    expect(source).not.toMatch(/innerHTML/);
    expect(source).toContain('textes.libelle');
  });
});

describe('tests/outils/lighthouse-panier.mjs', () => {
  it('écrit une clé « panier » de version 2 avec trois lignes valides, et ne touche plus à « commande »', () => {
    const script = lire('tests/outils/lighthouse-panier.mjs');
    expect(script).toContain("sessionStorage.setItem('panier'");
    expect(script).not.toMatch(/['"]commande['"]/);
    expect(script).toMatch(/v: 2,/);
    expect(script.match(/produit: '/g)).toHaveLength(3);
    expect(script).toContain('#recap-deplier');
  });
});
