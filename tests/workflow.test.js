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
