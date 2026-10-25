import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import {
  aleaParDefaut, basculerProduit, lireSelection, produitsDeAlea, selectionInitiale, selectionPourAlea, serialiserSelection,
} from '../assets/js/comparateur-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const json = (nom) => JSON.parse(lire(`data/${nom}.json`));
const produit = json('produit');
const diagnostic = json('diagnostic');
const accueil = json('accueil');
const site = json('site');
const donnees = { site, produit };
const c = produit.comparateur;
const produits = produit.produits;
const aleas = c.aleas;
const limites = c.limites;
const ids = (liste) => liste.map((p) => p.id);
const batardeau = produits.find((p) => p.id === 'batardeau-modulable');

const html = lire('comparateur.html');
const index = lire('index.html');
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const sansCode = (texte) => texte.replace(/ data-bloc="E\d+-\d+"/g, '');
const codes = (source) => [...source.matchAll(/data-bloc="(E\d+-\d+)"/g)].map((m) => m[1]);
const roles = (source) => [...source.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1]);
const gele = (valeur) => {
  if (valeur !== null && typeof valeur === 'object' && !Object.isFrozen(valeur)) {
    Object.freeze(valeur);
    for (const v of Object.values(valeur)) gele(v);
  }
  return valeur;
};
const session = (alea, liste) => JSON.stringify({ v: 1, alea, produits: liste });

describe('lot 9-A : données de data/produit.json', () => {
  it('dix produits : aleas égaux à ceux de diagnostic.json, performances entiers dans les bornes', () => {
    expect(produits).toHaveLength(10);
    for (const p of produits) {
      const equipement = diagnostic.equipements.find((e) => e.id === p.id);
      expect(p.aleas, p.id).toEqual(equipement.aleas);
      const { principale, montage, poids } = p.performances;
      for (const [valeur, borne] of [[principale, 500], [montage, 240], [poids, 200]]) {
        expect(Number.isInteger(valeur), p.id).toBe(true);
        expect(valeur).toBeGreaterThanOrEqual(1);
        expect(valeur).toBeLessThanOrEqual(borne);
      }
      expect(Object.keys(p.performances).sort()).toEqual(['montage', 'poids', 'principale']);
    }
  });
  it('deux produits d\'un même aléa ont des valeurs différentes (critère principal, montage et poids)', () => {
    for (const alea of aleas) {
      const groupe = produitsDeAlea(produits, alea.id);
      expect(groupe.length, alea.id).toBeGreaterThanOrEqual(2);
      for (const cle of ['principale', 'montage', 'poids']) {
        const valeurs = groupe.map((p) => p.performances[cle]);
        expect(new Set(valeurs).size, `${alea.id} ${cle}`).toBe(valeurs.length);
      }
    }
  });
  it('batardeau : 60 cm et 12 min dans performances, ses spécifications et la preuve de l\'accueil', () => {
    expect(batardeau.performances).toMatchObject({ principale: 60, montage: 12 });
    expect(batardeau.specs.find((s) => s.id === 'pression').valeur).toContain('60 cm');
    expect(batardeau.specs.find((s) => s.id === 'deploiement').valeur).toContain('12 minutes');
    const chiffres = accueil.preuve.chiffres;
    expect(chiffres.find((x) => x.libelle === 'Hauteur d\'eau retenue').valeur).toBe(`${batardeau.performances.principale} cm`);
    expect(chiffres.find((x) => x.libelle === 'Temps de déploiement').valeur).toBe(`${batardeau.performances.montage} min`);
  });
  it('comparateur : aleas et niveaux copiés de diagnostic.json, un critère par aléa, limites 2 et 3', () => {
    expect(c.aleas).toEqual(diagnostic.aleas.map(({ id, titre, court, niveau }) => ({ id, titre, court, niveau })));
    expect(c.niveaux).toEqual(diagnostic.niveaux);
    expect(Object.keys(c.criteres).sort()).toEqual(diagnostic.aleas.map((a) => a.id).sort());
    for (const critere of Object.values(c.criteres)) {
      expect(critere.titre).not.toBe('');
      expect(critere.unite).not.toBe('');
    }
    expect(new Set(Object.values(c.criteres).map((x) => x.titre)).size).toBe(4);
    expect(limites).toEqual({ min: 2, max: 3 });
  });
  it('comparateur : tous les textes sont non vides et marquent les valeurs comme exemples', () => {
    const textes = [];
    const parcourir = (valeur, chemin) => {
      if (typeof valeur === 'string') textes.push([chemin, valeur]);
      else if (valeur !== null && typeof valeur === 'object') for (const [k, v] of Object.entries(valeur)) parcourir(v, `${chemin}.${k}`);
    };
    parcourir(c, 'comparateur');
    for (const [chemin, texte] of textes) expect(texte.trim(), chemin).not.toBe('');
    for (const cle of ['niveauAlea', 'prix']) expect(c[cle], cle).toContain('exemple');
    expect(c.comparaison.note).toContain('exemple');
    expect(c.comparaison.legende).toContain('exemple');
    expect(c.aide).toContain('exemples');
  });
});

