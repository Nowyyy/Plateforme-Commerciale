import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const compte = JSON.parse(lire('data/compte.json'));
const donnees = { site, compte };
const index = lire('index.html');
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const sansCode = (texte) => texte.replace(/ data-bloc="E\d+-\d+"/g, '');
const codes = (html) => [...html.matchAll(/data-bloc="(E\d+-\d+)"/g)].map((m) => m[1]);
const roles = (html) => [...html.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1]);
const PAGES = {
  'sav-acces.html': { codes: ['E13-1', 'E13-2', 'E13-3'], roles: ['en-tete', 'acces', 'pied'] },
  'sav.html': {
    codes: ['E10-1', 'E10-2', 'E10-3', 'E10-4', 'E10-5', 'E10-6', 'E10-7', 'E10-8', 'E10-9'],
    roles: ['en-tete', 'intro', 'produit', 'demande', 'photos', 'coordonnees', 'envoi', 'confirmation', 'pied'],
  },
  'demandes.html': { codes: ['E11-1', 'E11-2', 'E11-3', 'E11-4'], roles: ['en-tete', 'filtre', 'liste', 'pied'] },
};
const HIFI = ['index.html', 'diagnostic.html', 'produit.html', 'panier.html', 'pro.html', 'connexion.html', 'compte.html', 'achats.html', 'achat.html', 'informations.html', ...Object.keys(PAGES)];

describe('lot 8d-A : sav-acces.html', () => {
  const html = lire('sav-acces.html');
  it('lang, noindex, un seul h1, codes E13-1 à E13-3 une fois chacun dans l\'ordre, aria-labelledby valides, rien d\'en ligne ni d\'externe, aucun id dupliqué', () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="fr" data-donnees="compte">/);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(codes(html)).toEqual(PAGES['sav-acces.html'].codes);
    expect(roles(html)).toEqual(PAGES['sav-acces.html'].roles);
    for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) expect(html, id).toContain(`id="${id}"`);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\sstyle=/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('formulaire : novalidate, hidden, ni name, ni action, ni fichier ; un label par champ ; un seul bouton ambre, « Continuer »', () => {
    const formulaire = bloc(html, '<form', '</form>');
    const ouvrante = formulaire.match(/^<form[^>]*>/)[0];
    expect(ouvrante).toMatch(/\snovalidate\s/);
    expect(ouvrante).toMatch(/\shidden[\s>]/);
    expect(ouvrante).not.toContain('action=');
    expect(formulaire).not.toMatch(/\sname=/);
    expect(html).not.toContain('type="file"');
    expect(formulaire.match(/<input /g)).toHaveLength(2);
    for (const [, id] of formulaire.matchAll(/<input [^>]*id="([^"]+)"/g)) {
      expect(formulaire, id).toContain(`for="${id}"`);
      expect(formulaire, id).toMatch(new RegExp(`id="${id}"[^>]*aria-describedby="aide-${id} erreur-${id}"`));
    }
    expect(html.match(/bouton--action/g)).toHaveLength(1);
    expect(formulaire).toContain('data-texte="compte.sav.acces.bouton"');
    expect(compte.sav.acces.bouton).toBe('Continuer');
    expect(html).toContain('data-lien="site.liens.connexion" data-texte="compte.sav.acces.connexion"');
    expect(html).toContain('data-lien="site.liens.achats" data-texte="compte.sav.acces.connecte.lien"');
  });
});

describe('lot 8d-A : squelettes de sav.html et demandes.html', () => {
  it('sav.html : E10-1 à E10-9 dans l\'ordre, confirmation hidden, un seul form englobant produit à envoi, un seul h1, noindex', () => {
    const html = lire('sav.html');
    expect(codes(html)).toEqual(PAGES['sav.html'].codes);
    expect(roles(html)).toEqual(PAGES['sav.html'].roles);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toMatch(/<section[^>]*data-role="confirmation"[^>]*\shidden>/);
    expect(html.match(/<form[ >]/g)).toHaveLength(1);
    const formulaire = bloc(html, '<form', '</form>');
    expect(roles(formulaire)).toEqual(['produit', 'demande', 'photos', 'coordonnees', 'envoi']);
    expect(roles(html.slice(0, html.indexOf('<form')))).toEqual(['en-tete', 'intro']);
    expect(roles(html.slice(html.indexOf('</form>')))).toEqual(['confirmation', 'pied']);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('data-etat');
  });
  it('demandes.html : E11-1 à E11-4 dans l\'ordre, un seul h1, noindex, navigation du compte, « Mes demandes » repéré', () => {
    const html = lire('demandes.html');
    expect(codes(html)).toEqual(PAGES['demandes.html'].codes);
    expect(roles(html)).toEqual(PAGES['demandes.html'].roles);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toMatch(/<\/header>\s*<nav class="nav-compte"/);
    expect(html).toContain('data-lien="site.liens.demandes" aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('data-deconnexion');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('toutes les clés data-texte, data-lien, data-aria-label et data-liste des trois pages se résolvent', () => {
    for (const page of Object.keys(PAGES)) {
      const html = lire(page);
      const hors = html.replace(/<template[\s\S]*?<\/template>/g, '');
      for (const attribut of ['data-texte', 'data-texte-global', 'data-lien', 'data-aria-label']) {
        for (const [, cle] of hors.matchAll(new RegExp(` ${attribut}="([^"]+)"`, 'g'))) expect(() => resoudre(donnees, cle), `${page} ${attribut} ${cle}`).not.toThrow();
      }
      for (const [, cle] of html.matchAll(/<template data-liste="([^"]+)">/g)) {
        if (cle !== 'entrees') expect(cle.startsWith('site.') || Array.isArray(cle.split('.').reduce((o, k) => o?.[k], compte)), `${page} ${cle}`).toBe(true);
      }
    }
  });
});

