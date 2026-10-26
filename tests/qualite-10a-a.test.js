// Lot 10a-A : documentation (plafonds, index, règles lues par les tests), empreinte (structure), outils sans dépendance, qualite.md.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { DOSSIER_CONVENTIONS, fichiersConventions } from './outils/conventions.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const PAGES = ['index', 'diagnostic', 'produit', 'panier', 'pro', 'connexion', 'compte', 'achats', 'achat', 'informations', 'sav-acces', 'sav', 'demandes', 'comparateur'];
const lignes = (texte) => texte.replace(/\n$/, '').split('\n').length;

describe('lot 10a-A : documentation', () => {
  it('CLAUDE.md fait 7 500 caractères au plus', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThanOrEqual(7500);
  });
  it('conventions.md est un index de 40 lignes au plus qui référence chaque fichier du dossier, et inversement ; chaque fichier fait 150 lignes au plus', () => {
    const index = lire('Docs/ref/conventions.md');
    expect(lignes(index)).toBeLessThanOrEqual(40);
    const fichiers = fichiersConventions();
    expect(fichiers.length).toBeGreaterThanOrEqual(7);
    for (const sujet of ['generales', 'accueil', 'diagnostic', 'produit', 'panier', 'formulaires', 'comparateur']) expect(fichiers, sujet).toContain(`${sujet}.md`);
    for (const f of fichiers) {
      expect(index, f).toContain(`${DOSSIER_CONVENTIONS}/${f}`);
      expect(lignes(lire(`${DOSSIER_CONVENTIONS}/${f}`)), f).toBeLessThanOrEqual(150);
    }
    for (const [, f] of index.matchAll(/Docs\/ref\/conventions\/([\w-]+\.md)/g)) expect(existsSync(`${DOSSIER_CONVENTIONS}/${f}`), f).toBe(true);
  });
  it('chaque règle lue par un test existe encore là où le test la lit', () => {
    const claude = lire('CLAUDE.md');
    const motsClaude = ['sav-acces.html', 'sav.html', 'demandes.html', 'acces-sav', 'resoudreContexte', 'sav.css', 'Envoyer ma demande', 'Continuer', '`CMD-` suivi de 3 à 8 chiffres',
      'comparateur.html', 'comparateur-logique.js', 'comparateur.js', 'comparateur.css', 'comparaison', 'selectionInitiale', 'basculerProduit', 'performances',
      'connexion.html', 'compte.json', 'compte-lien.js', 'Compte simulé', 'Se connecter', 'Formulaires simulés', 'Docs/ref/conventions.md', 'Docs/ref/conventions/', 'empreinte.e2e.js', 'npm run empreinte:maj'];
    for (const mot of motsClaude) expect(claude, mot).toContain(mot);
    const conventions = readdirSync(DOSSIER_CONVENTIONS).map((f) => lire(`${DOSSIER_CONVENTIONS}/${f}`)).join('\n');
    for (const section of [/^## SAV/m, /^## Comparateur/m, /^## Compte/m, /^## Formulaires/m]) expect(conventions).toMatch(section);
    expect(conventions).toContain('champs[x].focus');
    const titres = [...conventions.matchAll(/^## (.+)$/gm)].map((m) => m[1].toLowerCase());
    for (const sujet of ['diagnostic', 'fiche produit', 'cotes', 'liens externes', 'relief', 'listes et gabarits', 'pied et en-tête']) expect(titres.some((t) => t.includes(sujet)), sujet).toBe(true);
  });
  it('chaque fichier de Docs/ref/conventions/ a un titre et aucune règle (ligne de plus de 80 caractères) n\'est dupliquée mot pour mot', () => {
    const vues = new Map();
    const doublons = [];
    for (const f of fichiersConventions()) {
      const texte = lire(`${DOSSIER_CONVENTIONS}/${f}`);
      expect(texte.split('\n')[0], f).toMatch(/^# \S/);
      for (const l of texte.split('\n')) {
        if (l.length <= 80) continue;
        if (vues.has(l)) doublons.push(`${vues.get(l)} / ${f} : ${l.slice(0, 60)}`);
        else vues.set(l, f);
      }
    }
    expect(doublons).toEqual([]);
  });
  it('Docs/ref/qualite.md existe et fait 80 lignes au plus', () => {
    expect(existsSync('Docs/ref/qualite.md')).toBe(true);
    expect(lignes(lire('Docs/ref/qualite.md'))).toBeLessThanOrEqual(80);
  });
});

describe('lot 10a-A : empreinte de mise en page', () => {
  const sansGabarits = (html) => html.replace(/<template[\s\S]*?<\/template>/g, '');
  it('un fichier par page Hi-Fi : 375, 768 et 1440 px, repères et rôles statiques présents, rectangles de quatre entiers', () => {
    for (const nom of PAGES) {
      const empreinte = JSON.parse(lire(`tests/empreintes/${nom}.json`));
      expect(empreinte.page).toBe(`${nom}.html`);
      expect(Object.keys(empreinte.largeurs)).toEqual(['375', '768', '1440']);
      const rolesStatiques = [...new Set([...sansGabarits(lire(`${nom}.html`)).matchAll(/data-role="([^"]+)"/g)].map((m) => m[1]))];
      expect(rolesStatiques.length, nom).toBeGreaterThan(0);
      for (const largeur of Object.keys(empreinte.largeurs)) {
        const mesures = empreinte.largeurs[largeur];
        for (const repere of ['header', 'main', 'footer']) expect(mesures, `${nom} ${largeur} ${repere}`).toHaveProperty(`repere:${repere}`);
        for (const role of rolesStatiques) expect(mesures, `${nom} ${largeur} ${role}`).toHaveProperty(`role:${role}`);
        for (const rect of Object.values(mesures)) {
          expect(rect).toHaveLength(4);
          for (const v of rect) expect(Number.isInteger(v)).toBe(true);
        }
      }
    }
  });
});

describe('lot 10a-A : outils sans dépendance', () => {
  it('package.json ne gagne que des scripts (matrice, empreinte:maj) ; les outils n\'importent que Node, Playwright, Lighthouse, puppeteer-core et des fichiers locaux', () => {
    const paquet = JSON.parse(lire('package.json'));
    expect(Object.keys(paquet.devDependencies).sort()).toEqual(['@axe-core/playwright', '@eslint/js', '@playwright/test', 'eslint', 'globals', 'leaflet', 'lighthouse', 'vitest']);
    expect(paquet.dependencies).toBeUndefined();
    expect(paquet.scripts['empreinte:maj']).toBe('node tests/outils/empreinte.mjs');
    expect(paquet.scripts.matrice).toBe('node tests/outils/matrice-lighthouse.mjs');
    for (const f of ['empreinte.mjs', 'matrice-lighthouse.mjs', 'cls-matrice.mjs', 'mesures-pages.mjs', 'etats-pages.mjs']) {
      const imports = [...lire(`tests/outils/${f}`).matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
      for (const i of imports) expect(i.startsWith('.') || i.startsWith('node:') || ['@playwright/test', 'puppeteer-core', 'lighthouse'].includes(i), `${f} : ${i}`).toBe(true);
    }
  });
});
