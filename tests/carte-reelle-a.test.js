import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { HOTES_CARTE, hoteAutorise, gabaritFondValide, construireUrlGeocodage, analyserGeocodage, dansFrance, doitBasculer, chaineAttribution } from '../assets/js/carte-reelle-logique.js';
import { lienExterneValide } from '../assets/js/rendu.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const site = JSON.parse(lire('data/site.json'));
const config = diagnostic.carteReelle;
const html = lire('diagnostic.html');
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const BASE = config.geocodage.base;

const reponse = (lon, lat, score, extra = {}) => JSON.stringify({ features: [{ geometry: { coordinates: [lon, lat] }, properties: { label: 'Adresse', score, ...extra } }] });

describe('Leaflet copié (dépendance du lot 4c)', () => {
  const fichiers = ['leaflet.js', 'leaflet.css', 'images/layers.png', 'images/layers-2x.png', 'images/marker-icon.png', 'images/marker-icon-2x.png', 'images/marker-shadow.png'];

  it('chaque fichier copié est identique (SHA-256) à celui de node_modules/leaflet/dist, licence présente', () => {
    for (const f of fichiers) expect(sha(`assets/vendor/leaflet/${f}`), f).toBe(sha(`node_modules/leaflet/dist/${f}`));
    expect(lire('assets/vendor/leaflet/LICENSE')).toBe(lire('node_modules/leaflet/LICENSE'));
    expect(lire('assets/vendor/leaflet/LICENSE')).toContain('BSD 2-Clause');
  });

  it('version 1.9.4 exacte dans package.json et package-lock.json, aucune autre dépendance ajoutée', () => {
    const paquet = JSON.parse(lire('package.json'));
    expect(paquet.devDependencies.leaflet).toBe('1.9.4');
    expect(paquet.dependencies).toBeUndefined();
    expect(Object.keys(paquet.devDependencies).sort()).toEqual(['@axe-core/playwright', '@eslint/js', '@playwright/test', 'eslint', 'globals', 'leaflet', 'lighthouse', 'vitest']);
    expect(JSON.parse(lire('package-lock.json')).packages['node_modules/leaflet'].version).toBe('1.9.4');
    expect(JSON.parse(lire('node_modules/leaflet/package.json')).version).toBe('1.9.4');
  });

  it('ESLint et le test de couleurs excluent seulement assets/vendor/', () => {
    const eslint = lire('eslint.config.js');
    expect(eslint).toContain("'assets/vendor/'");
    expect(eslint.match(/assets\//g)).toHaveLength(2); // l'exclusion et la règle des modules de assets/js
    expect(lire('tests/jetons.test.js')).toContain("startsWith('assets/vendor/')");
  });
});

describe('hoteAutorise', () => {
  it('accepte les trois hôtes', () => {
    expect(HOTES_CARTE).toEqual(['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org']);
    for (const url of ['https://data.geopf.fr/geocodage/search?q=a', 'https://www.georisques.gouv.fr/services', 'https://tile.openstreetmap.org/1/2/3.png']) expect(hoteAutorise(url), url).toBe(true);
  });

  it('refuse georisques.gouv.fr sans www, http, sous-domaine inconnu, URL relative, caractères de contrôle, identifiants', () => {
    const refus = ['https://georisques.gouv.fr/services', 'http://data.geopf.fr/x', 'https://a.data.geopf.fr/x', 'https://evil.example/data.geopf.fr', 'data/diagnostic.json', '//data.geopf.fr/x', 'https://data.geopf.fr/x\n', 'https://data.geopf.fr/\u0000x', 'https://user:pw@data.geopf.fr/x', 'https://data.geopf.fr.evil.example/x', ''];
    for (const url of refus) expect(hoteAutorise(url), JSON.stringify(url)).toBe(false);
  });
});

describe('gabaritFondValide', () => {
  it('accepte les gabarits des données', () => {
    for (const fond of Object.values(config.fonds)) expect(gabaritFondValide(fond.gabarit), fond.libelle).toBe(true);
  });

  it('refuse une marque absente, un hôte inconnu ou http', () => {
    expect(gabaritFondValide('https://tile.openstreetmap.org/{z}/{x}.png')).toBe(false);
    expect(gabaritFondValide('https://tile.openstreetmap.org/{z}/{x}/y.png')).toBe(false);
    expect(gabaritFondValide('https://tile.example.org/{z}/{x}/{y}.png')).toBe(false);
    expect(gabaritFondValide('http://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(false);
    expect(gabaritFondValide(undefined)).toBe(false);
  });
});

describe('construireUrlGeocodage', () => {
  it('encode une adresse accentuée avec apostrophe, limit=1', () => {
    const url = construireUrlGeocodage("4 place de l'Hôtel de Ville, 75004 Paris", BASE);
    expect(url).toBe(`${BASE}?q=4%20place%20de%20l'H%C3%B4tel%20de%20Ville%2C%2075004%20Paris&limit=1`);
    expect(new URL(url).searchParams.get('q')).toBe("4 place de l'Hôtel de Ville, 75004 Paris");
    expect(new URL(url).searchParams.get('limit')).toBe('1');
  });

  it('refuse une adresse invalide ou une base non autorisée', () => {
    for (const adresse of ['', '  ', 'ab', '12345', 'x'.repeat(201), null, undefined, 42]) expect(construireUrlGeocodage(adresse, BASE), String(adresse)).toBe('');
    expect(construireUrlGeocodage('12 rue des Tilleuls, Lyon', 'https://evil.example/search')).toBe('');
    expect(construireUrlGeocodage('12 rue des Tilleuls, Lyon', undefined)).toBe('');
  });

  it('retire les caractères de contrôle', () => {
    const url = construireUrlGeocodage('12 rue\u0000 des\nTilleuls\u007f, Lyon', BASE);
    expect(url).not.toMatch(/%00|%0A|%7F/i);
    expect(new URL(url).searchParams.get('q')).toBe('12 rue des Tilleuls , Lyon');
  });
});

describe('analyserGeocodage', () => {
  it('nominal : coordonnées, libellé et score', () => {
    expect(analyserGeocodage(reponse(4.8357, 45.764, 0.92, { label: '12 Rue des Tilleuls 69000 Lyon' }), 0.5)).toEqual({ ok: true, lat: 45.764, lon: 4.8357, libelle: '12 Rue des Tilleuls 69000 Lyon', score: 0.92, type: '' });
  });

  it('JSON invalide, aucune entité, champs manquants', () => {
    expect(analyserGeocodage('pas du json', 0.5)).toEqual({ ok: false, raison: 'json' });
    expect(analyserGeocodage(JSON.stringify({ features: [] }), 0.5)).toEqual({ ok: false, raison: 'aucun' });
    for (const brut of ['{}', '[]', 'null', JSON.stringify({ features: [{}] }), JSON.stringify({ features: [{ geometry: { coordinates: [4] }, properties: { score: 1 } }] }), JSON.stringify({ features: [{ geometry: { coordinates: [4, 45] }, properties: {} }] })]) {
      expect(analyserGeocodage(brut, 0.5), brut).toEqual({ ok: false, raison: 'aucun' });
    }
  });

  it('score : 0,49 refusé, 0,5 accepté', () => {
    expect(analyserGeocodage(reponse(4.8, 45.7, 0.49), 0.5)).toEqual({ ok: false, raison: 'score' });
    expect(analyserGeocodage(reponse(4.8, 45.7, 0.5), 0.5).ok).toBe(true);
  });

  it('hors de France métropolitaine : La Réunion, New York, Madrid', () => {
    for (const [lon, lat] of [[55.45, -20.88], [-74, 40.7], [-3.7, 40.4]]) expect(analyserGeocodage(reponse(lon, lat, 0.95), 0.5), `${lon},${lat}`).toEqual({ ok: false, raison: 'hors-france' });
  });
});

describe('dansFrance', () => {
  it('bornes incluses : latitude 41 à 52, longitude -6 à 10', () => {
    expect(dansFrance(41, -6)).toBe(true);
    expect(dansFrance(52, 10)).toBe(true);
    for (const [lat, lon] of [[40.99, 0], [52.01, 0], [45, -6.01], [45, 10.01], [Number.NaN, 0], ['45', 0]]) expect(dansFrance(lat, lon), `${lat},${lon}`).toBe(false);
  });
});

describe('doitBasculer', () => {
  it('quatre erreurs sans tuile, ou huit secondes sans tuile ; jamais avec une tuile chargée', () => {
    expect(doitBasculer({ erreurs: 3, charges: 0, ecouleMs: 1000 })).toBe(false);
    expect(doitBasculer({ erreurs: 4, charges: 0, ecouleMs: 0 })).toBe(true);
    expect(doitBasculer({ erreurs: 4, charges: 1, ecouleMs: 9000 })).toBe(false);
    expect(doitBasculer({ erreurs: 0, charges: 0, ecouleMs: 7999 })).toBe(false);
    expect(doitBasculer({ erreurs: 0, charges: 0, ecouleMs: 8000 })).toBe(true);
    expect(doitBasculer(undefined)).toBe(false);
    expect(doitBasculer({ erreurs: 'x', charges: null, ecouleMs: -5 })).toBe(false);
  });
});

describe('chaineAttribution', () => {
  it('liens validés vers les entrées de liensExternes, texte échappé, aucune balise injectée', () => {
    const liens = { osm: site.liensExternes.osm, mauvais: 'http://evil.example/' };
    const texte = chaineAttribution([{ texte: '© OpenStreetMap', lien: 'osm' }, { texte: '<script>alert(1)</script>', lien: 'mauvais' }, { texte: 'Sans lien', lien: 'inconnu' }], liens);
    expect(texte).toContain(`<a href="${site.liensExternes.osm}" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>`);
    expect(texte).not.toContain('<script');
    expect(texte).toContain('&lt;script&gt;');
    expect(texte).not.toContain('evil.example');
    expect(chaineAttribution(null, null)).toBe('');
  });
});

describe('pureté de carte-reelle-logique.js', () => {
  it('arguments gelés non modifiés, types inattendus sans exception', () => {
    const entree = Object.freeze({ erreurs: 5, charges: 0, ecouleMs: 10 });
    const liste = Object.freeze([Object.freeze({ texte: 'a', lien: 'osm' })]);
    const liens = Object.freeze({ osm: site.liensExternes.osm });
    expect(() => { doitBasculer(entree); chaineAttribution(liste, liens); }).not.toThrow();
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1, Symbol.iterator.toString()]) {
      expect(() => { hoteAutorise(v); gabaritFondValide(v); construireUrlGeocodage(v, v); analyserGeocodage(v, v); dansFrance(v, v); doitBasculer(v); chaineAttribution(v, v); }, String(v)).not.toThrow();
    }
  });

  it('ne référence ni document, ni window, ni fetch, ni Date, ni localStorage, ni sessionStorage', () => {
    expect(lire('assets/js/carte-reelle-logique.js')).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest)\b/);
  });
});

