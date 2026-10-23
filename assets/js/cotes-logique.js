// Logique pure du configurateur de cotes : aucun accès au DOM ni au stockage, aucun argument modifié.
// Les limites viennent de data/produit.json (produit.cotes) ; la plage est un exemple fixe, pas un calcul d'ingénierie.

export const CHAMPS = ['largeur', 'hauteur', 'tolerance'];

const ESPACES = /[\u0020\u00a0\u202f]/g;
const ENTIER_MM = /^\d{1,4}$/;

// Texte saisi -> { etat: "vide" } | { etat: "ok", valeur } | { etat: "invalide" } ; entier de 1 à 4 chiffres, sans signe.
export function lireMm(texte, { minimum = 1 } = {}) {
  const net = typeof texte === 'string' ? texte.replace(ESPACES, '') : '';
  if (net === '') return { etat: 'vide' };
  if (!ENTIER_MM.test(net)) return { etat: 'invalide' };
  const valeur = Number(net);
  return valeur >= minimum ? { etat: 'ok', valeur } : { etat: 'invalide' };
}

// Écarts d'une dimension : valeur ± tolérance doit rester dans [min, max] (bornes comprises).
function ecartsDe(champ, valeur, tolerance, { min, max }) {
  const ecarts = [];
  if (valeur - tolerance < min) ecarts.push({ champ, sens: 'trop-petite', mm: min - (valeur - tolerance) });
  if (valeur + tolerance > max) ecarts.push({ champ, sens: 'trop-grande', mm: valeur + tolerance - max });
  return ecarts;
}

// saisie = { largeur, hauteur, tolerance } (textes) ; limites = produit.cotes.
// -> { etat: "invalide" | "incomplet" | "compatible" | "hors", champs, ecarts }
export function evaluerCotes(saisie, limites) {
  if (!limites || !limites.largeur || !limites.hauteur) throw new Error('Limites de cotes absentes');
  const lus = {
    largeur: lireMm(saisie?.largeur, { minimum: 1 }),
    hauteur: lireMm(saisie?.hauteur, { minimum: 1 }),
    tolerance: lireMm(saisie?.tolerance, { minimum: 0 }),
  };
  const champs = {};
  for (const nom of CHAMPS) {
    champs[nom] = lus[nom].etat === 'invalide' ? { etat: 'invalide', raison: 'format' } : { ...lus[nom] };
  }
  if (lus.tolerance.etat === 'ok' && lus.tolerance.valeur > limites.toleranceMax) {
    champs.tolerance = { etat: 'invalide', raison: 'trop-grande', valeur: lus.tolerance.valeur };
  }
  if (CHAMPS.some((nom) => champs[nom].etat === 'invalide')) return { etat: 'invalide', champs, ecarts: [] };
  if (champs.largeur.etat === 'vide' || champs.hauteur.etat === 'vide') return { etat: 'incomplet', champs, ecarts: [] };
  const t = champs.tolerance.etat === 'ok' ? champs.tolerance.valeur : 0;
  const ecarts = [
    ...ecartsDe('largeur', champs.largeur.valeur, t, limites.largeur),
    ...ecartsDe('hauteur', champs.hauteur.valeur, t, limites.hauteur),
  ];
  return { etat: ecarts.length === 0 ? 'compatible' : 'hors', champs, ecarts };
}

// Premier champ à corriger, dans l'ordre largeur, hauteur, tolérance (par défaut : la largeur).
export function premierChampACorriger(evaluation) {
  const { champs, ecarts } = evaluation;
  const invalide = CHAMPS.find((nom) => champs[nom].etat === 'invalide');
  if (invalide) return invalide;
  const vide = ['largeur', 'hauteur'].find((nom) => champs[nom].etat === 'vide');
  if (vide) return vide;
  return ecarts[0]?.champ ?? 'largeur';
}

// Remplace les marques {cle} ; une marque sans valeur lève une erreur qui nomme la clé.
export function remplirGabarit(gabarit, valeurs) {
  return String(gabarit).replace(/\{([^{}]+)\}/g, (_, cle) => {
    if (valeurs === null || typeof valeurs !== 'object' || !Object.hasOwn(valeurs, cle) || valeurs[cle] === undefined) {
      throw new Error(`Marque sans valeur : « ${cle} »`);
    }
    return String(valeurs[cle]);
  });
}

// Entier avec séparateur de milliers français (espace fine insécable U+202F), sans unité.
export function formaterMm(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function peutAjouter(evaluation) {
  return evaluation?.etat === 'compatible';
}

// Lecture sûre de sessionStorage.cotes : champs mémorisés si le produit est celui de la page, sinon champs vides.
export function restaurerCotes(brut, produitId) {
  const vides = () => ({ largeur: '', hauteur: '', tolerance: '' });
  try {
    const objet = JSON.parse(brut);
    if (objet === null || typeof objet !== 'object' || Array.isArray(objet) || objet.produit !== produitId) return vides();
    const texte = (v) => (typeof v === 'string' && v.length <= 40 ? v : '');
    return { largeur: texte(objet.largeur), hauteur: texte(objet.hauteur), tolerance: texte(objet.tolerance) };
  } catch {
    return vides();
  }
}
