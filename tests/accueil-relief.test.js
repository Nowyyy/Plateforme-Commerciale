import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = ['css/commun.css', 'css/accueil.css'].map((f) => readFileSync(f, 'utf8')).join('\n'); // règles partagées extraites au lot 10a
const tokens = readFileSync('css/tokens.css', 'utf8');
const relief = html.match(/<div class="relief" aria-hidden="true">[\s\S]*?\n {2}<\/div>\n/)[0];

describe('relief décoratif (lot 3c-B)', () => {
  it('un seul .relief aria-hidden, premier enfant de body, avec 2 svg (6 puis 5 use), sans texte, hexadécimal ni script', () => {
    expect(html.match(/class="relief"/g)).toHaveLength(1);
    expect(html).toMatch(/<body>\s*<div class="relief" aria-hidden="true">/);
    const svgs = relief.match(/<svg[\s\S]*?<\/svg>/g);
    expect(svgs).toHaveLength(2);
    expect(svgs[0].match(/<use href="#relief-blob"/g)).toHaveLength(6);
    expect(svgs[1].match(/<use href="#relief-blob"/g)).toHaveLength(5);
    expect(svgs[0]).toContain('id="relief-blob"');
    for (const svg of svgs) {
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('fill="none"');
      expect(svg).toContain('stroke-width="1"');
    }
    expect(relief.replace(/<[^>]*>/g, '').trim()).toBe('');
    expect(relief).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
    expect(relief).not.toMatch(/<script/i);
  });

  it('--color-relief est un jeton ; le conteneur est non interactif et le groupe 2 masqué sous 768 px', () => {
    expect(tokens).toMatch(/--color-relief:\s*color-mix\(in srgb,\s*var\(--color-navy\)\s*10%,\s*transparent\)/);
    const conteneur = css.match(/\n\.relief\s*\{[^}]*\}/)[0];
    expect(conteneur).toContain('pointer-events: none');
    expect(conteneur).toContain('position: absolute');
    expect(conteneur).toContain('inset: 0');
    expect(conteneur).toContain('overflow: hidden');
    expect(conteneur).toContain('color: var(--color-relief)');
    expect(css).toMatch(/\.relief__groupe--2\s*\{[^}]*display: none/);
    expect(css).toMatch(/@media \(min-width: 768px\)\s*\{[^@]*\.relief__groupe--2\s*\{[^}]*display: block/);
  });

  it('le message d\'erreur de la recherche n\'a plus de réserve de hauteur', () => {
    const erreur = css.match(/\n\.recherche__erreur\s*\{[^}]*\}/)[0];
    expect(erreur).not.toMatch(/min-block-size/);
  });
});
