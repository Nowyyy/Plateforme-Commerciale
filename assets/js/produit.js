// Fiche produit Hi-Fi : produit choisi au diagnostic (sessionStorage, clé « produit », lue sans être supprimée).
// Les textes issus des données sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { produitValide } from './produit-logique.js';

export const CLE_PRODUIT = 'produit';

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : produit par défaut
  }
}

function afficherProduit(produit) {
  document.getElementById('titre-achat').textContent = produit.titre;
  document.getElementById('fil-produit').textContent = produit.titre;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    const { produits, produitParDefaut } = donnees.produit;
    const produit = produitValide(produits, lireSession(CLE_PRODUIT), produitParDefaut);
    if (produit) afficherProduit(produit);
  });
}
