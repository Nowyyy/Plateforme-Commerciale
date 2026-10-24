// Compte client simulé (écrans 6, 7, 8, 9 et 12) : logique pure.
// Aucun accès au DOM, au réseau ni au stockage ; aucun argument n'est modifié ; jamais d'exception.
// Les bornes viennent de data/compte.json (clé « limites ») ; la normalisation et les contrôles réutilisent pro-logique.js.
import { normaliser, contientInterdit, validerEmail, validerTelephone, compterCaracteres } from './pro-logique.js';

export const VERSION_COMPTE = 1;
export const TOUS = 'tous';
export const STATUTS = ['en-preparation', 'expedie', 'livre', 'pose-planifiee'];
export const MODE_POSE = 'pose';

// Raisons de refus possibles, par champ : source unique pour les tests et pour la complétude de data/compte.json (« messages »).
export const RAISONSCOMPTE = {
  email: ['vide', 'format', 'longueur'],
  motDePasse: ['vide', 'longueur', 'caractere'],
  prenom: ['vide', 'longueur', 'caractere'],
  nom: ['vide', 'longueur', 'caractere'],
  telephone: ['format'],
  adresse: ['vide', 'longueur', 'caractere'],
  complement: ['longueur', 'caractere'],
  codePostal: ['vide', 'format'],
  ville: ['vide', 'longueur', 'caractere'],
};

const CHAMPS_CONNEXION = ['email', 'motDePasse'];
export const CHAMPS_INFORMATIONS = ['prenom', 'nom', 'email', 'telephone', 'adresse', 'complement', 'codePostal', 'ville'];

const DEFAUTS = {
  prenom: { min: 1, max: 50 },
  nom: { min: 1, max: 50 },
  adresse: { min: 2, max: 100 },
  complement: { min: 0, max: 100 },
  ville: { min: 2, max: 60 },
  motDePasse: { min: 0, max: 128 },
};

const estObjet = (valeur) => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

// Borne d'un champ, avec repli sur les valeurs par défaut si les données sont absentes ou invalides.
function borne(limites, champ, cle) {
  const valeur = estObjet(limites) ? limites[champ]?.[cle] : undefined;
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : DEFAUTS[champ][cle];
}

// --- Session -----------------------------------------------------------------------------------------------

// Texte de sessionStorage.compte -> { v: 1, connecte: true } ou null (toute autre forme = non connecté).
export function lireCompte(brut) {
  if (typeof brut !== 'string') return null;
  try {
    const objet = JSON.parse(brut);
    return estObjet(objet) && objet.v === VERSION_COMPTE && objet.connecte === true ? { v: VERSION_COMPTE, connecte: true } : null;
  } catch {
    return null;
  }
}

export function compteConnecte(brut) {
  return lireCompte(brut) !== null;
}

// --- Dates -------------------------------------------------------------------------------------------------

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « 2026-09-12 » -> « 12 septembre 2026 » (« 1er » le premier du mois) ; date absente, mal formée ou inexistante : chaîne vide.
export function formaterDate(iso) {
  const trouve = typeof iso === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!trouve) return '';
  const [annee, mois, jour] = [Number(trouve[1]), Number(trouve[2]), Number(trouve[3])];
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) return '';
  return `${jour === 1 ? '1er' : jour} ${MOIS[mois - 1]} ${annee}`;
}

// --- Commandes ---------------------------------------------------------------------------------------------

const lignesDe = (commande) => (Array.isArray(commande?.lignes) ? commande.lignes.filter(estObjet) : []);
const nombre = (valeur) => (Number.isFinite(valeur) ? valeur : 0);

// { articles, materiel, pose, total } d'une liste de lignes d'instantané ; la pose ne compte qu'en mode pose.
export function totauxCommande(lignes) {
  let articles = 0;
  let materiel = 0;
  let pose = 0;
  for (const ligne of Array.isArray(lignes) ? lignes.filter(estObjet) : []) {
    const quantite = nombre(ligne.quantite);
    articles += quantite;
    materiel += nombre(ligne.prixUnitaire?.materiel) * quantite;
    if (ligne.mode === MODE_POSE) pose += nombre(ligne.prixUnitaire?.pose) * quantite;
  }
  return { articles, materiel, pose, total: materiel + pose };
}

// « diy », « pose » ou « mixte » (lignes de modes différents) ; commande sans ligne : « diy ».
export function modeCommande(commande) {
  const modes = new Set(lignesDe(commande).map((ligne) => (ligne.mode === MODE_POSE ? MODE_POSE : 'diy')));
  if (modes.size > 1) return 'mixte';
  return modes.has(MODE_POSE) ? MODE_POSE : 'diy';
}

// ["Titre × q", …] dans l'ordre des lignes.
export function resumeLignes(commande) {
  return lignesDe(commande).map((ligne) => `${String(ligne.titre ?? '')} × ${nombre(ligne.quantite)}`);
}

const texte = (valeur) => (typeof valeur === 'string' ? valeur : '');

// Date décroissante, puis identifiant croissant ; renvoie une nouvelle liste.
export function trierCommandes(commandes) {
  const liste = Array.isArray(commandes) ? commandes.filter(estObjet) : [];
  return [...liste].sort((a, b) => {
    if (texte(a.date) !== texte(b.date)) return texte(a.date) < texte(b.date) ? 1 : -1;
    if (texte(a.id) === texte(b.id)) return 0;
    return texte(a.id) < texte(b.id) ? -1 : 1;
  });
}

