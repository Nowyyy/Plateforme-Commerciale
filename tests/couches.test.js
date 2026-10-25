import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as L from '../assets/outils/couches-logique.js';
import { tuileDepuis, bboxTuile3857 } from '../assets/outils/faisabilite-logique.js';
import { construireCatalogue } from './couches-fixture.js';

const lire = (f) => readFileSync(f, 'utf8');
const XML = construireCatalogue();
const CATALOGUE = L.extraireCatalogue(XML);
const entree = (nom, titre = '', resume = '') => ({ nom, titre, resume });
const noms = (liste) => liste.map((e) => e.nom);

describe('lot 4b-C : catalogue', () => {
  it('extraireCatalogue : plus de 40 couches, ordre d\'apparition, doublon et groupe sans nom ignorés, styles écartés', () => {
    expect(CATALOGUE.length).toBeGreaterThan(40);
    expect(CATALOGUE).toHaveLength(46);
    expect(CATALOGUE[0].nom).toBe('GROUPE');
    expect(CATALOGUE[1].nom).toBe('ALEARG');
    expect(noms(CATALOGUE).filter((n) => n === 'ALEARG')).toHaveLength(1);
    expect(new Set(noms(CATALOGUE)).size).toBe(CATALOGUE.length);
    expect(noms(CATALOGUE).some((n) => n.startsWith('style'))).toBe(false);
    const alearg = CATALOGUE.find((e) => e.nom === 'ALEARG');
    expect(alearg.titre).toBe('Aléa retrait-gonflement des argiles');
    expect(alearg.crs3857).toBe(true);
    expect(alearg.echelleMin).toBe(0);
    expect(alearg.echelleMax).toBeNull();
    expect(CATALOGUE[0].crs3857).toBe(false);
  });

  it('extraireCatalogue : entités décodées une seule fois, résumé tronqué à 160 caractères', () => {
    const e = CATALOGUE.find((c) => c.nom === 'Zone inondable & crue');
    expect(e.titre).toBe('Crue « centennale » <test>');
    expect(e.resume).toBe('Entités : &lt; é A "x" \'y\' >.');
    const long = CATALOGUE.find((c) => c.nom === 'COUCHE_05');
    expect(Array.from(long.resume)).toHaveLength(160);
    expect(long.resume.endsWith('…')).toBe(true);
  });

  it('extraireCatalogue : couches imbriquées, héritage du CRS, CDATA, préfixe d\'espace de noms ; XML vide ou invalide : liste vide', () => {
    const imbrique = '<wms:Layer><wms:Name>PARENT</wms:Name><wms:CRS>epsg:3857</wms:CRS><wms:Layer><wms:Name><![CDATA[ENFANT <1>]]></wms:Name></wms:Layer></wms:Layer>';
    const r = L.extraireCatalogue(imbrique);
    expect(noms(r)).toEqual(['PARENT', 'ENFANT <1>']);
    expect(r[1].crs3857).toBe(true);
    for (const v of ['', '   ', 'texte quelconque', '<Layer><Title>sans nom</Title></Layer>', '<Layer><Name>ouvert', null, undefined, 42, {}]) {
      expect(L.extraireCatalogue(v), String(v)).toEqual([]);
    }
  });

  it('classerFamilles : ALEARG, TRI, OLD, majuscules ; PPRN_COMMUNE_GASPAR seul et TRIANGLE ne donnent rien', () => {
    expect(L.classerFamilles(entree('ALEARG'))).toEqual(['argiles']);
    expect(L.classerFamilles(entree('PPRN_COMMUNE_GASPAR', 'Communes couvertes par un plan'))).toEqual([]);
    expect(L.classerFamilles(entree('OLD_DEBROUSSAILLEMENT'))).toEqual(['feux']);
    expect(L.classerFamilles(entree('TRI_ZONE_SUBM'))).toEqual(['inondation']);
    expect(L.classerFamilles(entree('ZONE INONDABLE EN MAJUSCULES'))).toEqual(['inondation']);
    expect(L.classerFamilles(entree('TRIANGLE_TEST', 'Triangle'))).toEqual([]);
    expect(L.classerFamilles(entree('ILOT_CHALEUR', 'Îlots de chaleur'))).toEqual(['chaleur']);
    expect(L.classerFamilles(entree('X-rga-Y'))).toEqual(['argiles']);
    expect(L.classerFamilles(entree('FEU_ET_ARGILES', 'Feu de forêt et retrait des argiles'))).toEqual(['argiles', 'feux']);
    expect(L.classerFamilles(entree('Débroussaillement', 'Forêt'))).toEqual(['feux']);
  });

  it('grouperParFamille et filtrerCatalogue : ordre du catalogue, accents, casse, texte vide', () => {
    const g = L.grouperParFamille(CATALOGUE);
    expect(Object.keys(g)).toEqual(['inondation', 'argiles', 'feux', 'chaleur']);
    expect(noms(g.argiles)).toEqual(['ALEARG', 'FEU_ET_ARGILES']);
    expect(noms(g.feux)).toEqual(['OLD_DEBROUSSAILLEMENT', 'FEU_ET_ARGILES']);
    expect(noms(g.inondation)).toContain('TRI_ZONE_SUBM');
    expect(noms(g.inondation)).not.toContain('PPRN_COMMUNE_GASPAR');
    expect(L.filtrerCatalogue(CATALOGUE, '')).toHaveLength(CATALOGUE.length);
    expect(L.filtrerCatalogue(CATALOGUE, '   ')).toHaveLength(CATALOGUE.length);
    expect(noms(L.filtrerCatalogue(CATALOGUE, 'ALEA RETRAIT'))).toEqual(['ALEARG']);
    expect(noms(L.filtrerCatalogue(CATALOGUE, 'aléa'))).toEqual(['ALEARG']);
    expect(noms(L.filtrerCatalogue(CATALOGUE, 'ILOTS CHALEUR'))).toEqual(['ILOT_CHALEUR']);
    expect(L.filtrerCatalogue(CATALOGUE, 'introuvable-xyz')).toEqual([]);
  });

  it('choisirSelection : 6 retenus, 7e refusée, doublon ignoré, nom inconnu refusé', () => {
    const tous = noms(CATALOGUE);
    const r = L.choisirSelection([tous[0], tous[1], tous[1], 'INCONNUE', ...tous.slice(2, 8)], CATALOGUE);
    expect(r.retenus).toEqual(tous.slice(0, 6));
    expect(r.refuses).toEqual([{ nom: 'INCONNUE', raison: 'inconnu' }, { nom: tous[6], raison: 'limite' }, { nom: tous[7], raison: 'limite' }]);
    expect(L.choisirSelection([tous[0], tous[1], tous[2]], CATALOGUE, 2).refuses).toEqual([{ nom: tous[2], raison: 'limite' }]);
    expect(L.choisirSelection('pas une liste', CATALOGUE)).toEqual({ retenus: [], refuses: [] });
  });

  it('lieuPourEntree : un lieu par famille, la première famille l\'emporte, couche sans famille à Paris', () => {
    expect(L.lieuPourEntree(entree('ZONE_INONDABLE'))).toBe(L.LIEUX.inondation);
    expect(L.lieuPourEntree(entree('ALEARG'))).toBe(L.LIEUX.argiles);
    expect(L.lieuPourEntree(entree('OLD_X'))).toBe(L.LIEUX.feux);
    expect(L.lieuPourEntree(entree('CANICULE'))).toBe(L.LIEUX.chaleur);
    expect(L.lieuPourEntree(entree('FEU_ET_ARGILES', 'Feu de forêt et retrait des argiles'))).toBe(L.LIEUX.argiles);
    expect(L.lieuPourEntree(entree('SANS_FAMILLE'))).toBe(L.LIEUX.autre);
    expect(L.LIEUX.autre.libelle).toBe('Paris');
    expect(Object.keys(L.LIEUX)).toEqual(['inondation', 'argiles', 'feux', 'chaleur', 'autre']);
    expect(L.LIEUX.argiles).toMatchObject({ libelle: 'Toulouse', lat: 43.6047, lon: 1.4442, zoom: 11 });
    expect(L.LIEUX.feux).toMatchObject({ libelle: 'Aix-en-Provence', lat: 43.5297, lon: 5.4474, zoom: 11 });
  });
});