describe('données de carteReelle', () => {
  it('config complète, textes non vides, seuil, zooms et opacité cohérents', () => {
    expect(config.hotes).toEqual(HOTES_CARTE);
    expect(config.geocodage).toMatchObject({ seuil: 0.5, delaiMs: 10000 });
    expect(config.vue.zoomMin).toBeLessThanOrEqual(config.vue.zoom);
    expect(config.vue.zoom).toBeLessThanOrEqual(config.vue.zoomMax);
    expect(config.vue).toMatchObject({ zoom: 14, zoomMin: 6, zoomMax: 18, opacite: 0.7 });
    expect(config.fondParDefaut).toBe('osm');
    expect(Object.keys(config.fonds)).toEqual(['osm', 'ign']);
    expect(config.wms).toEqual({ base: 'https://www.georisques.gouv.fr/services', version: '1.3.0', format: 'image/png', transparent: true, crs: 'EPSG:3857' });
    const textes = [];
    const parcourir = (o) => { for (const v of Object.values(o)) (typeof v === 'object' ? parcourir(v) : textes.push(v)); };
    parcourir(config.textes);
    expect(textes.length).toBeGreaterThan(10);
    for (const t of textes) expect(typeof t === 'string' && t.trim() !== '').toBe(true);
    for (const cle of ['scoreIllustratif', 'chaleurNote', 'legendeFond', 'legendeCouches']) expect(config.textes[cle], cle).toBeUndefined(); // lot 4e-A : notes et choix de fond supprimés
  });

  it('calques : mêmes identifiants que les aléas, couches exactement celles de la spécification, chaleur sans couche', () => {
    const ids = [...new Set(diagnostic.aleas.map((a) => a.calque))].sort();
    expect(Object.keys(config.calques).sort()).toEqual(ids);
    const noms = Object.fromEntries(Object.entries(config.calques).map(([id, couches]) => [id, couches.map((c) => c.nom)]));
    expect(noms).toEqual({
      inondation: ['ALEA_SYNT_01_04FAI_FXX', 'PPRN_COMMUNE_RISQINOND_PRESCRIT'],
      argile: ['ALEARG'],
      feu: ['PPRN_COMMUNE_FEU_APPROUV'],
      chaleur: [],
    });
    for (const c of Object.values(config.calques).flat()) expect(c.libelle).toMatch(/\(Géorisques\)$/);
    expect(JSON.stringify(config)).not.toMatch(/GEORISQUES_SERVICES|COMMUNE_FXX/);
  });

  it('gabarits d\'URL et services : hôtes autorisés seulement, jamais georisques.gouv.fr sans www', () => {
    for (const fond of Object.values(config.fonds)) expect(hoteAutorise(fond.gabarit.replaceAll('{', '').replaceAll('}', ''))).toBe(true);
    expect(hoteAutorise(config.wms.base)).toBe(true);
    expect(hoteAutorise(config.geocodage.base)).toBe(true);
    expect(JSON.stringify(config)).not.toMatch(/\/\/georisques\.gouv\.fr/);
  });
});

