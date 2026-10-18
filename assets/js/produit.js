// Fiche produit Hi-Fi : produit choisi au diagnostic (sessionStorage, clé « produit », lue sans être supprimée).
// Les textes issus des données sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { produitValide } from './produit-logique.js';
import { formaterPrix } from './diagnostic-logique.js';

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
  document.getElementById('achat-reference').textContent = produit.reference;
  document.getElementById('achat-prix').textContent = formaterPrix(produit.prix);
  document.getElementById('achat-delai').textContent = produit.delaiLivraison;
  document.querySelector('.achat').setAttribute('aria-busy', 'false');
}

// Galerie : un rectangle neutre (aucune image) et sa légende changent avec la vignette choisie (boutons radio, flèches natives).
function initialiserGalerie(vues) {
  const panneau = document.getElementById('galerie-panneau');
  const legende = document.getElementById('galerie-legende');
  const choisir = (id) => {
    const vue = vues.find((v) => v.id === id);
    if (!vue) return;
    panneau.dataset.type = vue.type === 'video' ? 'video' : 'image';
    legende.textContent = vue.legende;
  };
  const fieldset = document.querySelector('.galerie__vues');
  for (const vignette of fieldset.querySelectorAll('.vignette')) {
    vignette.querySelector('input').value = vignette.getAttribute('data-id');
  }
  const premiere = fieldset.querySelector('input');
  if (premiere) {
    premiere.checked = true;
    choisir(premiere.value);
  }
  fieldset.addEventListener('change', (e) => {
    if (e.target.matches('input[name="vue"]')) choisir(e.target.value);
  });
  document.querySelector('.galerie').setAttribute('aria-busy', 'false');
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    const { produits, produitParDefaut } = donnees.produit;
    const produit = produitValide(produits, lireSession(CLE_PRODUIT), produitParDefaut);
    if (produit) afficherProduit(produit);
    initialiserGalerie(donnees.produit.galerie.vues);
  });
}
