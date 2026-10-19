// Logique pure du panier : aucun accès au DOM ni au stockage, aucun argument modifié.
// La commande de session n'est jamais crue : elle est revalidée à partir des données du site.
import { evaluerCotes } from './cotes-logique.js';
import { lignesPrix, MODE_DIY, MODE_POSE } from './produit-logique.js';

const estObjet = (valeur) => valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur);

// Texte de sessionStorage.commande -> objet, ou null (absent, vide, non JSON, non objet) ; ne lève jamais d'exception.
export function lireCommande(brut) {
  if (typeof brut !== 'string' || brut.trim() === '') return null;
  try {
    const objet = JSON.parse(brut);
    return estObjet(objet) ? objet : null;
  } catch {
    return null;
  }
}

// -> { ok: true, commande } ou { ok: false, raison } ; raisons : absente, version, produit, incomplet, mode, cotes.
// Le champ « prix » de la session est ignoré : lignes et total sont recalculés par lignesPrix.
export function validerCommande(objet, produits) {
  if (!estObjet(objet)) return { ok: false, raison: 'absente' };
  if (objet.v !== 1) return { ok: false, raison: 'version' };
  const produit = (Array.isArray(produits) ? produits : []).find((p) => p.id === objet.produit);
  if (!produit) return { ok: false, raison: 'produit' };
  if (!produit.complet || !produit.cotes) return { ok: false, raison: 'incomplet' };
  if (objet.mode !== MODE_DIY && objet.mode !== MODE_POSE) return { ok: false, raison: 'mode' };
  const brutes = estObjet(objet.cotes) ? objet.cotes : {};
  const entiers = ['largeur', 'hauteur', 'tolerance'].every((nom) => Number.isInteger(brutes[nom]));
  if (!entiers) return { ok: false, raison: 'cotes' };
  const evaluation = evaluerCotes({
    largeur: String(brutes.largeur), hauteur: String(brutes.hauteur), tolerance: String(brutes.tolerance),
  }, produit.cotes);
  if (evaluation.etat !== 'compatible') return { ok: false, raison: 'cotes' };
  const lignes = lignesPrix(produit, objet.mode);
  return {
    ok: true,
    commande: {
      produit,
      mode: objet.mode,
      cotes: { largeur: brutes.largeur, hauteur: brutes.hauteur, tolerance: brutes.tolerance },
      lignes,
      total: lignes[lignes.length - 1].montant,
    },
  };
}

// Délais en texte : livraison toujours, intervention de l'artisan en mode pose seulement.
export function delaisCommande(produit, mode) {
  const delais = [{ cle: 'livraison', texte: produit.delaiLivraison }];
  if (mode === MODE_POSE) delais.push({ cle: 'pose', texte: produit.delaiPose });
  return delais;
}

// « Valider ma commande » n'est actif que si la case est cochée et la commande valide.
export function peutValider(caseCochee, validation) {
  return caseCochee === true && validation?.ok === true;
}
