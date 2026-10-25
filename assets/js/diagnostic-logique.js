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

// ---- Niveau d'exposition calculé et équipements selon les aléas recensés (lot 4e-B) ----
// `config` = l'objet de data/diagnostic.json (aleas, niveaux, equipements, exposition, detection, textes) ; `etats` = états par calque
// { inondation | argile | feu: { etat: 'present' | 'absent' | 'inconnu', niveau } } issus de etatCalques. Aucun argument n'est modifié.
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const liste = (v) => (Array.isArray(v) ? v : []);
const nombre = (v) => (Number.isFinite(v) ? v : 0);
const etatDe = (etats, calque) => (estObjet(etats) && typeof calque === 'string' && Object.hasOwn(etats, calque) && estObjet(etats[calque]) ? etats[calque] : null);

// Niveau (0 à 3) d'un aléa de détection (`alea` = calque : inondation, feu, argile) : 0 s'il n'est pas recensé ; sinon valeur des données
// (`exposition.niveaux`), propre à l'état « present » ou, pour les argiles, à l'exposition lue à l'adresse.
export function niveauAlea(alea, etat, exposition, config) {
  if (etat !== 'present' || typeof alea !== 'string') return 0;
  const regles = estObjet(config) && estObjet(config.exposition) && estObjet(config.exposition.niveaux) && Object.hasOwn(config.exposition.niveaux, alea) ? config.exposition.niveaux[alea] : null;
  if (!estObjet(regles)) return 0;
  const cle = Object.hasOwn(regles, 'present') ? 'present' : String(exposition);
  const valeur = Object.hasOwn(regles, cle) ? regles[cle] : 0;
  return Number.isInteger(valeur) && valeur > 0 ? valeur : 0;
}

// Niveau global : le plus élevé des aléas recensés. `aucun` : au moins une lecture réussie et aucun aléa recensé ; `indetermine` : aucune
// lecture réussie. `inconnus` : calques dont la présence n'a pas pu être lue.
export function niveauGlobalExposition(etats, config) {
  const entrees = estObjet(etats) ? Object.entries(etats).filter(([, e]) => estObjet(e)) : [];
  const inconnus = entrees.filter(([, e]) => e.etat === 'inconnu').map(([calque]) => calque);
  const lus = entrees.filter(([, e]) => e.etat === 'present' || e.etat === 'absent');
  if (lus.length === 0) return { etat: 'indetermine', niveau: 0, libelle: '', inconnus };
  const niveau = Math.max(0, ...lus.map(([calque, e]) => niveauAlea(calque, e.etat, e.niveau, config)));
  if (niveau === 0) return { etat: 'aucun', niveau: 0, libelle: '', inconnus };
  const libelles = estObjet(config) ? liste(config.niveaux) : [];
  const libelle = libelleNiveau(libelles, niveau);
  return { etat: 'niveau', niveau, libelle: typeof libelle === 'string' ? libelle : '', inconnus };
}

// Aléas du catalogue proposés comme pastilles : une source de détection, des équipements, et un état « present » ou « inconnu ».
// Résultat dans l'ordre des données : { id, calque, etat, niveau } ; niveau 0 pour une présence non déterminée.
export function aleasProposes(etats, config) {
  const cfg = estObjet(config) ? config : {};
  const detection = estObjet(cfg.detection) ? cfg.detection : {};
  const proposes = [];
  for (const alea of liste(cfg.aleas)) {
    const id = estObjet(alea) ? alea.id : undefined;
    const source = typeof id === 'string' && Object.hasOwn(detection, id) && estObjet(detection[id]) ? detection[id] : null;
    if (source === null || typeof source.calque !== 'string' || liste(source.equipements).length === 0) continue;
    const lu = etatDe(etats, source.calque);
    if (lu === null || (lu.etat !== 'present' && lu.etat !== 'inconnu')) continue;
    proposes.push({ id, calque: source.calque, etat: lu.etat, niveau: niveauAlea(source.calque, lu.etat, lu.niveau, cfg) });
  }
  return proposes;
}

