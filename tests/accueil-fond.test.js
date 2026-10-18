import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const tokens = readFileSync('css/tokens.css', 'utf8');
const css = readFileSync('css/accueil.css', 'utf8');
const html = readFileSync('index.html', 'utf8');

describe('fond de page unique et hero fondu (lot 3c-A)', () => {
  it('le dégradé du hero se termine par le jeton de fond de page, défini dans tokens.css', () => {
    expect(tokens).toMatch(/--color-bg:\s*#f8fafc;/i);
    expect(tokens).toMatch(/--color-hero-debut:\s*#[0-9a-f]{6};/i);
    expect(tokens).not.toContain('--color-hero-fin');
    expect(css).toMatch(/\.hero\s*\{[^}]*linear-gradient\(180deg,\s*var\(--color-hero-debut\),\s*var\(--color-bg\)\)/);
  });

  it('les sections n\'ont plus de fond propre : plus de classes bloc--blanc / bloc--clair, avis sans fond', () => {
    expect(css).not.toMatch(/bloc--(?:blanc|clair)/);
    expect(html).not.toMatch(/bloc--(?:blanc|clair)/);
    const avis = css.match(/\n\.avis\s*\{[^}]*\}/)[0];
    expect(avis).not.toContain('background');
  });

  it('pastilles, chiffres et logo d\'avis reposent sur le jeton blanc à bordure fine', () => {
    for (const sel of ['\\.pastille', '\\.chiffre', '\\.avis__logo']) {
      const bloc = css.match(new RegExp(`\\n${sel}\\s*\\{[^}]*\\}`))[0];
      expect(bloc).toContain('background: var(--color-card)');
      expect(bloc).toContain('border: 1px solid var(--color-border)');
    }
  });
});
