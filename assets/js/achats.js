// Achats (écran 8) : filtre par statut (pastilles radio) et liste triée, depuis data/compte.json.
import { donneesPretes } from './rendu.js';
import { trierCommandes, filtrerCommandes, TOUS } from './compte-logique.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';
import { carteCommande, brancherDetail } from './compte-vue.js';

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  const { compte } = donnees;
  const liste = racine.querySelector('.commandes');
  const modele = racine.querySelector('template[data-gabarit="carte-commande"]');
  const vide = racine.querySelector('.achats__vide');
  const radios = [...racine.querySelectorAll('.pastille-choix input')];
  const ids = compte.statuts.map((s) => s.id);
  const triees = trierCommandes(compte.commandes);

  const rendre = (filtre) => {
    const affichees = filtrerCommandes(triees, filtre, ids);
    liste.replaceChildren(modele, ...affichees.map((c) => carteCommande(modele, c, compte)));
    liste.setAttribute('aria-busy', 'false');
    vide.textContent = affichees.length === 0 ? compte.gardes.aucunAchatStatut.titre : '';
  };
  for (const radio of radios) {
    radio.addEventListener('change', () => { if (radio.checked) rendre(radio.closest('label').dataset.id); });
  }
  (radios.find((r) => r.closest('label').dataset.id === TOUS) ?? radios[0]).checked = true;
  rendre(TOUS);
  brancherDetail(liste, donnees);
  racine.documentElement.dataset.compte = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
