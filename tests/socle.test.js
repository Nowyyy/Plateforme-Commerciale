import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('socle du dépôt', () => {
  it('CLAUDE.md existe et fait au plus 10 000 caractères', () => {
    expect(existsSync('CLAUDE.md')).toBe(true);
    expect(readFileSync('CLAUDE.md', 'utf8').length).toBeLessThanOrEqual(10000);
  });

  it('.gitignore contient node_modules, dist et .env', () => {
    const lignes = readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.trim());
    for (const entree of ['node_modules', 'dist', '.env']) {
      expect(lignes).toContain(entree);
    }
  });
});
