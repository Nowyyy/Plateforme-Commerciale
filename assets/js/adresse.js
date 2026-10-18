// Recherche d'adresse (E1-3) : validation, stockage de session, navigation vers le diagnostic.
// L'adresse n'est jamais écrite dans l'URL, jamais envoyée ; aucun géocodage ni autocomplétion.
import { donneesPretes, resoudre } from './rendu.js';
import { CLE_STOCKAGE, LONGUEUR_MIN, LONGUEUR_MAX, valider } from './adresse-validation.js';

export { LONGUEUR_MIN, LONGUEUR_MAX, CLE_STOCKAGE, valider };

function conserver(adresse) {
  try {
    sessionStorage.setItem(CLE_STOCKAGE, adresse);
  } catch {
    // stockage indisponible : on poursuit sans conserver l'adresse
  }
}

export function initialiser(donnees, racine = document) {
  const formulaire = racine.querySelector('.recherche');
  const champ = racine.getElementById('adresse');
  const erreur = racine.getElementById('adresse-erreur');
  if (!formulaire || !champ || !erreur) return;

  const messageErreur = resoudre(donnees, 'accueil.recherche.erreur');
  const lienDiagnostic = resoudre(donnees, 'site.liens.diagnostic');

  const effacer = () => {
    erreur.textContent = '';
    champ.removeAttribute('aria-invalid');
  };

  champ.addEventListener('input', effacer);

  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    const resultat = valider(champ.value);
    if (!resultat.valide) {
      erreur.textContent = messageErreur;
      champ.setAttribute('aria-invalid', 'true');
      champ.focus();
      return;
    }
    effacer();
    conserver(resultat.adresse);
    window.location.assign(new URL(lienDiagnostic, window.location.href));
  });

  formulaire.hidden = false;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