// « tous » ou identifiant de statut ; un filtre inconnu vaut « tous ». Les commandes gardent leur ordre.
export function filtrerCommandes(commandes, filtre, statuts = STATUTS) {
  const liste = Array.isArray(commandes) ? commandes.filter(estObjet) : [];
  const connus = Array.isArray(statuts) ? statuts : STATUTS;
  if (typeof filtre !== 'string' || filtre === TOUS || !connus.includes(filtre)) return [...liste];
  return liste.filter((commande) => commande.statut === filtre);
}

// Demandes hors « cloturee », date décroissante puis identifiant, au plus max (2 par défaut).
export function demandesEnCours(demandes, max = 2) {
  const limite = Number.isInteger(max) && max >= 0 ? max : 2;
  const liste = Array.isArray(demandes) ? demandes.filter((d) => estObjet(d) && d.statut !== 'cloturee') : [];
  return [...liste]
    .sort((a, b) => {
      if (texte(a.date) !== texte(b.date)) return texte(a.date) < texte(b.date) ? 1 : -1;
      if (texte(a.id) === texte(b.id)) return 0;
      return texte(a.id) < texte(b.id) ? -1 : 1;
    })
    .slice(0, limite);
}

// Documents d'une commande, dans l'ordre du catalogue : facture toujours ; notice et PV si une ligne a des cotes ;
// attestation de pose et garantie décennale si une ligne est en mode pose.
export function documentsCommande(commande, catalogue) {
  const lignes = lignesDe(commande);
  const surMesure = lignes.some((ligne) => ligne.cotes !== null && ligne.cotes !== undefined);
  const enPose = lignes.some((ligne) => ligne.mode === MODE_POSE);
  const regles = {
    facture: true,
    notice: surMesure,
    pv: surMesure,
    'attestation-pose': enPose,
    'garantie-decennale': enPose,
  };
  return (Array.isArray(catalogue) ? catalogue : []).filter((entree) => estObjet(entree) && regles[entree.id] === true);
}

// --- Validation des formulaires ----------------------------------------------------------------------------

// Normalisation mono-ligne de pro-logique.js (bords et espaces compactés).
const ligneNormalisee = (valeur) => normaliser('nom', valeur);

// Longueur et caractères d'un texte mono-ligne : null si valide, sinon la raison (ordre : vide, caractere, longueur).
export function validerLigne(valeur, limites, champ, obligatoire) {
  if (valeur === '') return obligatoire ? 'vide' : null;
  if (contientInterdit(valeur, false)) return 'caractere';
  const longueur = compterCaracteres(valeur);
  if (longueur < borne(limites, champ, 'min') || longueur > borne(limites, champ, 'max')) return 'longueur';
  return null;
}

const finaliser = (champs, raisons) => champs.filter((champ) => raisons[champ] !== null).map((champ) => ({ champ, raison: raisons[champ] }));

// saisie = { email, motDePasse } -> { ok, erreurs: [{ champ, raison }] } dans l'ordre du formulaire. Aucune valeur n'est renvoyée.
export function validerConnexion(saisie, limites) {
  const source = estObjet(saisie) ? saisie : {};
  const email = normaliser('email', source.email);
  const motDePasse = typeof source.motDePasse === 'string' ? source.motDePasse : '';
  const raisons = {
    email: validerEmail(email, limites),
    motDePasse: motDePasse === '' ? 'vide' : contientInterdit(motDePasse, false) ? 'caractere' : compterCaracteres(motDePasse) > borne(limites, 'motDePasse', 'max') ? 'longueur' : null,
  };
  const erreurs = finaliser(CHAMPS_CONNEXION, raisons);
  return { ok: erreurs.length === 0, erreurs };
}

// saisie = { prenom, nom, email, telephone, adresse, complement, codePostal, ville }
// -> { ok, erreurs (ordre du formulaire, une raison par champ), valeurs (normalisées, jamais conservées) }.
export function validerInformations(saisie, limites) {
  const source = estObjet(saisie) ? saisie : {};
  const codePostal = typeof source.codePostal === 'string' ? source.codePostal.replace(/[ \u00a0\u202f]+/g, '') : '';
  const valeurs = {
    prenom: ligneNormalisee(source.prenom),
    nom: ligneNormalisee(source.nom),
    email: normaliser('email', source.email),
    telephone: normaliser('telephone', source.telephone),
    adresse: ligneNormalisee(source.adresse),
    complement: ligneNormalisee(source.complement),
    codePostal,
    ville: ligneNormalisee(source.ville),
  };
  const raisons = {
    prenom: validerLigne(valeurs.prenom, limites, 'prenom', true),
    nom: validerLigne(valeurs.nom, limites, 'nom', true),
    email: validerEmail(valeurs.email, limites),
    telephone: validerTelephone(valeurs.telephone),
    adresse: validerLigne(valeurs.adresse, limites, 'adresse', true),
    complement: validerLigne(valeurs.complement, limites, 'complement', false),
    codePostal: valeurs.codePostal === '' ? 'vide' : /^[0-9]{5}$/.test(valeurs.codePostal) ? null : 'format',
    ville: validerLigne(valeurs.ville, limites, 'ville', true),
  };
  const erreurs = finaliser(CHAMPS_INFORMATIONS, raisons);
  return { ok: erreurs.length === 0, erreurs, valeurs };
}
