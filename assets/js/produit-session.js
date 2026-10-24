// Produit choisi pour la fiche : clé « produit » de sessionStorage (jamais dans l'URL), lue sans être supprimée par produit.js.
// Partagé par le diagnostic et le comparateur (« Voir la fiche »).
export const CLE_PRODUIT = 'produit';

export function memoriserProduit(id) {
  try {
    sessionStorage.setItem(CLE_PRODUIT, id);
  } catch {
    // stockage indisponible : la fiche affichera le produit par défaut
  }
}
