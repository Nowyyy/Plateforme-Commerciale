// Logique pure de la saisie assistée de l'adresse (accueil et diagnostic) : aucun accès au DOM, au réseau, au stockage
// ni à l'horloge ; aucun argument n'est modifié ; jamais d'exception. Les URL de base, seuils et types viennent de data/diagnostic.json.
import { LONGUEUR_MAX } from './adresse-validation.js';
import { dansFrance, hoteAutorise } from './carte-reelle-logique.js';

const MAX_SUGGESTIONS = 5;
const TYPES_ACCEPTES = ['housenumber', 'street', 'locality'];

const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texte = (v) => (typeof v === 'string' ? v : '');
const coordonnee = (v) => (estNombre(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN);
const sansControle = (c) => c.codePointAt(0) < 0x20 || (c.codePointAt(0) >= 0x7f && c.codePointAt(0) <= 0x9f);

// Contrôles remplacés par une espace, espaces compactées et retirées en bordure, 200 caractères au plus.
export function nettoyerSaisie(brut) {
  const propre = Array.from(texte(brut), (c) => (sansControle(c) ? ' ' : c)).join('').replace(/\s+/g, ' ').trim();
  return Array.from(propre).slice(0, LONGUEUR_MAX).join('').trim();
}

// Interroger le service : au moins `minimum` caractères nettoyés, texte différent de la dernière interrogation et de la sélection retenue.
export function doitInterroger(saisie, dernier, selection, minimum = 3) {
  const nette = nettoyerSaisie(saisie);
  const seuil = estNombre(minimum) && minimum > 0 ? minimum : 3;
  if (Array.from(nette).length < seuil) return false;
  if (typeof dernier === 'string' && nette === nettoyerSaisie(dernier)) return false;
  return !(typeof selection === 'string' && selection !== '' && nette === nettoyerSaisie(selection));
}

const bornerMax = (n) => (estNombre(n) && n >= 1 ? Math.min(Math.floor(n), MAX_SUGGESTIONS) : MAX_SUGGESTIONS);

// Complétion de data.geopf.fr : text=…&type=StreetAddress&maximumResponses=n ; base refusée ou texte vide : chaîne vide.
export function construireUrlCompletion(saisie, base, maximum = MAX_SUGGESTIONS) {
  const nette = nettoyerSaisie(saisie);
  if (nette === '' || !hoteAutorise(base)) return '';
  return `${texte(base)}?text=${encodeURIComponent(nette)}&type=StreetAddress&maximumResponses=${bornerMax(maximum)}`;
}

// Recherche de data.geopf.fr : q=…&limit=n (repli de la complétion et vérification, limit=1).
export function construireUrlRecherche(saisie, limite, base) {
  const nette = nettoyerSaisie(saisie);
  if (nette === '' || !hoteAutorise(base)) return '';
  return `${texte(base)}?q=${encodeURIComponent(nette)}&limit=${bornerMax(limite)}`;
}

function lireJson(brut) {
  try {
    return { ok: true, valeur: JSON.parse(texte(brut)) };
  } catch {
    return { ok: false };
  }
}

const garder = (libelle, lon, lat) => {
  const l = nettoyerSaisie(libelle);
  const x = coordonnee(lon);
  const y = coordonnee(lat);
  return l !== '' && dansFrance(y, x) ? { libelle: l, lon: x, lat: y } : null;
};

// Réponse tolérante de la complétion : results[] avec fulltext, x (longitude) et y (latitude) ; entrées incomplètes ou hors de France ignorées.
export function analyserCompletion(brut) {
  const lu = lireJson(brut);
  if (!lu.ok) return { ok: false, raison: 'json' };
  const resultats = estObjet(lu.valeur) ? lu.valeur.results : undefined;
  if (!Array.isArray(resultats)) return { ok: false, raison: 'forme' };
  const suggestions = resultats.map((r) => (estObjet(r) ? garder(r.fulltext, r.x, r.y) : null)).filter(Boolean).slice(0, MAX_SUGGESTIONS);
  return { ok: true, suggestions };
}

// Réponse GeoJSON de `search` : features[].properties.label et geometry.coordinates [lon, lat].
export function analyserSuggestionsRecherche(brut) {
  const lu = lireJson(brut);
  if (!lu.ok) return { ok: false, raison: 'json' };
  const features = estObjet(lu.valeur) ? lu.valeur.features : undefined;
  if (!Array.isArray(features)) return { ok: false, raison: 'forme' };
  const suggestions = features
    .map((f) => {
      const coordonnees = estObjet(f) && estObjet(f.geometry) && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [];
      return estObjet(f) && estObjet(f.properties) ? garder(f.properties.label, coordonnees[0], coordonnees[1]) : null;
    })
    .filter(Boolean)
    .slice(0, MAX_SUGGESTIONS);
  return { ok: true, suggestions };
}

// Décision à la validation. `selection` : { libelle } retenue en mémoire ; `resultat` : sortie de analyserGeocodage (avec `type`),
// ou null si le service est injoignable ; `types` : types d'adresse acceptés.
//  - accepte  : { decision, adresse, source: 'selection' | 'service' }
//  - refuse   : { decision, raison: 'introuvable' | 'municipalite' | 'hors-france' }
//  - indisponible : service injoignable ou réponse illisible (la validation locale du lot 2 s'applique alors)
export function decisionVerification(entree) {
  const { texte: saisie, selection, resultat, types } = estObjet(entree) ? entree : {};
  const nette = nettoyerSaisie(saisie);
  if (estObjet(selection) && texte(selection.libelle) !== '' && nette === nettoyerSaisie(selection.libelle)) {
    return { decision: 'accepte', adresse: nettoyerSaisie(selection.libelle), source: 'selection' };
  }
  if (!estObjet(resultat)) return { decision: 'indisponible' };
  if (resultat.ok !== true) {
    if (resultat.raison === 'hors-france') return { decision: 'refuse', raison: 'hors-france' };
    if (resultat.raison === 'aucun' || resultat.raison === 'score') return { decision: 'refuse', raison: 'introuvable' };
    return { decision: 'indisponible' };
  }
  const acceptes = Array.isArray(types) ? types : TYPES_ACCEPTES;
  if (acceptes.includes(resultat.type)) {
    return { decision: 'accepte', adresse: nettoyerSaisie(resultat.libelle) || nette, source: 'service' };
  }
  return { decision: 'refuse', raison: resultat.type === 'municipality' ? 'municipalite' : 'introuvable' };
}

// Navigation au clavier dans `n` options : -1 = aucune ; bas et haut bouclent ; liste vide : -1.
export function indexSuivant(n, courant, touche) {
  const total = estNombre(n) ? Math.floor(n) : 0;
  if (total <= 0) return -1;
  const i = estNombre(courant) && courant >= 0 && courant < total ? Math.floor(courant) : -1;
  if (touche === 'ArrowDown') return i === -1 ? 0 : (i + 1) % total;
  if (touche === 'ArrowUp') return i === -1 ? total - 1 : (i - 1 + total) % total;
  return i;
}
