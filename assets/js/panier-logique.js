// Logique pure du panier : aucun accès au DOM ni au stockage, aucun argument modifié.
// Les lignes, leur validation et les totaux sont dans lignes-logique.js ; ce module ne garde que les délais d'une ligne.
import { MODE_POSE } from './produit-logique.js';

// Délais en texte : livraison toujours, intervention de l'artisan en mode pose seulement.
export function delaisCommande(produit, mode) {
  const delais = [{ cle: 'livraison', texte: produit.delaiLivraison }];
  if (mode === MODE_POSE) delais.push({ cle: 'pose', texte: produit.delaiPose });
  return delais;
}
