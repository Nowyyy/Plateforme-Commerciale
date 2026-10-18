// Logique pure de la fiche produit : aucun accès au DOM ni au stockage. Prix et pose viennent de data/produit.json.
import { formaterPrix } from './diagnostic-logique.js';

export const MODE_DIY = 'diy';
export const MODE_POSE = 'pose';

// Le produit d'id valide, sinon celui de defautId (id absent, inconnu ou non textuel).
export function produitValide(produits, id, defautId) {
  const liste = Array.isArray(produits) ? produits : [];
  return liste.find((p) => p.id === id) ?? liste.find((p) => p.id === defautId) ?? null;
}

// « diy » ou « pose » ; toute autre valeur donne « diy ».
export function modeValide(valeur) {
  return valeur === MODE_POSE ? MODE_POSE : MODE_DIY;
}

// Prix du matériel, plus la pose estimée en mode pose.
export function totalEstime(produit, mode) {
  return produit.prix + (modeValide(mode) === MODE_POSE ? produit.pose : 0);
}

// Lignes du récapitulatif : matériel, pose (mode pose seulement), total.
export function lignesPrix(produit, mode) {
  const lignes = [{ cle: 'materiel', montant: produit.prix }];
  if (modeValide(mode) === MODE_POSE) lignes.push({ cle: 'pose', montant: produit.pose });
  lignes.push({ cle: 'total', montant: totalEstime(produit, mode) });
  return lignes;
}

// Mêmes lignes avec le montant mis en forme (« 1 250 € »), prêtes à afficher.
export function lignesPrixFormatees(produit, mode) {
  return lignesPrix(produit, mode).map((ligne) => ({ ...ligne, texte: formaterPrix(ligne.montant) }));
}
