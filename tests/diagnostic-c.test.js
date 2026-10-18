import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { lienExterneValide } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const html = lire('diagnostic.html');
const svg = html.slice(html.indexOf('<svg class="schema"'), html.indexOf('</svg>', html.indexOf('<svg class="schema"')) + 6);

describe('carte schématique (SVG en ligne)', () => {
  it('est une image nommée, à quatre calques et quatre motifs, sans couleur en dur, texte ni script', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<title id="schema-titre" data-texte="diagnostic\.textes\.carte\.svgTitre">/);
    expect(svg).toMatch(/<desc id="schema-desc" data-texte="diagnostic\.textes\.carte\.svgDescription">/);
    expect(svg).toContain('aria-labelledby="schema-titre schema-desc"');
    expect(svg.match(/<g class="calque" data-calque="[a-z]+"/g)).toHaveLength(4);
    const motifs = [...svg.matchAll(/<pattern id="(motif-[a-z]+)"/g)].map((m) => m[1]);
    expect(new Set(motifs).size).toBe(4);
    for (const id of motifs) expect(svg).toContain(`url(#${id})`);
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6,8}\b/);
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('<text');
    const sansBalises = svg.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, '').replace(/<[^>]+>/g, '');
    expect(sansBalises.trim()).toBe('');
    expect(svg).not.toMatch(/style="/);
  });
});

describe('jetons des calques', () => {
  it('css/tokens.css définit les quatre jetons --calque-*', () => {
    const tokens = lire('css/tokens.css');
    for (const nom of ['inondation', 'argile', 'feu', 'chaleur']) {
      expect(tokens, nom).toMatch(new RegExp(`--calque-${nom}:\\s*#[0-9a-fA-F]{6};`));
    }
  });
});

describe('liens externes', () => {
  it('liensExternes.georisques : https et hôte georisques.gouv.fr ou sous-domaine, sans paramètre', () => {
    const adresse = site.liensExternes.georisques;
    expect(adresse.startsWith('https://')).toBe(true);
    const hote = new URL(adresse).hostname;
    expect(hote === 'georisques.gouv.fr' || hote.endsWith('.georisques.gouv.fr') || hote === 'www.georisques.gouv.fr').toBe(true);
    expect(new URL(adresse).search).toBe('');
    expect(lienExterneValide(adresse)).toBe(true);
  });

  it('lienExterneValide refuse http, un autre domaine, une adresse relative et les caractères de contrôle', () => {
    expect(lienExterneValide('https://www.georisques.gouv.fr/')).toBe(true);
    expect(lienExterneValide('https://georisques.gouv.fr/risques')).toBe(true);
    expect(lienExterneValide('http://www.georisques.gouv.fr/')).toBe(false);
    expect(lienExterneValide('https://exemple.org/')).toBe(false);
    expect(lienExterneValide('https://georisques.gouv.fr.exemple.org/')).toBe(false);
    expect(lienExterneValide('https://exemple.org/georisques.gouv.fr')).toBe(false);
    expect(lienExterneValide('https://notgeorisques.gouv.fr/')).toBe(false);
    expect(lienExterneValide('https://utilisateur@georisques.gouv.fr/')).toBe(false);
    expect(lienExterneValide('wireframes/produit.html')).toBe(false);
    expect(lienExterneValide('//georisques.gouv.fr/')).toBe(false);
    expect(lienExterneValide('https://www.georisques.gouv.fr/\u0007')).toBe(false);
    expect(lienExterneValide('https://www.georisques.gouv.fr/\npage')).toBe(false);
    expect(lienExterneValide(undefined)).toBe(false);
    expect(lienExterneValide('')).toBe(false);
  });

  it('la page déclare le lien Géorisques avec nouvel onglet et noopener noreferrer', () => {
    expect(html).toMatch(/<a class="lien-externe" data-lien-externe="georisques" target="_blank" rel="noopener noreferrer">/);
  });
});

describe('liens internes', () => {
  it('tous les liens.* de site.json pointent vers des fichiers existants (liensExternes exclu)', () => {
    for (const [cle, cible] of Object.entries(site.liens)) {
      if (cible.startsWith('#')) continue;
      expect(existsSync(cible.split('#')[0]), `liens.${cle} → ${cible}`).toBe(true);
    }
    expect(Object.keys(site.liens)).not.toContain('georisques');
  });
});
