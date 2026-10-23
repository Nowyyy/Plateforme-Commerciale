// Session du compte simulé : deux clés seulement, « compte » ({ v: 1, connecte: true }) et « achat » (identifiant de commande).
// Aucun e-mail, mot de passe ni saisie n'est conservé. Tous les accès à sessionStorage sont protégés (stockage indisponible :
// non connecté, aucune exception). Les fonctions acceptent un stockage en paramètre pour être testées sans navigateur.
import { compteConnecte, VERSION_COMPTE } from './compte-logique.js';

export const CLE_COMPTE = 'compte';
export const CLE_ACHAT = 'achat';
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

// Garde d'interface (pas de la sécurité) : non connecté, le contenu de <main> est remplacé par « Connexion requise » ;
// l'en-tête et le pied restent inchangés. Renvoie vrai si la page peut s'afficher.
export function appliquerGarde(donnees, racine = document) {
  if (estConnecte()) return true;
  const textes = donnees.compte.gardes.connexionRequise;
  const section = racine.createElement('section');
  section.className = 'conteneur compte__bloc compte__garde';
  const titre = racine.createElement('h1');
  titre.textContent = textes.titre;
  const phrase = racine.createElement('p');
  phrase.textContent = textes.phrase;
  const lien = racine.createElement('a');
  lien.className = 'bouton bouton--secondaire';
  lien.setAttribute('href', donnees.site.liens.connexion);
  lien.textContent = textes.lien;
  section.append(titre, phrase, lien);
  racine.querySelector('main').replaceChildren(section);
  for (const navigation of racine.querySelectorAll('.nav-compte')) navigation.hidden = true;
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
