// Connexion simulée (écran 6) : formulaire (formulaire.js + compte-logique.js), accès au compte de démonstration, état « déjà connecté ».
// Rien n'est conservé hors la clé de session « compte » : ni e-mail ni mot de passe, aucune requête, aucune donnée dans l'URL.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { brancherFormulaire } from './formulaire.js';
import { validerConnexion } from './compte-logique.js';
import { construireResume } from './pro-logique.js';
import { estConnecte, ouvrirSession, brancherDeconnexion, EVENEMENT } from './compte-session.js';

export function initialiser(donnees, racine = document) {
  const formulaire = racine.querySelector('.formulaire');
  if (!formulaire) return null;
  const { compte, site } = donnees;
  const carteFormulaire = racine.querySelector('[data-carte="formulaire"]');
  const carteConnecte = racine.querySelector('[data-carte="connecte"]');
  const demo = racine.querySelector('[data-role="demo"]');
  const stockage = racine.querySelector('[data-stockage]');
  const titre = racine.getElementById('titre-connexion');
  const controle = (id) => racine.getElementById(id);

  // Ouvre la session puis le tableau de bord ; stockage indisponible : message dédié, la page reste en place.
  const connecter = () => {
    if (!ouvrirSession()) {
      stockage.hidden = false;
      stockage.focus();
      return;
    }
    stockage.hidden = true;
    window.location.assign(site.liens.compte);
  };

  const majEtat = () => {
    const connecte = estConnecte();
    carteFormulaire.hidden = connecte;
    carteConnecte.hidden = !connecte;
    demo.hidden = connecte;
  };

  const ANCRES = { email: 'email', motDePasse: 'mot-de-passe' };
  const champs = {};
  for (const [nom, ancre] of Object.entries(ANCRES)) {
    champs[nom] = {
      ancre,
      zone: controle(ancre).closest('.formulaire__champ'),
      erreur: controle(`erreur-${ancre}`),
      controles: () => [controle(ancre)],
    };
  }

  const acces = brancherFormulaire({
    formulaire,
    champs,
    lire: () => ({ email: controle('email').value, motDePasse: controle('mot-de-passe').value }),
    valider: (saisie) => validerConnexion(saisie, compte.limites),
    texte: (champ, raison) => compte.messages[champ]?.[raison] ?? compte.messages.repli,
    resume: {
      titre: (n) => remplirGabarit(n === 1 ? compte.formulaire.resume.singulier : compte.formulaire.resume.pluriel, { n }),
      liens: (erreurs) => construireResume(erreurs, compte.formulaire.resume.liens),
    },
    apres: connecter,
  });

  racine.querySelector('[data-demo]').addEventListener('click', connecter);
  brancherDeconnexion(donnees, racine, () => {
    majEtat();
    titre.focus();
  });
  majEtat();
  racine.addEventListener(EVENEMENT, majEtat);
  window.addEventListener('pageshow', majEtat);
  racine.documentElement.dataset.formulaire = 'pret';
  return acces;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
