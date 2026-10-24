import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as L from '../assets/outils/faisabilite-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const SOURCE = lire('assets/outils/faisabilite-logique.js');
const DEMI = 20037508.342789244;

// référence indépendante : formule de Web Mercator
const refTuile = (lat, lon, z) => {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: Math.floor(((lon + 180) / 360) * n), y: Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n) };
};

describe('tuileDepuis / centreTuile', () => {
  it('zoom 0 : tuile (0, 0)', () => {
    expect(L.tuileDepuis(48.85, 2.35, 0)).toEqual({ z: 0, x: 0, y: 0 });
  });
  it('coins du monde au zoom 3', () => {
    expect(L.tuileDepuis(85, -180, 3)).toEqual({ z: 3, x: 0, y: 0 });
    expect(L.tuileDepuis(-85, 180, 3)).toEqual({ z: 3, x: 7, y: 7 });
  });
  it('Paris au zoom 12 : 2074 / 1409 à 1 près, égal à la formule de référence', () => {
    const t = L.tuileDepuis(L.LIEU.lat, L.LIEU.lon, 12);
    expect(Math.abs(t.x - 2074)).toBeLessThanOrEqual(1);
    expect(Math.abs(t.y - 1409)).toBeLessThanOrEqual(1);
    expect(t).toEqual({ z: 12, ...refTuile(L.LIEU.lat, L.LIEU.lon, 12) });
  });
  it('latitude de 90° et longitude excessive : valeurs clampées', () => {
    expect(L.tuileDepuis(90, 0, 4).y).toBe(0);
    expect(L.tuileDepuis(-90, 0, 4).y).toBe(15);
    expect(L.tuileDepuis(0, 500, 4).x).toBe(15);
    expect(L.tuileDepuis(0, -500, 4).x).toBe(0);
  });
  it('aller-retour sur 200 tuiles d\'une grille déterministe', () => {
    let essais = 0;
    for (let z = 1; z <= 10; z++) {
      const n = 2 ** z;
      for (let i = 0; i < 20; i++) {
        const x = (i * 7919 + z * 31) % n;
        const y = (i * 104729 + z * 17) % n;
        const c = L.centreTuile(z, x, y);
        expect(L.tuileDepuis(c.lat, c.lon, z)).toEqual({ z, x, y });
        essais++;
      }
    }
    expect(essais).toBe(200);
  });
});

describe('bboxTuile3857', () => {
  it('tuile 0/0/0 : le monde entier', () => {
    const [minx, miny, maxx, maxy] = L.bboxTuile3857(0, 0, 0);
    expect([minx, miny, maxx, maxy].map((v) => Math.abs(v))).toEqual([DEMI, DEMI, DEMI, DEMI]);
    expect(minx).toBeLessThan(0);
    expect(maxy).toBeGreaterThan(0);
  });
  it('deux tuiles voisines se touchent', () => {
    const a = L.bboxTuile3857(6, 10, 20);
    const droite = L.bboxTuile3857(6, 11, 20);
    const dessous = L.bboxTuile3857(6, 10, 21);
    expect(a[2]).toBeCloseTo(droite[0], 4);
    expect(a[1]).toBeCloseTo(dessous[3], 4);
  });
  it('largeur au zoom z égale à 40075016,6856 / 2^z', () => {
    for (const z of [1, 5, 12, 18]) {
      const [minx, miny, maxx, maxy] = L.bboxTuile3857(z, 1, 1);
      expect(maxx - minx).toBeCloseTo(40075016.6856 / 2 ** z, 3);
      expect(maxy - miny).toBeCloseTo(40075016.6856 / 2 ** z, 3);
    }
  });
});

