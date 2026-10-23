// Informations personnelles (écran 12) : formulaire simulé prérempli (formulaire.js + compte-logique.js).
// Rien n'est conservé : après un envoi valide, les champs reviennent aux valeurs d'origine ; aucune requête, aucun stockage.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { brancherFormulaire } from './formulaire.js';
import { validerInformations } from './compte-logique.js';
import { construireResume } from './pro-logique.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';

const ANCRES = {
  prenom: 'prenom', nom: 'nom', email: 'email', telephone: 'telephone',
  adresse: 'adresse', complement: 'complement', codePostal: 'code-postal', ville: 'ville',
};

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  const { compte } = donnees;
  const { client } = compte;
  const formulaire = racine.querySelector('.formulaire');
  const controle = (id) => racine.getElementById(id);
  const message = racine.querySelector('[data-enregistre]');
  const source = { ...client, ...client.adresse, adresse: client.adresse.ligne1 };
  const cases = [['pref-suivi', client.preferences.suiviCommandes], ['pref-sav', client.preferences.infosSav]];

  const valeursInitiales = [
    ...Object.entries(ANCRES).map(([champ, ancre]) => ({ controle: controle(ancre), valeur: source[champ] })),
    ...cases.map(([id, valeur]) => ({ controle: controle(id), valeur })),
  ];
  for (const { controle: element, valeur } of valeursInitiales) {
    if (typeof valeur === 'boolean') element.checked = valeur;
    else element.value = valeur;
  }

  const champs = {};
  for (const [champ, ancre] of Object.entries(ANCRES)) {
    champs[champ] = { ancre, zone: controle(ancre).closest('.formulaire__champ'), erreur: controle(`erreur-${ancre}`), controles: () => [controle(ancre)] };
  }

  brancherFormulaire({
    formulaire,
    champs,
    lire: () => Object.fromEntries(Object.entries(ANCRES).map(([champ, ancre]) => [champ, controle(ancre).value])),
    valider: (saisie) => validerInformations(saisie, compte.limites),
    texte: (champ, raison) => compte.messages[champ]?.[raison] ?? compte.messages.repli,
    resume: {
      titre: (n) => remplirGabarit(n === 1 ? compte.formulaire.resume.singulier : compte.formulaire.resume.pluriel, { n }),
      liens: (erreurs) => construireResume(erreurs, compte.formulaire.resume.liens),
    },
    valeursInitiales,
    apres: () => {
      message.hidden = false;
      message.focus();
    },
  });
  // Toute nouvelle saisie ou un nouvel envoi efface l'annonce précédente
  formulaire.addEventListener('input', () => { message.hidden = true; });
  formulaire.addEventListener('submit', () => { message.hidden = true; }, true);
  racine.documentElement.dataset.formulaire = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
