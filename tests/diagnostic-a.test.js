import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { valider } from '../assets/js/adresse-validation.js';
import { valider as validerViaAccueil } from '../assets/js/adresse.js';
import { TOUS, aleaValide, calquesParDefaut, filtrerEquipements, libelleNiveau, niveauGlobal } from '../assets/js/diagnostic-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const json = (chemin) => JSON.parse(lire(chemin));
const diagnostic = json('data/diagnostic.json');
const accueil = json('data/accueil.json');
const site = json('data/site.json');
const html = lire('diagnostic.html');
const accueilHtml = lire('index.html');

describe('data/diagnostic.json', () => {
  it('reprend les aléas de l\'accueil (mêmes id et titres), niveaux 1 à 4', () => {
    const attendus = accueil.aleas.liste.map((a) => [a.id, a.titre]);
    expect(diagnostic.aleas.map((a) => [a.id, a.titre])).toEqual(attendus);
    for (const a of diagnostic.aleas) {
      expect(a.niveau).toBeGreaterThanOrEqual(1);
      expect(a.niveau).toBeLessThanOrEqual(4);
      expect(a.court.length).toBeGreaterThan(0);
    }
    expect(new Set(diagnostic.aleas.map((a) => a.calque)).size).toBe(4);
    expect(diagnostic.niveaux).toHaveLength(4);
  });

  it('compte au moins 8 équipements, 2 par aléa, aléas valides, prix entiers positifs', () => {
    const ids = diagnostic.aleas.map((a) => a.id);
    expect(diagnostic.equipements.length).toBeGreaterThanOrEqual(8);
    for (const e of diagnostic.equipements) {
      expect(e.aleas.length).toBeGreaterThan(0);
      for (const a of e.aleas) expect(ids).toContain(a);
      expect(Number.isInteger(e.prix) && e.prix > 0).toBe(true);
    }
    for (const id of ids) expect(diagnostic.equipements.filter((e) => e.aleas.includes(id)).length).toBeGreaterThanOrEqual(2);
    expect(new Set(diagnostic.equipements.map((e) => e.id)).size).toBe(diagnostic.equipements.length);
  });

  it('a des textes non vides', () => {
    const vides = [];
    const parcourir = (noeud, chemin) => {
      if (typeof noeud === 'string') { if (noeud.trim() === '') vides.push(chemin); return; }
      for (const [cle, valeur] of Object.entries(noeud)) parcourir(valeur, `${chemin}.${cle}`);
    };
    parcourir(diagnostic.textes, 'textes');
    expect(Object.keys(diagnostic.textes).length).toBeGreaterThan(5);
    expect(vides).toEqual([]);
  });
});

describe('diagnostic.html', () => {
  it('est une page française noindex avec un seul h1, sans script en ligne ni URL absolue', () => {
    expect(html).toContain('<html lang="fr"');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('<noscript>');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('porte les codes E2-1 à E2-7 une fois chacun, dans l\'ordre', () => {
    const codes = [...html.matchAll(/data-bloc="(E\d-\d+)"/g)].map((m) => m[1]);
    expect(codes).toEqual(['E2-1', 'E2-2', 'E2-3', 'E2-4', 'E2-5', 'E2-6', 'E2-7']);
    const roles = [...html.matchAll(/data-role="([^"]+)"/g)].map((m) => m[1]);
    expect(roles).toEqual(['en-tete', 'adresse', 'carte', 'legende', 'exposition', 'equipements', 'pied']);
    expect(html).not.toMatch(/\border:/);
  });

  it('résout toutes ses clés de données', () => {
    const donnees = { site, diagnostic };
    const echecs = [];
    // les clés d'un gabarit de liste sont relatives à l'élément : on retire les <template> (du plus interne au plus externe)
    let global = html;
    const gabarit = /<template(?:(?!<template)[\s\S])*?<\/template>/;
    while (gabarit.test(global)) global = global.replace(gabarit, '');
    for (const [, attribut, cle] of global.matchAll(/(data-texte|data-lien|data-aria-label|data-placeholder|data-texte-global)="([^"]+)"/g)) {
      try { resoudre(donnees, cle); } catch { echecs.push(`${attribut}=${cle}`); }
    }
    for (const [, cle] of global.matchAll(/data-lien-externe="([^"]+)"/g)) {
      if (typeof site.liensExternes?.[cle] !== 'string') echecs.push(`data-lien-externe=${cle}`);
    }
    expect(echecs).toEqual([]);
  });

  it('partage en-tête, pied et relief avec index.html (hors code de bloc)', () => {
    const sansCode = (texte) => texte.replace(/ data-bloc="E\d-\d+"/g, '');
    const extraire = (texte, debut, fin) => sansCode(texte.slice(texte.indexOf(debut), texte.indexOf(fin, texte.indexOf(debut))));
    const parties = [['<div class="relief"', '<noscript>'], ['<header', '</header>'], ['<footer', '</footer>'], ['<svg class="sprite"', '<aside class="bandeau-demo"'], ['<aside class="bandeau-demo"', '<header']];
    for (const [debut, fin] of parties) {
      const attendu = extraire(accueilHtml, debut, fin);
      expect(attendu.length, debut).toBeGreaterThan(20);
      expect(extraire(html, debut, fin), debut).toBe(attendu);
    }
  });
});

