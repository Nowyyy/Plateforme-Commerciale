// Tableau de bord (écran 7) : garde « Connexion requise » ; le contenu est complété à la partie B.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  racine.getElementById('titre-bienvenue').textContent = remplirGabarit(donnees.compte.pages.compte.titre, { prenom: donnees.compte.client.prenom });
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