describe('lot 4b-C : URL', () => {
  it('urlGetMapCalque : https, hôte avec www, paramètres WMS, couche encodée', () => {
    const u = new URL(L.urlGetMapCalque({ couche: 'Zone inondable & crue', lieu: L.LIEUX.inondation }));
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('www.georisques.gouv.fr');
    expect(u.pathname).toBe('/services');
    const p = Object.fromEntries(u.searchParams);
    expect(p).toMatchObject({
      SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetMap', CRS: 'EPSG:3857', WIDTH: '256', HEIGHT: '256', FORMAT: 'image/png', TRANSPARENT: 'TRUE', LAYERS: 'Zone inondable & crue',
    });
    expect(u.search).toContain('LAYERS=Zone+inondable+%26+crue');
  });

  it('urlTuileOsmLieu et urlGetMapCalque : mêmes z/x/y (bbox de la tuile WMS = tuile OSM)', () => {
    for (const lieu of Object.values(L.LIEUX)) {
      const osm = /\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(L.urlTuileOsmLieu(lieu));
      expect(new URL(L.urlTuileOsmLieu(lieu)).hostname).toBe('tile.openstreetmap.org');
      const [z, x, y] = osm.slice(1).map(Number);
      expect(z).toBe(lieu.zoom);
      const attendu = bboxTuile3857(z, x, y);
      const bbox = new URL(L.urlGetMapCalque({ couche: 'C', lieu })).searchParams.get('BBOX').split(',').map(Number);
      bbox.forEach((v, i) => expect(Math.abs(v - attendu[i])).toBeLessThan(1e-6));
      expect(tuileDepuis(lieu.lat, lieu.lon, lieu.zoom)).toEqual({ z, x, y });
      expect(L.tuilePourLieu(lieu)).toEqual({ z, x, y });
    }
    expect(L.urlTuileOsmLieu(L.LIEUX.argiles)).not.toBe(L.urlTuileOsmLieu(L.LIEUX.feux));
  });

  it('urlApiGaspar et urlApiRga : hôte avec www, latlon en lon,lat encodé', () => {
    const g = new URL(L.urlApiGaspar({ lat: 48.8566, lon: 2.3522 }));
    expect(g.hostname).toBe('www.georisques.gouv.fr');
    expect(g.pathname).toBe('/api/v1/gaspar/risques');
    expect(g.searchParams.get('latlon')).toBe('2.3522,48.8566');
    expect(g.searchParams.get('rayon')).toBe('1000');
    expect(g.search).toContain('latlon=2.3522%2C48.8566');
    const r = new URL(L.urlApiRga({ lat: 43.6047, lon: 1.4442 }));
    expect(r.hostname).toBe('www.georisques.gouv.fr');
    expect(r.pathname).toBe('/api/v1/rga');
    expect(r.searchParams.get('latlon')).toBe('1.4442,43.6047');
    expect(r.searchParams.has('rayon')).toBe(false);
    expect(new URL(L.urlApiRga(null)).searchParams.get('latlon')).toBe('0,0');
  });
});

