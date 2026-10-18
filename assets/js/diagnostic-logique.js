// Logique pure du diagnostic : aucun accès au DOM ni au stockage. Valeurs et filtres viennent de data/diagnostic.json.
export const TOUS = 'tous';

// Renvoie l'id de l'aléa s'il existe, sinon null (« Tous » ou valeur inconnue).
export function aleaValide(ids, valeur) {
  return typeof valeur === 'string' && Array.isArray(ids) && ids.includes(valeur) ? valeur : null;
}

// « Tous » ou filtre inconnu (aucun équipement concerné) : les `max` premiers par priorité ; sinon ceux de l'aléa.
export function filtrerEquipements(equipements, filtre, max = 3) {
  const parPriorite = [...equipements].sort((a, b) => a.priorite - b.priorite);
  const concernes = parPriorite.filter((e) => e.aleas.includes(filtre));
  return (filtre === TOUS || concernes.length === 0 ? parPriorite : concernes).slice(0, max);
}

// « Tous » (ou filtre inconnu) : niveau maximal ; un aléa : son niveau.
export function niveauGlobal(aleas, filtre) {
  const choisi = aleas.find((a) => a.id === filtre);
  return choisi ? choisi.niveau : Math.max(...aleas.map((a) => a.niveau));
}

// Libellé du niveau n (1 à niveaux.length), borné.
export function libelleNiveau(niveaux, n) {
  const rang = Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), niveaux.length) : 1;
  return niveaux[rang - 1];
}

// Un booléen par segment : vrai jusqu'au niveau inclus.
export function segmentsJauge(niveau, total = 4) {
  const borne = Number.isFinite(niveau) ? Math.min(Math.max(Math.round(niveau), 0), total) : 0;
  return Array.from({ length: total }, (_, i) => i < borne);
}

const FINE = ' ';

// 1250 -> « 1 250 € » (espace fine insécable en séparateur de milliers et avant €).
export function formaterPrix(n) {
  if (!Number.isFinite(n)) return '';
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, FINE)}${FINE}€`;
}

// Calques visibles au départ : « Tous » = tous ; un aléa = le calque de cet aléa seul.
export function calquesParDefaut(aleas, filtre) {
  const choisi = aleas.find((a) => a.id === filtre);
  return choisi ? [choisi.calque] : aleas.map((a) => a.calque);
}
