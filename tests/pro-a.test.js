import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { RAISONS } from '../assets/js/pro-logique.js';
import { lireConventions } from './outils/conventions.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const pro = JSON.parse(lire('data/pro.json'));
const site = JSON.parse(lire('data/site.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const donnees = { site, pro };
const html = lire('pro.html');
const index = lire('index.html');

const feuilles = (objet, chemin = '') => Object.entries(objet).flatMap(([cle, valeur]) => {
  if (typeof valeur === 'string') return [[`${chemin}${cle}`, valeur]];
  if (Array.isArray(valeur)) return valeur.flatMap((x, i) => (typeof x === 'string' ? [[`${chemin}${cle}[${i}]`, x]] : feuilles(x, `${chemin}${cle}[${i}].`)));
  if (valeur !== null && typeof valeur === 'object') return feuilles(valeur, `${chemin}${cle}.`);
  return [];
});
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const sansCode = (texte) => texte.replace(/ data-bloc="E\d-\d+"/g, '');

describe('lot 8b-A : données de data/pro.json', () => {
  it('tous les textes sont non vides (la confirmation est complétée et vérifiée en partie C)', () => {
    const textes = feuilles({ ...pro, confirmation: undefined });
    expect(textes.length).toBeGreaterThan(40);
    for (const [cle, texte] of textes) expect(texte.trim().length, cle).toBeGreaterThan(0);
    expect(pro.etapes.liste).toHaveLength(3);
    expect(pro.formulaire.champs.certifications.emplacements).toHaveLength(2);
  });

  it('messages : un texte pour chaque couple champ et raison de RAISONS, plus un repli', () => {
    for (const [champ, raisons] of Object.entries(RAISONS)) {
      for (const raison of raisons) expect(pro.messages[champ]?.[raison]?.trim().length, `${champ}/${raison}`).toBeGreaterThan(0);
      expect(Object.keys(pro.messages[champ]).sort(), champ).toEqual([...raisons].sort());
    }
    expect(pro.messages.repli.trim().length).toBeGreaterThan(0);
    for (const champ of Object.keys(RAISONS)) expect(pro.formulaire.resume.liens[champ]?.length, champ).toBeGreaterThan(0);
    expect(pro.formulaire.resume.singulier).toContain('{n}');
    expect(pro.formulaire.resume.pluriel).toContain('{n}');
  });

  it('limites cohérentes : min inférieur à max, valeurs positives', () => {
    for (const [champ, borne] of Object.entries(pro.limites)) {
      for (const [cle, valeur] of Object.entries(borne)) expect(Number.isInteger(valeur) && valeur > 0, `${champ}.${cle}`).toBe(true);
      if (borne.min !== undefined) expect(borne.min, champ).toBeLessThan(borne.max);
    }
    expect(pro.limites.email.localMax).toBeLessThan(pro.limites.email.max);
  });

  it('aléas : les quatre premiers sont ceux de aleas.liste de data/accueil.json, dans l\'ordre ; le cinquième est protection-personne', () => {
    expect(pro.aleas.slice(0, 4)).toEqual(accueil.aleas.liste.map(({ id, titre }) => ({ id, titre })));
    expect(pro.aleas).toHaveLength(5);
    expect(pro.aleas[4].id).toBe('protection-personne');
  });

  it('liens.pro vaut pro.html et tous les liens pointent vers des fichiers existants', () => {
    expect(site.liens.pro).toBe('pro.html');
    for (const cible of Object.values(site.liens).filter((c) => !c.startsWith('#'))) expect(existsSync(cible), cible).toBe(true);
  });
});

describe('lot 8b-A : pro.html', () => {
  it('lang, noindex, un seul h1, codes E5-1 à E5-6 dans l\'ordre, aria-labelledby valides, confirmation masquée, rien d\'en ligne ni d\'externe', () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="fr" data-donnees="pro">/);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect([...html.matchAll(/data-bloc="(E5-\d)"/g)].map((m) => m[1])).toEqual(['E5-1', 'E5-2', 'E5-3', 'E5-4', 'E5-5', 'E5-6']);
    expect([...html.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1])).toEqual(['en-tete', 'intro', 'etapes', 'formulaire', 'confirmation', 'pied']);
    for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) expect(html, id).toContain(`id="${id}"`);
    expect(html).toMatch(/<section [^>]*data-role="confirmation"[^>]*\shidden>/);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\sstyle=/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toute clé data-texte, data-lien, data-aria-label et data-liste se résout', () => {
    const hors = html.replace(/<template[\s\S]*?<\/template>/g, '');
    for (const attribut of ['data-texte', 'data-texte-global', 'data-lien', 'data-aria-label']) {
      for (const [, cle] of hors.matchAll(new RegExp(` ${attribut}="([^"]+)"`, 'g'))) expect(() => resoudre(donnees, cle), `${attribut} ${cle}`).not.toThrow();
    }
    for (const [, cle, contenu] of html.matchAll(/<template data-liste="([^"]+)">([\s\S]*?)<\/template>/g)) {
      if (cle === 'entrees') continue; // gabarit imbriqué du pied, relatif à la colonne
      const liste = cle.split('.').reduce((o, k) => o[k], cle.startsWith('site.') ? donnees : pro);
      expect(Array.isArray(liste) && liste.length > 0, cle).toBe(true);
      if (cle.startsWith('site.')) continue; // pied : déjà couvert par les tests du pied
      for (const [, relative] of contenu.matchAll(/ data-texte="([^"]+)"/g)) expect(relative === '.' ? liste[0] : liste[0][relative], `${cle} ${relative}`).toBeTypeOf('string');
    }
  });

  it('l\'en-tête, le pied et le décor .relief sont identiques à ceux d\'index.html ; les cinq pages Hi-Fi chargent compteur.js', () => {
    expect(sansCode(bloc(html, '<header', '</header>'))).toBe(sansCode(bloc(index, '<header', '</header>')));
    expect(sansCode(bloc(html, '<footer', '</footer>'))).toBe(sansCode(bloc(index, '<footer', '</footer>')));
    expect(bloc(html, '<div class="relief"', '</svg>\n  </div>')).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
    for (const page of ['index.html', 'diagnostic.html', 'produit.html', 'panier.html', 'pro.html']) {
      expect(lire(page).match(/<script type="module" src="assets\/js\/compteur\.js"><\/script>/g), page).toHaveLength(1);
    }
  });

  it('les étapes forment un <ol> généré par gabarit : 3 éléments, chacun avec un h3', () => {
    expect(html).toMatch(/<ol class="etapes"[^>]*>\s*<template data-liste="etapes\.liste">/);
    const modele = html.match(/<template data-liste="etapes\.liste">([\s\S]*?)<\/template>/)[1];
    expect(modele.match(/<li[ >]/g)).toHaveLength(1);
    expect(modele.match(/<h3[ >]/g)).toHaveLength(1);
    expect(pro.etapes.liste).toHaveLength(3);
    expect(pro.etapes.liste.map((e) => e.titre)).toEqual(['Candidature', 'Validation du catalogue et des certifications', 'Mise en ligne']);
  });
});

describe('lot 8b-A : workflow, CLAUDE.md et conventions', () => {
  const workflow = lire('.github/workflows/pages.yml');
  it('le workflow publie pro.html, garde permissions:, sans secrets. ni pull_request_target, lignes uses: inchangées', () => {
    expect(workflow.match(/for p in ([^;]+);/)[1].split(/\s+/)).toContain('pro.html');
    expect(workflow).toContain('permissions:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('pull_request_target');
    const uses = workflow.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
    expect(uses).toEqual([
      'uses: actions/checkout@v4', 'uses: actions/setup-node@v4', 'uses: actions/checkout@v4',
      'uses: actions/configure-pages@v5', 'uses: actions/upload-pages-artifact@v3', 'uses: actions/deploy-pages@v4',
    ]);
  });

  it('CLAUDE.md fait moins de 9 000 caractères et conventions.md contient la section « Formulaires »', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
    expect(lireConventions()).toMatch(/^## Formulaires/m);
    expect(lire('CLAUDE.md')).toContain('Formulaires simulés');
  });
});
