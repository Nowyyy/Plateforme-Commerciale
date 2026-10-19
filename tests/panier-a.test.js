import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resoudre } from '../assets/js/rendu.js';
import { delaisCommande, lireCommande, peutValider, validerCommande } from '../assets/js/panier-logique.js';
import { construireCommande, evaluerCotes } from '../assets/js/cotes-logique.js';
import { lignesPrix } from '../assets/js/produit-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('panier.html');
const accueil = lire('index.html');
const { produits } = produit;
const batardeau = produits.find((p) => p.id === 'batardeau-modulable');
const commande = (surcharge = {}) => ({
  v: 1, produit: batardeau.id, mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, prix: { materiel: 1, pose: null, total: 1 }, ...surcharge,
});
const avecCotes = (cotes) => commande({ cotes: { largeur: 1200, hauteur: 400, tolerance: 0, ...cotes } });
const raison = (objet) => validerCommande(objet, produits).raison;

describe('lireCommande', () => {
  it('JSON valide, vide, null, texte non JSON, tableau, nombre : jamais d\'exception', () => {
    expect(lireCommande('{"v":1}')).toEqual({ v: 1 });
    for (const brut of ['', '   ', null, undefined, 'pas du json', '[1,2]', '12', 'null', '"texte"', '{', 42, {}]) {
      expect(() => lireCommande(brut)).not.toThrow();
      expect(lireCommande(brut), String(brut)).toBeNull();
    }
  });
});

describe('validerCommande : cas nominal', () => {
  it('batardeau en DIY et en pose : lignes et total égaux au calcul des données', () => {
    for (const mode of ['diy', 'pose']) {
      const r = validerCommande(commande({ mode }), produits);
      expect(r.ok).toBe(true);
      expect(r.commande.produit).toBe(batardeau);
      expect(r.commande.mode).toBe(mode);
      expect(r.commande.cotes).toEqual({ largeur: 1200, hauteur: 400, tolerance: 0 });
      expect(r.commande.lignes).toEqual(lignesPrix(batardeau, mode));
      expect(r.commande.total).toBe(mode === 'pose' ? 970 : 690);
    }
  });
  it('un prix mensonger dans la session est ignoré', () => {
    const r = validerCommande(commande({ mode: 'pose', prix: { materiel: 1, pose: 1, total: 1 } }), produits);
    expect(r.commande.total).toBe(970);
    expect(r.commande.lignes.map((l) => l.montant)).toEqual([690, 280, 970]);
  });
});

describe('validerCommande : refus', () => {
  it('absente, version, produit, incomplet, mode', () => {
    expect(raison(null)).toBe('absente');
    expect(raison([])).toBe('absente');
    expect(raison(commande({ v: 2 }))).toBe('version');
    expect(raison(commande({ produit: 'inconnu' }))).toBe('produit');
    expect(raison(commande({ produit: produits.find((p) => !p.complet).id }))).toBe('incomplet');
    expect(raison(commande({ mode: 'xx' }))).toBe('mode');
    expect(raison(commande({ mode: undefined }))).toBe('mode');
  });
  it('cotes : bornes, tolérance, valeurs non entières, négatives ou textuelles', () => {
    for (const cotes of [{ largeur: 699 }, { largeur: 1601 }, { hauteur: 299 }, { hauteur: 601 }, { tolerance: 51 },
      { largeur: 1200.5 }, { hauteur: -400 }, { tolerance: -1 }, { largeur: '1200' }, { tolerance: undefined }, { largeur: null }]) {
      expect(raison(avecCotes(cotes)), JSON.stringify(cotes)).toBe('cotes');
    }
    expect(raison(commande({ cotes: null }))).toBe('cotes');
    expect(raison(commande({ cotes: undefined }))).toBe('cotes');
  });
  it('compatibles aux bornes avec tolérance 0 ; effet de la tolérance (705 avec 10 refusée, 710 acceptée)', () => {
    for (const [largeur, hauteur] of [[700, 300], [1600, 600], [700, 600], [1600, 300]]) {
      expect(validerCommande(avecCotes({ largeur, hauteur }), produits).ok, `${largeur}x${hauteur}`).toBe(true);
    }
    expect(raison(avecCotes({ largeur: 705, tolerance: 10 }))).toBe('cotes');
    expect(validerCommande(avecCotes({ largeur: 710, tolerance: 10 }), produits).ok).toBe(true);
  });
});

