// Tableau de bord (écran 7) : trois dernières commandes et demandes en cours, depuis data/compte.json.
// Rien n'est enregistré hors la commande choisie (clé « achat », compte-session.js).
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { trierCommandes, demandesEnCours } from './compte-logique.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';
import { carteCommande, carteDemande, brancherDetail } from './compte-vue.js';

const NOMBRE_COMMANDES = 3;

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  const { compte } = donnees;
  racine.getElementById('titre-bienvenue').textContent = remplirGabarit(compte.pages.compte.titre, { prenom: compte.client.prenom });

  const listeCommandes = racine.querySelector('.commandes');
  const modeleCommande = racine.querySelector('template[data-gabarit="carte-commande"]');
  listeCommandes.replaceChildren(modeleCommande, ...trierCommandes(compte.commandes).slice(0, NOMBRE_COMMANDES).map((c) => carteCommande(modeleCommande, c, compte)));
  listeCommandes.setAttribute('aria-busy', 'false');
  brancherDetail(listeCommandes, donnees);

  const listeDemandes = racine.querySelector('.demandes');
  const modeleDemande = racine.querySelector('template[data-gabarit="carte-demande"]');
  const demandes = demandesEnCours(compte.demandes);
  listeDemandes.replaceChildren(modeleDemande, ...demandes.map((d) => carteDemande(modeleDemande, d, compte)));
  listeDemandes.setAttribute('aria-busy', 'false');
  racine.querySelector('.demandes__vide').hidden = demandes.length > 0;
  racine.documentElement.dataset.compte = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