describe('lot 9-A : lireSelection', () => {
  it('valide : objet normalisé ; autres formes : null', () => {
    expect(lireSelection(session('inondations', ['a', 'b']))).toEqual({ alea: 'inondations', produits: ['a', 'b'] });
    expect(lireSelection('{"v":2,"alea":"x","produits":[]}')).toBeNull();
    expect(lireSelection('{"alea":"x","produits":[]}')).toBeNull();
    expect(lireSelection('{pas du json')).toBeNull();
    expect(lireSelection('')).toBeNull();
    expect(lireSelection(null)).toBeNull();
    expect(lireSelection(undefined)).toBeNull();
    expect(lireSelection(12)).toBeNull();
    for (const brut of ['null', '[]', '"texte"', '3', 'true']) expect(lireSelection(brut), brut).toBeNull();
    for (const mauvais of [{ v: 1, alea: 3, produits: [] }, { v: 1, alea: '', produits: [] }, { v: 1, alea: 'x', produits: 'a' }, { v: 1, alea: 'x', produits: [1] }, { v: 1, alea: 'x' }, { v: '1', alea: 'x', produits: [] }]) {
      expect(lireSelection(JSON.stringify(mauvais)), JSON.stringify(mauvais)).toBeNull();
    }
  });
});

describe('lot 9-A : produitsDeAlea et aleaParDefaut', () => {
  it('produitsDeAlea : l\'ordre des données, aléa inconnu ou entrées invalides = liste vide', () => {
    expect(ids(produitsDeAlea(produits, 'inondations'))).toEqual(['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']);
    expect(ids(produitsDeAlea(produits, 'feux-de-foret'))).toEqual(['sprinkler-de-toiture', 'grille-pare-braises']);
    expect(produitsDeAlea(produits, 'inconnu')).toEqual([]);
    expect(produitsDeAlea(null, 'inondations')).toEqual([]);
    expect(produitsDeAlea([null, {}, { aleas: 'inondations' }], 'inondations')).toEqual([]);
  });
  it('aleaParDefaut : niveau maximal, à égalité le premier', () => {
    expect(aleaParDefaut(aleas)).toBe('inondations');
    expect(aleaParDefaut([{ id: 'a', niveau: 2 }, { id: 'b', niveau: 2 }, { id: 'c', niveau: 1 }])).toBe('a');
    expect(aleaParDefaut([{ id: 'a', niveau: 1 }, { id: 'b', niveau: 4 }, { id: 'c', niveau: 4 }])).toBe('b');
    expect(aleaParDefaut([])).toBeNull();
    expect(aleaParDefaut(undefined)).toBeNull();
    expect(aleaParDefaut([{ id: 'a' }, { id: 'b', niveau: 1 }])).toBe('b');
  });
});

