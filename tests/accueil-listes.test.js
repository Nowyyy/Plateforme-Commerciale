import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resoudre, resoudreDans, validerListe, resoudrePied } from '../assets/js/rendu.js';
import { flechesVisibles, cibleDefilement } from '../assets/js/carrousel.js';
import { extraire } from './outils/gabarits.mjs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const donnees = { site, accueil };
const html = lire('index.html');

const texte = (v) => typeof v === 'string' && v.trim().length > 0;
const cles = (source, attributs) =>
  [...source.matchAll(new RegExp(`\\b(${attributs})="([^"]+)"`, 'g'))].map((m) => [m[1], m[2]]);

const { hors, modeles } = extraire(html);
const sprite = html.match(/<svg class="sprite"[\s\S]*?<\/svg>/)[0];
const symboles = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);

describe('listes de data/accueil.json', () => {
  it('titres, introductions, éléments et étapes sont valides', () => {
    for (const nom of ['aleas', 'protection']) {
      expect(texte(accueil[nom].titre), `${nom}.titre`).toBe(true);
      expect(texte(accueil[nom].intro), `${nom}.intro`).toBe(true);
      expect(texte(accueil[nom].lien), `${nom}.lien`).toBe(true);
      expect(Array.isArray(accueil[nom].liste) && accueil[nom].liste.length > 0).toBe(true);
      for (const el of accueil[nom].liste) {
        for (const cle of ['id', 'icone', 'titre']) expect(texte(el[cle]), `${nom}.${cle}`).toBe(true);
        expect(el.familles.length).toBeGreaterThanOrEqual(1);
        for (const f of el.familles) expect(texte(f)).toBe(true);
      }
    }
    expect(texte(accueil.comment.titre)).toBe(true);
    expect(accueil.comment.liste.length).toBeGreaterThan(0);
    for (const etape of accueil.comment.liste) {
      expect(texte(etape.titre)).toBe(true);
      expect(texte(etape.texte)).toBe(true);
    }
  });
});

describe('clés des attributs de index.html', () => {
  it('chaque clé se résout : relative au premier élément dans un gabarit, globale ailleurs', () => {
    expect(modeles.map((m) => m.cle)).toEqual(['aleas.liste', 'protection.liste', 'comment.liste', 'reassurance.liste', 'preuve.chiffres', 'site.pied.colonnes']);

    const globales = cles(hors, 'data-texte|data-texte-global|data-lien|data-aria-label|data-placeholder');
    expect(globales.length).toBeGreaterThan(10);
    for (const [, cle] of globales) expect(() => resoudre(donnees, cle), cle).not.toThrow();

    for (const { cle, contenu } of modeles) {
      const source = cle.startsWith('site.')
        ? { site: { ...site, pied: { ...site.pied, colonnes: resoudrePied(site) } } }
        : accueil;
      const liste = validerListe(cle.split('.').reduce((o, k) => o[k], source), cle);
      const premier = liste[0];
      const interne = extraire(contenu);
      for (const [attribut, k] of cles(interne.hors, 'data-texte|data-icone')) {
        expect(() => resoudreDans(premier, k), `${attribut}="${k}"`).not.toThrow();
      }
      for (const [, k] of cles(interne.hors, 'data-texte-global|data-lien|data-aria-label|data-placeholder')) {
        expect(() => resoudre(donnees, k), k).not.toThrow();
      }
      for (const sous of interne.modeles) {
        const sousListe = validerListe(premier[sous.cle], sous.cle);
        for (const [, k] of cles(sous.contenu, 'data-texte')) {
          expect(() => resoudreDans(sousListe[0], k), k).not.toThrow();
        }
      }
    }
  });
});

describe('pictogrammes', () => {
  it('icone respecte /^[a-z0-9-]+$/ et désigne un symbole du sprite ; sprite sans hexadécimal ni script', () => {
    expect(symboles.length).toBeGreaterThanOrEqual(6);
    for (const nom of ['inondation', 'grele-vent', 'feu', 'chaleur', 'froid', 'chute']) expect(symboles).toContain(nom);
    for (const el of [...accueil.aleas.liste, ...accueil.protection.liste]) {
      expect(el.icone).toMatch(/^[a-z0-9-]+$/);
      expect(symboles, el.icone).toContain(el.icone);
    }
    expect(sprite).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(sprite).not.toMatch(/<script/i);
    expect(sprite).not.toMatch(/<text|<style/i);
  });
});

describe('rendu.js : résolution relative et validation de listes', () => {
  it('resoudreDans : clé simple, imbriquée, "." et clé absente', () => {
    expect(resoudreDans({ titre: 'T' }, 'titre')).toBe('T');
    expect(resoudreDans({ a: { b: 'B' } }, 'a.b')).toBe('B');
    expect(resoudreDans('Pompes', '.')).toBe('Pompes');
    expect(() => resoudreDans({ titre: 'T' }, 'texte')).toThrow(/Clé absente.*texte/);
    expect(() => resoudreDans({ titre: 'T' }, '.')).toThrow(/texte/);
    expect(() => resoudreDans('x', '')).toThrow(/vide/);
  });

  it('validerListe : refuse non-tableau, tableau vide et élément sans clé requise', () => {
    expect(validerListe([{ titre: 'a', texte: 'b' }], 'comment.liste')).toHaveLength(1);
    expect(() => validerListe({}, 'aleas.liste')).toThrow(/pas une liste/);
    expect(() => validerListe(undefined, 'aleas.liste')).toThrow(/pas une liste/);
    expect(() => validerListe([], 'aleas.liste')).toThrow(/vide/);
    expect(() => validerListe([{ titre: 'a' }], 'comment.liste')).toThrow(/« texte » absente/);
    expect(() => validerListe([{ id: 1 }], 'aleas.liste')).toThrow(/absente/);
    expect(() => validerListe([null], 'comment.liste')).toThrow(/absente/);
    expect(validerListe(['a', 'b'], 'familles')).toHaveLength(2);
  });
});

