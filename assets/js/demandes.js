// Mes demandes (écran 11) : garde « Connexion requise », filtre par statut (pastilles radio), liste triée et indicateur d'étapes,
// depuis data/compte.json. Lecture seule : aucune requête, aucune écriture ; les demandes sont des exemples fixes.
import { donneesPretes } from './rendu.js';
import { remplirGabarit } from './cotes-logique.js';
import { formaterDate, TOUS } from './compte-logique.js';
import { trierDemandes, filtrerDemandes, etapesDemande } from './sav-logique.js';
import { appliquerGarde, brancherDeconnexion } from './compte-session.js';
import { remplirStatut } from './compte-vue.js';

const par = (racine, selecteur) => racine.querySelector(selecteur);

// Indicateur d'étapes : pastille (icône dessinée en CSS, forme par état) et texte masqué ; jamais la couleur seule.
export function construireEtapes(gabarit, etapes, textes) {
  return etapes.map((etape) => {
    const li = gabarit.content.firstElementChild.cloneNode(true);
    li.setAttribute('data-etat', etape.etat);
    par(li, '.sav__etape-titre').textContent = etape.titre;
    par(li, '.sav__etape-etat').textContent = textes[etape.etat === 'terminee' ? 'terminee' : etape.etat === 'actuelle' ? 'actuelle' : 'avenir'];
    return li;
  });
}

export function carteSuivi(gabarits, demande, compte) {
  const carte = gabarits.demande.content.firstElementChild.cloneNode(true);
  const suivi = compte.sav.suivi;
  const motif = compte.motifs.find((m) => m.id === demande.motif)?.titre ?? '';
  carte.setAttribute('data-id', demande.id);
  par(carte, '.demande__numero').textContent = demande.id;
  par(carte, '.demande__produit').textContent = remplirGabarit(compte.demande.produit, { titre: demande.titre });
  par(carte, '.demande__date').textContent = remplirGabarit(suivi.date, { date: formaterDate(demande.date) });
  par(carte, '.demande__motif').textContent = remplirGabarit(suivi.motif, { motif });
  par(carte, '.demande__statut-libelle').textContent = suivi.statut;
  remplirStatut(carte, demande.statut, compte.statutsDemande);
  const liste = par(carte, '.sav__etapes');
  liste.setAttribute('aria-label', suivi.etapes.aria);
  liste.replaceChildren(...construireEtapes(gabarits.etape, etapesDemande(demande.statut, compte.statutsDemande), suivi.etapes));
  return carte;
}

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  const { compte } = donnees;
  const liste = par(racine, '.sav__demandes');
  const gabarits = { demande: par(racine, 'template[data-gabarit="carte-demande-sav"]'), etape: par(racine, 'template[data-gabarit="etape-sav"]') };
  const vide = par(racine, '.achats__vide');
  const radios = [...racine.querySelectorAll('.pastille-choix input')];
  const triees = trierDemandes(compte.demandes);

  const rendre = (filtre) => {
    const affichees = filtrerDemandes(triees, filtre, compte.statutsDemande);
    liste.replaceChildren(...Object.values(gabarits), ...affichees.map((d) => carteSuivi(gabarits, d, compte)));
    liste.setAttribute('aria-busy', 'false');
    vide.textContent = affichees.length === 0 ? compte.sav.suivi.vide : '';
  };
  for (const radio of radios) {
    radio.addEventListener('change', () => { if (radio.checked) rendre(radio.closest('label').dataset.id); });
  }
  (radios.find((r) => r.closest('label').dataset.id === TOUS) ?? radios[0]).checked = true;
  rendre(TOUS);
  racine.documentElement.dataset.compte = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
