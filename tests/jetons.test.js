import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const tokens = readFileSync('css/tokens.css', 'utf8');

function fichiers(dossier, exts) {
  return readdirSync(dossier).flatMap((nom) => {
    if (['node_modules', '.git', 'Docs', 'test-results', '.lighthouseci'].includes(nom)) return [];
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin, exts);
    return exts.some((e) => nom.endsWith(e)) ? [chemin] : [];
  });
}

describe('jetons de design', () => {
  it('tokens.css définit les couleurs et polices attendues', () => {
    const attendu = {
      '--color-navy': '#0f1d38',
      '--color-green': '#1b4332',
      '--color-bg': '#f8fafc',
      '--color-amber': '#d97706',
    };
    for (const [nom, valeur] of Object.entries(attendu)) {
      expect(tokens.toLowerCase()).toContain(`${nom}: ${valeur}`);
    }
    expect(tokens).toMatch(/--font-heading:[^;]*Plus Jakarta Sans/);
    expect(tokens).toMatch(/--font-data:[^;]*Inter/);
  });

  it('aucune valeur hexadécimale de couleur hors de css/tokens.css', () => {
    const hex = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
    const fautifs = fichiers('.', ['.css', '.html'])
      .filter((f) => f.replaceAll('\\', '/') !== 'css/tokens.css')
      .filter((f) => hex.test(readFileSync(f, 'utf8')));
    expect(fautifs).toEqual([]);
  });
});

describe('page d\'attente', () => {
  const html = readFileSync('index.html', 'utf8');

  it('a lang="fr", un title, un seul h1 et le bandeau démonstrateur', () => {
    expect(html).toContain('lang="fr"');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html.toLowerCase()).toContain('démonstrateur');
  });

  it('ne contient ni script ni lien externe', () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(?:href|src)="(?:https?:)?\/\//i);
  });
});
