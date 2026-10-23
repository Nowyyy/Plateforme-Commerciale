import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import {
  lireMm, evaluerCotes, remplirGabarit, formaterMm, peutAjouter, restaurerCotes, premierChampACorriger,
} from '../assets/js/cotes-logique.js';
import { construireLigne } from '../assets/js/lignes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const donneesProduit = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('produit.html');
const batardeau = donneesProduit.produits.find((p) => p.id === 'batardeau-modulable');
const LIMITES = { largeur: { min: 700, max: 1600 }, hauteur: { min: 300, max: 600 }, toleranceMax: 50 };

const eval_ = (largeur, hauteur, tolerance = '') => evaluerCotes({ largeur: String(largeur), hauteur: String(hauteur), tolerance: String(tolerance) }, LIMITES);

describe('lireMm', () => {
  it.each([
    ['850', 850], ['1 200', 1200], ['1 200', 1200], ['1 200', 1200], ['0850', 850], ['9999', 9999], [' 12 ', 12],
  ])('« %s » est valide', (texte, valeur) => {
    expect(lireMm(texte, { minimum: 1 })).toEqual({ etat: 'ok', valeur });
  });

  it.each([['', 'vide'], [' ', 'vide'], [' ', 'vide'], [' ', 'vide']])('« %j » est vide', (texte, etat) => {
    expect(lireMm(texte, { minimum: 1 })).toEqual({ etat });
  });

  it.each(['0', '-5', '+5', '12,5', '12.5', 'abc', '12a', '10000', '1e3', '１２'])('« %s » est invalide pour une largeur', (texte) => {
    expect(lireMm(texte, { minimum: 1 })).toEqual({ etat: 'invalide' });
  });

  it('accepte 0 pour la tolérance et refuse les valeurs non textuelles sans exception', () => {
    expect(lireMm('0', { minimum: 0 })).toEqual({ etat: 'ok', valeur: 0 });
    expect(lireMm(null, { minimum: 1 })).toEqual({ etat: 'vide' });
    expect(lireMm(undefined)).toEqual({ etat: 'vide' });
  });
});

describe('evaluerCotes : bornes et écarts', () => {
  it('inclut les bornes (tolérance 0)', () => {
    expect(eval_(700, 300).etat).toBe('compatible');
    expect(eval_(1600, 600).etat).toBe('compatible');
  });

  it('699 mm de large : hors, écart de 1 mm « trop-petite »', () => {
    const e = eval_(699, 300);
    expect(e.etat).toBe('hors');
    expect(e.ecarts).toEqual([{ champ: 'largeur', sens: 'trop-petite', mm: 1 }]);
  });

  it('1 601 mm de large : hors, écart de 1 mm « trop-grande »', () => {
    const e = eval_(1601, 600);
    expect(e.etat).toBe('hors');
    expect(e.ecarts).toEqual([{ champ: 'largeur', sens: 'trop-grande', mm: 1 }]);
  });

  it('hauteur hors plage : écart sur la hauteur', () => {
    expect(eval_(800, 299).ecarts).toEqual([{ champ: 'hauteur', sens: 'trop-petite', mm: 1 }]);
    expect(eval_(800, 650).ecarts).toEqual([{ champ: 'hauteur', sens: 'trop-grande', mm: 50 }]);
  });

  it('effet de la tolérance (marge d\'erreur de la mesure)', () => {
    expect(eval_(710, 400, 10).etat).toBe('compatible');
    const petite = eval_(705, 400, 10);
    expect(petite.etat).toBe('hors');
    expect(petite.ecarts).toEqual([{ champ: 'largeur', sens: 'trop-petite', mm: 5 }]);
    expect(eval_(1595, 400, 10).ecarts).toEqual([{ champ: 'largeur', sens: 'trop-grande', mm: 5 }]);
  });

  it('une dimension peut produire les deux écarts quand la plage est plus étroite que 2 × t', () => {
    const e = evaluerCotes({ largeur: '800', hauteur: '400', tolerance: '30' }, { largeur: { min: 780, max: 820 }, hauteur: { min: 300, max: 600 }, toleranceMax: 50 });
    expect(e.etat).toBe('hors');
    expect(e.ecarts).toEqual([
      { champ: 'largeur', sens: 'trop-petite', mm: 10 },
      { champ: 'largeur', sens: 'trop-grande', mm: 10 },
    ]);
  });
});

