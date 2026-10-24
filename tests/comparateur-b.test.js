import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { construireTableau, produitsDeAlea, selectionPourAlea } from '../assets/js/comparateur-logique.js';
import { formaterPrix } from '../assets/js/diagnostic-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const c = produit.comparateur;
const html = lire('comparateur.html');
const css = lire('css/comparateur.css');
const js = lire('assets/js/comparateur.js');
const choisir = (...ids) => ids.map((id) => produit.produits.find((p) => p.id === id));
const tableau = (alea, ...ids) => construireTableau({ produits: choisir(...ids), critere: c.criteres[alea], libelles: c.comparaison });
const FINE = '\u202f';

describe('lot 9-B : construireTableau', () => {
  it('deux produits : cinq lignes dans l\'ordre, valeurs formatées (cm, min, kg, prix à séparateur français)', () => {
    const lignes = tableau('inondations', 'batardeau-modulable', 'clapet-anti-retour');
    expect(lignes.map((l) => l.cle)).toEqual(['principale', 'montage', 'poids', 'prix', 'pose']);
    expect(lignes.map((l) => l.libelle)).toEqual(["Hauteur d'eau retenue", 'Temps de montage', 'Poids', 'Prix TTC', 'Pose estimée']);
    expect(lignes.map((l) => l.valeurs.map((v) => v.texte))).toEqual([
      ['60 cm', '120 cm'], ['12 min', '45 min'], ['18 kg', '4 kg'], [`690${FINE}€`, `149${FINE}€`], [`280${FINE}€`, `60${FINE}€`],
    ]);
  });
  it('trois produits : une valeur par produit et par ligne, dans l\'ordre de la sélection', () => {
    const lignes = tableau('grele-vents', 'filet-de-toiture', 'bouclier-de-baie', 'volet-extrude');
    for (const l of lignes) expect(l.valeurs).toHaveLength(3);
    expect(lignes[0].valeurs.map((v) => v.texte)).toEqual(['110 km/h', '180 km/h', '140 km/h']);
    expect(lignes[3].valeurs[1].texte).toBe(formaterPrix(1250));
    expect(lignes[3].valeurs[1].texte).toBe(`1${' '}250${' '}€`.replace(/ /g, (m, i) => (i === 1 ? ' ' : ' ')));
  });
  it('critère propre à chaque aléa, valeurs lues dans produit.json', () => {
    for (const alea of c.aleas) {
      const ids = selectionPourAlea(alea.id, produit.produits, c.limites).ids;
      const lignes = tableau(alea.id, ...ids);
      expect(lignes[0].libelle).toBe(c.criteres[alea.id].titre);
      lignes[0].valeurs.forEach((v, i) => {
        const p = produit.produits.find((x) => x.id === ids[i]);
        expect(v.texte).toContain(String(p.performances.principale));
        expect(v.texte.endsWith(c.criteres[alea.id].unite)).toBe(true);
      });
    }
    expect(new Set(c.aleas.map((a) => tableau(a.id, ...selectionPourAlea(a.id, produit.produits, c.limites).ids)[0].libelle)).size).toBe(4);
    expect(c.comparaison.note).toContain('exemple');
  });
  it('valeurs de trois chiffres et prix de sept chiffres : séparateur de milliers', () => {
    const gros = [{ id: 'x', titre: 'T', prix: 1234567, pose: 100, performances: { principale: 480, montage: 240, poids: 200 } }];
    const lignes = construireTableau({ produits: gros, critere: { titre: 'C', unite: 'cm' }, libelles: c.comparaison });
    expect(lignes[0].valeurs[0].texte).toBe('480 cm');
    expect(lignes[3].valeurs[0].texte).toBe(`1${FINE}234${FINE}567${FINE}€`);
  });
  it('pureté et robustesse : arguments gelés non modifiés, entrées invalides sans exception', () => {
    const gele = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(gele); } return v; };
    const entree = gele(structuredClone({ produits: choisir('batardeau-modulable', 'clapet-anti-retour'), critere: c.criteres.inondations, libelles: c.comparaison }));
    const avant = JSON.stringify(entree);
    expect(() => construireTableau(entree)).not.toThrow();
    expect(JSON.stringify(entree)).toBe(avant);
    expect(() => construireTableau()).not.toThrow();
    expect(() => construireTableau({ produits: [null, {}, { performances: { principale: 'a' } }], critere: null, libelles: { valeur: '{inconnue}' } })).not.toThrow();
    const vide = construireTableau({});
    expect(vide).toHaveLength(5);
    expect(vide.every((l) => l.valeurs.length === 0)).toBe(true);
    expect(construireTableau({ produits: [{}], libelles: c.comparaison }).map((l) => l.valeurs[0].texte).slice(0, 3)).toEqual(['', '', '']);
  });
});

