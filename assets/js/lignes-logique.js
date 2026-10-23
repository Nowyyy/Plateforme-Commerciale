// Logique pure du panier à plusieurs lignes : aucun accès au DOM ni au stockage, aucun argument modifié.
// La session ne contient que { v: 2, lignes: [{ produit, mode, cotes|null, quantite }] } : prix, titres et délais
// sont recalculés à partir de data/produit.json. Une valeur de session n'est jamais crue : lireListe puis validerLigne.
import { evaluerCotes } from './cotes-logique.js';
import { lignesPrix, MODE_DIY, MODE_POSE } from './produit-logique.js';

export const VERSION_PANIER = 2;
export const PLAFOND_COMPTEUR = 99;

const CHAMPS_COTES = ['largeur', 'hauteur', 'tolerance'];
const estObjet = (valeur) => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
const entier = (valeur, minimum) => Number.isInteger(valeur) && valeur >= minimum;

// Identité d'une ligne : produit, mode, cotes et tolérance (la quantité n'en fait pas partie).
export function cleLigne(ligne) {
  const { produit, mode, cotes } = ligne ?? {};
  if (!estObjet(cotes)) return `${produit}|${mode}|-`;
  return `${produit}|${mode}|${cotes.largeur}|${cotes.hauteur}|${cotes.tolerance}`;
}

function coteValide(cotes) {
  return cotes === null || (estObjet(cotes) && CHAMPS_COTES.every((nom) => entier(cotes[nom], 0)));
}

// Forme d'une ligne de session (hors quantité) : produit, mode et cotes.
function configurationValide(ligne) {
  return estObjet(ligne)
    && typeof ligne.produit === 'string' && ligne.produit !== ''
    && (ligne.mode === MODE_DIY || ligne.mode === MODE_POSE)
    && coteValide(ligne.cotes);
}

// Ligne propre : seuls les champs du modèle sont recopiés (un éventuel « prix » ou « titre » disparaît).
function configuration(ligne) {
  const { produit, mode, cotes } = ligne;
  return {
    produit,
    mode,
    cotes: cotes === null ? null : { largeur: cotes.largeur, hauteur: cotes.hauteur, tolerance: cotes.tolerance },
  };
}

const plafonner = (quantite, limites) => Math.min(quantite, limites.quantiteMax);

// Texte de sessionStorage.panier -> { lignes, ignorees } ; ne lève jamais d'exception.
export function lireListe(brut, limites) {
  const vide = { lignes: [], ignorees: 0 };
  if (typeof brut !== 'string' || brut.trim() === '') return vide;
  let objet;
  try {
    objet = JSON.parse(brut);
  } catch {
    return vide;
  }
  if (!estObjet(objet) || objet.v !== VERSION_PANIER || !Array.isArray(objet.lignes)) return vide;
  const fusionnees = [];
  const index = new Map();
  let ignorees = 0;
  for (const brute of objet.lignes) {
    if (!configurationValide(brute) || !entier(brute.quantite, 1)) {
      ignorees += 1;
      continue;
    }
    const ligne = { ...configuration(brute), quantite: brute.quantite };
    const cle = cleLigne(ligne);
    if (index.has(cle)) {
      const existante = fusionnees[index.get(cle)];
      existante.quantite += ligne.quantite;
    } else {
      index.set(cle, fusionnees.length);
      fusionnees.push(ligne);
    }
  }
  const lignes = fusionnees.slice(0, limites.lignesMax).map((l) => ({ ...l, quantite: plafonner(l.quantite, limites) }));
  return { lignes, ignorees: ignorees + (fusionnees.length - lignes.length) };
}

// Statut du texte de session : « absent » (rien d'enregistré), « illisible » (JSON invalide, forme ou version inconnue, ou
// aucune ligne exploitable alors que la liste en contenait) ou « lisible » (y compris une liste vide).
export function statutListe(brut, limites) {
  if (typeof brut !== 'string' || brut.trim() === '') return 'absent';
  let objet;
  try {
    objet = JSON.parse(brut);
  } catch {
    return 'illisible';
  }
  if (!estObjet(objet) || objet.v !== VERSION_PANIER || !Array.isArray(objet.lignes)) return 'illisible';
  const { lignes, ignorees } = lireListe(brut, limites);
  return lignes.length === 0 && ignorees > 0 ? 'illisible' : 'lisible';
}