describe('evaluerCotes : tolérance et états', () => {
  it('tolérance 51 : champ invalide (« trop-grande ») et état invalide ; 50 est accepté', () => {
    const e = eval_(800, 400, 51);
    expect(e.etat).toBe('invalide');
    expect(e.champs.tolerance).toMatchObject({ etat: 'invalide', raison: 'trop-grande' });
    expect(eval_(800, 400, 50).etat).toBe('compatible');
  });

  it('tolérance vide = 0 ; tolérance « 0 » aussi', () => {
    expect(eval_(699, 400, '').ecarts[0].mm).toBe(1);
    expect(eval_(699, 400, '0').ecarts[0].mm).toBe(1);
    expect(eval_(800, 400, '').champs.tolerance).toEqual({ etat: 'vide' });
  });

  it('incomplet (largeur seule, hauteur seule, aucune) ; invalide l\'emporte sur incomplet', () => {
    expect(eval_(800, '').etat).toBe('incomplet');
    expect(eval_('', 400).etat).toBe('incomplet');
    expect(eval_('', '').etat).toBe('incomplet');
    expect(eval_('abc', '').etat).toBe('invalide');
    expect(eval_('', '', 'x').etat).toBe('invalide');
  });

  it('donne l\'état et la valeur lue de chaque champ', () => {
    const e = eval_('1 200', 'abc', '10');
    expect(e.champs.largeur).toEqual({ etat: 'ok', valeur: 1200 });
    expect(e.champs.hauteur.etat).toBe('invalide');
    expect(e.champs.tolerance).toEqual({ etat: 'ok', valeur: 10 });
  });

  it('refuse des limites absentes', () => {
    expect(() => evaluerCotes({}, undefined)).toThrow();
  });

  it('premier champ à corriger', () => {
    expect(premierChampACorriger(eval_('', ''))).toBe('largeur');
    expect(premierChampACorriger(eval_(800, ''))).toBe('hauteur');
    expect(premierChampACorriger(eval_(800, 'x', 51))).toBe('hauteur');
    expect(premierChampACorriger(eval_(800, 400, 51))).toBe('tolerance');
    expect(premierChampACorriger(eval_(800, 650))).toBe('hauteur');
    expect(premierChampACorriger(eval_(650, 650))).toBe('largeur');
  });
});

describe('evaluerCotes : propriétés sur une grille', () => {
  const largeurs = Array.from({ length: 201 }, (_, i) => 650 + 5 * i);
  const tolerances = Array.from({ length: 11 }, (_, i) => 5 * i);

  it('compatible avec une tolérance = compatible avec toute tolérance plus petite', () => {
    for (const l of largeurs) {
      let compatiblePrecedente = true;
      for (const t of tolerances) {
        const ok = eval_(l, 400, t).etat === 'compatible';
        if (ok) expect(compatiblePrecedente, `${l} mm, tolérance ${t}`).toBe(true);
        compatiblePrecedente = ok;
      }
    }
  });

  it('l\'ensemble des largeurs compatibles est un intervalle continu', () => {
    for (const t of tolerances) {
      const ok = largeurs.map((l) => eval_(l, 400, t).etat === 'compatible');
      const premier = ok.indexOf(true);
      const dernier = ok.lastIndexOf(true);
      expect(premier, `tolérance ${t}`).toBeGreaterThan(-1);
      expect(ok.slice(premier, dernier + 1).every(Boolean), `tolérance ${t}`).toBe(true);
    }
  });
});