describe('lot 9-B : balisage du tableau', () => {
  it('caption masquée, région défilante nommée et focalisable, en-têtes de colonnes et de lignes générés, aucun id dupliqué', () => {
    expect(html).toMatch(/<caption class="visuellement-cache" data-texte="produit\.comparateur\.comparaison\.legende">/);
    expect(html).toMatch(/<div class="comp__zone" role="region" tabindex="0" data-aria-label="produit\.comparateur\.comparaison\.regionAria"/);
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(html).not.toMatch(/<th[ >]/);
    expect(js).toContain("colonne.scope = 'col'");
    expect(js).toContain("coin.scope = 'col'");
    expect(js).toContain("titre.scope = 'row'");
    expect(js).toContain('visuellement-cache');
    const idents = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(idents).size).toBe(idents.length);
    expect(js).not.toMatch(/(?<!dataset)\.id\s*=(?!=)|setAttribute\('id'/);
    expect(html).toContain('data-texte="produit.comparateur.comparaison.aideDefilement"');
    expect(html).toContain('data-texte="produit.comparateur.comparaison.note"');
    expect(c.comparaison.coin).not.toBe('');
  });
});

describe('lot 9-B : CSS du tableau', () => {
  it('première colonne figée (sticky) avec fond opaque et filet ; colonnes de 9 rem au moins ; tableau de 64 rem au plus', () => {
    const regle = css.match(/\.comp__table tbody th,\s*\.comp__table thead th:first-child \{([^}]*)\}/)[1];
    expect(regle).toMatch(/position:\s*sticky/);
    expect(regle).toMatch(/background:\s*var\(--color-card\)/);
    expect(regle).toMatch(/border-inline-end:\s*1px solid/);
    expect(css).toMatch(/min-inline-size:\s*var\(--comparateur-colonne-min\)/);
    expect(css).toMatch(/max-inline-size:\s*min\(100%, var\(--comparateur-tableau-max\)\)/);
    const tokens = lire('css/tokens.css');
    expect(tokens).toContain('--comparateur-colonne-min: 9rem');
    expect(tokens).toContain('--comparateur-tableau-max: 64rem');
  });
  it('aucune valeur hexadécimale ; overflow-x limité à la zone du tableau ; aide de défilement masquée dès 768 px', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const regles = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /overflow(-x)?:\s*(auto|scroll)/.test(m[2])).map((m) => m[1].trim());
    expect(regles).toEqual(['.comp__zone']);
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.comp__aide-defilement \{\s*display: none;/);
  });
});

describe('lot 9-B : aucune valeur « meilleure », liens « Voir la fiche »', () => {
  it('aucun texte du comparateur (données et page) ne qualifie un produit de meilleur, recommandé ou idéal', () => {
    const textes = JSON.stringify(c) + html;
    expect(textes).not.toMatch(/meilleur|recommand|idéal|ideal|préféré|top\b|gagnant/i);
  });
  it('« Voir la fiche » mémorise le produit par produit-session.js, comme le diagnostic, sans code dupliqué', () => {
    const session = lire('assets/js/produit-session.js');
    expect(session).toContain("export const CLE_PRODUIT = 'produit'");
    expect(session).toContain('export function memoriserProduit');
    for (const f of ['comparateur.js', 'diagnostic.js']) {
      const src = lire(`assets/js/${f}`);
      expect(src, f).toContain("import { memoriserProduit } from './produit-session.js'");
      expect(src, f).toMatch(/memoriserProduit\(id\)/);
      expect(src, f).not.toMatch(/setItem\(['"]produit|setItem\(CLE_PRODUIT/);
    }
    expect(js).toContain('lienProduit = donnees.site.liens.produit');
    expect(js).toMatch(/lien\.dataset\.id = produit\.id/);
    expect(produitsDeAlea(produit.produits, 'inondations').length).toBeGreaterThan(0);
  });
});
