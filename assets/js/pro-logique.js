// Candidature de professionnel (écran 5) : normalisation et validation, fonctions pures.
// Aucun accès au DOM, au réseau ni au stockage ; aucun argument n'est modifié ; jamais d'exception.
// Les bornes viennent de data/pro.json (clé « limites »).

export const CHAMPS = ['societe', 'siret', 'prenom', 'nom', 'email', 'telephone', 'aleas', 'description', 'message', 'consentement'];

// Raisons de refus possibles, par champ : source unique pour les tests et pour la complétude de data/pro.json (« messages »).
export const RAISONS = {
  societe: ['vide', 'longueur', 'caractere'],
  siret: ['vide', 'format'],
  prenom: ['vide', 'longueur', 'caractere'],
  nom: ['vide', 'longueur', 'caractere'],
  email: ['vide', 'format', 'longueur'],
  telephone: ['format'],
  aleas: ['vide', 'invalide'],
  description: ['vide', 'court', 'long', 'caractere'],
  message: ['long', 'caractere'],
  consentement: ['vide'],
};

const MONO_LIGNE = ['societe', 'prenom', 'nom', 'email', 'telephone'];
const ZONES = ['description', 'message'];
const ESPACES = /[ \u00a0\u202f]+/g;
const BORDS = /^[ \u00a0\u202f]+|[ \u00a0\u202f]+$/g;
const BORDS_ZONE = /^[ \u00a0\u202f\n]+|[ \u00a0\u202f\n]+$/g;

const DEFAUTS = {
  societe: { min: 2, max: 100 },
  prenom: { min: 1, max: 50 },
  nom: { min: 1, max: 50 },
  description: { min: 20, max: 1000 },
  message: { max: 1000 },
  email: { max: 254, localMax: 64 },
};

export function compterCaracteres(texte) {
  return typeof texte === 'string' ? [...texte].length : 0;
}

// Borne numérique d'un champ, avec repli sur les valeurs par défaut si les données sont absentes ou invalides.
function borne(limites, champ, cle) {
  const valeur = limites !== null && typeof limites === 'object' ? limites[champ]?.[cle] : undefined;
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : DEFAUTS[champ][cle];
}

// Contrôles C0 (hors saut de ligne dans les zones de texte), U+007F, contrôles bidirectionnels.
export function contientInterdit(texte, zone) {
  for (const c of texte) {
    const p = c.codePointAt(0);
    if (p === 0x0a && zone) continue;
    if (p <= 0x1f || p === 0x7f || (p >= 0x202a && p <= 0x202e) || (p >= 0x2066 && p <= 0x2069)) return true;
  }
  return false;
}

export function normaliser(champ, valeur) {
  if (typeof valeur !== 'string') return '';
  if (champ === 'siret') {
    const compact = valeur.replace(BORDS, '').replace(ESPACES, ' ');
    const chiffres = valeur.replace(ESPACES, '');
    return /^[0-9]{14}$/.test(chiffres) ? chiffres : compact;
  }
  if (ZONES.includes(champ)) return valeur.replace(/\r\n?/g, '\n').replace(BORDS_ZONE, '');
  if (MONO_LIGNE.includes(champ)) return valeur.replace(BORDS, '').replace(ESPACES, ' ');
  return valeur;
}

export function validerEmail(email, limites) {
  const max = borne(limites, 'email', 'max');
  const localMax = borne(limites, 'email', 'localMax');
  if (email === '') return 'vide';
  const morceaux = email.split('@');
  if (morceaux.length !== 2) return 'format';
  const [local, domaine] = morceaux;
  if (local === '' || /\s/u.test(local) || contientInterdit(local, false)) return 'format';
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return 'format';
  const etiquettes = domaine.split('.');
  if (etiquettes.length < 2) return 'format';
  for (const etiquette of etiquettes) {
    if (!/^[\p{L}\p{N}-]+$/u.test(etiquette) || etiquette.startsWith('-') || etiquette.endsWith('-')) return 'format';
  }
  if (!/^\p{L}{2,}$/u.test(etiquettes[etiquettes.length - 1])) return 'format';
  if (compterCaracteres(local) > localMax || compterCaracteres(email) > max) return 'longueur';
  return null;
}

