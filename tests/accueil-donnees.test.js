import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { extraire } from './outils/gabarits.mjs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const donnees = {
  site: JSON.parse(lire('data/site.json')),
  accueil: JSON.parse(lire('data/accueil.json')),
};
const html = lire('index.html');

describe('données de l\'accueil', () => {
  it('site.json et accueil.json sont du JSON valide ; les liens pointent vers des fichiers existants', () => {
    for (const cible of Object.values(donnees.site.liens).filter((c) => !c.startsWith('#'))) {
      expect(existsSync(cible), cible).toBe(true);
    }
    expect(Object.keys(donnees.site.liens)).toEqual(expect.arrayContaining(['accueil', 'diagnostic', 'panier']));
  });

  it('toute clé data-texte, data-lien, data-aria-label et data-placeholder existe dans les données', () => {
    const cles = [...extraire(html).hors.matchAll(/data-(?:texte|lien|aria-label|placeholder)="([^"]+)"/g)].map((m) => m[1]);
    expect(cles.length).toBeGreaterThan(10);
    for (const cle of cles) {
      expect(() => resoudre(donnees, cle), cle).not.toThrow();
    }
  });
});

describe('index.html', () => {
  it('a lang="fr", noindex, un seul h1, aucune URL http(s) ni script externe', () => {
    expect(html).toContain('<html lang="fr">');
    expect(html).toMatch(/<meta name="robots" content="noindex">/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<script[^>]+src="(?:https?:)?\/\//i);
  });

  it('assets/js/*.js ne contient aucune URL http(s)', () => {
    for (const f of readdirSync('assets/js').filter((n) => n.endsWith('.js'))) {
      expect(lire(`assets/js/${f}`), f).not.toMatch(/https?:\/\//i);
    }
  });

  it('les blocs portent data-bloc et data-role, dans l\'ordre relatif en-tete < hero < recherche < avis', () => {
    const attendu = { 'en-tete': 'E1-1', hero: 'E1-2', recherche: 'E1-3', avis: 'E1-9' };
    const index = [];
    for (const [role, code] of Object.entries(attendu)) {
      const m = html.match(new RegExp(`data-bloc="${code}"[^>]*data-role="${role}"`));
      expect(m, role).not.toBeNull();
      index.push(m.index);
    }
    expect(index).toEqual([...index].sort((x, y) => x - y));
  });
});

describe('rendu.js : résolution de clés', () => {
  const d = { site: { nom: 'X', liens: { panier: 'p.html' } }, nombre: 3 };

  it('clé existante', () => {
    expect(resoudre(d, 'site.nom')).toBe('X');
  });

  it('clé imbriquée', () => {
    expect(resoudre(d, 'site.liens.panier')).toBe('p.html');
  });

  it('clé absente : erreur claire', () => {
    expect(() => resoudre(d, 'site.inconnue')).toThrow(/Clé absente.*site\.inconnue/);
    expect(() => resoudre(d, 'site.nom.x')).toThrow(/Clé absente/);
  });

  it('clé vide ou valeur qui n\'est pas un texte : erreur', () => {
    expect(() => resoudre(d, '')).toThrow(/vide/);
    expect(() => resoudre(d, 'site.liens')).toThrow(/pas un texte/);
    expect(() => resoudre(d, 'nombre')).toThrow(/pas un texte/);
  });
});

describe('hero et avis (partie B)', () => {
  const { hero, avis } = donnees.accueil;

  it('les textes du hero et des avis sont présents et non vides ; « exemple » dans la légende et le libellé des avis', () => {
    for (const texte of [hero.titre, hero.accroche, hero.illustration.legende, hero.illustration.titre, hero.illustration.description, avis.note, avis.nombre]) {
      expect(typeof texte).toBe('string');
      expect(texte.trim().length).toBeGreaterThan(0);
    }
    expect(hero.illustration.legende.toLowerCase()).toContain('exemple');
    expect(avis.nombre.toLowerCase()).toContain('exemple');
  });

  it('le SVG en ligne n\'a aucune valeur hexadécimale ; role="img", title et desc liés par clés', () => {
    const svg = html.match(/<svg class="illustration"[\s\S]*?<\/svg>/)[0];
    expect(svg.replace(/url\("?#hachure"?\)|href="#[a-z-]+"/g, '')).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<title id="illu-titre" data-texte="accueil\.hero\.illustration\.titre">/);
    expect(svg).toMatch(/<desc id="illu-desc" data-texte="accueil\.hero\.illustration\.description">/);
    expect(svg).toContain('aria-labelledby="illu-titre illu-desc"');
    // aucun autre texte dans le SVG
    expect(svg.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, '')).not.toMatch(/>[^<\s][^<]*</);
  });
});
