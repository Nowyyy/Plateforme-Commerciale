import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { filtrerEquipements, TOUS } from '../assets/js/diagnostic-logique.js';
import { aleaParDefaut, comparaisonDepuisDiagnostic, lireSelection, selectionInitiale } from '../assets/js/comparateur-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const produit = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('diagnostic.html');
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const sansCode = (texte) => texte.replace(/ data-bloc="E\d+-\d+"/g, '');
const equipementsHtml = bloc(html, '<section class="diag__bloc diag__equipements"', '</section>');
const idsAffiches = (filtre) => filtrerEquipements(diagnostic.equipements, filtre).map((e) => e.id);
const ecrit = (filtre) => comparaisonDepuisDiagnostic({ filtre, aleas: diagnostic.aleas, ids: idsAffiches(filtre) });

describe('lot 9-C : lien « Comparer ces solutions » du diagnostic', () => {
  it('data-lien vers le comparateur dans le bloc equipements, sous les cartes, texte issu de diagnostic.json, aucun id dupliqué', () => {
    expect(equipementsHtml).toContain('data-role="equipements"');
    expect(equipementsHtml).toMatch(/<p class="diag__comparer"><a class="bouton bouton--secondaire" data-lien="site\.liens\.comparateur" data-texte="diagnostic\.textes\.equipements\.comparer"><\/a><\/p>/);
    expect(equipementsHtml.indexOf('diag__comparer')).toBeGreaterThan(equipementsHtml.indexOf('</ul>'));
    expect(equipementsHtml).not.toContain('bouton--action');
    expect(resoudre({ site, diagnostic }, 'diagnostic.textes.equipements.comparer')).toBe('Comparer ces solutions');
    expect(resoudre({ site, diagnostic }, 'site.liens.comparateur')).toBe('comparateur.html');
    const idents = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(idents).size).toBe(idents.length);
  });
});

describe('lot 9-C : écriture de la clé comparaison par le diagnostic', () => {
  it('aléa du filtre actif, aléa par défaut pour « Tous » ou un filtre inconnu, identifiants des cartes affichées', () => {
    const aleas = diagnostic.aleas;
    expect(JSON.parse(ecrit('feux-de-foret'))).toEqual({ v: 1, alea: 'feux-de-foret', produits: ['sprinkler-de-toiture', 'grille-pare-braises'] });
    expect(JSON.parse(ecrit(TOUS))).toEqual({ v: 1, alea: aleaParDefaut(aleas), produits: ['batardeau-modulable', 'bouclier-de-baie', 'sprinkler-de-toiture'] });
    expect(JSON.parse(comparaisonDepuisDiagnostic({ filtre: 'inconnu', aleas, ids: ['a'] })).alea).toBe('inondations');
    expect(JSON.parse(comparaisonDepuisDiagnostic({ filtre: 'canicule', aleas, ids: ['a', 3, '', 'b'] })).produits).toEqual(['a', 'b']);
    expect(() => comparaisonDepuisDiagnostic()).not.toThrow();
    const gele = Object.freeze({ filtre: 'canicule', aleas: Object.freeze(aleas.map((a) => Object.freeze({ ...a }))), ids: Object.freeze(['x']) });
    expect(() => comparaisonDepuisDiagnostic(gele)).not.toThrow();
  });
  it('pour chacun des quatre aléas, la sélection écrite est relue sans modification par selectionInitiale', () => {
    const aleas = produit.comparateur.aleas;
    for (const alea of aleas) {
      const brut = ecrit(alea.id);
      expect(lireSelection(brut), alea.id).not.toBeNull();
      const lue = selectionInitiale({ brut, produits: produit.produits, aleas, limites: produit.comparateur.limites });
      expect(lue, alea.id).toEqual({ alea: alea.id, ids: JSON.parse(brut).produits });
      expect(lue.ids.length).toBeGreaterThanOrEqual(2);
      expect(lue.ids.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('lot 9-C : diagnostic.js, CSS et pages', () => {
  it('diagnostic.js : aucun nouvel appel réseau, aucun autre stockage que comparaison en plus des clés existantes', () => {
    const src = lire('assets/js/diagnostic.js').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie|innerHTML|history\.|location\./);
    const cles = [...src.matchAll(/(?:lireSession|ecrireSession)\(([A-Z_]+)/g)].map((m) => m[1]);
    expect([...new Set(cles)].sort()).toEqual(['CLE_ALEA', 'CLE_COMPARAISON', 'CLE_STOCKAGE']);
    expect(src).not.toMatch(/(?:getItem|setItem|removeItem)\(['"](?!produit)/);
    expect(src).toContain('comparaisonDepuisDiagnostic({ filtre: etat.filtre');
    expect(lire('assets/js/produit-session.js')).toContain('setItem(CLE_PRODUIT, id)');
  });
  it('css/diagnostic.css : aucune valeur hexadécimale ; réserve de hauteur du lien', () => {
    const css = lire('css/diagnostic.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).toMatch(/\.diag__comparer \{\s*min-block-size: var\(--touch-min\)/);
  });
  it('en-tête, pied et décor identiques sur les quatorze pages Hi-Fi ; liens du pied et du diagnostic vers comparateur.html', () => {
    const index = lire('index.html');
    const pages = ['index.html', 'diagnostic.html', 'produit.html', 'panier.html', 'pro.html', 'connexion.html', 'compte.html', 'achats.html', 'achat.html', 'informations.html', 'sav-acces.html', 'sav.html', 'demandes.html', 'comparateur.html'];
    expect(pages).toHaveLength(14);
    for (const page of pages) {
      const source = lire(page);
      expect(sansCode(bloc(source, '<header', '</header>')), page).toBe(sansCode(bloc(index, '<header', '</header>')));
      expect(sansCode(bloc(source, '<footer', '</footer>')), page).toBe(sansCode(bloc(index, '<footer', '</footer>')));
      expect(bloc(source, '<div class="relief"', '</svg>\n  </div>'), page).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
    }
    expect(site.pied.colonnes[1].entrees.find((e) => e.lien === 'comparateur').texte).toBe('Comparer des solutions');
  });
  it('bilan Docs/lots/lot-9.md : 35 lignes au plus, sections demandées', () => {
    const bilan = lire('Docs/lots/lot-9.md');
    expect(bilan.split('\n').length).toBeLessThanOrEqual(36);
    for (const titre of ['Choix à valider', 'À tester par moi', 'Fusion (à faire par moi)']) expect(bilan).toContain(titre);
  });
});
