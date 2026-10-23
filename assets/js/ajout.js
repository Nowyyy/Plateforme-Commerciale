// Ajout au panier depuis la fiche (dix produits) : quantité, écriture de sessionStorage.panier (v 2, sans prix) et confirmation.
// La fiche reste affichée. Les textes issus des données et les valeurs de session sont posés par textContent seulement.
import { remplirGabarit } from './cotes-logique.js';
import { ajouterLigne, construireLigne, lireListe, VERSION_PANIER } from './lignes-logique.js';
import { modeValide } from './produit-logique.js';

export const CLE_PANIER = 'panier';
const CLE_MODE = 'mode';

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : panier vide
  }
}

// Vrai si l'écriture a réussi.
function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}

function element(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

// Groupe « Quantité » : valeur initiale 1, bornes 1 et quantiteMax, boutons jamais disabled (aria-disabled aux bornes).
export function initialiserQuantite(groupe, donnees, produit) {
  const textes = donnees.produit.ajout;
  const { quantiteMax } = donnees.produit.panier.limites;
  const moins = groupe.querySelector('[data-quantite="moins"]');
  const plus = groupe.querySelector('[data-quantite="plus"]');
  const sortie = groupe.querySelector('output');
  groupe.setAttribute('aria-label', remplirGabarit(textes.quantiteAria, { produit: produit.titre }));
  moins.setAttribute('aria-label', remplirGabarit(textes.moinsAria, { produit: produit.titre }));
  plus.setAttribute('aria-label', remplirGabarit(textes.plusAria, { produit: produit.titre }));
  let valeur = 1;
  const afficher = () => {
    sortie.textContent = String(valeur);
    moins.setAttribute('aria-disabled', valeur <= 1 ? 'true' : 'false');
    plus.setAttribute('aria-disabled', valeur >= quantiteMax ? 'true' : 'false');
  };
  moins.addEventListener('click', () => {
    valeur = Math.max(1, valeur - 1);
    afficher();
  });
  plus.addEventListener('click', () => {
    valeur = Math.min(quantiteMax, valeur + 1);
    afficher();
  });
  afficher();
  return { lire: () => valeur };
}

// Écrit le panier et affiche la confirmation dans la région role="status" de la zone, qui reçoit le focus.
// evaluation : celle du configurateur (batardeau) ou null.
export function ajouterDepuisFiche({ donnees, produit, zone, quantite, evaluation }) {
  const textes = donnees.produit.ajout;
  const limites = donnees.produit.panier.limites;
  const region = zone.querySelector('.ajout__confirmation');
  const mode = modeValide(lireSession(CLE_MODE));
  const ligne = construireLigne(produit, mode, evaluation, quantite);
  const courant = lireListe(lireSession(CLE_PANIER), limites);
  const { etat, resultat } = ajouterLigne({ lignes: courant.lignes }, ligne, quantite, limites);
  const messages = [];
  let liens = false;
  if (resultat === 'refusee') return resultat;
  if (resultat !== 'pleine') {
    const ecrit = ecrireSession(CLE_PANIER, JSON.stringify({ v: VERSION_PANIER, lignes: etat.lignes }));
    if (!ecrit) {
      region.replaceChildren(element('p', 'ajout__message', textes.stockage));
      region.focus();
      return 'stockage';
    }
    document.dispatchEvent(new CustomEvent('panier:modifie'));
    liens = true;
  }
  const finale = etat.lignes.find((l) => l.produit === ligne.produit && l.mode === ligne.mode
    && JSON.stringify(l.cotes) === JSON.stringify(ligne.cotes));
  const articles = etat.lignes.reduce((s, l) => s + l.quantite, 0);
  messages.push(element('p', 'ajout__message', remplirGabarit(textes[resultat], {
    titre: produit.titre,
    quantite: finale?.quantite,
    max: resultat === 'pleine' ? limites.lignesMax : limites.quantiteMax,
  })));
  if (liens) {
    messages.push(element('p', 'ajout__articles', remplirGabarit(articles === 1 ? textes.article : textes.articles, { articles })));
    const liste = element('p', 'ajout__liens');
    const voir = element('a', 'ajout__lien', textes.voirPanier);
    voir.setAttribute('href', donnees.site.liens.panier);
    const continuer = element('a', 'ajout__lien', textes.continuer);
    continuer.setAttribute('href', donnees.site.liens.diagnostic);
    liste.append(voir, continuer);
    messages.push(liste);
  }
  region.replaceChildren(...messages);
  region.focus();
  return resultat;
}

// Zone d'ajout des produits sans configurateur : dans le bloc « mode » (E3-4), bouton actif d'emblée.
export function initialiserZoneMode(donnees, produit) {
  const zone = document.querySelector('[data-ajout="mode"]');
  if (!zone) return;
  if (produit.complet) return; // le batardeau utilise la zone du configurateur (E3-5)
  zone.hidden = false;
  const quantite = initialiserQuantite(zone.querySelector('.quantite'), donnees, produit);
  const bouton = zone.querySelector('.ajout__bouton');
  bouton.classList.replace('bouton--secondaire', 'bouton--action'); // actif d'emblée : ambre posé par le script
  bouton.addEventListener('click', () => {
    ajouterDepuisFiche({ donnees, produit, zone, quantite: quantite.lire(), evaluation: null });
  });
}