// Identifiants ordonnés par niveau décroissant ; à égalité, ordre des données (tri stable).
const parNiveau = (aleas) => aleas.map((a, i) => ({ ...a, i })).sort((a, b) => nombre(b.niveau) - nombre(a.niveau) || a.i - b.i).map((a) => a.id);

// Au plus `max` équipements répartis à tour de rôle entre les aléas ordonnés ; à chaque tour, le prochain équipement de l'aléa par
// `priorite` croissante ; jamais deux fois le même équipement.
export function repartirEquipements(equipements, aleasOrdonnes, max = 3) {
  const plafond = Number.isInteger(max) && max > 0 ? max : 3;
  const catalogue = liste(equipements).filter((e) => estObjet(e) && typeof e.id === 'string');
  const files = liste(aleasOrdonnes).filter((id) => typeof id === 'string').map((id) => catalogue.filter((e) => liste(e.aleas).includes(id)).sort((a, b) => nombre(a.priorite) - nombre(b.priorite)));
  const choisis = [];
  const prochain = (file) => file.find((e) => !choisis.includes(e));
  for (let progres = true; progres && choisis.length < plafond;) {
    progres = false;
    for (const file of files) {
      const suivant = choisis.length < plafond ? prochain(file) : undefined;
      if (suivant) {
        choisis.push(suivant);
        progres = true;
      }
    }
  }
  return choisis;
}

// Équipements affichés : en mode exploration, les aléas du catalogue (niveaux d'exemple) ; sinon les aléas proposés à l'adresse.
// `pastille` : « tous » (répartition à tour de rôle) ou l'identifiant d'un aléa (ses trois premiers équipements par priorité).
export function selectionEquipements(entree) {
  const { equipements, pastille, etats, config, exploration } = estObjet(entree) ? entree : {};
  const cfg = estObjet(config) ? config : {};
  const aleas = exploration === true ? liste(cfg.aleas).filter((a) => estObjet(a) && typeof a.id === 'string') : aleasProposes(etats, cfg);
  const ordonnes = parNiveau(aleas);
  if (typeof pastille === 'string' && pastille !== TOUS && ordonnes.includes(pastille)) return repartirEquipements(equipements, [pastille], 3);
  return repartirEquipements(equipements, ordonnes, 3);
}

// Aléa écrit pour le comparateur : la pastille active ; avec « Tous », l'aléa proposé de niveau le plus élevé (à égalité, le premier) ;
// sans aléa proposé, `defaut` (aleaParDefaut du lot 9).
export function aleaPourComparaison(pastille, etats, config, defaut) {
  const cfg = estObjet(config) ? config : {};
  if (typeof pastille === 'string' && pastille !== TOUS && liste(cfg.aleas).some((a) => estObjet(a) && a.id === pastille)) return pastille;
  const ordonnes = parNiveau(aleasProposes(etats, cfg));
  return ordonnes.length > 0 ? ordonnes[0] : defaut;
}

// Ligne « Feux de forêt : non recensé. Grêle, vents, canicule : non évalués. » : aléas à source de détection lus et absents, puis
// aléas sans source (texte des données).
export function phraseAleasNonRecenses(etats, config) {
  const cfg = estObjet(config) ? config : {};
  const textes = estObjet(cfg.textes) && estObjet(cfg.textes.exposition) ? cfg.textes.exposition : {};
  const detection = estObjet(cfg.detection) ? cfg.detection : {};
  const absents = [];
  for (const alea of liste(cfg.aleas)) {
    const id = estObjet(alea) ? alea.id : undefined;
    const source = typeof id === 'string' && Object.hasOwn(detection, id) && estObjet(detection[id]) ? detection[id] : null;
    const lu = source === null ? null : etatDe(etats, source.calque);
    if (lu !== null && lu.etat === 'absent' && typeof alea.court === 'string') absents.push(alea.court);
  }
  const phrases = [];
  const gabarit = absents.length === 1 ? textes.nonRecense : textes.nonRecenses;
  if (absents.length > 0 && typeof gabarit === 'string') phrases.push(gabarit.replace('{aleas}', absents.join(', ')));
  if (typeof textes.nonEvalues === 'string' && textes.nonEvalues !== '') phrases.push(textes.nonEvalues);
  return phrases.join(' ');
}
