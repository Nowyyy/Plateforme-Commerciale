// Espace client (squelette de la partie A) : garde « Connexion requise » ; le contenu est complété aux parties B et C.
import { donneesPretes } from './rendu.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