describe('diagnostic-logique.js', () => {
  const ids = diagnostic.aleas.map((a) => a.id);

  it('aleaValide renvoie l\'id ou null', () => {
    expect(aleaValide(ids, 'inondations')).toBe('inondations');
    expect(aleaValide(ids, 'tous')).toBeNull();
    expect(aleaValide(ids, 'inconnu')).toBeNull();
    expect(aleaValide(ids, null)).toBeNull();
    expect(aleaValide(ids, undefined)).toBeNull();
  });

  it('libelleNiveau est borné', () => {
    expect(libelleNiveau(diagnostic.niveaux, 1)).toBe('faible');
    expect(libelleNiveau(diagnostic.niveaux, 3)).toBe('élevé');
    expect(libelleNiveau(diagnostic.niveaux, 4)).toBe('très élevé');
    expect(libelleNiveau(diagnostic.niveaux, 0)).toBe('faible');
    expect(libelleNiveau(diagnostic.niveaux, 9)).toBe('très élevé');
    expect(libelleNiveau(diagnostic.niveaux, NaN)).toBe('faible');
  });

  it('niveauGlobal : « Tous » = maximum, un aléa = son niveau', () => {
    expect(niveauGlobal(diagnostic.aleas, TOUS)).toBe(3);
    expect(niveauGlobal(diagnostic.aleas, 'inondations')).toBe(3);
    expect(niveauGlobal(diagnostic.aleas, 'feux-de-foret')).toBe(1);
    expect(niveauGlobal(diagnostic.aleas, 'canicule')).toBe(2);
    expect(niveauGlobal(diagnostic.aleas, 'inconnu')).toBe(3);
  });

  it('filtrerEquipements : « Tous » trois par priorité, filtre par aléa, max, filtre inconnu', () => {
    const tous = filtrerEquipements(diagnostic.equipements, TOUS);
    expect(tous).toHaveLength(3);
    expect(tous.map((e) => e.priorite)).toEqual([...tous.map((e) => e.priorite)].sort((a, b) => a - b));
    expect(new Set(tous.map((e) => e.aleas[0])).size).toBe(3);
    const inondations = filtrerEquipements(diagnostic.equipements, 'inondations');
    expect(inondations.length).toBeGreaterThanOrEqual(2);
    expect(inondations.length).toBeLessThanOrEqual(3);
    for (const e of inondations) expect(e.aleas).toContain('inondations');
    expect(filtrerEquipements(diagnostic.equipements, 'inondations', 1)).toHaveLength(1);
    const six = Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, aleas: ['x'], priorite: 6 - i, prix: 10 }));
    expect(filtrerEquipements(six, 'x').map((e) => e.id)).toEqual(['e5', 'e4', 'e3']);
    expect(filtrerEquipements(diagnostic.equipements, 'inconnu')).toEqual(tous);
  });

  it('calquesParDefaut : « Tous » = 4 calques, un aléa = le sien seul', () => {
    expect(calquesParDefaut(diagnostic.aleas, TOUS)).toHaveLength(4);
    expect(calquesParDefaut(diagnostic.aleas, 'inondations')).toEqual(['inondation']);
    expect(calquesParDefaut(diagnostic.aleas, 'inconnu')).toHaveLength(4);
  });
});

describe('adresse-validation.js', () => {
  it('s\'importe sans DOM ni effet de bord et conserve les résultats de valider', () => {
    expect(typeof document).toBe('undefined');
    expect(valider('12 rue des Tilleuls, 69000 Lyon')).toEqual({ valide: true, adresse: '12 rue des Tilleuls, 69000 Lyon', raison: null });
    expect(valider('  ')).toMatchObject({ valide: false, raison: 'vide' });
    expect(valider('Rue')).toMatchObject({ raison: 'courte' });
    expect(valider('a'.repeat(201))).toMatchObject({ raison: 'longue' });
    expect(valider('123456789')).toMatchObject({ raison: 'sans-lettre' });
    expect(validerViaAccueil).toBe(valider);
  });

  it('est un module pur : aucun accès au DOM ni au stockage', () => {
    const source = lire('assets/js/adresse-validation.js');
    expect(source).not.toMatch(/document|window|sessionStorage|localStorage|addEventListener/);
  });
});
