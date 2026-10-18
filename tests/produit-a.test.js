import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resoudre } from '../assets/js/rendu.js';
import { modeValide, produitValide, totalEstime, lignesPrix } from '../assets/js/produit-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const json = (chemin) => JSON.parse(lire(chemin));
const produit = json('data/produit.json');
const diagnostic = json('data/diagnostic.json');
const site = json('data/site.json');
const html = lire('produit.html');
const accueilHtml = lire('index.html');

describe('data/produit.json', () => {
  it('reprend les id, titres et prix des équipements du diagnostic (même ensemble, mêmes valeurs)', () => {
    const ref = diagnostic.equipements.map((e) => [e.id, e.titre, e.prix]).sort();
    expect(produit.produits.map((p) => [p.id, p.titre, p.prix]).sort()).toEqual(ref);
    expect(produit.produits).toHaveLength(10);
    for (const p of produit.produits) {
      expect(Number.isInteger(p.pose) && p.pose > 0, p.id).toBe(true);
      expect(p.pose % 10, p.id).toBe(0);
      expect(p.pose, p.id).toBeGreaterThanOrEqual(p.prix * 0.3 - 5);
      expect(p.pose, p.id).toBeLessThanOrEqual(p.prix * 0.5 + 5);
    }
    const complets = produit.produits.filter((p) => p.complet);
    expect(complets.map((p) => p.id)).toEqual(['batardeau-modulable']);
    expect(produit.produitParDefaut).toBe('batardeau-modulable');
  });

  it('compte 4 vues (3 images, 1 vidéo), 3 pastilles et des textes d\'exemple', () => {
    const { vues } = produit.galerie;
    expect(vues).toHaveLength(4);
    expect(vues.filter((v) => v.type === 'image')).toHaveLength(3);
    expect(vues.filter((v) => v.type === 'video')).toHaveLength(1);
    for (const v of vues) expect(v.legende).toContain('exemple');
    expect(produit.badges).toHaveLength(3);
    for (const b of produit.badges) expect(b.titre).toContain('exemple');
    expect(Object.keys(produit.textes).length).toBeGreaterThan(0);
    for (const t of JSON.stringify(produit.textes).match(/"[^"]*"/g)) expect(t.length).toBeGreaterThan(2);
  });
});

describe('produit.html', () => {
  it('est une page noindex en français, avec un seul h1 et les blocs E3-1 à E3-4 et E3-8 une fois chacun', () => {
    expect(html).toContain('<html lang="fr" data-donnees="produit">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    for (const code of ['E3-1', 'E3-2', 'E3-3', 'E3-4', 'E3-8']) {
      expect(html.match(new RegExp(`data-bloc="${code}"`, 'g')), code).toHaveLength(1);
    }
    const ordre = ['en-tete', 'galerie', 'achat', 'mode', 'pied'].map((r) => html.indexOf(`data-role="${r}"`));
    expect(ordre.every((n) => n > -1)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    expect(html.indexOf('aria-label') > -1 && html.indexOf('class="fil"')).toBeGreaterThan(html.indexOf('</header>'));
    for (const balise of html.match(/<script[^>]*>/g)) expect(balise).toContain('src="');
    expect(html).not.toMatch(/<script[^>]*>[^<]+<\/script>/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('toute clé data-texte, data-lien et data-liste se résout', () => {
    const donnees = { site, produit };
    const echecs = [];
    // clés absolues seulement : celles d'un gabarit de liste (« titre », « entrees ») sont relatives à l'élément
    const absolue = (cle) => /^(site|produit)\./.test(cle);
    for (const [, attribut, cle] of [...html.matchAll(/data-(texte|lien|aria-label|placeholder)="([^"]+)"/g)].filter((m) => absolue(m[2]))) {
      try { resoudre(donnees, cle); } catch { echecs.push(`${attribut}=${cle}`); }
    }
    // listes du pied : « site.… » ; listes de la fiche : relatives à produit.json (« galerie.vues », « badges »)
    for (const [, cle] of [...html.matchAll(/data-liste="([^"]+)"/g)].filter((m) => /^(site\.|galerie\.|badges$)/.test(m[1]))) {
      const valeur = cle.split('.').reduce((o, s) => o?.[s], cle.startsWith('site.') ? donnees : produit);
      if (!Array.isArray(valeur)) echecs.push(`liste=${cle}`);
    }
    expect(echecs).toEqual([]);
  });

  it('partage en-tête, pied, bandeau et relief avec index.html (hors code de bloc)', () => {
    const sansCode = (texte) => texte.replace(/ data-bloc="E\d-\d+"/g, '');
    const extraire = (texte, debut, fin) => sansCode(texte.slice(texte.indexOf(debut), texte.indexOf(fin, texte.indexOf(debut))));
    const parties = [['<div class="relief"', '<noscript>'], ['<header', '</header>'], ['<footer', '</footer>'], ['<aside class="bandeau-demo"', '<header']];
    for (const [debut, fin] of parties) {
      const attendu = extraire(accueilHtml, debut, fin);
      expect(attendu.length, debut).toBeGreaterThan(20);
      expect(extraire(html, debut, fin), debut).toBe(attendu);
    }
  });
});

describe('produit-logique.js', () => {
  const { produits, produitParDefaut } = produit;

  it('produitValide : id valide, id inconnu, id absent', () => {
    expect(produitValide(produits, 'bouclier-de-baie', produitParDefaut).id).toBe('bouclier-de-baie');
    expect(produitValide(produits, 'inconnu', produitParDefaut).id).toBe('batardeau-modulable');
    expect(produitValide(produits, null, produitParDefaut).id).toBe('batardeau-modulable');
    expect(produitValide(produits, undefined, produitParDefaut).id).toBe('batardeau-modulable');
  });

  it('modeValide : « diy » ou « pose », défaut « diy »', () => {
    expect(modeValide('pose')).toBe('pose');
    expect(modeValide('diy')).toBe('diy');
    for (const v of ['autre', '', null, undefined, 3]) expect(modeValide(v)).toBe('diy');
  });

  it('totalEstime et lignesPrix : diy = 2 lignes, pose = 3 lignes', () => {
    const p = { prix: 690, pose: 280 };
    expect(totalEstime(p, 'diy')).toBe(690);
    expect(totalEstime(p, 'pose')).toBe(970);
    expect(lignesPrix(p, 'diy')).toEqual([{ cle: 'materiel', montant: 690 }, { cle: 'total', montant: 690 }]);
    expect(lignesPrix(p, 'pose')).toEqual([{ cle: 'materiel', montant: 690 }, { cle: 'pose', montant: 280 }, { cle: 'total', montant: 970 }]);
    expect(lignesPrix(p, 'inconnu')).toHaveLength(2);
  });
});

describe('liens et workflow', () => {
  it('les liens de site.json pointent vers des fichiers existants, dont liens.produit', () => {
    expect(site.liens.produit).toBe('produit.html');
    for (const cible of Object.values(site.liens).filter((c) => !c.startsWith('#'))) expect(existsSync(cible), cible).toBe(true);
  });

  it('le workflow publie produit.html sans toucher aux droits, secrets ni lignes uses:', () => {
    const texte = lire('.github/workflows/pages.yml');
    expect(texte.match(/for p in ([^;]+);/)?.[1].split(/\s+/)).toContain('produit.html');
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
    const usesDe = (t) => t.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
    let main = null;
    try {
      main = execFileSync('git', ['show', 'origin/main:.github/workflows/pages.yml'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch { /* clone superficiel : origin/main absent */ }
    if (main !== null) expect(usesDe(texte)).toEqual(usesDe(main));
  });
});
