// Cartes du compte (tableau de bord et achats) : remplissage des gabarits <template data-gabarit="…"> par textContent seulement,
// sans id dans les clones. Tous les textes viennent de data/compte.json ; les montants passent par formaterPrix.
import { remplirGabarit } from './cotes-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { formaterDate, totauxCommande, resumeLignes, modeCommande } from './compte-logique.js';
import { ecrireAchat } from './compte-session.js';

const libelleDe = (liste, id) => liste.find((e) => e.id === id)?.libelle ?? id;
const par = (racine, selecteur) => racine.querySelector(selecteur);

// Pastille de statut : texte et icône (jamais la couleur seule).
export function remplirStatut(carte, statut, liste) {
  const marque = par(carte, '.statut');
  marque.setAttribute('data-statut', statut);
  par(marque, '.statut__texte').textContent = libelleDe(liste, statut);
}

export function carteCommande(gabarit, commande, compte) {
  const carte = gabarit.content.firstElementChild.cloneNode(true);
  const t = compte.commande;
  const totaux = totauxCommande(commande.lignes);
  carte.setAttribute('data-id', commande.id);
  par(carte, '.commande__numero').textContent = remplirGabarit(t.numero, { id: commande.id });
  par(carte, '.commande__date').textContent = remplirGabarit(t.date, { date: formaterDate(commande.date) });
  par(carte, '.commande__statut-libelle').textContent = t.statut;
  remplirStatut(carte, commande.statut, compte.statuts);
  par(carte, '.commande__lignes').replaceChildren(...resumeLignes(commande).map((texte) => {
    const li = carte.ownerDocument.createElement('li');
    li.textContent = texte;
    return li;
  }));
  par(carte, '.commande__total').textContent = remplirGabarit(t.total, { total: formaterPrix(totaux.total) });
  par(carte, '.commande__mode').textContent = remplirGabarit(t.mode, { mode: t.modes[modeCommande(commande)] });
  const bouton = par(carte, '.commande__detail');
  bouton.textContent = t.detail;
  bouton.setAttribute('data-id', commande.id);
  bouton.setAttribute('aria-label', remplirGabarit(t.detailAria, { id: commande.id }));
  return carte;
}

export function carteDemande(gabarit, demande, compte) {
  const carte = gabarit.content.firstElementChild.cloneNode(true);
  const t = compte.demande;
  par(carte, '.demande__numero').textContent = remplirGabarit(t.numero, { id: demande.id });
  par(carte, '.demande__produit').textContent = remplirGabarit(t.produit, { titre: demande.titre });
  par(carte, '.demande__statut-libelle').textContent = t.statut;
  remplirStatut(carte, demande.statut, compte.statutsDemande);
  return carte;
}

// Clic sur « Voir le détail » (délégation) : écrit la commande choisie puis ouvre la page de détail.
export function brancherDetail(conteneur, donnees) {
  conteneur.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('.commande__detail');
    if (!bouton) return;
    ecrireAchat(bouton.getAttribute('data-id'));
    window.location.assign(donnees.site.liens.achat);
  });
}