describe('lot 9-A : selectionInitiale', () => {
  const initiale = (brut, p = produits, a = aleas) => selectionInitiale({ brut, produits: p, aleas: a, limites });
  const cinq = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => ({ id, aleas: ['x'] }));
  const aleaX = [{ id: 'x', niveau: 1 }];
  it('sans session : aléa de niveau maximal, deux premiers produits dans l\'ordre des données', () => {
    expect(initiale(null)).toEqual({ alea: 'inondations', ids: ['batardeau-modulable', 'clapet-anti-retour'] });
    expect(initiale('{invalide')).toEqual({ alea: 'inondations', ids: ['batardeau-modulable', 'clapet-anti-retour'] });
  });
  it('session valide : aléa et produits repris tels quels (trois produits possibles)', () => {
    expect(initiale(session('grele-vents', ['filet-de-toiture', 'bouclier-de-baie', 'volet-extrude']))).toEqual({
      alea: 'grele-vents', ids: ['filet-de-toiture', 'bouclier-de-baie', 'volet-extrude'],
    });
  });
  it('un produit d\'un autre aléa est écarté, puis la sélection est complétée', () => {
    expect(initiale(session('canicule', ['isolant-reflecteur', 'batardeau-modulable']))).toEqual({
      alea: 'canicule', ids: ['isolant-reflecteur', 'cool-roofing'],
    });
  });
  it('doublons retirés, ids inconnus écartés', () => {
    expect(initiale(session('inondations', ['pompe-de-relevage', 'pompe-de-relevage', 'inconnu', 'clapet-anti-retour']))).toEqual({
      alea: 'inondations', ids: ['pompe-de-relevage', 'clapet-anti-retour'],
    });
  });
  it('plus de trois ids : tronqués à trois ; moins de deux : complétés dans l\'ordre des données', () => {
    expect(initiale(session('x', ['p5', 'p4', 'p3', 'p2', 'p1']), cinq, aleaX).ids).toEqual(['p5', 'p4', 'p3']);
    expect(initiale(session('x', ['p4']), cinq, aleaX).ids).toEqual(['p4', 'p1']);
    expect(initiale(session('x', []), cinq, aleaX).ids).toEqual(['p1', 'p2']);
  });
  it('aléa inconnu : aléa par défaut, les produits de la session qui lui appartiennent sont gardés', () => {
    expect(initiale(session('inconnu', ['pompe-de-relevage', 'bouclier-de-baie']))).toEqual({
      alea: 'inondations', ids: ['pompe-de-relevage', 'batardeau-modulable'],
    });
  });
  it('aléa à deux produits : les deux, jamais plus ; aléa à un seul produit : tous', () => {
    expect(initiale(session('feux-de-foret', ['grille-pare-braises']))).toEqual({ alea: 'feux-de-foret', ids: ['grille-pare-braises', 'sprinkler-de-toiture'] });
    expect(initiale(session('solo', []), [{ id: 'seul', aleas: ['solo'] }], [{ id: 'solo', niveau: 1 }])).toEqual({ alea: 'solo', ids: ['seul'] });
  });
  it('limites invalides : valeurs par défaut 2 et 3', () => {
    expect(selectionInitiale({ brut: null, produits, aleas, limites: { min: 'a' } }).ids).toHaveLength(2);
    expect(selectionInitiale({ brut: session('inondations', ['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']), produits, aleas, limites: null }).ids).toHaveLength(3);
  });
});

describe('lot 9-A : selectionPourAlea', () => {
  it('pour chacun des quatre aléas : deux premiers produits de l\'aléa, dans l\'ordre des données', () => {
    for (const alea of aleas) {
      const attendus = ids(produitsDeAlea(produits, alea.id)).slice(0, 2);
      expect(selectionPourAlea(alea.id, produits, limites), alea.id).toEqual({ alea: alea.id, ids: attendus });
    }
  });
  it('aléa inconnu : aucun produit, sans exception', () => {
    expect(selectionPourAlea('inconnu', produits, limites)).toEqual({ alea: 'inconnu', ids: [] });
  });
});

