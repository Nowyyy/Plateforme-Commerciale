// Carrousel cyclique des cartes d'aléas (dès 1200 px : 3 cartes visibles, flèches toujours actives).
// Sous 1200 px la grille affiche toutes les cartes et les flèches restent masquées (css/accueil.css).
import { donneesPretes } from './rendu.js';

const TOLERANCE = 2;

// Fonctions pures. Les flèches sont visibles dès que des cartes dépassent de la piste.
export function flechesVisibles(largeurVisible, largeurTotale) {
  return largeurTotale - largeurVisible > TOLERANCE;
}

// Position cible d'un clic : le défilement est cyclique (après la dernière carte on revient à la première,
// avant la première on passe à la dernière).
export function cibleDefilement(sens, defilement, largeurVisible, largeurTotale, pas) {
  const max = Math.max(0, largeurTotale - largeurVisible);
  if (sens > 0) return defilement >= max - TOLERANCE ? 0 : Math.min(max, defilement + pas);
  return defilement <= TOLERANCE ? max : Math.max(0, defilement - pas);
}

function initialiser(racine) {
  const piste = racine.querySelector('ul');
  const precedent = racine.querySelector('[data-carrousel-precedent]');
  const suivant = racine.querySelector('[data-carrousel-suivant]');
  if (!piste || !precedent || !suivant) return;

  const mettreAJour = () => {
    const visibles = flechesVisibles(piste.clientWidth, piste.scrollWidth);
    precedent.hidden = !visibles;
    suivant.hidden = !visibles;
  };

  const pas = () => {
    const [premiere, deuxieme] = piste.children;
    return deuxieme ? deuxieme.offsetLeft - premiere.offsetLeft : piste.clientWidth;
  };
  const defiler = (sens) => {
    const doux = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const left = cibleDefilement(sens, piste.scrollLeft, piste.clientWidth, piste.scrollWidth, pas());
    piste.scrollTo({ left, behavior: doux ? 'smooth' : 'auto' });
  };

  precedent.addEventListener('click', () => defiler(-1));
  suivant.addEventListener('click', () => defiler(1));
  new ResizeObserver(mettreAJour).observe(piste);
  mettreAJour();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) for (const racine of document.querySelectorAll('[data-carrousel]')) initialiser(racine);
  });
}
