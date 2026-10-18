import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const lire = (f) => readFileSync(f, 'utf8');

function fichiers(dossier, extensions) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin, extensions);
    return extensions.some((e) => nom.endsWith(e)) ? [chemin] : [];
  });
}

describe('index.html (accueil Hi-Fi)', () => {
  it('porte les blocs en-tete, hero, recherche, aleas, protection, comment, avis dans cet ordre relatif', () => {
    const html = lire('index.html');
    const positions = ['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'avis']
      .map((role) => html.indexOf(`data-role="${role}"`));
    for (const p of positions) expect(p).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe('accueil.html (redirection)', () => {
  const html = lire('accueil.html');
  it('redirige vers index.html, noindex, un seul h1', () => {
    expect(html).toContain('lang="fr"');
    expect(html).toMatch(/<meta http-equiv="refresh" content="0; url=index\.html">/);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('href="index.html"');
  });
  it('sans script ni URL http(s)', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//i);
  });
});

describe('attente.html (ancienne page d\'attente)', () => {
  const html = lire('attente.html');
  it('a lang="fr", un seul h1 et le bandeau démonstrateur', () => {
    expect(html).toContain('lang="fr"');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.toLowerCase()).toContain('démonstrateur');
  });
  it('wireframes/index.html renvoie vers ../attente.html', () => {
    expect(lire('wireframes/index.html')).toContain('href="../attente.html"');
  });
});

describe('références à accueil.html', () => {
  it('aucune dans data/, assets/, css/ ni scripts/', () => {
    const fautifs = ['data', 'assets', 'css', 'scripts']
      .flatMap((d) => fichiers(d, ['.json', '.js', '.mjs', '.css', '.html']))
      .filter((f) => /accueil\.html/.test(lire(f)));
    expect(fautifs).toEqual([]);
  });
  it('data/site.json : liens.accueil vaut index.html', () => {
    expect(JSON.parse(lire('data/site.json')).liens.accueil).toBe('index.html');
  });
});

describe('workflow : publication des pages de la racine', () => {
  const texte = lire('.github/workflows/pages.yml');
  it('publie attente.html, index.html et accueil.html', () => {
    const liste = texte.match(/for p in ([^;]+);/)?.[1].split(/\s+/);
    expect(liste).toEqual(expect.arrayContaining(['attente.html', 'index.html', 'accueil.html']));
  });
  it('permissions: présent, ni secrets. ni pull_request_target', () => {
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
  });
});