describe('pureté', () => {
  it('arguments gelés non modifiés, mêmes entrées, mêmes sorties', () => {
    const gele = (o) => (o !== null && typeof o === 'object' ? Object.values(o).forEach(gele) || Object.freeze(o) : o);
    const objet = gele(commande({ mode: 'pose' }));
    const liste = JSON.parse(JSON.stringify(produits));
    gele(liste);
    const copie = JSON.stringify(liste);
    const a = validerCommande(objet, liste);
    const b = validerCommande(objet, liste);
    expect(a).toEqual(b);
    expect(JSON.stringify(liste)).toBe(copie);
    expect(objet.cotes.largeur).toBe(1200);
  });
});

describe('delaisCommande et peutValider', () => {
  it('DIY : une ligne ; pose : deux lignes', () => {
    expect(delaisCommande(batardeau, 'diy')).toEqual([{ cle: 'livraison', texte: batardeau.delaiLivraison }]);
    expect(delaisCommande(batardeau, 'pose')).toEqual([
      { cle: 'livraison', texte: batardeau.delaiLivraison }, { cle: 'pose', texte: batardeau.delaiPose },
    ]);
  });
  it('peutValider : quatre combinaisons', () => {
    const ok = { ok: true };
    const refus = { ok: false, raison: 'cotes' };
    expect(peutValider(true, ok)).toBe(true);
    expect(peutValider(true, refus)).toBe(false);
    expect(peutValider(false, ok)).toBe(false);
    expect(peutValider(false, refus)).toBe(false);
  });
});

describe('données du panier', () => {
  const textes = (o, chemin = 'panier') => Object.entries(o).flatMap(([cle, v]) => {
    if (typeof v === 'string') return [[`${chemin}.${cle}`, v]];
    if (Array.isArray(v)) return v.flatMap((e, i) => (typeof e === 'string' ? [[`${chemin}.${cle}.${i}`, e]] : textes(e, `${chemin}.${cle}.${i}`)));
    return textes(v, `${chemin}.${cle}`);
  });
  it('objet panier complet : textes non vides, trois étapes, étape en cours connue', () => {
    const { panier } = produit;
    expect(panier.etapes).toHaveLength(3);
    expect(panier.etapes.map((e) => e.titre)).toEqual(['Panier', 'Validation', 'Paiement']);
    expect(panier.etapes.map((e) => e.id)).toContain(panier.etapeEnCours.id);
    const tous = textes(panier);
    expect(tous.length).toBeGreaterThan(30);
    for (const [cle, texte] of tous) expect(texte.trim().length, cle).toBeGreaterThan(0);
  });
  it('textes d\'exemple contenant « exemple »', () => {
    const { panier } = produit;
    for (const t of [panier.responsabilite.legende, panier.responsabilite.avertissement, panier.responsabilite.schema.title,
      panier.total.confirmation.titre, panier.total.confirmation.numero, panier.paiement.paiement, panier.paiement.sav]) {
      expect(t).toContain('exemple');
    }
  });
  it('liens.panier = panier.html et fichier existant', () => {
    expect(site.liens.panier).toBe('panier.html');
    expect(existsSync(site.liens.panier)).toBe(true);
  });
});

