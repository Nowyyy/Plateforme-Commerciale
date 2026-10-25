import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { lireConventions } from './outils/conventions.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('produit.html');
const accueil = lire('index.html');
const batardeau = produit.produits.find((p) => p.id === 'batardeau-modulable');
const donnees = { produit, site };

describe('lot 7-A : CLAUDE.md et conventions', () => {
  it('CLAUDE.md fait au plus 9 000 caractères ; conventions.md existe, au plus 190 lignes, une rubrique par sujet', () => {
    expect(lire('CLAUDE.md').length).toBeLessThanOrEqual(9000);
    expect(existsSync('Docs/ref/conventions.md')).toBe(true);
    const conventions = lireConventions();
    expect(lire('Docs/ref/conventions.md').split('\n').length).toBeLessThanOrEqual(190);
    const titres = [...conventions.matchAll(/^## (.+)$/gm)].map((m) => m[1].toLowerCase());
    for (const sujet of ['diagnostic', 'fiche produit', 'cotes', 'liens externes', 'relief', 'listes et gabarits', 'pied et en-tête']) {
      expect(titres.some((t) => t.includes(sujet)), sujet).toBe(true);
    }
    expect(lire('CLAUDE.md')).toContain('Docs/ref/conventions.md');
  });
});

describe('lot 7-A : données', () => {
  it('seul le produit complet a specs (4 éléments) et documents (2 éléments)', () => {
    for (const p of produit.produits) {
      if (p.id !== batardeau.id) {
        expect(p.specs, p.id).toBeUndefined();
        expect(p.documents, p.id).toBeUndefined();
      }
    }
    expect(batardeau.specs).toHaveLength(4);
    for (const s of batardeau.specs) {
      for (const cle of ['id', 'icone', 'titre', 'valeur']) expect(s[cle]?.trim().length, `${s.id} ${cle}`).toBeGreaterThan(0);
      expect(s.valeur).toContain('exemple');
      expect(s.icone).toMatch(/^[a-z0-9-]+$/);
    }
    expect(batardeau.documents).toHaveLength(2);
    for (const d of batardeau.documents) {
      expect(d.format).toBe('PDF');
      expect(d.fichier.startsWith('assets/documents/')).toBe(true);
      expect(d.titre.trim().length).toBeGreaterThan(0);
      expect(d.aide.trim().length).toBeGreaterThan(0);
      expect(d.aide).toContain('exemple');
    }
  });

  it('objets de textes non vides', () => {
    const feuilles = (o) => Object.values(o).flatMap((v) => (typeof v === 'object' ? feuilles(v) : [v]));
    for (const objet of [produit.specifications, produit.documentsTextes]) {
      const textes = feuilles(objet);
      expect(textes.length).toBeGreaterThan(3);
      for (const t of textes) expect(t.trim().length).toBeGreaterThan(0);
    }
    expect(produit.documentsTextes.libelle).toBe('{titre} (PDF, exemple)');
  });

  it('le message des produits non complets mentionne spécifications et documents', () => {
    const message = produit.configurateur.nonComplet.message;
    expect(message).toContain('spécifications');
    expect(message).toContain('documents');
  });
});

describe('lot 7-A : produit.html', () => {
  it('codes E3-1 à E3-8 exactement une fois ; ordre mode < configurateur < specs < documents < pied ; aria-labelledby valides', () => {
    for (let i = 1; i <= 8; i += 1) expect(html.match(new RegExp(`data-bloc="E3-${i}"`, 'g')), `E3-${i}`).toHaveLength(1);
    const place = (role) => html.indexOf(`data-role="${role}"`);
    const ordre = ['en-tete', 'galerie', 'achat', 'mode', 'configurateur', 'specs', 'documents', 'pied'].map(place);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    expect(ordre.every((n) => n > 0)).toBe(true);
    for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const cible of id.split(' ')) expect(html.match(new RegExp(`id="${cible}"`, 'g')), cible).toHaveLength(1);
    }
    expect(html).not.toMatch(/order\s*:/);
  });

  it('les clés data-texte et data-liste-produit des deux nouveaux blocs se résolvent dans data/produit.json', () => {
    const debut = html.indexOf('data-role="specs"');
    const bloc = html.slice(html.lastIndexOf('<section', debut), html.indexOf('</main>'));
    const cles = [...bloc.matchAll(/data-texte="((?:produit|site)\.[^"]+)"/g)].map((m) => m[1]);
    expect(cles.length).toBeGreaterThanOrEqual(6);
    for (const cle of cles) expect(resoudre(donnees, cle).length, cle).toBeGreaterThan(0);
    for (const [, liste] of bloc.matchAll(/data-liste-produit="([^"]+)"/g)) {
      expect(Array.isArray(batardeau[liste]), liste).toBe(true);
    }
    expect(bloc).not.toMatch(/data-liste="/);
  });

  it('en-tête, pied et décor relief identiques à ceux d\'index.html', () => {
    const extraire = (source, motif) => source.match(motif)[0];
    for (const motif of [/<header class="entete"[\s\S]*?<\/header>/, /<footer class="pied"[\s\S]*?<\/footer>/, /<div class="relief"[\s\S]*?<\/svg>\s*<\/div>/]) {
      const normaliser = (t) => t.replace(/data-bloc="[^"]*" data-role="[^"]*"/g, '').replace(/\s+/g, ' ');
      expect(normaliser(extraire(html, motif))).toBe(normaliser(extraire(accueil, motif)));
    }
  });
});
