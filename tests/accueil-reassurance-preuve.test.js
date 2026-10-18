import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre, resoudreDans, validerListe } from '../assets/js/rendu.js';
import { extraire } from './outils/gabarits.mjs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const donnees = { site, accueil };
const html = lire('index.html');
const texte = (v) => typeof v === 'string' && v.trim().length > 0;
const cles = (source, attributs) =>
  [...source.matchAll(new RegExp(`\\b(${attributs})="([^"]+)"`, 'g'))].map((m) => [m[1], m[2]]);
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;

describe('data/accueil.json : réassurance et preuve (lot 3b-B)', () => {
  it('reassurance : titre, au moins une pastille avec id et titre marqué « exemple »', () => {
    expect(texte(accueil.reassurance.titre)).toBe(true);
    expect(accueil.reassurance.liste.length).toBeGreaterThanOrEqual(1);
    for (const p of accueil.reassurance.liste) {
      expect(texte(p.id)).toBe(true);
      expect(texte(p.titre)).toBe(true);
      expect(p.titre).toContain('exemple');
    }
  });
  it('preuve : titre, introduction, légende « exemple », 3 chiffres, note', () => {
    const { preuve } = accueil;
    expect(texte(preuve.titre)).toBe(true);
    expect(texte(preuve.intro)).toBe(true);
    expect(preuve.video.legende).toContain('exemple');
    expect(preuve.chiffres).toHaveLength(3);
    for (const c of preuve.chiffres) {
      expect(texte(c.valeur)).toBe(true);
      expect(texte(c.libelle)).toBe(true);
    }
    expect(texte(preuve.note)).toBe(true);
  });
});

describe('clés de index.html pour les blocs E1-7 et E1-8', () => {
  const { hors, modeles } = extraire(html);
  it('toute clé data-liste, data-texte, data-texte-global, data-lien, data-icone se résout', () => {
    for (const [, cle] of cles(hors, 'data-texte|data-texte-global|data-lien|data-aria-label|data-placeholder')) {
      expect(() => resoudre(donnees, cle), cle).not.toThrow();
    }
    for (const nom of ['reassurance.liste', 'preuve.chiffres']) {
      const modele = modeles.find((m) => m.cle === nom);
      expect(modele, nom).toBeDefined();
      const liste = validerListe(nom.split('.').reduce((o, k) => o[k], accueil), nom);
      for (const [, k] of cles(extraire(modele.contenu).hors, 'data-texte|data-icone')) {
        expect(() => resoudreDans(liste[0], k), `${nom} : ${k}`).not.toThrow();
      }
    }
  });
});

describe('sprite et ordre des blocs', () => {
  it('le sprite contient le symbole bouclier, sans valeur hexadécimale ni script', () => {
    const sprite = html.match(/<svg class="sprite"[\s\S]*?<\/svg>/)[0];
    const bouclier = sprite.match(/<symbol id="bouclier"[\s\S]*?<\/symbol>/)?.[0];
    expect(bouclier).toBeDefined();
    expect(bouclier).not.toMatch(HEX);
    expect(bouclier).not.toContain('<text');
    expect(sprite).not.toMatch(/<script/i);
  });
  it('ordre relatif comment < reassurance < preuve < avis (avis juste avant le pied), avec les data-bloc E1-7, E1-8, E1-9', () => {
    const pos = ['comment', 'reassurance', 'preuve', 'avis'].map((r) => html.indexOf(`data-role="${r}"`));
    for (const p of pos) expect(p).toBeGreaterThan(-1);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    for (const [role, bloc] of [['reassurance', 'E1-7'], ['preuve', 'E1-8'], ['avis', 'E1-9']]) {
      expect(html).toMatch(new RegExp(`data-bloc="${bloc}" data-role="${role}"`));
    }
  });
  it('css/accueil.css et css/composants.css sans couleur hexadécimale ; aucun order en CSS', () => {
    for (const f of ['css/accueil.css', 'css/composants.css']) expect(lire(f)).not.toMatch(HEX);
    const css = lire('css/accueil.css');
    const blocs = css.slice(css.indexOf('Réassurance E1-7'));
    expect(blocs).not.toMatch(/\border:/);
  });
  it('la vidéo est un rectangle décoratif : aucun <video>, rectangle aria-hidden dans une figure', () => {
    expect(html).not.toMatch(/<video/i);
    expect(html).toMatch(/<figure class="preuve__video">\s*<div class="preuve__ecran" aria-hidden="true"><\/div>\s*<figcaption/);
  });
});
