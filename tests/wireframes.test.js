import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const PAGES = ['index', 'accueil', 'diagnostic', 'produit', 'panier'];
const lire = (nom) => readFileSync(`wireframes/${nom}.html`, 'utf8');

describe('wireframes : socle', () => {
  it('les 5 pages ont lang="fr", noindex, un seul h1 et le bandeau démonstrateur', () => {
    for (const nom of PAGES) {
      const html = lire(nom);
      expect(html, nom).toContain('<html lang="fr">');
      expect(html, nom).toContain('<meta name="robots" content="noindex">');
      expect(html.match(/<h1[\s>]/g), nom).toHaveLength(1);
      expect(html, nom).toContain('Démonstrateur : contenus fictifs, aucune vente');
      expect(html, nom).toContain('aria-label="Revue des wireframes"');
    }
  });

  it('aucun <script ni URL http(s):// dans wireframes/*.html et css/wireframe.css', () => {
    const fichiers = readdirSync('wireframes')
      .filter((f) => f.endsWith('.html'))
      .map((f) => `wireframes/${f}`)
      .concat('css/wireframe.css');
    for (const f of fichiers) {
      const texte = readFileSync(f, 'utf8');
      expect(texte, f).not.toMatch(/<script/i);
      expect(texte, f).not.toMatch(/https?:\/\//i);
    }
  });

  it('tous les liens relatifs des 5 pages pointent vers des fichiers existants', () => {
    for (const nom of PAGES) {
      const html = lire(nom);
      const cibles = [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
      for (const cible of cibles) {
        if (cible.startsWith('data:') || cible.startsWith('#')) continue;
        const chemin = normalize(join(dirname(`wireframes/${nom}.html`), cible.split('#')[0]));
        expect(existsSync(chemin), `${nom} -> ${cible}`).toBe(true);
      }
    }
  });

  it('le workflow publie wireframes, déclare permissions: et évite secrets. et pull_request_target', () => {
    const texte = readFileSync('.github/workflows/pages.yml', 'utf8');
    expect(texte).toMatch(/cp -r [^\n]*\bwireframes\b/);
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
  });
});