// -> { etat, resultat } ; resultat : ajoutee, fusionnee, plafonnee, pleine, refusee.
export function ajouterLigne(etat, ligne, quantite, limites) {
  const lignes = etat?.lignes ?? [];
  const inchange = { lignes };
  if (!entier(quantite, 1) || !configurationValide(ligne)) return { etat: inchange, resultat: 'refusee' };
  const propre = configuration(ligne);
  const cle = cleLigne(propre);
  const position = lignes.findIndex((l) => cleLigne(l) === cle);
  if (position >= 0) {
    const total = lignes[position].quantite + quantite;
    const nouvelle = plafonner(total, limites);
    const suivantes = lignes.map((l, i) => (i === position ? { ...l, quantite: nouvelle } : l));
    return { etat: { lignes: suivantes }, resultat: total > limites.quantiteMax ? 'plafonnee' : 'fusionnee' };
  }
  if (lignes.length >= limites.lignesMax) return { etat: inchange, resultat: 'pleine' };
  const nouvelle = { ...propre, quantite: plafonner(quantite, limites) };
  return { etat: { lignes: [...lignes, nouvelle] }, resultat: quantite > limites.quantiteMax ? 'plafonnee' : 'ajoutee' };
}

// Plancher 1, plafond quantiteMax ; clé inconnue : état inchangé et quantité nulle.
export function changerQuantite(etat, cle, delta, limites) {
  const lignes = etat?.lignes ?? [];
  const position = lignes.findIndex((l) => cleLigne(l) === cle);
  if (position < 0) return { etat: { lignes }, quantite: null };
  const pas = Number.isInteger(delta) ? delta : 0;
  const quantite = Math.max(1, Math.min(limites.quantiteMax, lignes[position].quantite + pas));
  return { etat: { lignes: lignes.map((l, i) => (i === position ? { ...l, quantite } : l)) }, quantite };
}

// -> { etat, retiree, index } ; retiree nulle (et index -1) si la clé est inconnue.
export function retirerLigne(etat, cle) {
  const lignes = etat?.lignes ?? [];
  const position = lignes.findIndex((l) => cleLigne(l) === cle);
  if (position < 0) return { etat: { lignes }, retiree: null, index: -1 };
  return { etat: { lignes: lignes.filter((_, i) => i !== position) }, retiree: lignes[position], index: position };
}

// Réinsère à min(index, longueur) ; fusion avec une ligne identique ajoutée entre-temps ; panier plein : état inchangé.
// -> { etat, resultat } ; resultat : restauree, fusionnee, pleine, refusee.
export function restaurerLigne(etat, ligne, index, limites) {
  const lignes = etat?.lignes ?? [];
  if (!configurationValide(ligne) || !entier(ligne.quantite, 1)) return { etat: { lignes }, resultat: 'refusee' };
  const propre = { ...configuration(ligne), quantite: plafonner(ligne.quantite, limites) };
  const cle = cleLigne(propre);
  const position = lignes.findIndex((l) => cleLigne(l) === cle);
  if (position >= 0) {
    const quantite = plafonner(lignes[position].quantite + propre.quantite, limites);
    return { etat: { lignes: lignes.map((l, i) => (i === position ? { ...l, quantite } : l)) }, resultat: 'fusionnee' };
  }
  if (lignes.length >= limites.lignesMax) return { etat: { lignes }, resultat: 'pleine' };
  const rang = Math.max(0, Math.min(Number.isInteger(index) ? index : lignes.length, lignes.length));
  return { etat: { lignes: [...lignes.slice(0, rang), propre, ...lignes.slice(rang)] }, resultat: 'restauree' };
}

// Ligne à enregistrer depuis la fiche : produit complet -> cotes entiers si l'évaluation est compatible, sinon null ;
// produit non complet -> cotes null (l'évaluation est ignorée).
export function construireLigne(produit, mode, evaluation, quantite = 1) {
  const choisi = mode === MODE_POSE ? MODE_POSE : MODE_DIY;
  let cotes = null;
  if (produit?.complet && evaluation?.etat === 'compatible') {
    const { largeur, hauteur, tolerance } = evaluation.champs;
    cotes = { largeur: largeur.valeur, hauteur: hauteur.valeur, tolerance: tolerance.etat === 'ok' ? tolerance.valeur : 0 };
  }
  return { produit: produit.id, mode: choisi, cotes, quantite };
}

