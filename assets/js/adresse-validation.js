// Validation d'adresse : module pur, sans effet de bord à l'import (partagé par l'accueil et le diagnostic).
export const LONGUEUR_MIN = 5;
export const LONGUEUR_MAX = 200;
export const CLE_STOCKAGE = 'adresse';

// Fonction pure : { valide, adresse, raison } ; `adresse` est le texte sans espaces en bordure.
export function valider(texte) {
  const adresse = String(texte ?? '').trim();
  if (adresse.length === 0) return { valide: false, adresse, raison: 'vide' };
  if (adresse.length < LONGUEUR_MIN) return { valide: false, adresse, raison: 'courte' };
  if (adresse.length > LONGUEUR_MAX) return { valide: false, adresse, raison: 'longue' };
  // au moins une lettre : refuse les chaînes de chiffres ou de signes seulement
  if (!/\p{L}/u.test(adresse)) return { valide: false, adresse, raison: 'sans-lettre' };
  return { valide: true, adresse, raison: null };
}