describe('lot 4b-C : aplatissement, durées, rapport', () => {
  it('aplatirJson : objet imbriqué, tableau long, chaîne tronquée, valeurs simples', () => {
    expect(L.aplatirJson({ a: { b: 1, c: 'x' }, d: true, e: null })).toEqual(['a.b: 1', 'a.c: x', 'd: true', 'e: null']);
    expect(L.aplatirJson({ liste: [1, 2, 3, 4, 5] })).toEqual(['liste[0]: 1', 'liste[1]: 2', 'liste[2]: 3', 'liste: … 5 éléments']);
    expect(L.aplatirJson({ v: [] , o: {} })).toEqual(['v: []', 'o: {}']);
    const [ligne] = L.aplatirJson({ t: 'a'.repeat(200) });
    expect(ligne).toBe(`t: ${'a'.repeat(80)} …`);
    expect(L.aplatirJson('seul')).toEqual(['(racine): seul']);
    expect(L.aplatirJson({ s: 'ligne1\nligne2\u0007' })).toEqual(['s: ligne1 ligne2']);
  });

  it('aplatirJson : maxLignes, profondeur, valeurs spéciales, circularité sans exception', () => {
    const grand = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
    const l = L.aplatirJson(grand);
    expect(l).toHaveLength(40);
    expect(l[39]).toBe('… (lignes suivantes omises)');
    expect(L.aplatirJson(grand, { maxLignes: 5 })).toHaveLength(5);
    expect(L.aplatirJson({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toEqual(['a.b.c.d.e.f: … (profondeur maximale)']);
    const speciaux = L.aplatirJson({ n: Number.NaN, i: Infinity, b: 10n, f: () => 1, u: undefined, s: Symbol('x') });
    expect(speciaux).toEqual(['n: NaN', 'i: Infinity', 'b: 10', 'f: (non sérialisable)', 'u: null', 's: (non sérialisable)']);
    const circulaire = { nom: 'c' };
    circulaire.soi = circulaire;
    circulaire.liste = [circulaire];
    expect(L.aplatirJson(circulaire)).toEqual(['nom: c', 'soi: (référence circulaire)', 'liste[0]: (référence circulaire)']);
    const piege = { get mauvais() { throw new Error('non'); } };
    expect(() => L.aplatirJson(piege)).not.toThrow();
    expect(L.aplatirJson(piege)).toEqual(['(valeur non lisible)']);
    expect(L.aplatirJson(undefined)).toEqual(['(racine): null']);
  });

  it('resumerDurees : min, max, médiane (impaire, paire), valeurs invalides ignorées, liste vide : null', () => {
    expect(L.resumerDurees([30, 10, 20])).toEqual({ min: 10, max: 30, mediane: 20 });
    expect(L.resumerDurees([10, 20, 30, 41])).toEqual({ min: 10, max: 41, mediane: 25 });
    expect(L.resumerDurees([5, 'x', null, Number.NaN, -3, 7])).toEqual({ min: 5, max: 7, mediane: 6 });
    expect(L.resumerDurees([])).toBeNull();
    expect(L.resumerDurees('non')).toBeNull();
  });

  it('formaterRapportCouches : toutes les sections, jugements, durées, limites, aucun caractère de contrôle', () => {
    const familles = L.grouperParFamille(CATALOGUE);
    const rapport = L.formaterRapportCouches({
      date: '2026-01-01T10:00:00.000Z',
      origine: 'https://exemple.github.io',
      navigateur: 'Navigateur\u0007 de test',
      catalogue: { etat: 'ok', detail: '1560 ms', nombre: CATALOGUE.length },
      familles,
      cartes: [
        { nom: 'ALEARG', titre: 'Aléa', lieu: 'Toulouse', durees: [1200, 800], etat: 'ok', jugement: 'bien' },
        { nom: 'TRI_ZONE_SUBM', titre: 'Zones', lieu: 'Paris', durees: [], etat: 'image-echec', jugement: 'illisible' },
        { nom: 'OLD_DEBROUSSAILLEMENT', titre: 'OLD', lieu: 'Aix-en-Provence', durees: [3000, 4000], etat: 'ok', jugement: 'rien' },
        { nom: 'AUTRE', titre: '', lieu: 'Paris', durees: [10, 20], etat: 'ok', jugement: '' },
      ],
      api: [
        { libelle: 'Gaspar, Paris', etat: 'ok', statut: 'HTTP 200', ms: 420, lignes: ['data[0].code: 75', 'data: … 9 éléments'] },
        { libelle: 'RGA, Toulouse', etat: 'http', statut: 'HTTP 404', ms: 90, lignes: ['message: introuvable'] },
      ],
    });
    for (const section of ['Rapport du catalogue des couches Géorisques', 'Horodatage (date et heure) : 2026-01-01T10:00:00.000Z', 'Origine de la page : https://exemple.github.io', 'Navigateur : Navigateur de test', 'Catalogue', 'Couches lues : 46', 'Famille Inondation', 'Famille Argiles', 'Famille Feux de forêt', 'Famille Chaleur', "Tuiles d'essai (4)", 'API Géorisques', 'Limites']) {
      expect(rapport, section).toContain(section);
    }
    expect(rapport).toContain('ALEARG | Aléa retrait-gonflement des argiles');
    expect(rapport).toContain('durées : 1200 ms ; 800 ms');
    expect(rapport).toContain('jugement : Montre bien la zone');
    expect(rapport).toContain('jugement : Illisible');
    expect(rapport).toContain('jugement : Ne montre rien');
    expect(rapport).toContain('jugement : non renseigné');
    expect(rapport).toContain("état : échec de l'image");
    expect(rapport).toContain('Durées de chargement : min 10 ms, médiane 1000 ms, max 4000 ms');
    expect(rapport).toContain('Gaspar, Paris : ok, HTTP 200 (420 ms)');
    expect(rapport).toContain('    data: … 9 éléments');
    expect(rapport).toContain('RGA, Toulouse : réponse HTTP lisible ou en erreur, HTTP 404 (90 ms)');
    expect(rapport).toContain('ne recommande aucune couche');
    expect(rapport).toContain('Le jugement est subjectif');
    expect(rapport).toContain('extension');
    expect(Array.from(rapport).every((c) => c === '\n' || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127))).toBe(true);
  });

  it('formaterRapportCouches : 25 lignes au plus par famille, paramètres absents sans exception', () => {
    const longue = Array.from({ length: 30 }, (_, i) => entree(`L${i}`, `T${i}`));
    const r = L.formaterRapportCouches({ familles: { inondation: longue } });
    expect(r.split('\n').filter((l) => /^- L\d+ \| T\d+$/.test(l))).toHaveLength(25);
    expect(r).toContain('… 5 autres non listées');
    for (const v of [undefined, null, 'x', 7, [], { cartes: 'non', api: 3, familles: 9, catalogue: [] }]) {
      expect(() => L.formaterRapportCouches(v)).not.toThrow();
      expect(L.formaterRapportCouches(v)).toContain('Limites');
    }
  });
});

describe('lot 4b-C : pureté et conformité', () => {
  it('arguments gelés non modifiés, entrées de types inattendus sans exception', () => {
    const catalogue = Object.freeze(CATALOGUE.map((e) => Object.freeze({ ...e })));
    const noms_ = Object.freeze(['ALEARG', 'ALEARG', 'X']);
    const json = Object.freeze({ a: Object.freeze([1, 2, 3, 4]), b: Object.freeze({ c: 'd' }) });
    const copie = JSON.stringify([catalogue, noms_, json]);
    L.grouperParFamille(catalogue);
    L.filtrerCatalogue(catalogue, 'x');
    L.choisirSelection(noms_, catalogue);
    L.aplatirJson(json);
    L.formaterRapportCouches(Object.freeze({ cartes: Object.freeze([Object.freeze({ nom: 'n' })]), familles: Object.freeze({}) }));
    expect(JSON.stringify([catalogue, noms_, json])).toBe(copie);
    const bizarres = [undefined, null, 0, 1.5, 'texte', true, [], {}, () => 1, Symbol('s'), 10n];
    for (const v of bizarres) {
      for (const f of [L.extraireCatalogue, L.classerFamilles, L.grouperParFamille, L.lieuPourEntree, L.urlGetMapCalque, L.urlTuileOsmLieu, L.urlApiGaspar, L.urlApiRga, L.aplatirJson, L.resumerDurees, L.formaterRapportCouches, L.tuilePourLieu]) {
        expect(() => f(v), f.name).not.toThrow();
      }
      expect(() => L.filtrerCatalogue(v, v)).not.toThrow();
      expect(() => L.choisirSelection(v, v, v)).not.toThrow();
      expect(() => L.urlGetMapCalque({ couche: v, lieu: v })).not.toThrow();
    }
    expect(new URL(L.urlGetMapCalque(undefined)).hostname).toBe('www.georisques.gouv.fr');
  });

  it('couches-logique.js : aucun accès DOM, réseau, stockage ni horloge ; URL https vers HOTES seulement, jamais sans www', () => {
    const source = lire('assets/outils/couches-logique.js');
    for (const interdit of ['document', 'window', 'fetch', 'Date', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'indexedDB', 'cookie', 'performance']) {
      expect(source.includes(interdit), interdit).toBe(false);
    }
    const urls = source.match(/https?:\/\/[^\s'"`)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.startsWith('https://'), u).toBe(true);
      expect(L.HOTES, u).toContain(new URL(u).hostname);
    }
    expect(source).not.toContain('://georisques.gouv.fr');
    expect(source).not.toMatch(/\\b/);
    expect(L.HOTES).toEqual(['data.geopf.fr', 'georisques.gouv.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org']);
  });

  it('couches.html : lang, noindex, referrer, un h1, noscript, aucune URL en dur, aucun formulaire ni script en ligne, deux boutons au plus', () => {
    const html = lire('assets/outils/couches.html');
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('<noscript>');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<form[\s>]/);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect((html.match(/<button[\s>]/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(html).not.toMatch(/<img[\s>]/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const phrase of ["L'IGN data.geopf.fr, Géorisques www.georisques.gouv.fr et OpenStreetMap tile.openstreetmap.org voient votre adresse IP. Les lieux testés sont des villes : Paris, Toulouse et Aix-en-Provence. Rien n'est enregistré.", 'Lire le catalogue des couches']) {
      expect(html).toContain(phrase);
    }
  });

  it('couches.js : sans stockage ni envoi ; requêtes en cors, sans identifiants, sans cache ; aucune URL en dur ; faisabilite.css sans valeur hexadécimale', () => {
    const js = lire('assets/outils/couches.js');
    for (const interdit of ['localStorage', 'sessionStorage', 'indexedDB', 'sendBeacon', 'document.cookie', 'XMLHttpRequest', 'WebSocket']) expect(js.includes(interdit), interdit).toBe(false);
    expect(js).toContain("mode: 'cors', credentials: 'omit', cache: 'no-store'");
    expect(js).not.toMatch(/https?:\/\//);
    expect(js).not.toMatch(/(?<!aria-)disabled/);
    expect(lire('assets/outils/faisabilite.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(lire('assets/outils/faisabilite.css')).not.toMatch(/\b(?:red|rgb|hsl)a?\(|\bred\b/i);
  });

  it('faisabilite.html : lien vers couches.html, sans nouvelle requête ni nouveau bouton', () => {
    const html = lire('assets/outils/faisabilite.html');
    expect(html).toContain('<a href="couches.html">Étape 2 : catalogue des couches</a>');
    expect(html).not.toMatch(/https?:\/\//);
    expect((html.match(/<button[\s>]/g) ?? []).length).toBe(1);
  });
});