describe('lot 9-A : basculerProduit', () => {
  const dispo = ['a', 'b', 'c', 'd'];
  it('ajoute à la fin, retire sans changer l\'ordre des autres', () => {
    expect(basculerProduit(['a', 'b'], 'c', dispo, limites)).toEqual({ ids: ['a', 'b', 'c'], resultat: 'ajoute' });
    expect(basculerProduit(['a', 'b', 'c'], 'a', dispo, limites)).toEqual({ ids: ['b', 'c'], resultat: 'retire' });
    expect(basculerProduit(['c', 'a', 'b'], 'a', dispo, limites)).toEqual({ ids: ['c', 'b'], resultat: 'retire' });
  });
  it('un quatrième produit est refusé (max), un décochage sous deux aussi (min) ; l\'état est inchangé', () => {
    expect(basculerProduit(['a', 'b', 'c'], 'd', dispo, limites)).toEqual({ ids: ['a', 'b', 'c'], resultat: 'max' });
    expect(basculerProduit(['a', 'b'], 'a', dispo, limites)).toEqual({ ids: ['a', 'b'], resultat: 'min' });
  });
  it('identifiant absent des produits disponibles : inconnu', () => {
    expect(basculerProduit(['a', 'b'], 'z', dispo, limites)).toEqual({ ids: ['a', 'b'], resultat: 'inconnu' });
    expect(basculerProduit(['a', 'b'], undefined, dispo, limites)).toEqual({ ids: ['a', 'b'], resultat: 'inconnu' });
  });
  it('propriété : sur toutes les suites de six bascules, l\'effectif reste entre min et max', () => {
    const jeux = [...aleas.map((a) => ids(produitsDeAlea(produits, a.id))), ['p1', 'p2', 'p3', 'p4', 'p5']];
    for (const disponibles of jeux) {
      const initial = selectionPourAlea('x', disponibles.map((id) => ({ id, aleas: ['x'] })), limites).ids;
      const parcourir = (etat, reste) => {
        expect(etat.length).toBeGreaterThanOrEqual(limites.min);
        expect(etat.length).toBeLessThanOrEqual(limites.max);
        expect(new Set(etat).size).toBe(etat.length);
        expect(etat.every((id) => disponibles.includes(id))).toBe(true);
        if (reste === 0) return;
        for (const id of disponibles) parcourir(basculerProduit(etat, id, disponibles, limites).ids, reste - 1);
      };
      parcourir(initial, 6);
    }
  });
});

describe('lot 9-A : serialiserSelection, pureté et robustesse', () => {
  it('aller-retour : identifiants seulement, relus sans modification', () => {
    const brut = serialiserSelection('canicule', ['cool-roofing', 'isolant-reflecteur']);
    expect(JSON.parse(brut)).toEqual({ v: 1, alea: 'canicule', produits: ['cool-roofing', 'isolant-reflecteur'] });
    expect(lireSelection(brut)).toEqual({ alea: 'canicule', produits: ['cool-roofing', 'isolant-reflecteur'] });
    for (const alea of aleas) {
      const { ids: choisis } = selectionPourAlea(alea.id, produits, limites);
      expect(selectionInitiale({ brut: serialiserSelection(alea.id, choisis), produits, aleas, limites })).toEqual({ alea: alea.id, ids: choisis });
    }
  });
  it('arguments gelés : aucune fonction ne les modifie', () => {
    const p = gele(structuredClone(produits));
    const a = gele(structuredClone(aleas));
    const l = gele({ ...limites });
    const liste = gele(['batardeau-modulable', 'clapet-anti-retour']);
    expect(() => {
      selectionInitiale({ brut: session('inondations', ['pompe-de-relevage']), produits: p, aleas: a, limites: l });
      selectionPourAlea('inondations', p, l);
      basculerProduit(liste, 'pompe-de-relevage', ids(p), l);
      basculerProduit(liste, 'batardeau-modulable', ids(p), l);
      produitsDeAlea(p, 'canicule');
      aleaParDefaut(a);
      serialiserSelection('x', liste);
    }).not.toThrow();
    expect(liste).toEqual(['batardeau-modulable', 'clapet-anti-retour']);
  });
  it('entrées invalides : jamais d\'exception', () => {
    expect(() => {
      selectionInitiale();
      selectionInitiale({});
      selectionInitiale({ brut: 1, produits: 'x', aleas: 3, limites: 'y' });
      selectionPourAlea(undefined, undefined, undefined);
      basculerProduit(undefined, undefined, undefined, undefined);
      basculerProduit('abc', 'a', 'abc', null);
      serialiserSelection(undefined, undefined);
    }).not.toThrow();
    expect(basculerProduit(null, 'a', ['a'], limites)).toEqual({ ids: ['a'], resultat: 'ajoute' });
    expect(selectionInitiale()).toEqual({ alea: null, ids: [] });
  });
});

