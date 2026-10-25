// Logique pure de la carte réelle du diagnostic : aucun accès au DOM, au réseau, au stockage ni à l'horloge ;
// aucun argument n'est modifié ; jamais d'exception. Les URL (gabarits, services) viennent de data/diagnostic.json.
import { lienExterneValide } from './rendu.js';
import { valider } from './adresse-validation.js';

// Seuls hôtes joignables par le site. Géorisques : toujours avec « www » (sans, CORS bloque).
export const HOTES_CARTE = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];

// Métropole : latitude de 41 à 52, longitude de -6 à 10.
const FRANCE = { latMin: 41, latMax: 52, lonMin: -6, lonMax: 10 };
const MARQUES = ['{z}', '{x}', '{y}'];

const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texte = (v) => (typeof v === 'string' ? v : '');
const sansControle = (t) => Array.from(t).every((c) => c.codePointAt(0) > 0x20 && !(c.codePointAt(0) >= 0x7f && c.codePointAt(0) <= 0x9f));

// https, hôte de HOTES_CARTE, sans identifiants ni caractère de contrôle.
export function hoteAutorise(url) {
  const adresse = texte(url);
  if (!/^https:\/\//i.test(adresse) || !sansControle(adresse)) return false;
  try {
    const u = new URL(adresse);
    return u.protocol === 'https:' && u.username === '' && u.password === '' && HOTES_CARTE.includes(u.hostname);
  } catch {
    return false;
  }
}

// Gabarit de tuiles : hôte autorisé et les trois marques {z}, {x}, {y} présentes.
export function gabaritFondValide(url) {
  const gabarit = texte(url);
  if (!MARQUES.every((m) => gabarit.includes(m))) return false;
  return hoteAutorise(gabarit.replaceAll('{', '').replaceAll('}', ''));
}

// Adresse validée (adresse-validation), contrôles retirés, encodée ; « limit=1 ». Adresse ou base refusée : chaîne vide.
export function construireUrlGeocodage(adresse, base) {
  const nette = Array.from(texte(adresse), (c) => (c.codePointAt(0) < 0x20 || (c.codePointAt(0) >= 0x7f && c.codePointAt(0) <= 0x9f) ? ' ' : c))
    .join('')
    .replace(/ {2,}/g, ' ');
  const verdict = valider(nette);
  if (!verdict.valide || !hoteAutorise(base)) return '';
  return `${texte(base)}?q=${encodeURIComponent(verdict.adresse)}&limit=1`;
}

export function dansFrance(lat, lon) {
  return estNombre(lat) && estNombre(lon) && lat >= FRANCE.latMin && lat <= FRANCE.latMax && lon >= FRANCE.lonMin && lon <= FRANCE.lonMax;
}

// Réponse GeoJSON du géocodeur : premier résultat, score d'au moins `seuil`, en France métropolitaine.
export function analyserGeocodage(texteJson, seuil) {
  let donnees;
  try {
    donnees = JSON.parse(texte(texteJson));
  } catch {
    return { ok: false, raison: 'json' };
  }
  const premiere = estObjet(donnees) && Array.isArray(donnees.features) ? donnees.features[0] : undefined;
  if (!estObjet(premiere)) return { ok: false, raison: 'aucun' };
  const proprietes = estObjet(premiere.properties) ? premiere.properties : {};
  const coordonnees = estObjet(premiere.geometry) ? premiere.geometry.coordinates : null;
  if (!Array.isArray(coordonnees) || !estNombre(coordonnees[0]) || !estNombre(coordonnees[1]) || !estNombre(proprietes.score)) {
    return { ok: false, raison: 'aucun' };
  }
  if (proprietes.score < (estNombre(seuil) ? seuil : 0)) return { ok: false, raison: 'score' };
  const [lon, lat] = coordonnees;
  if (!dansFrance(lat, lon)) return { ok: false, raison: 'hors-france' };
  return { ok: true, lat, lon, libelle: texte(proprietes.label), score: proprietes.score, type: texte(proprietes.type) };
}

// Bascule automatique du fond : au moins `erreursMin` erreurs sans aucune tuile chargée, ou aucune tuile chargée après `delaiMs`.
export function doitBasculer(mesures, seuils) {
  const m = estObjet(mesures) ? mesures : {};
  const s = estObjet(seuils) ? seuils : {};
  const erreursMin = estNombre(s.erreursMin) ? s.erreursMin : 4;
  const delaiMs = estNombre(s.delaiMs) ? s.delaiMs : 8000;
  if (estNombre(m.charges) && m.charges > 0) return false;
  return (estNombre(m.erreurs) && m.erreurs >= erreursMin) || (estNombre(m.ecouleMs) && m.ecouleMs >= delaiMs);
}

const echapper = (t) => texte(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Seule chaîne HTML construite avec des données : texte échappé, liens https validés (liensExternes), nouvel onglet.
export function chaineAttribution(attributions, liens) {
  const table = estObjet(liens) ? liens : {};
  return (Array.isArray(attributions) ? attributions : [])
    .filter((a) => estObjet(a) && texte(a.texte) !== '')
    .map((a) => {
      const adresse = estObjet(table) && Object.hasOwn(table, texte(a.lien)) ? table[a.lien] : undefined;
      return lienExterneValide(adresse)
        ? `<a href="${echapper(adresse)}" target="_blank" rel="noopener noreferrer">${echapper(a.texte)}</a>`
        : echapper(a.texte);
    })
    .join(' | ');
}

const listeCouches = (calque, config) => {
  const calques = estObjet(config) && estObjet(config.calques) ? config.calques : {};
  const couches = typeof calque === 'string' && Object.hasOwn(calques, calque) && Array.isArray(calques[calque]) ? calques[calque] : [];
  return couches.filter((c) => estObjet(c) && texte(c.nom) !== '');
};

// Noms techniques des couches d'un calque (chaleur et calque inconnu : liste vide).
export function couchesPourCalque(calque, config) {
  return listeCouches(calque, config).map((c) => c.nom);
}

// Réglages WMS d'un calque : un seul service, une requête par couche jointe (`couches.join(',')`).
export function optionsWms(calque, config) {
  const wms = estObjet(config) && estObjet(config.wms) ? config.wms : {};
  const vue = estObjet(config) && estObjet(config.vue) ? config.vue : {};
  return {
    base: texte(wms.base),
    couches: couchesPourCalque(calque, config),
    version: texte(wms.version),
    format: texte(wms.format),
    transparent: wms.transparent === true,
    opacite: estNombre(vue.opacite) ? vue.opacite : 1,
  };
}

// Calques à afficher : cases cochées (`[{ id, coche }]`) dont le calque a au moins une couche, dans l'ordre de la configuration.
export function calquesActifs(cases, config) {
  const cochees = new Set((Array.isArray(cases) ? cases : []).filter((c) => estObjet(c) && c.coche === true).map((c) => c.id));
  const calques = estObjet(config) && estObjet(config.calques) ? Object.keys(config.calques) : [];
  return calques.filter((id) => cochees.has(id) && couchesPourCalque(id, config).length > 0);
}

// Légende de la carte réelle : une entrée par couche (libellé générique + nom technique) ; un calque sans couche (chaleur) n'en a pas.
export function libellesLegende(config) {
  const textes = estObjet(config) && estObjet(config.textes) ? config.textes : {};
  const calques = estObjet(config) && estObjet(config.calques) ? Object.keys(config.calques) : [];
  return calques.flatMap((calque) => listeCouches(calque, config).map((c) => ({ calque, nom: c.nom, libelle: texte(c.libelle), technique: texte(textes.nomTechnique).replace('{nom}', c.nom) })));
}

// ---- Aléas recensés à l'adresse (lot 4d-C) : lecture tolérante de l'API Géorisques (formats inférés, non confirmés par un échantillon réel) ----

const coord = (v) => (estNombre(v) ? String(Number(v.toFixed(6))) : '');

// Gaspar (risques de la commune) : latlon=<lon>,<lat>&rayon=<m> ; base refusée ou point hors de France : chaîne vide.
export function construireUrlGaspar(lat, lon, base, rayon) {
  if (!dansFrance(lat, lon) || !hoteAutorise(base) || !estNombre(rayon) || rayon <= 0) return '';
  return `${texte(base)}?latlon=${coord(lon)},${coord(lat)}&rayon=${Math.round(rayon)}`;
}

// RGA (retrait-gonflement des argiles) : latlon=<lon>,<lat>
export function construireUrlRga(lat, lon, base) {
  if (!dansFrance(lat, lon) || !hoteAutorise(base)) return '';
  return `${texte(base)}?latlon=${coord(lon)},${coord(lat)}`;
}

// Minuscules, sans accents.
const normaliser = (t) => texte(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function lireJson(brut) {
  try {
    const valeur = JSON.parse(texte(brut));
    return valeur !== null && typeof valeur === 'object' ? { ok: true, valeur } : { ok: false };
  } catch {
    return { ok: false };
  }
}

// Parcours récursif (profondeur bornée) : visite chaque paire clé / valeur dans l'ordre de la réponse.
function parcourir(noeud, visiter, profondeur = 0) {
  if (profondeur > 20 || noeud === null || typeof noeud !== 'object') return;
  for (const [cle, valeur] of Array.isArray(noeud) ? noeud.entries() : Object.entries(noeud)) {
    visiter(String(cle), valeur);
    parcourir(valeur, visiter, profondeur + 1);
  }
}

// gaspar/risques : toutes les valeurs des clés `mots.cles` (libellés de risque), normalisées ; un calque est présent si une valeur
// contient l'un de ses mots (`mots.calques` : { calque: [mots] }). Réponse illisible : { ok: false }.
export function lireRisquesGaspar(texteJson, mots) {
  const lu = lireJson(texteJson);
  if (!lu.ok) return { ok: false };
  const regles = estObjet(mots) ? mots : {};
  const cles = new Set((Array.isArray(regles.cles) ? regles.cles : []).filter((c) => typeof c === 'string').map((c) => c.toLowerCase()));
  const libelles = [];
  parcourir(lu.valeur, (cle, valeur) => {
    if (cles.has(cle.toLowerCase()) && typeof valeur === 'string') libelles.push(normaliser(valeur));
  });
  const presents = {};
  for (const [calque, liste] of Object.entries(estObjet(regles.calques) ? regles.calques : {})) {
    const motsNormalises = (Array.isArray(liste) ? liste : []).map(normaliser).filter((m) => m !== '');
    presents[calque] = libelles.some((l) => motsNormalises.some((m) => l.includes(m)));
  }
  return { ok: true, presents };
}

// rga : première valeur textuelle (non numérique) d'une clé contenant `regles.cle` (« expos »), lue d'après `regles.niveaux`
// ({ forte: 3, moyenne: 2, faible: 1 }) ; à défaut, la valeur de `regles.cleCode` (« codeExposition ») ; sinon niveau 0.
export function lireExpositionRga(texteJson, regles) {
  const lu = lireJson(texteJson);
  if (!lu.ok) return { ok: false };
  const r = estObjet(regles) ? regles : {};
  const fragment = typeof r.cle === 'string' && r.cle !== '' ? r.cle.toLowerCase() : 'expos';
  const cleCode = typeof r.cleCode === 'string' && r.cleCode !== '' ? r.cleCode : 'codeExposition';
  const niveaux = estObjet(r.niveaux) ? r.niveaux : { forte: 3, moyenne: 2, faible: 1 };
  let niveau = null;
  let code = null;
  parcourir(lu.valeur, (cle, valeur) => {
    if (niveau === null && cle.toLowerCase().includes(fragment) && typeof valeur === 'string' && valeur.trim() !== '' && !/^\d+$/.test(valeur.trim())) {
      const lu2 = normaliser(valeur);
      const mot = Object.keys(niveaux).find((m) => lu2.includes(normaliser(m)));
      niveau = mot !== undefined && estNombre(niveaux[mot]) ? niveaux[mot] : 0;
    }
    if (code === null && cle === cleCode) code = Number(valeur);
  });
  const final = niveau !== null ? niveau : estNombre(code) && [1, 2, 3].includes(code) ? code : 0;
  return { ok: true, niveau: final };
}

// États des calques qui ont au moins une couche : « present », « absent » (réponse lisible sans correspondance) ou « inconnu »
// (appel en échec ou réponse illisible, `null` ou { ok: false }). `secours` : tous les états sont inconnus.
export function etatCalques(entree) {
  const { gaspar, rga, calquesConfig } = estObjet(entree) ? entree : {};
  const config = estObjet(calquesConfig) ? calquesConfig : {};
  const detection = estObjet(config.detection) ? config.detection : {};
  const etats = {};
  for (const calque of Object.keys(estObjet(config.calques) ? config.calques : {})) {
    if (couchesPourCalque(calque, config).length === 0) continue;
    const regle = estObjet(detection[calque]) ? detection[calque] : {};
    if (regle.source === 'rga') {
      etats[calque] = estObjet(rga) && rga.ok === true && estNombre(rga.niveau) ? (rga.niveau > 0 ? { etat: 'present', niveau: rga.niveau } : { etat: 'absent', niveau: 0 }) : { etat: 'inconnu', niveau: 0 };
    } else {
      const lu = estObjet(gaspar) && gaspar.ok === true && estObjet(gaspar.presents) && typeof gaspar.presents[calque] === 'boolean';
      etats[calque] = lu ? { etat: gaspar.presents[calque] ? 'present' : 'absent', niveau: 0 } : { etat: 'inconnu', niveau: 0 };
    }
  }
  const liste = Object.values(etats);
  return { etats, secours: liste.length > 0 && liste.every((e) => e.etat === 'inconnu') };
}

// Calques proposés : présents et inconnus (les absents sont masqués), dans l'ordre de la configuration.
export function calquesProposes(etats) {
  const liste = estObjet(etats) && estObjet(etats.etats) ? Object.entries(etats.etats) : [];
  return liste.filter(([, e]) => estObjet(e) && e.etat !== 'absent').map(([calque]) => calque);
}

// Libellé d'une case : nom du calque et présence (« recensé », « présence non déterminée », ou niveau d'exposition des argiles).
export function libelleCalque(calque, etat, niveau, textes) {
  const t = estObjet(textes) ? textes : {};
  const noms = estObjet(t.calques) ? t.calques : {};
  const expositions = estObjet(t.exposition) ? t.exposition : {};
  const nom = typeof calque === 'string' && Object.hasOwn(noms, calque) ? texte(noms[calque]) : '';
  let presence = texte(t.inconnue);
  if (etat === 'present') presence = estNombre(niveau) && niveau > 0 && Object.hasOwn(expositions, String(niveau)) ? texte(expositions[String(niveau)]) : texte(t.recense);
  return { nom, presence };
}

// Cases cochées au départ : les calques proposés qui figurent parmi les calques par défaut du filtre d'aléa (`defauts`,
// issus de calquesParDefaut) ; un filtre dont le calque n'est pas proposé ne coche rien.
export function cochesInitiales(proposes, defauts) {
  const liste = Array.isArray(defauts) ? defauts : [];
  return (Array.isArray(proposes) ? proposes : []).filter((c) => liste.includes(c));
}
