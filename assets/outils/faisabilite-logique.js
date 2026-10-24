// Logique pure du test de faisabilité de la carte réelle : aucun accès au DOM, au réseau, au stockage ni à l'horloge ; aucun argument n'est modifié ; jamais d'exception.
// Seul fichier autorisé à contenir des URL externes, uniquement vers les hôtes de HOTES.

export const HOTES = ['data.geopf.fr', 'georisques.gouv.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];

export const LIEU = {
  libelle: "Hôtel de ville de Paris (adresse publique d'exemple)",
  q: "4 place de l'Hôtel de Ville 75004 Paris",
  lat: 48.8566,
  lon: 2.3522,
  zoom: 12,
};

const LAT_MAX = 85.0511;
const DEMI_MONDE = 20037508.342789244;
const ETATS = ['ok', 'http', 'bloque', 'delai', 'image-echec', 'non-testee'];

const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texte = (v) => (typeof v === 'string' ? v : '');
const borne = (v, min, max) => Math.min(max, Math.max(min, v));

// ---------- Web Mercator ----------

export function tuileDepuis(lat, lon, z) {
  const zoom = estNombre(z) ? borne(Math.trunc(z), 0, 30) : 0;
  const n = 2 ** zoom;
  const phi = (borne(estNombre(lat) ? lat : 0, -LAT_MAX, LAT_MAX) * Math.PI) / 180;
  const lambda = estNombre(lon) ? lon : 0;
  const x = Math.floor(((lambda + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n);
  return { z: zoom, x: borne(x, 0, n - 1), y: borne(y, 0, n - 1) };
}

export function centreTuile(z, x, y) {
  const zoom = estNombre(z) ? borne(Math.trunc(z), 0, 30) : 0;
  const n = 2 ** zoom;
  const cx = estNombre(x) ? x : 0;
  const cy = estNombre(y) ? y : 0;
  const lon = ((cx + 0.5) / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (cy + 0.5)) / n))) * 180) / Math.PI;
  return { lat, lon };
}

export function bboxTuile3857(z, x, y) {
  const zoom = estNombre(z) ? borne(Math.trunc(z), 0, 30) : 0;
  const n = 2 ** zoom;
  const taille = (2 * DEMI_MONDE) / n;
  const cx = estNombre(x) ? x : 0;
  const cy = estNombre(y) ? y : 0;
  const minx = -DEMI_MONDE + cx * taille;
  const maxy = DEMI_MONDE - cy * taille;
  return [minx, maxy - taille, minx + taille, maxy];
}

// ---------- Constructeurs d'URL ----------

function url(base, parametres) {
  const u = new URL(base);
  for (const [cle, valeur] of parametres) u.searchParams.set(cle, valeur);
  return u.toString();
}

const hoteGeorisques = (hote) => (hote === 'www.georisques.gouv.fr' ? hote : 'georisques.gouv.fr');
const entier = (v) => (estNombre(v) ? Math.trunc(v) : 0);

export function urlGeocodage(q) {
  return url('https://data.geopf.fr/geocodage/search', [['q', texte(q)], ['limit', '1']]);
}

export function urlGeorisquesApi(hote, coordonnees) {
  const c = estObjet(coordonnees) ? coordonnees : {};
  const lat = estNombre(c.lat) ? c.lat : 0;
  const lon = estNombre(c.lon) ? c.lon : 0;
  return url(`https://${hoteGeorisques(hote)}/api/v1/gaspar/risques`, [['latlon', `${lon},${lat}`], ['rayon', '1000']]);
}

export function urlWmsCapabilities(hote) {
  return url(`https://${hoteGeorisques(hote)}/services`, [['SERVICE', 'WMS'], ['REQUEST', 'GetCapabilities']]);
}

export function urlWmsGetMap(options) {
  const o = estObjet(options) ? options : {};
  const bbox = Array.isArray(o.bbox) && o.bbox.length === 4 && o.bbox.every(estNombre) ? o.bbox : [0, 0, 0, 0];
  return url(`https://${hoteGeorisques(o.hote)}/services`, [
    ['SERVICE', 'WMS'],
    ['VERSION', '1.3.0'],
    ['REQUEST', 'GetMap'],
    ['LAYERS', texte(o.couche)],
    ['STYLES', ''],
    ['CRS', 'EPSG:3857'],
    ['BBOX', bbox.join(',')],
    ['WIDTH', '256'],
    ['HEIGHT', '256'],
    ['FORMAT', 'image/png'],
    ['TRANSPARENT', 'TRUE'],
  ]);
}

