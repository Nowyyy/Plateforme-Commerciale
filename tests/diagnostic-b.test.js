import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { identifiantElement } from '../assets/js/rendu.js';
import { formaterPrix, segmentsJauge } from '../assets/js/diagnostic-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');

describe('segmentsJauge', () => {
  it('allume les segments jusqu\'au niveau (1 à 4) et borne les valeurs', () => {
    expect(segmentsJauge(1)).toEqual([true, false, false, false]);
    expect(segmentsJauge(2)).toEqual([true, true, false, false]);
    expect(segmentsJauge(3)).toEqual([true, true, true, false]);
    expect(segmentsJauge(4)).toEqual([true, true, true, true]);
    expect(segmentsJauge(0)).toEqual([false, false, false, false]);
    expect(segmentsJauge(9)).toEqual([true, true, true, true]);
    expect(segmentsJauge(NaN)).toEqual([false, false, false, false]);
    expect(segmentsJauge(2, 5)).toHaveLength(5);
  });
});

describe('formaterPrix', () => {
  it('écrit l\'entier, un séparateur de milliers fin insécable et « € » après une espace fine insécable', () => {
    expect(formaterPrix(349)).toBe('349 €');
    expect(formaterPrix(1250)).toBe('1 250 €');
    expect(formaterPrix(1234567)).toBe('1 234 567 €');
    expect(formaterPrix(Number.NaN)).toBe('');
  });
});

describe('data-id des éléments de liste (rendu.js)', () => {
  it('identifiantElement renvoie l\'id textuel, sinon null', () => {
    expect(identifiantElement({ id: 'inondations', titre: 'x' })).toBe('inondations');
    expect(identifiantElement({ titre: 'x' })).toBeNull();
    expect(identifiantElement({ id: '' })).toBeNull();
    expect(identifiantElement({ id: 3 })).toBeNull();
    expect(identifiantElement('texte')).toBeNull();
    expect(identifiantElement(null)).toBeNull();
  });

  it('le rendu pose data-id sur la racine de l\'élément à partir de cette fonction', () => {
    const source = lire('assets/js/rendu.js');
    expect(source).toMatch(/identifiantElement\(element\)/);
    expect(source).toContain("setAttribute('data-id', id)");
  });
});

describe('couleurs en dur', () => {
  it('css/diagnostic.css et css/composants.css sans valeur hexadécimale', () => {
    for (const fichier of ['css/diagnostic.css', 'css/composants.css']) {
      expect(lire(fichier), fichier).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});

describe('workflow publié', () => {
  const texte = lire('.github/workflows/pages.yml');
  const uses = (t) => t.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));

  it('publie diagnostic.html, déclare permissions: sans secrets. ni pull_request_target', () => {
    expect(texte.match(/for p in ([^;]+);/)?.[1].split(/\s+/)).toContain('diagnostic.html');
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
  });

  it('garde les mêmes lignes uses: que main', async () => {
    const { execFileSync } = await import('node:child_process');
    let principal;
    try {
      principal = execFileSync('git', ['show', 'origin/main:.github/workflows/pages.yml'], { encoding: 'utf8' });
    } catch {
      return; // dépôt sans origin/main (clone partiel) : comparaison impossible
    }
    expect(uses(texte)).toEqual(uses(principal));
  });
});
