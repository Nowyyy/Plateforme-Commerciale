// Recherche d'adresse (E1-3) : validation locale, saisie assistée et vérification (data.geopf.fr seulement, jamais avant 3 caractères),
// stockage de session, navigation vers le diagnostic. L'adresse n'est jamais écrite dans l'URL.
import { donneesPretes, resoudre } from './rendu.js';
import { CLE_STOCKAGE, LONGUEUR_MIN, LONGUEUR_MAX, valider } from './adresse-validation.js';
import { brancherAssistant } from './adresse-assistee.js';

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
  const textes = donnees.accueil.recherche.assistee;
  const assistant = brancherAssistant({ champ, liste: racine.getElementById('adresse-liste'), statut: racine.getElementById('adresse-statut'), config: donnees.diagnostic.carteReelle, textes });
  let enCours = false;

  const effacer = () => {
    erreur.textContent = '';
    champ.removeAttribute('aria-invalid');
  };
  const refuser = (message) => {
    erreur.textContent = message;
    champ.setAttribute('aria-invalid', 'true');
    champ.focus();
  };

  champ.addEventListener('input', effacer);

  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enCours) return;
    const resultat = valider(champ.value); // validation locale du lot 2, toujours avant le réseau
    if (!resultat.valide) {
      refuser(messageErreur);
      return;
    }
    effacer();
    enCours = true;
    const verdict = await assistant.verifier();
    enCours = false;
    if (verdict.decision === 'refuse') {
      refuser(textes[verdict.raison === 'municipalite' ? 'municipalite' : 'introuvable']);
      return;
    }
    if (verdict.decision === 'indisponible') assistant.annoncer(textes.nonVerifiee);
    conserver(verdict.decision === 'accepte' ? verdict.adresse : resultat.adresse);
    window.location.assign(new URL(lienDiagnostic, window.location.href));
  });

  formulaire.hidden = false;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
