// Compteur d'articles de l'en-tête (pages Hi-Fi) : lit sessionStorage.panier (compterArticles) et ajoute, à chaque lien « Panier »
// de l'en-tête, un <span> « ({n}) » (« 99+ » au-delà de 99) suivi d'un texte masqué visuellement pour le nom accessible.
// Les libellés viennent de data/site.json (clé compteur), lu par la requête de rendu.js. Mis à jour sur pageshow, storage et panier:modifie.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { compterArticles } from './lignes-logique.js';

export const PLAFOND_AFFICHE = 99;
export const CLE_PANIER = 'panier';

// Libellé visible pour un nombre d'articles : null (rien) à 0, « 99+ » au-delà de 99. Fonction pure.
export function libelleCompteur(nombre, textes) {
  if (!Number.isInteger(nombre) || nombre < 1) return null;
  return remplirGabarit(textes.gabarit, { n: nombre > PLAFOND_AFFICHE ? textes.plus : nombre });
}

function lireSession() {
  try {
    return sessionStorage.getItem(CLE_PANIER);
  } catch {
    return null; // stockage indisponible : aucun compteur
  }
}

function afficher(textes) {
  const libelle = libelleCompteur(compterArticles(lireSession(), PLAFOND_AFFICHE + 1), textes);
  for (const lien of document.querySelectorAll('.entete .lien-entete')) {
    lien.querySelector('.compteur')?.remove();
    if (libelle === null) continue;
    const compteur = document.createElement('span');
    compteur.className = 'compteur';
    const visible = document.createElement('span');
    visible.className = 'compteur__nombre';
    visible.textContent = libelle;
    if (libelle.length > 3) visible.classList.add('compteur__nombre--long'); // écrans étroits : police réduite pour garder la ligne
    const cache = document.createElement('span');
    cache.className = 'visuellement-cache';
    cache.textContent = ` ${textes.libelle}`;
    compteur.append(visible, cache);
    lien.append(compteur);
  }
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    const textes = donnees?.site?.compteur;
    if (!textes) return;
    const maj = () => afficher(textes);
    maj();
    window.addEventListener('pageshow', maj);
    window.addEventListener('storage', maj);
    document.addEventListener('panier:modifie', maj);
  });
}
