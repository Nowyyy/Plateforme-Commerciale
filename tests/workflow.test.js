import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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
  it('publie attente.html, index.html, accueil.html, css, data et assets', () => {
    const texte = readFileSync('.github/workflows/pages.yml', 'utf8');
    const liste = texte.match(/for p in ([^;]+);/)?.[1].split(/\s+/);
    expect(liste).toEqual(expect.arrayContaining(['index.html', 'accueil.html', 'attente.html', 'css', 'data', 'assets', 'wireframes']));
  });
});

describe('Docs/apercus.txt (laissé en place, plus lu par le workflow depuis le lot 2b)', () => {
  it('décrit chaque lot (lot-N|texte)', () => {
    const lignes = readFileSync('Docs/apercus.txt', 'utf8').split('\n').filter(Boolean);
    for (const ligne of lignes) expect(ligne).toMatch(/^lot-\d+[a-z]?\|[^|]{10,}$/);
    const lots = lignes.map((l) => l.split('|')[0]);
    expect(lots).toEqual(expect.arrayContaining(['lot-0', 'lot-1', 'lot-2']));
    expect(new Set(lots).size).toBe(lots.length);
  });
});

const lignesUses = (texte) => texte.split('\n').map((l) => l.trim()).map((l) => l.replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
const workflow = () => readFileSync('.github/workflows/pages.yml', 'utf8');

describe('workflow : page Lots (lot 2b)', () => {
  it('appelle scripts/lots/generer.mjs, en étape tolérante, sans l\'ancienne génération', () => {
    const texte = workflow();
    expect(texte).toContain('scripts/lots/generer.mjs');
    expect(texte).toMatch(/continue-on-error: true\s+run: node scripts\/lots\/generer\.mjs/);
    expect(texte).not.toContain('Aperçus par lot');
    expect(texte).toContain('fetch-depth: 0');
  });
  it('aucun droit ajouté : les mêmes permissions que le lot 2', () => {
    const texte = workflow();
    expect(texte).toContain('permissions:');
    expect(texte.match(/^\s+(contents|pages|id-token): \w+$/gm).map((l) => l.trim())).toEqual([
      'contents: read', 'contents: read', 'pages: write', 'id-token: write',
    ]);
  });
  it('YAML valide : aucun nom d\'étape non guillemeté ne contient « : »', () => {
    // une valeur simple contenant « : » casse tout le fichier (le run ne démarre aucun job)
    for (const [, valeur] of workflow().matchAll(/^\s*(?:- )?name: (.+)$/gm)) {
      if (!/^["']/.test(valeur)) expect(valeur, valeur).not.toMatch(/: |:$/);
    }
  });
  it('lignes uses: inchangées', () => {
    expect(lignesUses(workflow())).toEqual([
      'uses: actions/checkout@v4', 'uses: actions/setup-node@v4', 'uses: actions/checkout@v4',
      'uses: actions/configure-pages@v5', 'uses: actions/upload-pages-artifact@v3', 'uses: actions/deploy-pages@v4',
    ]);
  });
  let main = null;
  try {
    main = execFileSync('git', ['show', 'origin/main:.github/workflows/pages.yml'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* clone superficiel : origin/main absent */ }
  it.skipIf(main === null)('lignes uses: identiques à celles de origin/main', () => {
    expect(lignesUses(workflow())).toEqual(lignesUses(main));
  });
});
