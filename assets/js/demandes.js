// Mes demandes (écran 11) : garde « Connexion requise », puis (partie C) filtre, liste et indicateur d'étapes.
import { donneesPretes } from './rendu.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  racine.documentElement.dataset.compte = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