describe('lot 9-A : comparateur.html', () => {
  it('lang, noindex, un seul h1, E14-1 à E14-4 une fois dans l\'ordre, fil d\'Ariane, deux fieldset avec legend', () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="fr" data-donnees="produit">/);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(codes(html)).toEqual(['E14-1', 'E14-2', 'E14-3', 'E14-4']);
    expect(roles(html)).toEqual(['en-tete', 'selection', 'comparaison', 'pied']);
    expect(html).not.toMatch(/\sorder:/);
    const fil = bloc(html, '<nav class="fil"', '</nav>');
    expect(fil).toContain('data-aria-label="produit.comparateur.fil.aria"');
    expect(fil.match(/<li/g)).toHaveLength(3);
    expect(fil).toMatch(/<li class="fil__courant" aria-current="page"/);
    expect(html.indexOf('<nav class="fil"')).toBeGreaterThan(html.indexOf('</header>'));
    expect(html.indexOf('<nav class="fil"')).toBeLessThan(html.indexOf('<main'));
    expect(html.match(/<fieldset/g)).toHaveLength(2);
    expect(html.match(/<fieldset[^>]*>\s*<legend/g)).toHaveLength(2);
    expect(html).toContain('<noscript>');
    expect(html).toContain('class="lien-evitement"');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('data-bloc="E14-1" data-role="en-tete"');
  });
  it('aucun name, aucun id dupliqué, aucun script en ligne, aucune adresse http(s), aucun style en ligne, aucun bouton ambre', () => {
    expect(html).not.toMatch(/<(?:input|select|textarea|button)[^>]*\sname=/);
    const idents = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(idents).size).toBe(idents.length);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\sstyle=/);
    expect(html).not.toContain('bouton--action');
    for (const [, cible] of html.matchAll(/aria-labelledby="([^"]+)"/g)) expect(html, cible).toContain(`id="${cible}"`);
    const gabarits = [...html.matchAll(/<template[^>]*id="([^"]+)">([\s\S]*?)<\/template>/g)];
    expect(gabarits.length).toBeGreaterThanOrEqual(2);
    for (const [, , contenu] of gabarits) expect(contenu).not.toMatch(/\sid=/);
  });
  it('toutes les clés data-texte, data-lien, data-aria-label et data-liste se résolvent', () => {
    const hors = html.replace(/<template data-liste="[^"]+">[\s\S]*?<\/template>\s*(?=<\/ul>|<div class="pied__colonne pied__marque")/g, '');
    for (const attribut of ['data-texte', 'data-lien', 'data-aria-label']) {
      for (const [, cle] of hors.matchAll(new RegExp(` ${attribut}="([^"]+)"`, 'g'))) expect(() => resoudre(donnees, cle), `${attribut} ${cle}`).not.toThrow();
    }
    for (const [, cle] of html.matchAll(/<template data-liste="([^"]+)">/g)) {
      if (cle !== 'entrees') expect(cle.startsWith('site.'), cle).toBe(true);
    }
  });
  it('en-tête, pied et décor identiques à ceux d\'index.html ; les quatorze pages Hi-Fi chargent compteur.js et compte-lien.js', () => {
    expect(sansCode(bloc(html, '<header', '</header>'))).toBe(sansCode(bloc(index, '<header', '</header>')));
    expect(sansCode(bloc(html, '<footer', '</footer>'))).toBe(sansCode(bloc(index, '<footer', '</footer>')));
    expect(bloc(html, '<div class="relief"', '</svg>\n  </div>')).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
    const pages = ['index.html', 'diagnostic.html', 'produit.html', 'panier.html', 'pro.html', 'connexion.html', 'compte.html', 'achats.html', 'achat.html', 'informations.html', 'sav-acces.html', 'sav.html', 'demandes.html', 'comparateur.html'];
    expect(pages).toHaveLength(14);
    for (const page of pages) {
      const source = lire(page);
      expect(source.match(/<script type="module" src="assets\/js\/compteur\.js"><\/script>/g), page).toHaveLength(1);
      expect(source.match(/<script type="module" src="assets\/js\/compte-lien\.js"><\/script>/g), page).toHaveLength(1);
    }
  });
  it('feuilles de style : celles du diagnostic plus comparateur.css ; deux requêtes de données au plus (site et produit)', () => {
    const feuilles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
    expect(feuilles).toEqual(['css/tokens.css', 'css/base.css', 'css/composants.css', 'css/accueil.css', 'css/diagnostic.css', 'css/comparateur.css']);
    for (const f of feuilles) expect(existsSync(f), f).toBe(true);
    expect(html).toContain('data-donnees="produit"');
  });
});

