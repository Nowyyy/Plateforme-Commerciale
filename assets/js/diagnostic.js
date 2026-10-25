// Diagnostic Hi-Fi : adresse de session, mise à jour validée, niveau d'exposition calculé, pastilles d'aléa et équipements selon les aléas recensés.
// L'adresse et l'aléa ne passent jamais par l'URL ; l'adresse est affichée par valeur de champ / textContent seulement.
import { donneesPretes, resoudre } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { brancherAssistant } from './adresse-assistee.js';
import { memoriserProduit } from './produit-session.js';
import { CLE_COMPARAISON, aleaParDefaut, comparaisonDepuisDiagnostic } from './comparateur-logique.js';
import { TOUS, aleaPourComparaison, aleaValide, aleasProposes, formaterPrix, niveauGlobalExposition, phraseAleasNonRecenses, segmentsJauge, selectionEquipements } from './diagnostic-logique.js';

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
const el = (id) => document.getElementById(id);

// Cartes d'équipement : <template> et textContent seulement (aucune donnée n'est injectée comme HTML).
function afficherEquipements(donnees, choisis) {
  const { aleas, textes } = donnees.diagnostic;
  const liste = el('liste-equipements');
  const modele = el('modele-equipement');
  const lienProduit = resoudre(donnees, 'site.liens.produit');
  const cartes = choisis.map((equipement) => {
    const alea = aleas.find((a) => a.id === equipement.aleas[0]);
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
}

// État du diagnostic : phase de lecture des aléas (annoncée par carte-reelle.js), états par calque, pastille, mode exploration.
const etat = { phase: 'sans-adresse', etats: null, pastille: TOUS, exploration: false, ligne: '', aleaAccueil: null };

// Jauge à 4 segments (décor) avec repère sous le segment du niveau, puis niveau en toutes lettres : calculé sur les aléas recensés,
// jamais modifié par les cases de calques ni par les pastilles.
function afficherExposition(donnees) {
  const d = donnees.diagnostic;
  const t = d.textes.exposition;
  const global = etat.phase === 'lus' ? niveauGlobalExposition(etat.etats, d) : { etat: 'attente', niveau: 0, inconnus: [] };
  const segments = segmentsJauge(global.niveau, d.niveaux.length).map((plein, i) => {
    const segment = document.createElement('li');
    segment.className = plein ? 'jauge__segment est-plein' : 'jauge__segment';
    if (i === global.niveau - 1) {
      const repere = document.createElement('span');
      repere.className = 'jauge__repere';
      segment.append(repere);
    }
    return segment;
  });
  el('jauge').replaceChildren(...segments);
  let texte = t.sansAdresse;
  if (etat.phase === 'lecture') texte = t.lecture;
  else if (etat.phase === 'lus') texte = { niveau: `${t.libelle} ${global.libelle} ${t.indicatif}`, aucun: t.aucun, indetermine: t.indetermine }[global.etat];
  el('exposition-niveau').textContent = texte;
  const noms = d.textes.carte.calques;
  const inconnus = el('exposition-inconnus');
  const afficher = etat.phase === 'lus' && global.etat !== 'indetermine' && global.inconnus.length > 0;
  inconnus.hidden = !afficher;
  inconnus.textContent = afficher ? t.inconnus.replace('{aleas}', global.inconnus.map((c) => noms[c] ?? c).join(', ')) : '';
  el('exposition-non-evalues').textContent = etat.phase === 'lus' ? phraseAleasNonRecenses(etat.etats, d) : '';
  document.querySelector('.exposition').setAttribute('aria-busy', 'false');
}

// Aléas proposés par les pastilles : recensés ou non déterminés à l'adresse, ou les aléas du catalogue en mode exploration.
function choixPastilles(donnees) {
  const d = donnees.diagnostic;
  if (etat.phase !== 'lus') return [];
  if (etat.exploration) return d.aleas.map((a) => ({ id: a.id, libelle: a.court }));
  return aleasProposes(etat.etats, d).map((p) => ({ id: p.id, libelle: p.etat === 'inconnu' ? `${d.aleas.find((a) => a.id === p.id).court} ${d.textes.equipements.suffixeInconnu}` : d.aleas.find((a) => a.id === p.id).court }));
}

// Pastilles : « Tous » puis un aléa proposé chacun, générées par gabarit ; le `name` des radios est posé ici (flèches dans le groupe).
function afficherPastilles(donnees) {
  const conteneur = el('pastilles-alea');
  const modele = el('modele-pastille');
  const choix = [{ id: TOUS, libelle: resoudre(donnees, 'diagnostic.textes.tous') }, ...choixPastilles(donnees)];
  if (!choix.some((c) => c.id === etat.pastille)) etat.pastille = TOUS;
  for (const ancienne of conteneur.querySelectorAll('label')) ancienne.remove();
  for (const { id, libelle } of choix) {
    const pastille = modele.content.cloneNode(true);
    const radio = pastille.querySelector('input');
    radio.name = 'alea';
    radio.value = id;
    radio.checked = id === etat.pastille;
    pastille.querySelector('span').textContent = libelle;
    conteneur.append(pastille);
  }
}

// Équipements et messages d'état de la zone ; `annoncer` : phrase « {n} équipements pour {aléa} » (changement de pastille).
function afficherZoneEquipements(donnees, annoncer) {
  const d = donnees.diagnostic;
  const t = d.textes.equipements;
  const proposes = etat.phase === 'lus' && !etat.exploration ? aleasProposes(etat.etats, d) : [];
  let message = '';
  if (etat.phase === 'sans-adresse') message = t.sansAdresse;
  else if (etat.phase === 'lecture') message = t.chargement;
  else if (!etat.exploration && proposes.length === 0) message = t.aucun;
  el('equipements-message').textContent = message;
  el('equipements-ligne').textContent = etat.phase === 'lus' ? etat.ligne : '';
  el('equipements-explorer').hidden = !(etat.phase === 'lus' && !etat.exploration && proposes.length === 0);
  const choisis = etat.phase === 'lus' ? selectionEquipements({ equipements: d.equipements, pastille: etat.pastille, etats: etat.etats, config: d, exploration: etat.exploration }) : [];
  afficherEquipements(donnees, choisis);
  if (!annoncer) return;
  const alea = etat.pastille === TOUS ? t.tousAleas : d.aleas.find((a) => a.id === etat.pastille)?.court ?? '';
  el('annonce-diagnostic').textContent = (choisis.length === 1 ? t.annonceUn : t.annonceN).replace('{n}', String(choisis.length)).replace('{alea}', alea);
}

function tout(donnees) {
  afficherExposition(donnees);
  afficherPastilles(donnees);
  afficherZoneEquipements(donnees, false);
}

// Nouvel état des aléas (carte-reelle.js) : le niveau, les pastilles et les équipements sont recalculés ; l'aléa de l'accueil n'est lu qu'une fois.
function brancherAleas(donnees) {
  const d = donnees.diagnostic;
  document.addEventListener('aleas:etat', (e) => {
    const { phase, etats } = e.detail ?? {};
    etat.phase = ['sans-adresse', 'lecture', 'lus'].includes(phase) ? phase : 'sans-adresse';
    etat.etats = etat.phase === 'lus' && etats && typeof etats === 'object' ? etats : null;
    if (etat.phase !== 'lus') {
      etat.exploration = false;
      etat.ligne = '';
    } else if (etat.aleaAccueil !== null) {
      const propose = aleasProposes(etat.etats, d).some((p) => p.id === etat.aleaAccueil);
      etat.pastille = propose ? etat.aleaAccueil : TOUS;
      etat.ligne = propose ? '' : d.textes.equipements.aleaAccueilAbsent;
      etat.aleaAccueil = null;
    }
    tout(donnees);
  });
  el('pastilles-alea').addEventListener('change', (e) => {
    if (!e.target.matches('input[name="alea"]')) return;
    etat.pastille = e.target.value;
    afficherZoneEquipements(donnees, true);
  });
  el('equipements-explorer').addEventListener('click', () => {
    etat.exploration = true;
    etat.pastille = TOUS;
    etat.ligne = d.textes.equipements.exploration;
    tout(donnees);
    el('pastilles-alea').querySelector('input')?.focus();
  });
}

// « Voir la fiche » : l'équipement de la carte est mémorisé en session (jamais dans l'URL) pour la fiche produit.
function initialiserFiches() {
  el('liste-equipements').addEventListener('click', (e) => {
    const id = e.target.closest('a')?.closest('li[data-id]')?.getAttribute('data-id');
    if (id) memoriserProduit(id);
  });
}

// « Comparer ces solutions » : l'aléa de la pastille active (avec « Tous » : l'aléa proposé de niveau le plus élevé, sinon l'aléa par
// défaut du comparateur) et les cartes affichées sont mémorisés (identifiants seulement, jamais dans l'URL).
function initialiserComparaison(donnees) {
  const d = donnees.diagnostic;
  document.querySelector('.diag__comparer').addEventListener('click', () => {
    const ids = [...document.querySelectorAll('#liste-equipements > li[data-id]')].map((li) => li.getAttribute('data-id'));
    const alea = aleaPourComparaison(etat.pastille, etat.phase === 'lus' ? etat.etats : null, d, aleaParDefaut(d.aleas));
    ecrireSession(CLE_COMPARAISON, comparaisonDepuisDiagnostic({ filtre: alea, aleas: d.aleas, ids }));
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
  // Adresse de session : tenue pour déjà validée (la carte et les lectures partent de ce texte), le bouton reste inactif tant qu'elle est identique.
  const bouton = formulaire.querySelector('button[type="submit"]');
  const assistant = brancherAssistant({ champ, liste: document.getElementById('adresse-liste'), statut: document.getElementById('adresse-statut'), config: donnees.diagnostic.carteReelle, textes, bouton, erreur, adresseCourante: adresse ?? '' });

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
  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!assistant.valide()) {
      assistant.refuser(); // bouton inactif : aucune action, phrase d'aide annoncée, focus dans le champ
      return;
    }
    const resultat = valider(champ.value); // validation locale du lot 2, toujours avant toute mise à jour
    if (!resultat.valide) {
      refuser(resoudre(donnees, 'diagnostic.textes.erreur'));
      return;
    }
    effacer();
    ecrireSession(CLE_STOCKAGE, resultat.adresse);
    assistant.definirCourante(resultat.adresse);
    aide.textContent = resoudre(donnees, 'diagnostic.textes.aide');
    // Après une adresse valide seulement : la carte est recréée pour la nouvelle adresse (carte-reelle.js).
    document.dispatchEvent(new CustomEvent('adresse:modifiee'));
  });
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    // Aléa choisi sur l'accueil : lu une seule fois, puis supprimé ; appliqué dès que les aléas de l'adresse sont connus.
    etat.aleaAccueil = aleaValide(donnees.diagnostic.aleas.map((a) => a.id), lireSession(CLE_ALEA, true));
    etat.phase = valider(lireSession(CLE_STOCKAGE)).valide ? 'lecture' : 'sans-adresse';
    for (const paragraphe of donnees.diagnostic.textes.exposition.calcul.paragraphes) {
      const p = document.createElement('p');
      p.textContent = paragraphe;
      el('exposition-calcul').append(p);
    }
    initialiserAdresse(donnees);
    initialiserFiches();
    initialiserComparaison(donnees);
    brancherAleas(donnees);
    tout(donnees);
  });
}