describe('pureté', () => {
  it('mêmes entrées, mêmes sorties ; arguments gelés non modifiés', () => {
    const saisie = Object.freeze({ largeur: '705', hauteur: '400', tolerance: '10' });
    const limites = Object.freeze({ largeur: Object.freeze({ min: 700, max: 1600 }), hauteur: Object.freeze({ min: 300, max: 600 }), toleranceMax: 50 });
    const un = evaluerCotes(saisie, limites);
    expect(evaluerCotes(saisie, limites)).toEqual(un);
    expect(saisie).toEqual({ largeur: '705', hauteur: '400', tolerance: '10' });
    const gele = Object.freeze({ ...batardeau, cotes: limites });
    const bon = evaluerCotes({ largeur: '800', hauteur: '400', tolerance: '' }, limites);
    expect(() => construireLigne(gele, 'pose', bon)).not.toThrow();
    expect(() => restaurerCotes(Object.freeze('{"produit":"x"}'), 'x')).not.toThrow();
    expect(un).not.toBe(evaluerCotes(saisie, limites));
  });
});

describe('remplirGabarit, formaterMm, peutAjouter', () => {
  it('remplace les marques et nomme la clé inconnue', () => {
    expect(remplirGabarit('de {min} à {max} mm', { min: '700', max: '1 600' })).toBe('de 700 à 1 600 mm');
    expect(remplirGabarit('sans marque', {})).toBe('sans marque');
    expect(() => remplirGabarit('trop grande de {ecart} mm', { autre: 1 })).toThrow(/ecart/);
    expect(() => remplirGabarit('{x}', null)).toThrow(/x/);
  });

  it('formaterMm : séparateur de milliers fin insécable, sans unité', () => {
    expect(formaterMm(850)).toBe('850');
    expect(formaterMm(1200)).toBe('1 200');
    expect(formaterMm(12000)).toBe('12 000');
  });

  it('peutAjouter : vrai seulement pour « compatible »', () => {
    expect(peutAjouter(eval_(800, 400))).toBe(true);
    for (const e of [eval_(699, 400), eval_('', ''), eval_('x', 400), null, undefined]) expect(peutAjouter(e)).toBe(false);
  });
});

describe('construireLigne (remplace construireCommande du lot 8)', () => {
  const bon = eval_('1 200', 400, 10);

  it('mode DIY : ligne sans aucun prix, quantité 1', () => {
    expect(construireLigne(batardeau, 'diy', bon)).toEqual({
      produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 10 }, quantite: 1,
    });
  });

  it('mode pose : mode conservé, quantité choisie, aucun prix (recalculé à l\'affichage)', () => {
    const c = construireLigne(batardeau, 'pose', bon, 3);
    expect(c).toMatchObject({ mode: 'pose', quantite: 3 });
    expect(JSON.stringify(c)).not.toMatch(/prix|total|materiel/);
  });

  it('mode inconnu = DIY ; tolérance vide = 0', () => {
    const c = construireLigne(batardeau, 'autre', eval_(800, 400));
    expect(c.mode).toBe('diy');
    expect(c.cotes.tolerance).toBe(0);
  });

  it('évaluation non compatible : cotes null ; produit non complet : cotes null', () => {
    expect(construireLigne(batardeau, 'diy', eval_(699, 400)).cotes).toBeNull();
    expect(construireLigne(batardeau, 'diy', eval_('', '')).cotes).toBeNull();
    expect(construireLigne(batardeau, 'diy', null).cotes).toBeNull();
    const autre = donneesProduit.produits.find((p) => !p.complet);
    expect(construireLigne(autre, 'diy', bon).cotes).toBeNull();
  });
});

