// Espace professionnel (écran 5) : les listes (étapes, aléas, emplacements) sont rendues par rendu.js à partir de
// data/pro.json (gabarits <template data-liste>) ; ce module branche le formulaire simulé (formulaire.js + pro-logique.js).
// Rien n'est envoyé ni enregistré : aucune requête, aucun stockage, aucune donnée dans l'URL.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { brancherFormulaire } from './formulaire.js';
import { valider, construireResume } from './pro-logique.js';

// Identifiants d'aléas acceptés par la validation : ceux de data/pro.json (mêmes que ceux de l'accueil).
export const idsAleas = (donnees) => donnees.pro.aleas.map((alea) => alea.id);

const CHAMPS_TEXTE = ['societe', 'siret', 'contact', 'email', 'telephone', 'description', 'message'];

export function initialiser(donnees, racine = document) {
  const formulaire = racine.querySelector('.formulaire');
  if (!formulaire) return null;
  const { pro } = donnees;
  const cases = () => [...formulaire.querySelectorAll('.formulaire__cases input[type="checkbox"]')];
  const controle = (id) => racine.getElementById(id);

  // Confirmation simulée : remplace le formulaire (déjà vidé par formulaire.js), ne répète aucune saisie.
  const sectionFormulaire = racine.querySelector('[data-role="formulaire"]');
  const confirmation = racine.querySelector('[data-role="confirmation"]');
  const region = confirmation.querySelector('[role="status"]');
  const autre = confirmation.querySelector('[data-autre]');
  const titre = racine.getElementById('titre-formulaire');
  const afficherConfirmation = () => {
    sectionFormulaire.hidden = true;
    confirmation.hidden = false;
    region.focus();
  };

  const champs = {};
  for (const nom of ['societe', 'siret', 'contact', 'email', 'telephone', 'aleas', 'description', 'message', 'consentement']) {
    const ancre = nom;
    const zone = nom === 'aleas' ? controle('aleas') : controle(nom).closest('.formulaire__champ');
    champs[nom] = {
      ancre,
      zone,
      erreur: controle(`erreur-${nom}`),
      controles: nom === 'aleas' ? cases : () => [controle(nom)],
    };
  }

  const lire = () => ({
    ...Object.fromEntries(CHAMPS_TEXTE.map((nom) => [nom, controle(nom).value])),
    aleas: cases().filter((c) => c.checked).map((c) => c.closest('label').dataset.id),
    consentement: controle('consentement').checked,
  });

  const acces = brancherFormulaire({
    formulaire,
    champs,
    lire,
    valider: (saisie) => valider(saisie, pro.limites, idsAleas(donnees)),
    texte: (champ, raison) => pro.messages[champ]?.[raison] ?? pro.messages.repli,
    resume: {
      titre: (n) => remplirGabarit(n === 1 ? pro.formulaire.resume.singulier : pro.formulaire.resume.pluriel, { n }),
      liens: (erreurs) => construireResume(erreurs, pro.formulaire.resume.liens),
    },
    apres: afficherConfirmation,
  });
  autre?.addEventListener('click', () => {
    confirmation.hidden = true;
    sectionFormulaire.hidden = false;
    titre.focus();
  });
  racine.documentElement.dataset.formulaire = 'pret';
  return acces;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
