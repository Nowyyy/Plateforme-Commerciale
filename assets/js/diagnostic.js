// Diagnostic Hi-Fi : adresse de session, mise à jour validée, filtre par aléa (pastilles radio).
// L'adresse et l'aléa ne passent jamais par l'URL ; l'adresse est affichée par valeur de champ / textContent seulement.
import { donneesPretes, resoudre } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { brancherAssistant } from './adresse-assistee.js';
import { memoriserProduit } from './produit-session.js';
import { CLE_COMPARAISON, comparaisonDepuisDiagnostic } from './comparateur-logique.js';
import { TOUS, aleaValide, filtrerEquipements, formaterPrix, libelleNiveau, niveauGlobal, segmentsJauge } from './diagnostic-logique.js';

export const CLE_ALEA = 'alea';

function lireSession(cle, retirer = false) {
  try {
    const valeur = sessionStorage.getItem(cle);
    if (retirer) sessionStorage.removeItem(cle);
    return valeur;
  } catch {
    return null; // stockage indisponible : comportement par défaut
  }
}

function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : on poursuit sans conserver l'adresse
  }
}

const SYMBOLE = /^[a-z0-9-]+$/;

// Cartes d'équipement : <template> et textContent seulement (aucune donnée n'est injectée comme HTML).
function afficherEquipements(donnees, filtre) {
  const { aleas, equipements, textes } = donnees.diagnostic;
  const liste = document.getElementById('liste-equipements');
  const modele = document.getElementById('modele-equipement');
  const lienProduit = resoudre(donnees, 'site.liens.produit');
  const choisis = filtrerEquipements(equipements, filtre);
  const cartes = choisis.map((equipement) => {
    const alea = aleas.find((a) => a.id === (equipement.aleas.includes(filtre) ? filtre : equipement.aleas[0]));
    const carte = modele.content.cloneNode(true);
    carte.querySelector('h3').textContent = equipement.titre;
    const [etiquetteAlea, etiquettePrix] = carte.querySelectorAll('.equipement__etiquette');
    etiquetteAlea.textContent = textes.equipements.neutralise;
    carte.querySelector('.equipement__alea').textContent = alea.titre;
    etiquettePrix.textContent = textes.equipements.prix;
    carte.querySelector('.equipement__prix').textContent = formaterPrix(equipement.prix);
    carte.querySelector('.equipement__exemple').textContent = textes.equipements.exemple;
    carte.querySelector('li').setAttribute('data-id', equipement.id);
    const lien = carte.querySelector('a');
    lien.textContent = textes.equipements.voirFiche;
    lien.setAttribute('href', lienProduit);
    lien.setAttribute('aria-label', `${textes.equipements.voirFiche} : ${equipement.titre}`);
    if (SYMBOLE.test(alea.icone) && document.getElementById(alea.icone)) {
      carte.querySelector('use').setAttribute('href', `#${alea.icone}`);
    }
    return carte;
  });
  // le <template> reste dans la liste : seules les cartes précédentes sont retirées
  for (const ancienne of liste.querySelectorAll(':scope > li')) ancienne.remove();
  liste.append(...cartes);
  liste.setAttribute('aria-busy', 'false');
  return choisis.length;
}

// Jauge à 4 segments (décor) avec repère sous le segment du niveau, puis niveau en toutes lettres.
// Lot 4e-A : niveau fixe provisoire (maximum des niveaux d'exemple) ; le calcul sur les aléas recensés arrive à la partie B.
function afficherExposition(donnees) {
  const { aleas, niveaux, textes } = donnees.diagnostic;
  const niveau = niveauGlobal(aleas, TOUS);
  const segments = segmentsJauge(niveau, niveaux.length).map((plein, i) => {
    const segment = document.createElement('li');
    segment.className = plein ? 'jauge__segment est-plein' : 'jauge__segment';
    if (i === niveau - 1) {
      const repere = document.createElement('span');
      repere.className = 'jauge__repere';
      segment.append(repere);
    }
    return segment;
  });
  document.getElementById('jauge').replaceChildren(...segments);
  const { libelle, indicatif } = textes.exposition;
  document.getElementById('exposition-niveau').textContent = `${libelle} ${libelleNiveau(niveaux, niveau)} ${indicatif}`;
  document.querySelector('.exposition').setAttribute('aria-busy', 'false');
}

