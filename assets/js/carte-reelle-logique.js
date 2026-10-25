// Logique pure de la carte réelle du diagnostic : aucun accès au DOM, au réseau, au stockage ni à l'horloge ;
// aucun argument n'est modifié ; jamais d'exception. Les URL (gabarits, services) viennent de data/diagnostic.json.
import { lienExterneValide } from './rendu.js';
import { valider } from './adresse-validation.js';

// Seuls hôtes joignables après l'accord du visiteur. Géorisques : toujours avec « www » (sans, CORS bloque).
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
  return { ok: true, lat, lon, libelle: texte(proprietes.label), score: proprietes.score };
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

// Légende de la carte réelle : une entrée par couche (libellé générique + nom technique) ; chaleur : mention d'indisponibilité.
export function libellesLegende(config, libellesCalques) {
  const textes = estObjet(config) && estObjet(config.textes) ? config.textes : {};
  const noms = estObjet(libellesCalques) ? libellesCalques : {};
  const calques = estObjet(config) && estObjet(config.calques) ? Object.keys(config.calques) : [];
  return calques.flatMap((calque) => {
    const couches = listeCouches(calque, config);
    if (couches.length === 0) return [{ calque, nom: null, libelle: texte(noms[calque]), technique: null, indisponible: texte(textes.chaleurIndisponible) }];
    return couches.map((c) => ({ calque, nom: c.nom, libelle: texte(c.libelle), technique: texte(textes.nomTechnique).replace('{nom}', c.nom), indisponible: null }));
  });
}
