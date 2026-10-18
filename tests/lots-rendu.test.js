import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generer, lireTextes } from '../scripts/lots/generer.mjs';
import { rendrePageLots, rendreRedirection, echapper } from '../scripts/lots/rendu.mjs';
import { preparerLots, choisirVues } from '../scripts/lots/logique.mjs';

const textes = lireTextes();
const essai = (nom) => JSON.parse(readFileSync(`tests/lots-essais/${nom}.json`, 'utf8')).entrees;
const vuesDe = (nom) => choisirVues(preparerLots(essai(nom)).lots);
const rendu = (nom) => rendrePageLots(vuesDe(nom), textes);

describe('page Lots générée', () => {
  it('lang, noindex, un seul h1, aucun script, aucune URL absolue', () => {
    for (const nom of ['normal', 'un-seul-hifi', 'aucun-hifi']) {
      const html = rendu(nom);
      expect(html).toContain('<html lang="fr">');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/https?:\/\//);
      for (const [, href] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
        expect(href.startsWith('/')).toBe(false);
        if (href !== 'data:,') expect(href).not.toMatch(/^[a-z]+:/i);
      }
      expect(html).toMatch(/<header[\s>]/);
      expect(html).toMatch(/<main[\s>]/);
      expect(html).toMatch(/<footer[\s>]/);
    }
  });

  it('un titre malveillant est échappé', () => {
    const lots = preparerLots([
      { branche: 'lot-2', apercu: 'accueil.html\ntitre: <script>alert(1)</script>', bilan: null, fusionne: true },
      { branche: 'lot-3', apercu: 'accueil.html\ntitre: <img src=x onerror=alert(1)>', bilan: null, fusionne: false },
    ]).lots;
    const html = rendrePageLots(choisirVues(lots), textes);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('états vides : message, aucun lien dans le menu, bouton remplacé par un texte', () => {
    const un = rendu('un-seul-hifi');
    const menu = un.match(/<details[\s\S]*<\/details>/)[0];
    expect(menu).toContain('Aucun ancien lot Hi-Fi pour l&#39;instant.');
    expect(menu).not.toContain('<a ');
    const aucun = rendu('aucun-hifi');
    expect(aucun).toContain(echapper(textes.hifi.aucun));
    expect(aucun).not.toContain(`>${textes.hifi.bouton}<`);
    const sansWf = rendrePageLots(choisirVues([]), textes);
    expect(sansWf).toContain(echapper(textes.wireframe.aucun));
    expect(sansWf).not.toContain('<a ');
  });

  it('scénario normal : liens et état en texte', () => {
    const html = rendu('normal');
    expect(html).toContain('href="../wireframes/index.html"');
    expect(html).toContain('href="../lot-4/accueil.html"');
    expect(html).toContain('État : en cours');
    expect(html).toContain('État : fusionné');
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).not.toContain('Outillage');
  });
});

describe('redirection /apercus/', () => {
  it('refresh vers ../lots/, lien visible, noindex', () => {
    const html = rendreRedirection(textes);
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=../lots/">');
    expect(html).toContain('<a href="../lots/">Cette page s&#39;appelle désormais Lots</a>');
    expect(html).toContain('noindex');
  });
});

describe('feuille de style et textes', () => {
  it('lots.css sans valeur hexadécimale de couleur', () => {
    expect(readFileSync('scripts/lots/lots.css', 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('tout texte visible vient de textes.json', () => {
    // toutes les valeurs de textes.json remplacées par un jeton : le texte visible
    // de la page ne doit plus contenir que ces jetons et les libellés de lots.
    const jetons = JSON.parse(JSON.stringify(textes), function remplacer(cle, v) {
      return typeof v === 'string' && cle !== 'langue' ? `@@${cle}@@` : v;
    });
    const vues = vuesDe('normal');
    const html = rendrePageLots(vues, jetons);
    const visible = html
      .replace(/<head>[\s\S]*<\/head>/, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n').map((l) => l.trim()).filter(Boolean);
    const libelles = new Set([...vues.anciens.map((a) => a.libelle), vues.hifi.libelle, vues.wireframe.libelle]);
    for (const ligne of visible) {
      const reste = ligne.replace(/@@[^@]+@@/g, '').trim();
      expect(reste === '' || libelles.has(reste), `texte en dur : « ${ligne} »`).toBe(true);
    }
    const redirection = rendreRedirection(jetons).replace(/<[^>]+>/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
    for (const ligne of redirection) expect(ligne.replace(/@@[^@]+@@/g, '').trim()).toBe('');
  });
});

describe('commande de génération', () => {
  let sortie;
  beforeAll(() => { sortie = mkdtempSync(join(tmpdir(), 'lots-')); });
  it('écrit lots/index.html, lots/lots.css et apercus/index.html', () => {
    const avert = generer({ sortie, entrees: essai('normal') });
    expect(readdirSync(join(sortie, 'lots')).sort()).toEqual(['index.html', 'lots.css']);
    expect(readdirSync(join(sortie, 'apercus'))).toEqual(['index.html']);
    expect(avert).toEqual([]);
  });
});
