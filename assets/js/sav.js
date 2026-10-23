// Demande de SAV (écran 10) : lit le contexte (compte, sans-compte, achat-manquant, acces-requis) puis, partie B, le formulaire.
// Rien n'est envoyé ni enregistré : aucune requête, aucune écriture de session, aucune donnée dans l'URL.
import { donneesPretes } from './rendu.js';
import { resoudreContexte } from './sav-logique.js';
import { estConnecte, lireAchat, lireAccesSav } from './compte-session.js';

// Contexte courant, d'après la session (lecture seule) et les commandes de data/compte.json.
export function contexteCourant(donnees) {
  return resoudreContexte({ connecte: estConnecte(), achat: lireAchat(), acces: lireAccesSav() }, donnees.compte.commandes);
}

// État sans commande : le formulaire est remplacé par un message (h2, phrase, liens).
function afficherEtat(racine, textes, liens) {
  const etat = racine.querySelector('[data-etat]');
  racine.querySelector('[data-etat-titre]').textContent = textes.titre;
  racine.querySelector('[data-etat-phrase]').textContent = textes.phrase;
  const [principal, secondaire] = racine.querySelectorAll('[data-etat-lien], [data-etat-lien-2]');
  principal.textContent = textes.lien;
  principal.setAttribute('href', liens.principal);
  if (liens.secondaire) {
    secondaire.textContent = textes.lienConnexion;
    secondaire.setAttribute('href', liens.secondaire);
    secondaire.hidden = false;
  }
  racine.querySelector('[data-corps]').hidden = true;
  etat.hidden = false;
  racine.querySelector('.fil').hidden = true;
}

export function initialiser(donnees, racine = document) {
  const { compte, site } = donnees;
  const contexte = contexteCourant(donnees);
  racine.documentElement.dataset.contexte = contexte.etat;
  if (contexte.etat === 'achat-manquant') {
    afficherEtat(racine, compte.sav.etats.achatManquant, { principal: site.liens.achats });
    return contexte;
  }
  if (contexte.etat === 'acces-requis') {
    afficherEtat(racine, compte.sav.etats.accesRequis, { principal: site.liens.savAcces, secondaire: site.liens.connexion });
    return contexte;
  }
  racine.querySelector('.formulaire').hidden = false;
  return contexte;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
