// Service après-vente simulé (écrans 10, 11 et 13) : logique pure.
// Aucun accès au DOM, au réseau ni au stockage ; aucun argument n'est modifié ; jamais d'exception.
// Les bornes viennent de data/compte.json (clé « limites ») ; normalisation et contrôles réutilisent pro-logique.js et compte-logique.js.
import { normaliser, contientInterdit, validerEmail, validerTelephone, compterCaracteres } from './pro-logique.js';
import { trierCommandes, validerLigne, TOUS } from './compte-logique.js';

export const PREFIXE_ACCES = 'CMD-';
export const FORMAT_ACCES = /^CMD-[0-9]{3,8}$/;

// Raisons de refus possibles, par champ : source unique pour les tests et pour la complétude de data/compte.json (« sav.messages »).
export const RAISONSACCES = {
  numero: ['vide', 'format'],
  email: ['vide', 'format', 'longueur'],
};

export const RAISONSSAV = {
  ligne: ['vide', 'invalide'],
  motif: ['vide', 'invalide'],
  description: ['vide', 'caractere', 'court', 'long'],
  prenom: ['vide', 'caractere', 'longueur'],
  nom: ['vide', 'caractere', 'longueur'],
  email: ['vide', 'format', 'longueur'],
  telephone: ['format'],
  adresse: ['vide', 'caractere', 'longueur'],
  codePostal: ['vide', 'format'],
  ville: ['vide', 'caractere', 'longueur'],
  consentement: ['vide'],
};

export const CHAMPS_ACCES = Object.keys(RAISONSACCES);
export const CHAMPS_SAV = Object.keys(RAISONSSAV);
export const ETATS = ['compte', 'sans-compte', 'achat-manquant', 'acces-requis'];
export const ETAPES = ['terminee', 'actuelle', 'a-venir'];

const DEFAUTS = {
  numero: { min: 3, max: 8 },
  description: { min: 20, max: 1000 },
};

const ESPACES = /[ \u00a0\u202f]+/g;
const estObjet = (valeur) => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);
const liste = (valeur) => (Array.isArray(valeur) ? valeur.filter(estObjet) : []);
const texte = (valeur) => (typeof valeur === 'string' ? valeur : '');

function borne(limites, champ, cle) {
  const valeur = estObjet(limites) ? limites[champ]?.[cle] : undefined;
  return Number.isFinite(valeur) && valeur >= 0 ? valeur : DEFAUTS[champ][cle];
}

// --- Numéro de commande ------------------------------------------------------------------------------------

// « 1037 », « CMD-1037 », « cmd 1037 » -> { etat: "ok", id: "CMD-1037" } ; vide -> { etat: "vide" } ; autre -> { etat: "invalide" }.
export function lireNumero(saisie, limites) {
  const compact = texte(saisie).replace(ESPACES, '');
  if (compact === '') return { etat: 'vide' };
  const trouve = /^(?:cmd-?)?([0-9]+)$/i.exec(compact);
  if (!trouve) return { etat: 'invalide' };
  const longueur = trouve[1].length;
  if (longueur < borne(limites, 'numero', 'min') || longueur > borne(limites, 'numero', 'max')) return { etat: 'invalide' };
  return { etat: 'ok', id: `${PREFIXE_ACCES}${trouve[1]}` };
}

export function trouverCommande(commandes, id) {
  if (typeof id !== 'string') return null;
  return liste(commandes).find((commande) => commande.id === id) ?? null;
}

const nbLignes = (commande) => (Array.isArray(commande?.lignes) ? commande.lignes.filter(estObjet).length : 0);

// Première commande (ordre de trierCommandes) qui a au moins deux lignes ; sinon la première ; sans commande : null.
export function commandeParDefaut(commandes) {
  const triees = trierCommandes(commandes);
  return triees.find((commande) => nbLignes(commande) >= 2) ?? triees[0] ?? null;
}

// saisie = { numero, email } -> { ok, erreurs: [{ champ, raison }], commandeId }. L'e-mail n'est jamais renvoyé.
// commandeId : commande du numéro saisi si elle existe, sinon commande par défaut (null si la saisie est refusée).
export function validerAcces(saisie, limites, commandes) {
  const source = estObjet(saisie) ? saisie : {};
  const numero = lireNumero(source.numero, limites);
  const email = normaliser('email', source.email);
  const raisons = {
    numero: numero.etat === 'ok' ? null : numero.etat === 'vide' ? 'vide' : 'format',
    email: validerEmail(email, limites),
  };
  const erreurs = CHAMPS_ACCES.filter((champ) => raisons[champ] !== null).map((champ) => ({ champ, raison: raisons[champ] }));
  const ok = erreurs.length === 0;
  const trouvee = ok ? trouverCommande(commandes, numero.id) ?? commandeParDefaut(commandes) : null;
  return { ok, erreurs, commandeId: trouvee ? trouvee.id : null };
}

// --- Contexte ----------------------------------------------------------------------------------------------

// { connecte, achat, acces } + commandes -> { etat, commande } ; priorité : compte, sans-compte, achat-manquant, acces-requis.
export function resoudreContexte(contexte, commandes) {
  const source = estObjet(contexte) ? contexte : {};
  const achat = trouverCommande(commandes, source.achat);
  const acces = trouverCommande(commandes, source.acces);
  if (source.connecte === true && achat) return { etat: 'compte', commande: achat };
  if (acces) return { etat: 'sans-compte', commande: acces };
  if (source.connecte === true) return { etat: 'achat-manquant', commande: null };
  return { etat: 'acces-requis', commande: null };
}

