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

function bloc(html, code) {
  const debut = html.indexOf(`data-bloc="${code}"`);
  const fin = html.indexOf('data-bloc="', debut + 1);
  return html.slice(debut, fin === -1 ? html.length : fin);
}

function exactementUneFois(html, codes) {
  for (const code of codes) {
    expect(html.split(`data-bloc="${code}"`).length - 1, code).toBe(1);
  }
}

describe('wireframes : accueil et diagnostic', () => {
  const accueil = lire('accueil');
  const diagnostic = lire('diagnostic');

  it('accueil contient exactement une fois chacun des codes E1-1 à E1-8', () => {
    exactementUneFois(accueil, Array.from({ length: 8 }, (_, i) => `E1-${i + 1}`));
  });

  it('diagnostic contient exactement une fois E2-1 à E2-6, et E2-5 contient 3 cartes', () => {
    exactementUneFois(diagnostic, Array.from({ length: 6 }, (_, i) => `E2-${i + 1}`));
    const e25 = bloc(diagnostic, 'E2-5');
    expect(e25.match(/<li class="wf-carte"/g)).toHaveLength(3);
  });

  it('E1-5 a les 4 aléas et un lien vers diagnostic.html par carte ; E1-3 a un lien vers diagnostic.html', () => {
    const e15 = bloc(accueil, 'E1-5');
    for (const titre of ['Inondations et crues', 'Grêle et vents violents', 'Feux de forêt', 'Canicule et chaleur extrême']) {
      expect(e15).toContain(`<h3>${titre}</h3>`);
    }
    const cartes = e15.split('<li class="wf-carte"').slice(1);
    expect(cartes).toHaveLength(4);
    for (const carte of cartes) expect(carte).toContain('href="diagnostic.html"');
    expect(bloc(accueil, 'E1-3')).toContain('href="diagnostic.html"');
  });
});
