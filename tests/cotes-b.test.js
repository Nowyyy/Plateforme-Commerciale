import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('produit.html');
const produit = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const debut = html.indexOf('data-role="configurateur"');
const bloc = html.slice(debut, html.indexOf('</section>', debut));
const svg = bloc.slice(bloc.indexOf('<svg class="schema"'), bloc.indexOf('</svg>', bloc.indexOf('<svg class="schema"')) + 6);
const COULEUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

describe('schéma du configurateur', () => {
  it('est un SVG role="img" avec title et desc, trois groupes de cotes et trois lettres liées aux données', () => {
    expect(svg).toMatch(/^<svg[^>]*role="img"/);
    expect(svg).toMatch(/viewBox="0 0 400 300"/);
    expect(svg).toMatch(/<title[^>]*data-texte="produit\.configurateur\.schema\.title"/);
    expect(svg).toMatch(/<desc[^>]*data-texte="produit\.configurateur\.schema\.desc"/);
    for (const cote of ['cote-a', 'cote-b', 'cote-c']) expect(svg, cote).toContain(`<g id="${cote}"`);
    const textes = svg.match(/<text[^>]*>/g);
    expect(textes).toHaveLength(3);
    for (const t of textes) expect(t).toContain('data-texte="produit.configurateur.schema.lettres.');
    expect(svg).not.toMatch(/<text[^>]*>[^<]+<\/text>/);
    expect(svg).not.toMatch(COULEUR);
    expect(svg).not.toContain('<script');
    expect(svg).not.toMatch(/\son[a-z]+=/);
    expect(Object.values(produit.configurateur.schema.lettres)).toEqual(['A', 'B', 'C']);
  });
});

describe('feuilles de style et formulaire du bloc', () => {
  it('css/produit.css et css/composants.css ne contiennent aucune couleur en dur', () => {
    for (const fichier of ['css/produit.css', 'css/composants.css']) expect(lire(fichier), fichier).not.toMatch(COULEUR);
  });

  it('chaque champ a un label, des aides reliées et les attributs de saisie numérique', () => {
    const champs = [...bloc.matchAll(/<input[^>]*>/g)].map((m) => m[0]);
    expect(champs).toHaveLength(3);
    for (const champ of champs) {
      const id = champ.match(/id="([^"]+)"/)[1];
      expect(bloc, id).toMatch(new RegExp(`<label[^>]*for="${id}"`));
      expect(champ).toContain('type="text"');
      expect(champ).toContain('inputmode="numeric"');
      expect(champ).toContain('autocomplete="off"');
      for (const ref of champ.match(/aria-describedby="([^"]+)"/)[1].split(' ')) expect(bloc, ref).toContain(`id="${ref}"`);
    }
    expect(bloc).toMatch(/<fieldset[^>]*>\s*<legend/);
  });

  it('« Où mesurer » est une liste ordonnée de trois éléments pilotée par les données', () => {
    expect(bloc).toMatch(/<ol class="etapes" aria-labelledby="titre-etapes"/);
    expect(bloc).toContain('<template data-liste="configurateur.etapes">');
    expect(produit.configurateur.etapes.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(bloc.match(/<li class="etapes__item"/g)).toHaveLength(1); // gabarit unique : 3 éléments rendus depuis les données
  });
});

describe('textes du bloc', () => {
  it('toute clé data-texte du bloc se résout ; états et erreurs non vides', () => {
    const donnees = { site, produit };
    const echecs = [];
    for (const [, , cle] of [...bloc.matchAll(/data-(texte|lien|aria-label)="([^"]+)"/g)].filter((m) => /^(site|produit)\./.test(m[2]))) {
      try { resoudre(donnees, cle); } catch { echecs.push(cle); }
    }
    expect(echecs).toEqual([]);
    const { etats, erreurs, ecarts } = produit.configurateur;
    for (const etat of ['saisir', 'compatible', 'hors']) {
      expect(etats[etat].titre.trim()).not.toBe('');
      expect(etats[etat].texte.trim()).not.toBe('');
    }
    expect(erreurs.nombre.trim()).not.toBe('');
    expect(erreurs.toleranceMax).toContain('{max}');
    expect(Object.keys(ecarts)).toEqual(['largeur', 'hauteur']);
  });
});