describe('constructeurs d\'URL', () => {
  const tuile = { z: 12, x: 2074, y: 1409 };
  const urls = {
    geocodage: L.urlGeocodage(L.LIEU.q),
    api: L.urlGeorisquesApi('georisques.gouv.fr', { lat: 48.8566, lon: 2.3522 }),
    apiWww: L.urlGeorisquesApi('www.georisques.gouv.fr', { lat: 48.8566, lon: 2.3522 }),
    caps: L.urlWmsCapabilities('georisques.gouv.fr'),
    capsWww: L.urlWmsCapabilities('www.georisques.gouv.fr'),
    getMap: L.urlWmsGetMap({ hote: 'georisques.gouv.fr', couche: 'PPRN_COMMUNE_RISQINOND', bbox: L.bboxTuile3857(12, 2074, 1409) }),
    osm: L.urlTuileOsm(tuile),
    ign: L.urlTuilePlanIgn(tuile),
  };
  it('schéma https, hôte de HOTES, aucun caractère de contrôle', () => {
    for (const [nom, u] of Object.entries(urls)) {
      const analyse = new URL(u);
      expect(analyse.protocol, nom).toBe('https:');
      expect(L.HOTES, nom).toContain(analyse.hostname);
      expect(Array.from(u).some((c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127), nom).toBe(false);
    }
  });
  it('géocodage : adresse à apostrophe et accents encodée, limit=1', () => {
    const u = new URL(urls.geocodage);
    expect(u.pathname).toBe('/geocodage/search');
    expect(u.searchParams.get('q')).toBe("4 place de l'Hôtel de Ville 75004 Paris");
    expect(urls.geocodage).toContain('H%C3%B4tel');
    expect(urls.geocodage).not.toContain('Hôtel');
    expect(u.searchParams.get('limit')).toBe('1');
    expect(new URL(L.urlGeocodage("l'été & <b>")).searchParams.get('q')).toBe("l'été & <b>");
  });
  it('API Géorisques : latlon = lon,lat, rayon 1000, les deux noms d\'hôte', () => {
    expect(new URL(urls.api).searchParams.get('latlon')).toBe('2.3522,48.8566');
    expect(new URL(urls.api).searchParams.get('rayon')).toBe('1000');
    expect(new URL(urls.api).pathname).toBe('/api/v1/gaspar/risques');
    expect(new URL(urls.apiWww).hostname).toBe('www.georisques.gouv.fr');
  });
  it('GetCapabilities et GetMap WMS : paramètres attendus', () => {
    expect(new URL(urls.caps).searchParams.get('REQUEST')).toBe('GetCapabilities');
    expect(new URL(urls.capsWww).hostname).toBe('www.georisques.gouv.fr');
    const p = new URL(urls.getMap).searchParams;
    expect(p.get('VERSION')).toBe('1.3.0');
    expect(p.get('CRS')).toBe('EPSG:3857');
    expect(p.get('WIDTH')).toBe('256');
    expect(p.get('HEIGHT')).toBe('256');
    expect(p.get('FORMAT')).toBe('image/png');
    expect(p.get('TRANSPARENT')).toBe('TRUE');
    expect(p.get('LAYERS')).toBe('PPRN_COMMUNE_RISQINOND');
    expect(p.get('BBOX').split(',')).toHaveLength(4);
    expect(urls.getMap).toContain('VERSION=1.3.0');
    expect(urls.getMap).toContain('CRS=EPSG%3A3857');
  });
  it('tuiles OSM et Plan IGN', () => {
    expect(urls.osm).toBe('https://tile.openstreetmap.org/12/2074/1409.png');
    const p = new URL(urls.ign).searchParams;
    expect(p.get('LAYER')).toBe('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2');
    expect(p.get('TILEMATRIXSET')).toBe('PM');
    expect([p.get('TILEMATRIX'), p.get('TILECOL'), p.get('TILEROW')]).toEqual(['12', '2074', '1409']);
  });
  it('un hôte inconnu retombe sur un hôte de HOTES', () => {
    expect(L.HOTES).toContain(new URL(L.urlWmsCapabilities('evil.example')).hostname);
    expect(L.HOTES).toContain(new URL(L.urlGeorisquesApi('evil.example', {})).hostname);
  });
});

describe('analyserGeocodage', () => {
  const reponse = (coordonnees, proprietes = { label: '4 Place de l\'Hôtel de Ville 75004 Paris', score: 0.97 }) =>
    JSON.stringify({ features: [{ geometry: { coordinates: coordonnees }, properties: proprietes }] });
  it('réponse nominale', () => {
    expect(L.analyserGeocodage(reponse([2.3522, 48.8566]))).toEqual({
      ok: true, lat: 48.8566, lon: 2.3522, libelle: "4 Place de l'Hôtel de Ville 75004 Paris", score: 0.97,
    });
  });
  it('JSON invalide, aucune entité, hors de France, champs manquants', () => {
    expect(L.analyserGeocodage('{pas du json')).toEqual({ ok: false, raison: 'JSON invalide' });
    expect(L.analyserGeocodage('{"features":[]}').ok).toBe(false);
    expect(L.analyserGeocodage(reponse([-74, 40.7])).ok).toBe(false);
    expect(L.analyserGeocodage(reponse([2.35, 60])).ok).toBe(false);
    expect(L.analyserGeocodage('{"features":[{}]}').ok).toBe(false);
    expect(L.analyserGeocodage('{"features":[{"geometry":{"coordinates":["a","b"]}}]}').ok).toBe(false);
    const sansProprietes = L.analyserGeocodage('{"features":[{"geometry":{"coordinates":[2.35,48.85]}}]}');
    expect(sansProprietes).toMatchObject({ ok: true, libelle: '', score: null });
  });
});

const CAPABILITIES = `<?xml version="1.0"?>
<WMS_Capabilities version="1.3.0"><Service><Name>WMS</Name><Title>Géorisques</Title></Service>
<Capability><Layer><Name>RACINE</Name><Title>racine</Title>
  <Layer queryable="1"><Name>PPRN_COMMUNE_RISQINOND</Name><Style><Name>defaut</Name></Style></Layer>
  <Layer><Name>ALEARG</Name><Layer><Name>ALEARG_FAIBLE</Name></Layer></Layer>
  <Layer><Name><![CDATA[INCENDIE_FORET]]></Name></Layer>
  <Layer><Title>sans nom</Title></Layer>
  <Layer/>
  <Layer><Name>AUTRE</Name></Layer>
</Layer></Capability></WMS_Capabilities>`;

describe('extraireCouches / choisirCouches', () => {
  it('XML d\'exemple : couches, y compris imbriquées, hors service et styles', () => {
    expect(L.extraireCouches(CAPABILITIES)).toEqual(['RACINE', 'PPRN_COMMUNE_RISQINOND', 'ALEARG', 'ALEARG_FAIBLE', 'INCENDIE_FORET', 'AUTRE']);
  });
  it('préfixe d\'espace de noms accepté', () => {
    expect(L.extraireCouches('<wms:Layer><wms:Name>A</wms:Name></wms:Layer>')).toEqual(['A']);
  });
  it('XML vide, texte quelconque, entrées inattendues : liste vide', () => {
    for (const v of ['', 'bonjour', '<<<>>>', undefined, null, 12, [], {}]) expect(L.extraireCouches(v)).toEqual([]);
  });
  it('choisirCouches : chaque famille, majuscules, aucune correspondance', () => {
    expect(L.choisirCouches(['X', 'Zone_Inondable', 'ARGILE', 'FEU_DE_FORET'])).toEqual({ inondation: 'Zone_Inondable', argiles: 'ARGILE', feux: 'FEU_DE_FORET' });
    expect(L.choisirCouches(['RGA_ALEA', 'PPRI_X', 'INCENDIE'])).toEqual({ inondation: 'PPRI_X', argiles: 'RGA_ALEA', feux: 'INCENDIE' });
    expect(L.choisirCouches(['AAA', 'BBB'])).toEqual({ inondation: null, argiles: null, feux: null });
    expect(L.choisirCouches('pas une liste')).toEqual({ inondation: null, argiles: null, feux: null });
    expect(L.choisirCouches(['FORÊT_BRÛLÉE']).feux).toBe('FORÊT_BRÛLÉE');
  });
});

describe('classerEchec / evaluerSonde', () => {
  it('classerEchec', () => {
    expect(L.classerEchec(new TypeError('Failed to fetch'), {})).toBe('bloque');
    expect(L.classerEchec(new DOMException('x', 'AbortError'), {})).toBe('delai');
    expect(L.classerEchec(new TypeError('x'), { delaiDepasse: true })).toBe('delai');
    expect(L.classerEchec(new RangeError('x'), {})).toBe('autre');
    for (const v of [undefined, null, 3, 'x']) expect(L.classerEchec(v, undefined)).toBe('autre');
  });
  it('evaluerSonde pour chaque état et entrées invalides', () => {
    for (const etat of ['ok', 'http', 'bloque', 'delai', 'image-echec', 'non-testee']) {
      expect(L.evaluerSonde({ id: 'a', etat, ms: 12.4, detail: 'd' })).toEqual({ id: 'a', etat, ms: 12, detail: 'd' });
    }
    expect(L.evaluerSonde({ id: 'a', etat: 'bizarre', ms: -1 })).toEqual({ id: 'a', etat: 'non-testee', ms: null, detail: '' });
    expect(L.evaluerSonde(undefined)).toEqual({ id: '', etat: 'non-testee', ms: null, detail: '' });
  });
});

const jeu = (etats = {}) => {
  const base = {
    geocodage: 'ok', 'osm-tuile': 'ok', 'ign-tuile': 'ok', 'georisques-api': 'ok', 'georisques-api-www': 'ok',
    'georisques-wms': 'ok', 'georisques-wms-www': 'ok', 'georisques-wms-image': 'ok', ...etats,
  };
  return Object.entries(base).map(([id, etat]) => ({ id, etat, ms: 10, detail: '' }));
};

describe('conclure', () => {
  it('tout ok : carte possible, deux fonds', () => {
    expect(L.conclure(jeu())).toMatchObject({ carteReellePossible: true, fondsDisponibles: ['osm', 'ign'], geocodage: 'ok' });
  });
  it('OSM seul ok, IGN seul ok', () => {
    expect(L.conclure(jeu({ 'ign-tuile': 'bloque' }))).toMatchObject({ carteReellePossible: true, fondsDisponibles: ['osm'], tuilesIgn: 'bloque' });
    expect(L.conclure(jeu({ 'osm-tuile': 'image-echec' }))).toMatchObject({ carteReellePossible: true, fondsDisponibles: ['ign'] });
  });
  it('aucun fond, géocodage bloqué, image Géorisques en échec : impossible', () => {
    expect(L.conclure(jeu({ 'osm-tuile': 'bloque', 'ign-tuile': 'delai' }))).toMatchObject({ carteReellePossible: false, fondsDisponibles: [] });
    expect(L.conclure(jeu({ geocodage: 'bloque' })).carteReellePossible).toBe(false);
    expect(L.conclure(jeu({ 'georisques-wms-image': 'image-echec' }))).toMatchObject({ carteReellePossible: false, georisquesImage: 'image-echec' });
  });
  it('sonde 8 non testée : inconnu ; sonde absente : inconnu', () => {
    expect(L.conclure(jeu({ 'georisques-wms-image': 'non-testee' }))).toMatchObject({ carteReellePossible: 'inconnu', georisquesImage: 'inconnu' });
    expect(L.conclure([])).toMatchObject({ carteReellePossible: 'inconnu', geocodage: 'inconnu', fondsDisponibles: [] });
  });
  it('API et GetCapabilities : le meilleur des deux noms d\'hôte', () => {
    const v = L.conclure(jeu({ 'georisques-api': 'bloque', 'georisques-api-www': 'http', 'georisques-wms': 'bloque' }));
    expect(v.georisquesApi).toBe('http');
    expect(v.georisquesCapabilities).toBe('ok');
  });
  it('ne recommande rien', () => {
    expect(JSON.stringify(L.conclure(jeu()))).not.toMatch(/recommand/i);
  });
});

describe('formaterRapport', () => {
  const resultats = jeu();
  const verdicts = L.conclure(resultats);
  const rapport = L.formaterRapport({ date: '2026-01-02T03:04:05Z', origine: 'https://exemple.github.io', navigateur: 'UA-test', resultats, verdicts });
  it('une ligne par sonde, la date, l\'origine et le navigateur passés', () => {
    for (const s of L.SONDES) expect(rapport).toContain(`- ${s.id} : ok (10 ms)`);
    expect(rapport).toContain('Horodatage (date et heure) : 2026-01-02T03:04:05Z');
    expect(rapport).toContain('Origine de la page : https://exemple.github.io');
    expect(rapport).toContain('Navigateur : UA-test');
    expect(rapport).toContain('Carte réelle possible depuis ce navigateur : oui');
    expect(rapport).toContain('extension');
  });
  it('rapport de référence exact pour un jeu minimal', () => {
    const minimal = L.formaterRapport({ date: 'D', origine: 'O', navigateur: 'N', resultats: [{ id: 'geocodage', etat: 'ok', ms: 5, detail: 'Paris' }], verdicts: L.conclure([{ id: 'geocodage', etat: 'ok' }]) });
    expect(minimal.split('\n').slice(0, 8)).toEqual([
      'Rapport du test de faisabilité de la carte réelle',
      'Horodatage (date et heure) : D',
      'Origine de la page : O',
      'Navigateur : N',
      `Lieu testé : ${L.LIEU.libelle}`,
      '',
      'Résultats',
      '- geocodage : ok (5 ms) : Paris',
    ]);
  });
  it('aucune donnée absente des paramètres', () => {
    const vide = L.formaterRapport({});
    expect(vide).not.toMatch(/undefined|null|\[object/);
  });
});

describe('pureté', () => {
  it('arguments gelés non modifiés', () => {
    const resultats = Object.freeze(jeu().map((r) => Object.freeze({ ...r })));
    const verdicts = Object.freeze({ ...L.conclure(resultats), fondsDisponibles: Object.freeze(['osm']) });
    const noms = Object.freeze(['a', 'inond']);
    expect(() => {
      L.conclure(resultats);
      L.formaterRapport(Object.freeze({ date: 'd', origine: 'o', navigateur: 'n', resultats, verdicts }));
      L.choisirCouches(noms);
      L.evaluerSonde(resultats[0]);
      L.urlWmsGetMap(Object.freeze({ hote: 'georisques.gouv.fr', couche: 'x', bbox: Object.freeze([1, 2, 3, 4]) }));
    }).not.toThrow();
  });
  it('entrées de types inattendus : aucune exception', () => {
    const bizarres = [undefined, null, 7, 'x', [], {}, [1, 2], { a: 1 }, NaN, () => 1];
    for (const f of Object.values(L)) {
      if (typeof f !== 'function') continue;
      for (const v of bizarres) {
        expect(() => f(v), f.name).not.toThrow();
        expect(() => f(v, v, v), f.name).not.toThrow();
      }
    }
  });
  it('faisabilite-logique.js ne référence ni document, ni window, ni fetch, ni Date, ni stockage', () => {
    const code = SOURCE.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const mot of ['document', 'window', 'fetch', 'Date', 'localStorage', 'sessionStorage']) {
      expect(code, mot).not.toMatch(new RegExp(`\\b${mot}\\b`));
    }
  });
});

describe('faisabilite.html, .css et .js', () => {
  const html = lire('assets/outils/faisabilite.html');
  const css = lire('assets/outils/faisabilite.css');
  const js = lire('assets/outils/faisabilite.js');
  it('lang, noindex, referrer, un seul h1, noscript', () => {
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('<noscript><p class="outil__noscript">Cette page nécessite JavaScript.</p></noscript>');
  });
  it('aucune URL http(s) en dur, aucun form, aucun script en ligne, un seul bouton « Lancer le test », aucun rendu.js ni data/*.json', () => {
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/<form/i);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*>Lancer le test<\/button>/);
    expect(html).not.toMatch(/rendu\.js|data\/[a-z]+\.json/);
    expect(html).toContain('../../css/tokens.css');
    expect(html).toContain('../../css/base.css');
  });
  it('aucun id dupliqué', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('le CSS n\'a aucune valeur hexadécimale ni ambre ni rouge', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/amber|red|rouge/i);
  });
  it('le JavaScript n\'écrit ni stockage, ni cookie, ni balise', () => {
    for (const mot of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'sendBeacon']) expect(js, mot).not.toContain(mot);
    expect(js).not.toMatch(/https?:\/\//);
  });
  it('les fetch utilisent mode cors, credentials omit, cache no-store', () => {
    expect(js).toContain("mode: 'cors'");
    expect(js).toContain("credentials: 'omit'");
    expect(js).toContain("cache: 'no-store'");
  });
});

describe('URL du fichier de logique', () => {
  it('chaque chaîne https:// a un hôte de HOTES', () => {
    const urls = SOURCE.match(/https:\/\/[^\s'"`)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(3);
    for (const u of urls) {
      const hote = u.replace(/^https:\/\//, '').split(/[/?#]/)[0].replace(/\$\{.*$/, '');
      if (hote === '') continue; // https://${...}/ : hôte calculé, contrôlé par hoteGeorisques
      expect(L.HOTES, u).toContain(hote);
    }
  });
});