describe('lot 8d-A : en-tête, pied, décor et chargement des modules', () => {
  it('en-tête, pied et décor identiques à ceux d\'index.html sur les trois pages', () => {
    for (const page of Object.keys(PAGES)) {
      const html = lire(page);
      expect(sansCode(bloc(html, '<header', '</header>')), page).toBe(sansCode(bloc(index, '<header', '</header>')));
      expect(sansCode(bloc(html, '<footer', '</footer>')), page).toBe(sansCode(bloc(index, '<footer', '</footer>')));
      expect(bloc(html, '<div class="relief"', '</svg>\n  </div>'), page).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
    }
  });
  it('les treize pages Hi-Fi chargent compteur.js et compte-lien.js une fois', () => {
    expect(HIFI).toHaveLength(13);
    for (const page of HIFI) {
      const html = lire(page);
      expect(html.match(/<script type="module" src="assets\/js\/compteur\.js"><\/script>/g), page).toHaveLength(1);
      expect(html.match(/<script type="module" src="assets\/js\/compte-lien\.js"><\/script>/g), page).toHaveLength(1);
    }
  });
  it('liens.savAcces, liens.sav et liens.demandes pointent vers les pages Hi-Fi ; tous les liens.* vers des fichiers existants', () => {
    expect(site.liens).toMatchObject({ savAcces: 'sav-acces.html', sav: 'sav.html', demandes: 'demandes.html' });
    for (const [cle, lien] of Object.entries(site.liens)) {
      if (lien.startsWith('#')) continue;
      expect(existsSync(lien.split('#')[0]), cle).toBe(true);
    }
    expect(site.pied.colonnes[1].entrees[0]).toEqual({ texte: 'Service après-vente', lien: 'savAcces' });
  });
});

describe('lot 8d-A : workflow, CSS, modules et CLAUDE.md', () => {
  const lignesUses = (texte) => texte.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
  it('le workflow publie les trois pages ; permissions: présent ; ni secrets. ni pull_request_target ; lignes uses: identiques à celles de main', () => {
    const texte = lire('.github/workflows/pages.yml');
    const liste = texte.match(/for p in ([^;]+);/)[1].split(/\s+/);
    expect(liste).toEqual(expect.arrayContaining(['sav-acces.html', 'sav.html', 'demandes.html']));
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
    expect(lignesUses(texte)).toEqual([
      'uses: actions/checkout@v4', 'uses: actions/setup-node@v4', 'uses: actions/checkout@v4',
      'uses: actions/configure-pages@v5', 'uses: actions/upload-pages-artifact@v3', 'uses: actions/deploy-pages@v4',
    ]);
  });
  it('css/sav.css sans valeur hexadécimale ni couleur nommée', () => {
    const css = lire('css/sav.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/:\s*(red|blue|green|white|black|orange|amber|navy)\b/i);
    expect(css).not.toMatch(/\brgba?\(|\bhsla?\(/);
  });
  it('modules de la partie : ni réseau, ni cookie, ni stockage hors compte, achat et acces-sav', () => {
    for (const m of ['sav-logique.js', 'sav-acces.js', 'sav.js', 'demandes.js', 'compte-session.js']) {
      const src = lire(`assets/js/${m}`).replace(/\/\/.*$/gm, '');
      expect(src, m).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie/);
      expect(src, m).not.toMatch(/(?:getItem|setItem|removeItem)\('(?!compte'|achat'|acces-sav')/);
    }
    expect(lire('assets/js/sav-logique.js')).not.toMatch(/\bdocument\b|\bwindow\b|sessionStorage/);
    expect(lire('assets/js/sav-acces.js')).not.toMatch(/sessionStorage|\.value\s*=|name=/);
  });
  it('CLAUDE.md fait moins de 9 000 caractères et décrit le SAV ; conventions.md a une section SAV et reste sous 150 lignes', () => {
    const texte = lire('CLAUDE.md');
    expect([...texte].length).toBeLessThan(9000);
    for (const mot of ['sav-acces.html', 'sav.html', 'demandes.html', 'acces-sav', 'resoudreContexte', 'sav.css', 'Envoyer ma demande', 'Continuer']) expect(texte, mot).toContain(mot);
    expect(texte).toContain('`CMD-` suivi de 3 à 8 chiffres');
    const conventions = lire('Docs/ref/conventions.md');
    expect(conventions).toMatch(/^## SAV/m);
    expect(conventions.split('\n').length).toBeLessThanOrEqual(150);
  });
  it('apercu.txt vise l\'accueil en Hi-Fi et Docs/apercus.txt décrit le lot 8d', () => {
    expect(lire('apercu.txt').split('\n').filter(Boolean)).toEqual(['index.html', 'type: hifi', 'titre: Service après-vente simulé']);
    expect(lire('Docs/apercus.txt')).toMatch(/^lot-8d\|.{10,}$/m);
  });
  it('les tests adaptés des lots précédents attendent les pages Hi-Fi du SAV', () => {
    const tests = readdirSync('tests').filter((f) => f.endsWith('.test.js')).map((f) => lire(`tests/${f}`)).join('\n');
    const e2e = readdirSync('tests/e2e').map((f) => lire(`tests/e2e/${f}`)).join('\n');
    expect(tests).toContain("savAcces: 'sav-acces.html'");
    expect(tests).toContain("lien: 'sav-acces.html'");
    expect(e2e).toContain("['Service après-vente', 'sav-acces.html']");
    expect(e2e).not.toContain("'/wireframes/demandes.html'");
    expect(e2e).not.toContain("'/wireframes/sav.html'");
  });
});
