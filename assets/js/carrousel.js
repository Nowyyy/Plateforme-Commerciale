// Carrousel des cartes d'aléas (dès 1200 px : 3 cartes visibles, flèches pour faire défiler).
// Sous 1200 px la grille affiche toutes les cartes et les flèches restent masquées (css/accueil.css).
import { donneesPretes } from './rendu.js';

const TOLERANCE = 2;

// Fonction pure : état des flèches d'après la position de défilement de la piste.
export function etatFleches(defilement, largeurVisible, largeurTotale) {
  const deborde = largeurTotale - largeurVisible > TOLERANCE;
  return {
    visible: deborde,
    precedent: deborde && defilement > TOLERANCE,
    suivant: deborde && defilement + largeurVisible < largeurTotale - TOLERANCE,
  };
}

function initialiser(racine) {
  const piste = racine.querySelector('ul');
  const precedent = racine.querySelector('[data-carrousel-precedent]');
  const suivant = racine.querySelector('[data-carrousel-suivant]');
  if (!piste || !precedent || !suivant) return;

  const mettreAJour = () => {
    const etat = etatFleches(piste.scrollLeft, piste.clientWidth, piste.scrollWidth);
    precedent.hidden = !etat.visible;
    suivant.hidden = !etat.visible;
    precedent.disabled = !etat.precedent;
    suivant.disabled = !etat.suivant;
  };

  const pas = () => {
    const [premiere, deuxieme] = piste.children;
    return deuxieme ? deuxieme.offsetLeft - premiere.offsetLeft : piste.clientWidth;
  };
  const defiler = (sens) => {
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    piste.scrollBy({ left: sens * pas(), behavior: doux ? 'smooth' : 'auto' });
  };

  precedent.addEventListener('click', () => defiler(-1));
  suivant.addEventListener('click', () => defiler(1));
  piste.addEventListener('scroll', mettreAJour, { passive: true });
  new ResizeObserver(mettreAJour).observe(piste);
  mettreAJour();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) for (const racine of document.querySelectorAll('[data-carrousel]')) initialiser(racine);
  });
}