export function urlTuileOsm(tuile) {
  const t = estObjet(tuile) ? tuile : {};
  return `https://tile.openstreetmap.org/${entier(t.z)}/${entier(t.x)}/${entier(t.y)}.png`;
}

export function urlTuilePlanIgn(tuile) {
  const t = estObjet(tuile) ? tuile : {};
  return url('https://data.geopf.fr/wmts', [
    ['SERVICE', 'WMTS'],
    ['REQUEST', 'GetTile'],
    ['VERSION', '1.0.0'],
    ['LAYER', 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'],
    ['STYLE', 'normal'],
    ['FORMAT', 'image/png'],
    ['TILEMATRIXSET', 'PM'],
    ['TILEMATRIX', String(entier(t.z))],
    ['TILEROW', String(entier(t.y))],
    ['TILECOL', String(entier(t.x))],
  ]);
}

// ---------- Analyses ----------

export function analyserGeocodage(texteJson) {
  let donnees;
  try {
    donnees = JSON.parse(texte(texteJson));
  } catch {
    return { ok: false, raison: 'JSON invalide' };
  }
  const entites = estObjet(donnees) && Array.isArray(donnees.features) ? donnees.features : [];
  const premiere = entites[0];
  if (!estObjet(premiere)) return { ok: false, raison: 'aucune entité' };
  const coordonnees = estObjet(premiere.geometry) ? premiere.geometry.coordinates : null;
  if (!Array.isArray(coordonnees) || !estNombre(coordonnees[0]) || !estNombre(coordonnees[1])) {
    return { ok: false, raison: 'coordonnées absentes' };
  }
  const [lon, lat] = coordonnees;
  if (lat < 41 || lat > 52 || lon < -6 || lon > 10) return { ok: false, raison: 'hors de la France métropolitaine' };
  const proprietes = estObjet(premiere.properties) ? premiere.properties : {};
  return {
    ok: true,
    lat,
    lon,
    libelle: texte(proprietes.label),
    score: estNombre(proprietes.score) ? proprietes.score : null,
  };
}

// Analyse tolérante de texte : relève le <Name> de chaque <Layer> (balises avec ou sans préfixe d'espace de noms).
export function extraireCouches(xml) {
  const source = texte(xml).replace(/<(?:\w+:)?Style\b[\s\S]*?<\/(?:\w+:)?Style\s*>/g, '');
  const noms = [];
  const motif = /<(?:\w+:)?Layer\b[^>]*>|<\/(?:\w+:)?Layer\s*>|<(?:\w+:)?Name\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Name\s*>/g;
  const pile = [];
  for (const m of source.matchAll(motif)) {
    const balise = m[0];
    if (/^<\//.test(balise)) {
      pile.pop();
    } else if (m[1] === undefined) {
      if (!/\/>$/.test(balise)) pile.push({ nomPris: false });
    } else if (pile.length > 0 && !pile.at(-1).nomPris) {
      pile.at(-1).nomPris = true;
      const nom = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      if (nom) noms.push(nom);
    }
  }
  return noms;
}

export function choisirCouches(noms) {
  const liste = Array.isArray(noms) ? noms.filter((n) => typeof n === 'string') : [];
  const premiere = (motif) => liste.find((n) => motif.test(n)) ?? null;
  return {
    inondation: premiere(/inond|zone.?inond|ppr[i]?/i),
    argiles: premiere(/argil|rga|retrait/i),
    feux: premiere(/feu|incendie|for[eê]t/i),
  };
}

// ---------- Classement des résultats ----------

export function classerEchec(erreur, contexte) {
  const nom = estObjet(erreur) || erreur instanceof Error ? erreur.name : '';
  const delai = estObjet(contexte) && contexte.delaiDepasse === true;
  if (delai || nom === 'AbortError' || nom === 'TimeoutError') return 'delai';
  if (nom === 'TypeError') return 'bloque';
  return 'autre';
}

export function evaluerSonde(brut) {
  const b = estObjet(brut) ? brut : {};
  const etat = ETATS.includes(b.etat) ? b.etat : 'non-testee';
  return {
    id: texte(b.id),
    etat,
    ms: estNombre(b.ms) && b.ms >= 0 ? Math.round(b.ms) : null,
    detail: texte(b.detail),
  };
}

const etatDe = (resultats, id) => {
  const liste = Array.isArray(resultats) ? resultats : [];
  const trouve = liste.find((r) => estObjet(r) && r.id === id);
  return trouve ? evaluerSonde(trouve).etat : 'non-testee';
};

const verdictSonde = (etat) => {
  if (etat === 'non-testee') return 'inconnu';
  return etat;
};

export function conclure(resultats) {
  const geo = etatDe(resultats, 'geocodage');
  const osm = etatDe(resultats, 'osm-tuile');
  const ign = etatDe(resultats, 'ign-tuile');
  const api = [etatDe(resultats, 'georisques-api'), etatDe(resultats, 'georisques-api-www')];
  const caps = [etatDe(resultats, 'georisques-wms'), etatDe(resultats, 'georisques-wms-www')];
  const image = etatDe(resultats, 'georisques-wms-image');
  const meilleur = (etats) => {
    for (const e of ['ok', 'http']) if (etats.includes(e)) return e;
    if (etats.every((e) => e === 'non-testee')) return 'non-testee';
    return etats.find((e) => e !== 'non-testee') ?? 'non-testee';
  };
  const fondsDisponibles = [];
  if (osm === 'ok') fondsDisponibles.push('osm');
  if (ign === 'ok') fondsDisponibles.push('ign');
  const regle = (g, o, i, img) => g === 'ok' && (o === 'ok' || i === 'ok') && img === 'ok';
  const optimiste = (e) => (e === 'non-testee' ? 'ok' : e);
  let carteReellePossible = false;
  if (regle(geo, osm, ign, image)) carteReellePossible = true;
  else if (regle(optimiste(geo), optimiste(osm), optimiste(ign), optimiste(image))) carteReellePossible = 'inconnu';
  return {
    geocodage: verdictSonde(geo),
    tuilesOsm: verdictSonde(osm),
    tuilesIgn: verdictSonde(ign),
    georisquesApi: verdictSonde(meilleur(api)),
    georisquesCapabilities: verdictSonde(meilleur(caps)),
    georisquesImage: verdictSonde(image),
    carteReellePossible,
    fondsDisponibles,
  };
}

// ---------- Rapport ----------

const LIBELLES_ETAT = {
  ok: 'ok',
  http: 'réponse HTTP lisible',
  bloque: 'bloqué (réseau, CORS ou bloqueur)',
  delai: 'délai dépassé',
  'image-echec': "échec de l'image",
  'non-testee': 'non testée',
  inconnu: 'inconnu',
};

const libelleEtat = (etat) => (typeof etat === 'string' && Object.hasOwn(LIBELLES_ETAT, etat) ? LIBELLES_ETAT[etat] : 'inconnu');

const nettoyer = (v) => Array.from(String(v ?? ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').trim().slice(0, 300);

export function lignesVerdicts(verdicts) {
  const v = estObjet(verdicts) ? verdicts : {};
  const fonds = Array.isArray(v.fondsDisponibles) ? v.fondsDisponibles.map(nettoyer).join(', ') : '';
  const etat = (cle) => libelleEtat(v[cle]);
  return [
    `Géocodage : ${etat('geocodage')}`,
    `Tuiles OpenStreetMap : ${etat('tuilesOsm')}`,
    `Tuiles Plan IGN : ${etat('tuilesIgn')}`,
    `API Géorisques : ${etat('georisquesApi')}`,
    `GetCapabilities WMS Géorisques : ${etat('georisquesCapabilities')}`,
    `Image de calque Géorisques : ${etat('georisquesImage')}`,
    `Fonds de carte disponibles : ${fonds || 'aucun'}`,
    `Carte réelle possible depuis ce navigateur : ${v.carteReellePossible === true ? 'oui' : v.carteReellePossible === false ? 'non' : 'inconnu'}`,
  ];
}

export function formaterRapport(parametres) {
  const p = estObjet(parametres) ? parametres : {};
  const resultats = Array.isArray(p.resultats) ? p.resultats.filter(estObjet).map(evaluerSonde) : [];
  const verdicts = estObjet(p.verdicts) ? p.verdicts : {};
  const lignes = [
    'Rapport du test de faisabilité de la carte réelle',
    `Horodatage (date et heure) : ${nettoyer(p.date)}`,
    `Origine de la page : ${nettoyer(p.origine)}`,
    `Navigateur : ${nettoyer(p.navigateur)}`,
    `Lieu testé : ${LIEU.libelle}`,
    '',
    'Résultats',
  ];
  for (const r of resultats) {
    const duree = r.ms === null ? '-' : `${r.ms} ms`;
    lignes.push(`- ${r.id} : ${libelleEtat(r.etat)} (${duree})${r.detail ? ` : ${nettoyer(r.detail)}` : ''}`);
  }
  lignes.push(
    '',
    'Verdicts',
    ...lignesVerdicts(verdicts).map((l) => `- ${l}`),
    '',
    'Limites',
    "- Un TypeError (réseau, CORS, bloqueur) est indistinguable dans le navigateur : un blocage peut venir d'une extension de confidentialité ou d'un bloqueur de publicités.",
    '- Un code HTTP lisible, même 404, prouve que la page peut lire la réponse (en-têtes CORS acceptés), sans valider le chemin demandé.',
    "- Le chemin de l'API Géorisques n'a pas été vérifié dans la documentation officielle.",
    '- Ce rapport décrit des états mesurés une fois, depuis un seul navigateur et un seul réseau ; il ne recommande aucun service.',
  );
  return lignes.join('\n');
}

// ---------- Sondes (données) ----------

export const SONDES = [
  { id: 'geocodage', libelle: 'Géocodage IGN', type: 'json' },
  { id: 'osm-tuile', libelle: 'Tuile OpenStreetMap', type: 'image' },
  { id: 'ign-tuile', libelle: 'Tuile Plan IGN', type: 'image' },
  { id: 'georisques-api', libelle: 'API Géorisques (georisques.gouv.fr)', type: 'json' },
  { id: 'georisques-api-www', libelle: 'API Géorisques (www.georisques.gouv.fr)', type: 'json' },
  { id: 'georisques-wms', libelle: 'GetCapabilities WMS (georisques.gouv.fr)', type: 'xml' },
  { id: 'georisques-wms-www', libelle: 'GetCapabilities WMS (www.georisques.gouv.fr)', type: 'xml' },
  { id: 'georisques-wms-image', libelle: "Image de calque d'inondation (WMS GetMap)", type: 'image' },
];

export function urlDeSonde(id, contexte) {
  const c = estObjet(contexte) ? contexte : {};
  const tuile = tuileDepuis(LIEU.lat, LIEU.lon, LIEU.zoom);
  const coord = estObjet(c.coordonnees) ? c.coordonnees : { lat: LIEU.lat, lon: LIEU.lon };
  switch (id) {
    case 'geocodage': return urlGeocodage(LIEU.q);
    case 'osm-tuile': return urlTuileOsm(tuile);
    case 'ign-tuile': return urlTuilePlanIgn(tuile);
    case 'georisques-api': return urlGeorisquesApi('georisques.gouv.fr', coord);
    case 'georisques-api-www': return urlGeorisquesApi('www.georisques.gouv.fr', coord);
    case 'georisques-wms': return urlWmsCapabilities('georisques.gouv.fr');
    case 'georisques-wms-www': return urlWmsCapabilities('www.georisques.gouv.fr');
    case 'georisques-wms-image':
      return typeof c.couche === 'string' && c.couche
        ? urlWmsGetMap({ hote: c.hote, couche: c.couche, bbox: bboxTuile3857(tuile.z, tuile.x, tuile.y) })
        : null;
    default: return null;
  }
}