describe('diagnostic.html (partie A)', () => {
  it('un seul conteneur de carte (région), message d\'état et bouton « Réessayer » masqué', () => {
    expect(html).toMatch(/<button[^>]*id="carte-reelle-reessayer"[^>]*hidden/);
    expect(html).toMatch(/<p[^>]*id="carte-reelle-etat"[^>]*role="status"/);
    expect(html.match(/id="carte-reelle"/g)).toHaveLength(1);
    expect(html).toMatch(/id="carte-reelle"[^>]*role="region"/);
  });

  it('aucun id dupliqué, aucun name sur les nouveaux contrôles, aucun script en ligne ni URL en dur', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const bloc = html.slice(html.indexOf('carte-cadre'), html.indexOf('data-role="legende"'));
    expect(bloc).not.toMatch(/\sname=/);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });
});

describe('modules de la carte réelle', () => {
  it('css/carte-reelle.css sans valeur hexadécimale ni rouge ni ambre', () => {
    const css = lire('css/carte-reelle.css');
    expect(css).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
    expect(css).not.toMatch(/amber|red|rgb\(|hsl\(/i);
  });

  it('carte-reelle.js : deux fetch (géocodage, API Géorisques), aucune écriture de stockage, de cookie ni d\'IndexedDB', () => {
    const src = lire('assets/js/carte-reelle.js');
    expect(src.match(/\bfetch\(/g)).toHaveLength(2); // géocodage et lecture de l'API Géorisques (lireTexteApi)
    expect(src).not.toMatch(/localStorage|indexedDB|document\.cookie|setItem|removeItem|sendBeacon|XMLHttpRequest|innerHTML|https?:\/\//);
    expect(src.match(/sessionStorage\.\w+/g)).toEqual(['sessionStorage.getItem']);
    expect(existsSync('assets/js/carte-reelle-logique.js')).toBe(true);
  });
});

describe('événement adresse:modifiee', () => {
  it('émis par diagnostic.js après la mise à jour valide seulement', () => {
    const src = lire('assets/js/diagnostic.js');
    expect(src.match(/adresse:modifiee/g)).toHaveLength(1);
    const evenement = src.indexOf("new CustomEvent('adresse:modifiee')");
    const refusLocal = src.indexOf('if (!resultat.valide)');
    const refusService = src.indexOf("if (verdict.decision === 'refuse')");
    const retour = src.indexOf('return;', refusService);
    const ecriture = src.indexOf('ecrireSession(CLE_STOCKAGE, adresse)');
    expect(refusLocal).toBeGreaterThan(0);
    expect(refusService).toBeGreaterThan(refusLocal);
    expect(retour).toBeGreaterThan(refusService);
    expect(ecriture).toBeGreaterThan(retour);
    expect(evenement).toBeGreaterThan(ecriture);
  });
});

describe('liensExternes', () => {
  it('entrées valides (https, hôte déclaré, sans donnée du visiteur)', () => {
    for (const cle of ['georisques', 'osm', 'ign']) {
      expect(lienExterneValide(site.liensExternes[cle]), cle).toBe(true);
      expect(site.liensExternes[cle]).not.toContain('?');
    }
    for (const attribution of Object.values(config.attributions)) expect(site.liensExternes).toHaveProperty(attribution.lien);
  });
});

describe('CLAUDE.md', () => {
  it('moins de 9 000 caractères', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
  });
});
