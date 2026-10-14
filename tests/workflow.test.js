import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('workflow de publication', () => {
  it('existe, déclare permissions: et n\'utilise ni secrets. ni pull_request_target', () => {
    const chemin = '.github/workflows/pages.yml';
    expect(existsSync(chemin)).toBe(true);
    const texte = readFileSync(chemin, 'utf8');
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
  });
});

describe('workflow : chemins publiés', () => {
  it('publie accueil.html, css, data et assets', () => {
    const texte = readFileSync('.github/workflows/pages.yml', 'utf8');
    const liste = texte.match(/for p in ([^;]+);/)?.[1].split(/\s+/);
    expect(liste).toEqual(expect.arrayContaining(['index.html', 'accueil.html', 'css', 'data', 'assets', 'wireframes']));
  });
});