// -> { ok: true, cle, produit, mode, cotes, unitaire: { materiel, pose, total }, lignesPrix } ou { ok: false, raison }.
// Raisons : produit (inconnu), mode, cotes. Le champ « prix » d'une ligne est ignoré : tout est recalculé.
export function validerLigne(ligne, produits) {
  const cle = cleLigne(ligne);
  const produit = (Array.isArray(produits) ? produits : []).find((p) => p.id === ligne?.produit);
  if (!produit) return { ok: false, raison: 'produit' };
  if (ligne.mode !== MODE_DIY && ligne.mode !== MODE_POSE) return { ok: false, raison: 'mode' };
  const { cotes } = ligne;
  if (produit.complet && produit.cotes) {
    if (!estObjet(cotes) || !CHAMPS_COTES.every((nom) => entier(cotes[nom], 0))) return { ok: false, raison: 'cotes' };
    const evaluation = evaluerCotes({
      largeur: String(cotes.largeur), hauteur: String(cotes.hauteur), tolerance: String(cotes.tolerance),
    }, produit.cotes);
    if (evaluation.etat !== 'compatible') return { ok: false, raison: 'cotes' };
  } else if (cotes !== null && cotes !== undefined) {
    return { ok: false, raison: 'cotes' };
  }
  const prix = lignesPrix(produit, ligne.mode);
  const montant = (nom) => prix.find((l) => l.cle === nom)?.montant ?? 0;
  return {
    ok: true,
    cle,
    produit,
    mode: ligne.mode,
    cotes: estObjet(cotes) ? { largeur: cotes.largeur, hauteur: cotes.hauteur, tolerance: cotes.tolerance } : null,
    unitaire: { materiel: montant('materiel'), pose: montant('pose'), total: montant('total') },
    lignesPrix: prix,
  };
}

// -> { lignes: [{ ligne, cle, validation }], valides, invalides, vide } ; ordre conservé.
export function validerPanier(etat, produits) {
  const lignes = (etat?.lignes ?? []).map((ligne) => ({ ligne, cle: cleLigne(ligne), validation: validerLigne(ligne, produits) }));
  const valides = lignes.filter((l) => l.validation.ok).length;
  return { lignes, valides, invalides: lignes.length - valides, vide: lignes.length === 0 };
}

// Premier élément dont la valeur numérique est la plus grande (égalité : le premier).
function plusLong(entrees, champ) {
  let retenu = null;
  for (const entree of entrees) {
    if (retenu === null || entree.validation.produit[champ] > retenu.validation.produit[champ]) retenu = entree;
  }
  return retenu;
}

// Totaux des lignes valides seulement (entrées de validerPanier(...).lignes).
export function totauxPanier(entrees) {
  const valides = (entrees ?? []).filter((e) => e.validation?.ok);
  const enPose = valides.filter((e) => e.validation.mode === MODE_POSE);
  const somme = (liste, valeur) => liste.reduce((s, e) => s + valeur(e) * e.ligne.quantite, 0);
  const materiel = somme(valides, (e) => e.validation.unitaire.materiel);
  const pose = somme(valides, (e) => e.validation.unitaire.pose);
  const livraison = plusLong(valides, 'livraisonSemainesMax');
  const interventions = plusLong(enPose, 'poseSemainesMax');
  return {
    lignes: valides.length,
    articles: somme(valides, () => 1),
    materiel,
    pose,
    total: materiel + pose,
    articlesPose: somme(enPose, () => 1),
    lignesSurMesure: valides.filter((e) => e.validation.cotes !== null).length,
    delaiLivraison: livraison ? livraison.validation.produit.delaiLivraison : null,
    delaiPose: interventions ? interventions.validation.produit.delaiPose : null,
  };
}

export function besoinConfirmation(entrees) {
  return (entrees ?? []).some((e) => e.validation?.ok && e.validation.cotes !== null);
}

export function peutValider({ caseCochee, besoinConfirmation: besoin, valides, invalides }) {
  return valides >= 1 && invalides === 0 && (!besoin || caseCochee === true);
}

// Nombre d'articles d'une liste v 2 lisible, sans dépendre des données (en-tête de toutes les pages) ; 0 si illisible.
// Plafonné à 99 par défaut ; l'en-tête demande 100 pour distinguer « 99 » de « plus de 99 ».
export function compterArticles(brut, plafond = PLAFOND_COMPTEUR) {
  if (typeof brut !== 'string') return 0;
  try {
    const objet = JSON.parse(brut);
    if (!estObjet(objet) || objet.v !== VERSION_PANIER || !Array.isArray(objet.lignes)) return 0;
    const total = objet.lignes.reduce((s, l) => s + (estObjet(l) && entier(l.quantite, 1) ? l.quantite : 0), 0);
    return Math.min(total, plafond);
  } catch {
    return 0;
  }
}
