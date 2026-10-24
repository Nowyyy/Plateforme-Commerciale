// Logique pure du comparateur : aucun accès au DOM, au réseau ni au stockage ; aucun argument n'est modifié ; jamais d'exception.
// Source de vérité de la sélection (2 à 3 produits d'un même aléa) : selectionInitiale et basculerProduit.
import { formaterPrix } from './diagnostic-logique.js';
import { formaterMm, remplirGabarit } from './cotes-logique.js';

export const VERSION = 1;
const LIMITES_PAR_DEFAUT = { min: 2, max: 3 };

const estTexte = (v) => typeof v === 'string' && v !== '';
const liste = (v) => (Array.isArray(v) ? v : []);

// Limites entières, min >= 1 et max >= min ; toute autre forme : valeurs par défaut.
function normaliserLimites(limites) {
  const { min, max } = limites ?? {};
  return Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min ? { min, max } : { ...LIMITES_PAR_DEFAUT };
}

// Valeur brute de la clé « comparaison » -> { alea, produits } ou null (JSON invalide, version inconnue, types inattendus).
export function lireSelection(brut) {
  if (typeof brut !== 'string') return null;
  let valeur;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return null;
  }
  if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  if (valeur.v !== VERSION || !estTexte(valeur.alea)) return null;
  if (!Array.isArray(valeur.produits) || !valeur.produits.every(estTexte)) return null;
  return { alea: valeur.alea, produits: [...valeur.produits] };
}

// Produits dont `aleas` contient l'identifiant, dans l'ordre des données.
export function produitsDeAlea(produits, aleaId) {
  return liste(produits).filter((p) => Array.isArray(p?.aleas) && p.aleas.includes(aleaId));
}

// Aléa de niveau maximal ; à égalité, le premier. null s'il n'y a aucun aléa.
export function aleaParDefaut(aleas) {
  let choisi = null;
  for (const a of liste(aleas)) {
    if (!estTexte(a?.id)) continue;
    const niveau = Number.isFinite(a.niveau) ? a.niveau : -Infinity;
    if (choisi === null || niveau > choisi.niveau) choisi = { id: a.id, niveau };
  }
  return choisi === null ? null : choisi.id;
}

// Ids retenus (sans doublon, tronqués à max) puis complétés dans l'ordre des données jusqu'à min.
function completer(retenus, disponibles, { min, max }) {
  const ids = [...new Set(retenus.filter((id) => disponibles.includes(id)))].slice(0, max);
  for (const id of disponibles) {
    if (ids.length >= min) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

// Sélection au chargement : aléa et produits de la session s'ils sont valides, sinon valeurs par défaut.
export function selectionInitiale({ brut, produits, aleas, limites } = {}) {
  const bornes = normaliserLimites(limites);
  const session = lireSelection(brut);
  const connus = liste(aleas).map((a) => a?.id);
  const alea = session !== null && connus.includes(session.alea) ? session.alea : aleaParDefaut(aleas);
  const disponibles = produitsDeAlea(produits, alea).map((p) => p.id);
  return { alea, ids: completer(session?.produits ?? [], disponibles, bornes) };
}

// Sélection d'un aléa choisi, sans session : les `min` premiers produits dans l'ordre des données.
export function selectionPourAlea(aleaId, produits, limites) {
  const disponibles = produitsDeAlea(produits, aleaId).map((p) => p.id);
  return { alea: aleaId, ids: completer([], disponibles, normaliserLimites(limites)) };
}

// Coche ou décoche un produit. resultat : ajoute, retire, max (non ajouté), min (non retiré), inconnu (absent des disponibles).
export function basculerProduit(ids, id, disponibles, limites) {
  const { min, max } = normaliserLimites(limites);
  const courants = liste(ids);
  if (!liste(disponibles).includes(id)) return { ids: [...courants], resultat: 'inconnu' };
  if (courants.includes(id)) {
    if (courants.length <= min) return { ids: [...courants], resultat: 'min' };
    return { ids: courants.filter((autre) => autre !== id), resultat: 'retire' };
  }
  if (courants.length >= max) return { ids: [...courants], resultat: 'max' };
  return { ids: [...courants, id], resultat: 'ajoute' };
}

// Chaîne JSON de la clé « comparaison » (identifiants seulement).
export function serialiserSelection(alea, ids) {
  return JSON.stringify({ v: VERSION, alea, produits: liste(ids) });
}

// « {valeur} {unite} » ; valeur absente ou gabarit inutilisable : texte vide (jamais d'exception).
function avecUnite(gabarit, valeur, unite) {
  if (!Number.isFinite(valeur)) return '';
  try {
    return remplirGabarit(gabarit, { valeur: formaterMm(valeur), unite: unite ?? '' });
  } catch {
    return '';
  }
}

// Lignes du tableau dans l'ordre : critère principal de l'aléa, montage, poids, prix TTC, pose estimée.
// libelles = comparateur.comparaison (valeur, lignes, unites) ; critere = { titre, unite } de l'aléa.
export function construireTableau({ produits, critere, libelles } = {}) {
  const choisis = liste(produits);
  const { valeur, lignes, unites } = libelles ?? {};
  const ligne = (cle, libelle, texteDe) => ({ cle, libelle: libelle ?? '', valeurs: choisis.map((p) => ({ texte: texteDe(p?.performances ?? {}, p ?? {}) })) });
  return [
    ligne('principale', critere?.titre, (perf) => avecUnite(valeur, perf.principale, critere?.unite)),
    ligne('montage', lignes?.montage, (perf) => avecUnite(valeur, perf.montage, unites?.montage)),
    ligne('poids', lignes?.poids, (perf) => avecUnite(valeur, perf.poids, unites?.poids)),
    ligne('prix', lignes?.prix, (perf, p) => formaterPrix(p.prix)),
    ligne('pose', lignes?.pose, (perf, p) => formaterPrix(p.pose)),
  ];
}