function mettreAJour(donnees, filtre, annoncer) {
  const nombre = afficherEquipements(donnees, filtre);
  if (!annoncer) return;
  const { equipements } = donnees.diagnostic.textes;
  document.getElementById('annonce-diagnostic').textContent = nombre === 1 ? equipements.annonceUn : equipements.annonceN.replace('{n}', String(nombre));
}

function afficherPastilles(donnees, etat) {
  const conteneur = document.getElementById('pastilles-alea');
  const modele = document.getElementById('modele-pastille');
  const choix = [{ id: TOUS, libelle: resoudre(donnees, 'diagnostic.textes.tous') }, ...donnees.diagnostic.aleas.map((a) => ({ id: a.id, libelle: a.court }))];
  for (const { id, libelle } of choix) {
    const pastille = modele.content.cloneNode(true);
    const radio = pastille.querySelector('input');
    radio.value = id;
    radio.checked = id === etat.filtre;
    pastille.querySelector('span').textContent = libelle;
    conteneur.append(pastille);
  }
  // Un changement de pastille met à jour l'état puis prévient les autres blocs (équipements, carte).
  conteneur.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="alea"]')) return;
    etat.filtre = aleaValide(donnees.diagnostic.aleas.map((a) => a.id), e.target.value) ?? TOUS;
    mettreAJour(donnees, etat.filtre, true);
    document.dispatchEvent(new CustomEvent('diagnostic:filtre', { detail: { filtre: etat.filtre } }));
  });
}

// « Voir la fiche » : l'équipement de la carte est mémorisé en session (jamais dans l'URL) pour la fiche produit.
function initialiserFiches() {
  document.getElementById('liste-equipements').addEventListener('click', (e) => {
    const id = e.target.closest('a')?.closest('li[data-id]')?.getAttribute('data-id');
    if (id) memoriserProduit(id);
  });
}

// « Comparer ces solutions » : l'aléa du filtre et les cartes affichées sont mémorisés (identifiants seulement, jamais dans l'URL).
function initialiserComparaison(donnees, etat) {
  document.querySelector('.diag__comparer').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('#liste-equipements > li[data-id]')].map((li) => li.getAttribute('data-id'));
    ecrireSession(CLE_COMPARAISON, comparaisonDepuisDiagnostic({ filtre: etat.filtre, aleas: donnees.diagnostic.aleas, ids }));
  });
}

function initialiserAdresse(donnees) {
  const formulaire = document.getElementById('formulaire-adresse');
  const champ = document.getElementById('adresse-evaluee');
  const erreur = document.getElementById('adresse-erreur');
  const aide = document.getElementById('adresse-aide');
  const adresse = lireSession(CLE_STOCKAGE);
  if (adresse) champ.value = adresse;
  else aide.textContent = resoudre(donnees, 'diagnostic.textes.aideSansAdresse');

  const textes = donnees.diagnostic.textes.assistee;
  const assistant = brancherAssistant({ champ, liste: document.getElementById('adresse-liste'), statut: document.getElementById('adresse-statut'), config: donnees.diagnostic.carteReelle, textes });
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
      refuser(resoudre(donnees, 'diagnostic.textes.erreur'));
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
    const adresse = verdict.decision === 'accepte' ? verdict.adresse : resultat.adresse;
    if (verdict.decision === 'indisponible') {
      erreur.textContent = textes.nonVerifiee; // service injoignable : l'adresse est utilisée telle quelle
    }
    champ.value = adresse;
    ecrireSession(CLE_STOCKAGE, adresse);
    aide.textContent = resoudre(donnees, 'diagnostic.textes.aide');
    // Après une adresse acceptée seulement : la carte est recréée pour la nouvelle adresse (carte-reelle.js).
    document.dispatchEvent(new CustomEvent('adresse:modifiee'));
  });
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    // Aléa choisi sur l'accueil : lu une seule fois, puis supprimé ; absent ou inconnu = « Tous ».
    const etat = { filtre: aleaValide(donnees.diagnostic.aleas.map((a) => a.id), lireSession(CLE_ALEA, true)) ?? TOUS };
    initialiserAdresse(donnees);
    initialiserFiches();
    initialiserComparaison(donnees, etat);
    afficherPastilles(donnees, etat);
    afficherExposition(donnees);
    mettreAJour(donnees, etat.filtre, false);
    document.dispatchEvent(new CustomEvent('diagnostic:filtre', { detail: { filtre: etat.filtre } }));
  });
}
