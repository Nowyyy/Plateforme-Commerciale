// Session du compte simulé : trois clés seulement, « compte » ({ v: 1, connecte: true }), « achat » (identifiant de commande) et
// « acces-sav » (identifiant d'une commande d'exemple, écrit par l'accès au SAV sans compte). Aucun e-mail, mot de passe, numéro
// saisi ni autre saisie n'est conservé. Tous les accès à sessionStorage sont protégés (stockage indisponible :
// non connecté, aucune exception). Les fonctions acceptent un stockage en paramètre pour être testées sans navigateur.
import { compteConnecte, VERSION_COMPTE } from './compte-logique.js';
import { FORMAT_ACCES } from './sav-logique.js';

export const CLE_COMPTE = 'compte';
export const CLE_ACHAT = 'achat';
export const CLE_ACCES_SAV = 'acces-sav';
export const EVENEMENT = 'compte:modifie';

const stockageDefaut = () => globalThis.sessionStorage;

function lire(cle, stockage) {
  try {
    return (stockage ?? stockageDefaut()).getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle, valeur, stockage) {
  try {
    (stockage ?? stockageDefaut()).setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}

function supprimer(cle, stockage) {
  try {
    (stockage ?? stockageDefaut()).removeItem(cle);
  } catch {
    /* stockage indisponible : rien à supprimer */
  }
}

function prevenir() {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent(EVENEMENT));
}

export function estConnecte(stockage) {
  return compteConnecte(lire(CLE_COMPTE, stockage));
}

// Ouvre la session de démonstration ; faux si le stockage est indisponible.
export function ouvrirSession(stockage) {
  const ok = ecrire(CLE_COMPTE, JSON.stringify({ v: VERSION_COMPTE, connecte: true }), stockage);
  if (ok) prevenir();
  return ok;
}

export function fermerSession(stockage) {
  supprimer(CLE_COMPTE, stockage);
  supprimer(CLE_ACHAT, stockage);
  supprimer(CLE_ACCES_SAV, stockage);
  prevenir();
}

// Commande choisie (identifiant de data/compte.json), lue sans être supprimée.
export function ecrireAchat(identifiant, stockage) {
  if (typeof identifiant !== 'string' || identifiant === '') return false;
  return ecrire(CLE_ACHAT, identifiant, stockage);
}

export function lireAchat(stockage) {
  const valeur = lire(CLE_ACHAT, stockage);
  return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

// Accès au SAV sans compte : identifiant « CMD- » suivi de 3 à 8 chiffres (jamais le numéro saisi), lu sans être supprimé ;
// toute autre valeur est lue comme absente.
export function ecrireAccesSav(identifiant, stockage) {
  if (typeof identifiant !== 'string' || !FORMAT_ACCES.test(identifiant)) return false;
  return ecrire(CLE_ACCES_SAV, identifiant, stockage);
}

export function lireAccesSav(stockage) {
  const valeur = lire(CLE_ACCES_SAV, stockage);
  return typeof valeur === 'string' && FORMAT_ACCES.test(valeur) ? valeur : null;
}

export function supprimerAccesSav(stockage) {
  supprimer(CLE_ACCES_SAV, stockage);
}

// Remplace le contenu de <main> par un état : h1, phrase et lien (en-tête et pied inchangés) ; masque la navigation du compte
// et le fil d'Ariane.
export function remplacerContenu({ titre, phrase, lien, adresse }, racine = document) {
  const section = racine.createElement('section');
  section.className = 'conteneur compte__bloc compte__garde';
  const h1 = racine.createElement('h1');
  h1.textContent = titre;
  const p = racine.createElement('p');
  p.textContent = phrase;
  const a = racine.createElement('a');
  a.className = 'bouton bouton--secondaire';
  a.setAttribute('href', adresse);
  a.textContent = lien;
  section.append(h1, p, a);
  racine.querySelector('main').replaceChildren(section);
  for (const element of racine.querySelectorAll('.nav-compte, .fil')) element.hidden = true;
}

// Garde d'interface (pas de la sécurité) : non connecté, le contenu est remplacé par « Connexion requise ».
// Renvoie vrai si la page peut s'afficher.
export function appliquerGarde(donnees, racine = document) {
  if (estConnecte()) return true;
  const textes = donnees.compte.gardes.connexionRequise;
  remplacerContenu({ titre: textes.titre, phrase: textes.phrase, lien: textes.lien, adresse: donnees.site.liens.connexion }, racine);
  racine.documentElement.dataset.compte = 'garde';
  return false;
}

// « Se déconnecter » : supprime la session puis ouvre la page de connexion (ou appelle apres()).
export function brancherDeconnexion(donnees, racine = document, apres = null) {
  for (const bouton of racine.querySelectorAll('[data-deconnexion]')) {
    bouton.addEventListener('click', () => {
      fermerSession();
      if (apres) apres();
      else window.location.assign(donnees.site.liens.connexion);
    });
  }
}
