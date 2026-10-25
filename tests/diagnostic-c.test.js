import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { lienExterneValide } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const html = lire('diagnostic.html');

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