describe('liens et navigation', () => {
  it('les liens pointent vers des fichiers existants et les ancres vers un id de index.html', () => {
    for (const [nom, cible] of Object.entries(site.liens)) {
      if (cible.startsWith('#')) {
        expect(html, nom).toContain(`id="${cible.slice(1)}"`);
      } else {
        expect(existsSync(cible), cible).toBe(true);
      }
    }
  });

  it('en-tête : trois libellés dans l\'ordre (Aléas et Comment ça marche retirés), avec les bonnes cibles', () => {
    const nav = html.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
    const barre = html.match(/<a class="lien-entete entete__panier-barre" data-lien="([^"]+)"/)[1];
    const liens = [...nav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((li) => [
      /data-lien="site\.liens\.([a-z]+)"/.exec(li[1]),
      /data-texte="site\.navigation\.([a-z]+)"/.exec(li[1]),
    ]).map(([l, t]) => [l[1], t[1]]);
    expect(liens.map((m) => site.navigation[m[1]])).toEqual([
      'Vendre sur la plateforme', 'Mon compte', 'Panier',
    ]);
    expect(liens.map((m) => site.liens[m[0]])).toEqual([
      'wireframes/pro.html', 'wireframes/connexion.html', 'panier.html',
    ]);
    expect(resoudre(donnees, barre)).toBe('panier.html');
  });
});

describe('ordre des blocs de index.html', () => {
  it('en-tete < hero < recherche < aleas < protection < comment < avis, avec E1-1 à E1-6 et E1-9', () => {
    const attendu = [['en-tete', 'E1-1'], ['hero', 'E1-2'], ['recherche', 'E1-3'], ['aleas', 'E1-4'],
      ['protection', 'E1-5'], ['comment', 'E1-6'], ['avis', 'E1-9']];
    const index = attendu.map(([role, code]) => {
      const m = html.match(new RegExp(`data-bloc="${code}"[^>]*data-role="${role}"`));
      expect(m, role).not.toBeNull();
      return m.index;
    });
    expect(index).toEqual([...index].sort((x, y) => x - y));
    expect(html).toMatch(/<section[^>]*id="aleas"[^>]*tabindex="-1"/);
    expect(html).toMatch(/<section[^>]*id="comment"[^>]*tabindex="-1"/);
  });
});

describe('style des blocs (partie B)', () => {
  it('css/accueil.css et css/composants.css sans couleur hexadécimale ; index.html sans style= hors sprite', () => {
    for (const f of ['css/accueil.css', 'css/composants.css']) {
      expect(lire(f).replace(/\/\*[\s\S]*?\*\//g, ''), f).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
    expect(html.replace(sprite, '')).not.toMatch(/\sstyle=/i);
  });
});

describe('carrousel des aléas', () => {
  it('fleches visibles seulement si des cartes dépassent', () => {
    expect(flechesVisibles(900, 900)).toBe(false);
    expect(flechesVisibles(900, 1200)).toBe(true);
  });

  it('cibleDefilement : cyclique dans les deux sens', () => {
    // piste de 1200 px dont 900 visibles, pas de 300
    expect(cibleDefilement(1, 0, 900, 1200, 300)).toBe(300);
    expect(cibleDefilement(1, 300, 900, 1200, 300)).toBe(0);
    expect(cibleDefilement(-1, 0, 900, 1200, 300)).toBe(300);
    expect(cibleDefilement(-1, 300, 900, 1200, 300)).toBe(0);
    // pas plus grand que le reste : on s'arrête à la fin
    expect(cibleDefilement(1, 0, 900, 1500, 400)).toBe(400);
    expect(cibleDefilement(1, 400, 900, 1500, 400)).toBe(600);
    expect(cibleDefilement(1, 600, 900, 1500, 400)).toBe(0);
  });

  it('le titre des aléas et les libellés des flèches viennent des données', () => {
    expect(accueil.aleas.titre).toBe('À chaque aléa immobilier sa solution');
    expect(texte(accueil.aleas.precedent) && texte(accueil.aleas.suivant)).toBe(true);
    expect(html).toContain('data-aria-label="accueil.aleas.precedent"');
    expect(html).toContain('data-aria-label="accueil.aleas.suivant"');
  });
});

describe('comment ça marche (partie C)', () => {
  it('les trois étapes sont dans le gabarit d\'une liste ordonnée <ol>, numéro visuel aria-hidden', () => {
    expect(accueil.comment.liste).toHaveLength(3);
    const bloc = html.match(/<section[^>]*data-role="comment"[\s\S]*?<\/section>/)[0];
    expect(bloc).toMatch(/<ol class="etapes"[^>]*>\s*<template data-liste="comment\.liste">[\s\S]*<\/template>\s*<\/ol>/);
    expect(bloc).toMatch(/<span class="etape__numero" aria-hidden="true"><\/span>/);
    expect(bloc).toMatch(/<h3 data-texte="titre">/);
  });
});
