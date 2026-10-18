// Cartes d'aléa de l'accueil (E1-4) : un clic sur le lien d'une carte mémorise l'aléa pour le diagnostic.
// Seul l'id va en sessionStorage (clé « alea ») ; l'URL ne change pas.
import { donneesPretes } from './rendu.js';

export const CLE_ALEA = 'alea';

export function memoriser(racine) {
  racine.addEventListener('click', (e) => {
    const lien = e.target.closest('a.carte-bloc__lien');
    const id = lien?.closest('[data-id]')?.getAttribute('data-id');
    if (!id) return;
    try {
      sessionStorage.setItem(CLE_ALEA, id);
    } catch {
      // stockage indisponible : le diagnostic s'ouvre sur « Tous »
    }
  });
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    const section = document.querySelector('[data-role="aleas"]');
    if (donnees && section) memoriser(section);
  });
}
