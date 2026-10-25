// Logique pure de la saisie assistée de l'adresse (accueil et diagnostic) : aucun accès au DOM, au réseau, au stockage
// ni à l'horloge ; aucun argument n'est modifié ; jamais d'exception. Les URL de base, seuils et types viennent de data/diagnostic.json.
import { LONGUEUR_MAX } from './adresse-validation.js';
import { dansFrance, hoteAutorise } from './carte-reelle-logique.js';

const MAX_SUGGESTIONS = 5;

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

// Recherche de data.geopf.fr : q=…&limit=n (repli de la complétion pour les suggestions seulement, jamais de vérification à la validation).
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

// Adresse valide = le texte du champ est exactement le libellé d'une suggestion choisie par le visiteur et n'a pas été modifié depuis.
// `selection` : libellé choisi (texte ou { libelle }) ; `adresseCourante` : adresse déjà affichée (diagnostic) ; `panne` : la complétion
// et son repli ont tous deux échoué (l'adresse est alors utilisée telle quelle si `valideLocal`, résultat de la validation locale du lot 2).
// Résultat { valide, raison } ; raison : null (choisie), 'non-choisie', 'modifiee', 'identique', 'locale' ou 'panne' (valide sans suggestion).
export function etatValidation(entree) {
  const { texte: brut, selection, adresseCourante, panne, valideLocal } = estObjet(entree) ? entree : {};
  const saisie = texte(brut);
  const libelle = estObjet(selection) ? texte(selection.libelle) : texte(selection);
  const courante = texte(adresseCourante);
  if (saisie === '') return { valide: false, raison: 'non-choisie' };
  if (courante !== '' && saisie === courante) return { valide: false, raison: 'identique' };
  if (libelle !== '' && saisie === libelle) return { valide: true, raison: null };
  if (libelle !== '') return { valide: false, raison: 'modifiee' };
  if (panne === true) return valideLocal === true ? { valide: true, raison: 'panne' } : { valide: false, raison: 'locale' };
  return { valide: false, raison: 'non-choisie' };
}

// Touche Entrée dans le champ : une option surlignée est choisie ; sinon une adresse valide déclenche la validation ; sinon rien.
export function actionEntree(entree) {
  const { activeIndex, valide } = estObjet(entree) ? entree : {};
  if (estNombre(activeIndex) && activeIndex >= 0) return 'choisir';
  return valide === true ? 'valider' : 'rien';
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