describe('lot 9-A : liens, workflow, CSS, modules et CLAUDE.md', () => {
  const lignesUses = (texte) => texte.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
  it('liens.comparateur pointe vers un fichier existant, tous les liens.* aussi ; l\'entrée du pied existe, le balisage statique du pied est inchangé', () => {
    expect(site.liens.comparateur).toBe('comparateur.html');
    for (const [cle, lien] of Object.entries(site.liens)) {
      if (lien.startsWith('#')) continue;
      expect(existsSync(lien.split('#')[0]), cle).toBe(true);
    }
    expect(site.pied.colonnes[1].titre).toBe('Aide et informations');
    expect(site.pied.colonnes[1].entrees).toContainEqual({ texte: 'Comparer des solutions', lien: 'comparateur' });
    const pied = bloc(html, '<footer', '</footer>');
    expect(pied.match(/data-lien-element="lien"/g)).toHaveLength(1);
    expect(pied).toContain('<template data-liste="entrees">');
    expect(pied).not.toContain('comparateur');
  });
  it('le workflow publie comparateur.html ; permissions: présent ; ni secrets. ni pull_request_target ; lignes uses: identiques à celles de main', () => {
    const texte = lire('.github/workflows/pages.yml');
    expect(texte.match(/for p in ([^;]+);/)[1].split(/\s+/)).toContain('comparateur.html');
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
    expect(lignesUses(texte)).toEqual([
      'uses: actions/checkout@v4', 'uses: actions/setup-node@v4', 'uses: actions/checkout@v4',
      'uses: actions/configure-pages@v5', 'uses: actions/upload-pages-artifact@v3', 'uses: actions/deploy-pages@v4',
    ]);
  });
  it('comparateur.css sans valeur hexadécimale de couleur ; tokens.css porte les nouveaux jetons', () => {
    expect(lire('css/comparateur.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(lire('css/tokens.css')).toContain('--comparateur-tableau-max: 64rem');
  });
  it('modules : ni réseau, ni cookie, ni autre stockage que comparaison ; la logique ne touche ni document, ni window, ni sessionStorage', () => {
    const logique = lire('assets/js/comparateur-logique.js');
    expect(logique).not.toMatch(/\bdocument\b|\bwindow\b|sessionStorage|localStorage/);
    const src = lire('assets/js/comparateur.js').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie|innerHTML|insertAdjacentHTML|history\.|location/);
    expect(src).not.toMatch(/\.name\s*=\s*['"](?!\$)/);
    expect([...src.matchAll(/(?:getItem|setItem|removeItem)\(([^,)]+)/g)].map((m) => m[1])).toEqual(['cle', 'cle']);
    expect(logique).toContain("export const CLE_COMPARAISON = 'comparaison'");
    expect(src).toMatch(/import \{ CLE_COMPARAISON,[^}]*\} from '\.\/comparateur-logique\.js'/);
  });
  it('apercu.txt vise l\'accueil en Hi-Fi ; Docs/apercus.txt décrit le lot 9', () => {
    expect([['index.html', 'type: hifi', 'titre: Comparateur de solutions'], ['index.html', 'type: hifi', 'titre: Carte réelle avec consentement'], ['index.html', 'type: hifi', "titre: Carte réelle seule, saisie assistée, calques selon l'adresse"], ['index.html', 'type: hifi', 'titre: Diagnostic : mise en page, niveau calculé, adresse stricte']]).toContainEqual(lire('apercu.txt').split('\n').filter(Boolean));
    expect(lire('Docs/apercus.txt')).toMatch(/^lot-9\|.{10,}$/m);
  });
  it('CLAUDE.md fait moins de 9 000 caractères et décrit le comparateur ; conventions.md a une section Comparateur et reste sous 190 lignes', () => {
    const texte = lire('CLAUDE.md');
    expect([...texte].length).toBeLessThan(9000);
    for (const mot of ['comparateur.html', 'comparateur-logique.js', 'comparateur.js', 'comparateur.css', 'comparaison', 'selectionInitiale', 'basculerProduit', 'performances']) expect(texte, mot).toContain(mot);
    const conventions = lire('Docs/ref/conventions.md');
    expect(conventions).toMatch(/^## Comparateur/m);
    expect(conventions.split('\n').length).toBeLessThanOrEqual(190);
  });
});