describe('restaurerCotes', () => {
  const vides = { largeur: '', hauteur: '', tolerance: '' };

  it('rend la saisie du bon produit', () => {
    const brut = JSON.stringify({ produit: 'batardeau-modulable', largeur: '1 200', hauteur: '400', tolerance: '' });
    expect(restaurerCotes(brut, 'batardeau-modulable')).toEqual({ largeur: '1 200', hauteur: '400', tolerance: '' });
  });

  it('champs vides pour un autre produit, un texte non JSON, une valeur nulle ou un objet incomplet, sans exception', () => {
    const autre = JSON.stringify({ produit: 'bouclier-de-baie', largeur: '800', hauteur: '400', tolerance: '' });
    for (const brut of [autre, 'pas du json', null, undefined, '', 'null', '[]', '42', '"x"', '{', JSON.stringify({ produit: 'batardeau-modulable' })]) {
      expect(restaurerCotes(brut, 'batardeau-modulable')).toEqual(vides);
    }
  });

  it('ignore les champs qui ne sont pas des textes courts', () => {
    const brut = JSON.stringify({ produit: 'p', largeur: 800, hauteur: { a: 1 }, tolerance: 'x'.repeat(100) });
    expect(restaurerCotes(brut, 'p')).toEqual(vides);
  });
});

describe('données et squelette du bloc E3-5', () => {
  it('seul le produit « complet » a des cotes cohérentes', () => {
    for (const p of donneesProduit.produits) {
      if (p.complet) {
        expect(p.cotes.largeur.min).toBeLessThan(p.cotes.largeur.max);
        expect(p.cotes.hauteur.min).toBeLessThan(p.cotes.hauteur.max);
        expect(p.cotes.toleranceMax).toBeGreaterThan(0);
        expect(p.cotes).toEqual(LIMITES);
      } else {
        expect(p, p.id).not.toHaveProperty('cotes');
      }
    }
  });

  it('configurateur : tous les textes sont présents et non vides', () => {
    const c = donneesProduit.configurateur;
    const feuilles = [];
    const parcourir = (valeur, chemin) => {
      if (typeof valeur === 'string') feuilles.push([chemin, valeur]);
      else if (Array.isArray(valeur)) valeur.forEach((v, i) => parcourir(v, `${chemin}[${i}]`));
      else if (valeur && typeof valeur === 'object') Object.entries(valeur).forEach(([k, v]) => parcourir(v, `${chemin}.${k}`));
    };
    parcourir(c, 'configurateur');
    expect(feuilles.length).toBeGreaterThan(30);
    for (const [chemin, texte] of feuilles) expect(texte.trim().length, chemin).toBeGreaterThan(0);
    expect(c.etapes).toHaveLength(3);
    expect(c.etapes.map((e) => e.lettre)).toEqual(['A', 'B', 'C']);
    for (const champ of ['largeur', 'hauteur']) {
      for (const sens of ['trop-petite', 'trop-grande']) expect(c.ecarts[champ][sens]).toContain('{ecart}');
      expect(c.saisie.plage[champ]).toMatch(/\{min\}.*\{max\}/);
    }
    expect(c.erreurs.toleranceMax).toContain('{max}');
    expect(c.nonComplet.message).toBe('Configurateur, spécifications et documents disponibles seulement pour la fiche complète du batardeau modulable dans ce démonstrateur.');
  });

  it('produit.html : section configurateur E3-5 une fois, entre « mode » et « pied », clés résolues', () => {
    expect(html.match(/data-bloc="E3-5"/g)).toHaveLength(1);
    expect(html).toMatch(/<section[^>]*data-role="configurateur"[^>]*aria-labelledby="titre-configurateur"/);
    const ordre = ['galerie', 'achat', 'mode', 'configurateur', 'pied'].map((r) => html.indexOf(`data-role="${r}"`));
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    expect(ordre.every((n) => n > -1)).toBe(true);
    const debut = html.indexOf('data-role="configurateur"');
    const bloc = html.slice(debut, html.indexOf('</section>', debut));
    const donnees = { site, produit: donneesProduit };
    const echecs = [];
    for (const [, , cle] of [...bloc.matchAll(/data-(texte|lien|aria-label)="([^"]+)"/g)].filter((m) => /^(site|produit)\./.test(m[2]))) {
      try { resoudre(donnees, cle); } catch { echecs.push(cle); }
    }
    expect(echecs).toEqual([]);
    expect(bloc).toContain('data-liste="configurateur.etapes"');
    expect(Array.isArray(donneesProduit.configurateur.etapes)).toBe(true);
  });
});