export function validerTelephone(telephone) {
  if (telephone === '') return null;
  const chiffres = telephone.replace(/[ \u00a0\u202f.\-()]/g, '');
  return /^\+?[0-9]{9,15}$/.test(chiffres) ? null : 'format';
}

function validerTexte(valeur, limites, champ, { obligatoire, zone }) {
  if (valeur === '') return obligatoire ? 'vide' : null;
  if (contientInterdit(valeur, zone)) return 'caractere';
  const longueur = compterCaracteres(valeur);
  const min = DEFAUTS[champ].min === undefined ? 0 : borne(limites, champ, 'min');
  const max = borne(limites, champ, 'max');
  if (longueur < min) return zone ? 'court' : 'longueur';
  if (longueur > max) return zone ? 'long' : 'longueur';
  return null;
}

// saisie = { societe, siret, prenom, nom, email, telephone, aleas, description, message, consentement }
// Renvoie { ok, erreurs: [{ champ, raison }] (ordre du formulaire, une raison par champ), valeurs (normalisées, jamais stockées) }.
export function valider(saisie, limites, aleasValides) {
  const source = saisie !== null && typeof saisie === 'object' ? saisie : {};
  const connus = Array.isArray(aleasValides) ? aleasValides.filter((a) => typeof a === 'string') : [];
  const aleas = Array.isArray(source.aleas) ? [...new Set(source.aleas.filter((a) => typeof a === 'string'))] : [];
  const valeurs = {
    societe: normaliser('societe', source.societe),
    siret: normaliser('siret', source.siret),
    prenom: normaliser('prenom', source.prenom),
    nom: normaliser('nom', source.nom),
    email: normaliser('email', source.email),
    telephone: normaliser('telephone', source.telephone),
    aleas,
    description: normaliser('description', source.description),
    message: normaliser('message', source.message),
    consentement: source.consentement === true,
  };
  const raisons = {
    societe: validerTexte(valeurs.societe, limites, 'societe', { obligatoire: true, zone: false }),
    siret: valeurs.siret === '' ? 'vide' : /^[0-9]{14}$/.test(valeurs.siret) ? null : 'format',
    prenom: validerTexte(valeurs.prenom, limites, 'prenom', { obligatoire: true, zone: false }),
    nom: validerTexte(valeurs.nom, limites, 'nom', { obligatoire: true, zone: false }),
    email: validerEmail(valeurs.email, limites),
    telephone: validerTelephone(valeurs.telephone),
    aleas: aleas.length === 0 ? 'vide' : aleas.every((a) => connus.includes(a)) ? null : 'invalide',
    description: validerTexte(valeurs.description, limites, 'description', { obligatoire: true, zone: true }),
    message: validerTexte(valeurs.message, limites, 'message', { obligatoire: false, zone: true }),
    consentement: valeurs.consentement ? null : 'vide',
  };
  const erreurs = CHAMPS.filter((champ) => raisons[champ] !== null).map((champ) => ({ champ, raison: raisons[champ] }));
  return { ok: erreurs.length === 0, erreurs, valeurs };
}

// Liens du récapitulatif : un par champ en erreur, dans l'ordre reçu, sans doublon.
export function construireResume(erreurs, libelles) {
  const vus = new Set();
  const resume = [];
  for (const erreur of Array.isArray(erreurs) ? erreurs : []) {
    const champ = erreur?.champ;
    if (typeof champ !== 'string' || vus.has(champ)) continue;
    vus.add(champ);
    const libelle = libelles?.[champ];
    resume.push({ champ, libelle: typeof libelle === 'string' ? libelle : champ });
  }
  return resume;
}
