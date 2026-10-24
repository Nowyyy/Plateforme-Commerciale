// Accès au SAV sans compte (écran 13) : formulaire simulé (formulaire.js + sav-logique.js).
// Seul l'identifiant d'une commande d'exemple est écrit en session (« acces-sav ») ; ni le numéro saisi ni l'e-mail ne sont conservés.
// Aucune requête, aucune donnée dans l'URL. Stockage indisponible : message dédié, aucune navigation.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { brancherFormulaire } from './formulaire.js';
import { construireResume } from './pro-logique.js';
import { validerAcces } from './sav-logique.js';
import { estConnecte, ecrireAccesSav } from './compte-session.js';

const ANCRES = { numero: 'numero', email: 'email' };

export function initialiser(donnees, racine = document) {
  const formulaire = racine.querySelector('.formulaire');
  if (!formulaire) return null;
  const { compte, site } = donnees;
  const controle = (id) => racine.getElementById(id);
  const stockage = racine.querySelector('[data-stockage]');
  let commandeId = null;

  const champs = {};
  for (const [champ, ancre] of Object.entries(ANCRES)) {
    champs[champ] = { ancre, zone: controle(ancre).closest('.formulaire__champ'), erreur: controle(`erreur-${ancre}`), controles: () => [controle(ancre)] };
  }

  const acces = brancherFormulaire({
    formulaire,
    champs,
    lire: () => ({ numero: controle('numero').value, email: controle('email').value }),
    valider: (saisie) => {
      const resultat = validerAcces(saisie, compte.limites, compte.commandes);
      commandeId = resultat.commandeId;
      return resultat;
    },
    texte: (champ, raison) => compte.sav.messages[champ]?.[raison] ?? compte.sav.messages.repli,
    resume: {
      titre: (n) => remplirGabarit(n === 1 ? compte.formulaire.resume.singulier : compte.formulaire.resume.pluriel, { n }),
      liens: (erreurs) => construireResume(erreurs, compte.sav.resume.liens),
    },
    // Champs déjà vidés : on n'écrit que l'identifiant de la commande d'exemple, puis on ouvre la demande.
    apres: () => {
      if (commandeId === null || !ecrireAccesSav(commandeId)) {
        stockage.hidden = false;
        stockage.focus();
        return;
      }
      stockage.hidden = true;
      window.location.assign(site.liens.sav);
    },
  });

  const majConnecte = () => { racine.querySelector('[data-connecte]').hidden = !estConnecte(); };
  majConnecte();
  window.addEventListener('pageshow', majConnecte);
  racine.documentElement.dataset.formulaire = 'pret';
  return acces;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
