// Menu mobile : bouton avec aria-expanded / aria-controls, fermé par défaut.
const OUVERT = 'est-ouvert';
// Même seuil que la navigation en ligne dans css/accueil.css.
const SEUIL_BUREAU = '(min-width: 1200px)';

// Ancre interne : après le défilement natif, la section reçoit le focus (tabindex="-1").
export function gererAncres(racine = document) {
  racine.addEventListener('click', (e) => {
    const lien = e.target.closest('a[href^="#"]');
    const cible = lien && racine.getElementById(lien.getAttribute('href').slice(1));
    if (!cible) return;
    requestAnimationFrame(() => cible.focus({ preventScroll: true }));
  });
}

export function initialiser(racine = document) {
  const bouton = racine.querySelector('[data-menu-bouton]');
  const panneau = bouton && racine.getElementById(bouton.getAttribute('aria-controls'));
  if (!bouton || !panneau) return;

  const ouvert = () => bouton.getAttribute('aria-expanded') === 'true';
  const regler = (valeur) => {
    bouton.setAttribute('aria-expanded', String(valeur));
    panneau.classList.toggle(OUVERT, valeur);
  };

  bouton.addEventListener('click', () => regler(!ouvert()));

  racine.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ouvert()) {
      regler(false);
      bouton.focus();
    }
  });

  panneau.addEventListener('click', (e) => {
    if (e.target.closest('a')) regler(false);
  });

  window.matchMedia(SEUIL_BUREAU).addEventListener('change', (e) => {
    if (e.matches) regler(false);
  });
}

if (typeof document !== 'undefined') {
  initialiser();
  gererAncres();
}
