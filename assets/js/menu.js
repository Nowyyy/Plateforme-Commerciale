// Menu mobile : bouton avec aria-expanded / aria-controls, fermé par défaut.
const OUVERT = 'est-ouvert';

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

  window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
    if (e.matches) regler(false);
  });
}

if (typeof document !== 'undefined') initialiser();