describe('panier.html', () => {
  const ordre = ['en-tete', 'recapitulatif', 'responsabilite', 'total', 'paiement', 'pied'];
  it('lang fr, noindex, un seul h1, aucun script en ligne ni URL absolue', () => {
    expect(html).toContain('<html lang="fr" data-donnees="produit">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html.match(/<script(?![^>]*\bsrc=)/g)).toBeNull();
    expect(html).not.toMatch(/https?:\/\//);
  });
  it('codes E4-1 à E4-6 et rôles exactement une fois, dans l\'ordre', () => {
    for (let i = 1; i <= 6; i++) expect(html.match(new RegExp(`data-bloc="E4-${i}"`, 'g')), `E4-${i}`).toHaveLength(1);
    const positions = ordre.map((r) => {
      expect(html.match(new RegExp(`data-role="${r}"`, 'g')), r).toHaveLength(1);
      return html.indexOf(`data-role="${r}"`);
    });
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).not.toMatch(/style="[^"]*order/);
  });
  it('l\'indicateur d\'étapes suit le header, en tête du main, sans data-role', () => {
    const nav = html.indexOf('<nav class="etapes-commande"');
    expect(nav).toBeGreaterThan(html.indexOf('</header>'));
    expect(nav).toBeGreaterThan(html.indexOf('<main'));
    expect(nav).toBeLessThan(html.indexOf('data-role="recapitulatif"'));
    expect(html.slice(nav, html.indexOf('>', nav))).not.toContain('data-role');
  });
  it('aria-labelledby valides ; toute clé data-texte, data-lien, data-liste se résout', () => {
    for (const [, ids] of html.matchAll(/aria-labelledby="([^"]+)"/g)) for (const id of ids.split(' ')) expect(html, id).toContain(`id="${id}"`);
    const donnees = { site, produit };
    const echecs = [];
    for (const [, attribut, cle] of [...html.matchAll(/data-(texte|lien|aria-label|placeholder)="([^"]+)"/g)].filter((m) => /^(site|produit)\./.test(m[2]))) {
      try { resoudre(donnees, cle); } catch { echecs.push(`${attribut}=${cle}`); }
    }
    for (const [, cle] of [...html.matchAll(/data-liste="([^"]+)"/g)].filter((m) => /^(site\.|panier\.)/.test(m[1]))) {
      const valeur = cle.split('.').reduce((o, s) => o?.[s], cle.startsWith('site.') ? donnees : produit);
      if (!Array.isArray(valeur)) echecs.push(`liste=${cle}`);
    }
    expect(echecs).toEqual([]);
  });
});

describe('panier.html : balisage commun et workflow', () => {
  it('en-tête, pied, bandeau, relief et sprite identiques à ceux d\'index.html (hors code de bloc)', () => {
    const sansCode = (texte) => texte.replace(/ data-bloc="E\d-\d+"/g, '');
    const extraire = (texte, debut, fin) => sansCode(texte.slice(texte.indexOf(debut), texte.indexOf(fin, texte.indexOf(debut))));
    for (const [debut, fin] of [['<div class="relief"', '<noscript>'], ['<svg class="sprite"', '<aside class="bandeau-demo"'], ['<header', '</header>'], ['<footer', '</footer>'], ['<aside class="bandeau-demo"', '<header']]) {
      const attendu = extraire(accueil, debut, fin);
      expect(attendu.length, debut).toBeGreaterThan(20);
      expect(extraire(html, debut, fin), debut).toBe(attendu);
    }
  });
  it('les liens de site.json pointent vers des fichiers existants', () => {
    for (const [nom, lien] of Object.entries(site.liens)) {
      if (lien.startsWith('#')) continue;
      expect(existsSync(lien.split('#')[0]), nom).toBe(true);
    }
  });
  const workflow = lire('.github/workflows/pages.yml');
  const uses = (t) => t.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
  it('le workflow publie panier.html, garde permissions: et exclut secrets. et pull_request_target', () => {
    expect(workflow.match(/for p in ([^;]+);/)[1].split(/\s+/)).toContain('panier.html');
    expect(workflow).toContain('permissions:');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toContain('pull_request_new');
    expect(workflow).not.toContain('pull_request_target');
  });
  let main = null;
  try {
    main = execFileSync('git', ['show', 'origin/main:.github/workflows/pages.yml'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { /* origin/main absent */ }
  it.skipIf(main === null)('lignes uses: identiques à celles de origin/main', () => {
    expect(uses(workflow)).toEqual(uses(main));
  });
});

describe('cohérence commande construite / validée', () => {
  it('construireCommande puis validerCommande : acceptée', () => {
    const ev = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '' }, batardeau.cotes);
    expect(validerCommande(construireCommande(batardeau, 'pose', ev), produits).ok).toBe(true);
  });
});