// Coordonnées préremplies : le client de démonstration avec un compte, vides sinon.
export function coordonneesInitiales(etat, client) {
  const vide = { prenom: '', nom: '', email: '', telephone: '', adresse: '', codePostal: '', ville: '' };
  if (etat !== 'compte' || !estObjet(client)) return vide;
  const adresse = estObjet(client.adresse) ? client.adresse : {};
  return {
    prenom: texte(client.prenom),
    nom: texte(client.nom),
    email: texte(client.email),
    telephone: texte(client.telephone),
    adresse: texte(adresse.ligne1),
    codePostal: texte(adresse.codePostal),
    ville: texte(adresse.ville),
  };
}

// --- Demande d'intervention --------------------------------------------------------------------------------

// Index de ligne : entier de 0 à nbLignes - 1, en nombre ou en chaîne canonique (« 0 », « 1 »…). Renvoie l'index ou null.
function lireLigne(valeur, nombreLignes) {
  let index = null;
  if (typeof valeur === 'number' && Number.isInteger(valeur)) index = valeur;
  else if (typeof valeur === 'string' && /^(0|[1-9][0-9]*)$/.test(valeur)) index = Number(valeur);
  return index !== null && index >= 0 && index < nombreLignes ? index : null;
}

const vide = (valeur) => valeur === undefined || valeur === null || valeur === '';

function validerDescription(valeur, limites) {
  if (valeur === '') return 'vide';
  if (contientInterdit(valeur, true)) return 'caractere';
  const longueur = compterCaracteres(valeur);
  if (longueur < borne(limites, 'description', 'min')) return 'court';
  if (longueur > borne(limites, 'description', 'max')) return 'long';
  return null;
}

// saisie = { ligne, motif, description, prenom, nom, email, telephone, adresse, codePostal, ville, consentement },
// contexte = { nbLignes, motifs } -> { ok, erreurs (ordre du formulaire, une raison par champ), valeurs (normalisées, jamais conservées) }.
export function validerDemande(saisie, contexte, limites) {
  const source = estObjet(saisie) ? saisie : {};
  const cadre = estObjet(contexte) ? contexte : {};
  const nombreLignes = Number.isInteger(cadre.nbLignes) && cadre.nbLignes > 0 ? cadre.nbLignes : 0;
  const motifs = (Array.isArray(cadre.motifs) ? cadre.motifs : []).map((m) => (estObjet(m) ? m.id : m)).filter((m) => typeof m === 'string');
  const index = lireLigne(source.ligne, nombreLignes);
  const valeurs = {
    ligne: index,
    motif: texte(source.motif),
    description: normaliser('description', source.description),
    prenom: normaliser('nom', source.prenom),
    nom: normaliser('nom', source.nom),
    email: normaliser('email', source.email),
    telephone: normaliser('telephone', source.telephone),
    adresse: normaliser('nom', source.adresse),
    codePostal: texte(source.codePostal).replace(ESPACES, ''),
    ville: normaliser('nom', source.ville),
    consentement: source.consentement === true,
  };
  const raisons = {
    ligne: index !== null ? null : vide(source.ligne) ? 'vide' : 'invalide',
    motif: valeurs.motif === '' ? 'vide' : motifs.includes(valeurs.motif) ? null : 'invalide',
    description: validerDescription(valeurs.description, limites),
    prenom: validerLigne(valeurs.prenom, limites, 'prenom', true),
    nom: validerLigne(valeurs.nom, limites, 'nom', true),
    email: validerEmail(valeurs.email, limites),
    telephone: validerTelephone(valeurs.telephone),
    adresse: validerLigne(valeurs.adresse, limites, 'adresse', true),
    codePostal: valeurs.codePostal === '' ? 'vide' : /^[0-9]{5}$/.test(valeurs.codePostal) ? null : 'format',
    ville: validerLigne(valeurs.ville, limites, 'ville', true),
    consentement: valeurs.consentement ? null : 'vide',
  };
  const erreurs = CHAMPS_SAV.filter((champ) => raisons[champ] !== null).map((champ) => ({ champ, raison: raisons[champ] }));
  return { ok: erreurs.length === 0, erreurs, valeurs };
}

// --- Suivi des demandes ------------------------------------------------------------------------------------

// Date décroissante, puis identifiant croissant (même règle que les commandes).
export function trierDemandes(demandes) {
  return trierCommandes(demandes);
}

// « tous » (ou « toutes ») ou identifiant de statut ; un filtre inconnu vaut « tous ». Les demandes gardent leur ordre.
export function filtrerDemandes(demandes, filtre, statuts) {
  const toutes = liste(demandes);
  const connus = liste(statuts).map((s) => s.id);
  if (typeof filtre !== 'string' || filtre === TOUS || filtre === 'toutes') return [...toutes];
  const valides = connus.length > 0 ? connus : ['recue', 'en-analyse', 'intervention-planifiee', 'cloturee'];
  if (!valides.includes(filtre)) return [...toutes];
  return toutes.filter((demande) => demande.statut === filtre);
}

// [{ id, titre, etat }] dans l'ordre des statuts : terminee avant le statut, actuelle, a-venir après ; statut inconnu : tout a-venir.
export function etapesDemande(statut, statutsDemande) {
  const etapes = liste(statutsDemande);
  const courant = etapes.findIndex((etape) => etape.id === statut);
  return etapes.map((etape, i) => ({
    id: texte(etape.id),
    titre: texte(etape.libelle),
    etat: courant === -1 || i > courant ? 'a-venir' : i === courant ? 'actuelle' : 'terminee',
  }));
}
