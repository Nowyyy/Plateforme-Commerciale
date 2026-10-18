// Diagnostic Hi-Fi : adresse de session, mise à jour validée, filtre par aléa (pastilles radio).
// L'adresse et l'aléa ne passent jamais par l'URL ; l'adresse est affichée par valeur de champ / textContent seulement.
import { donneesPretes, resoudre } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { TOUS, aleaValide, calquesParDefaut, filtrerEquipements, formaterPrix, libelleNiveau, niveauGlobal, segmentsJauge } from './diagnostic-logique.js';

export const CLE_ALEA = 'alea';
export const CLE_PRODUIT = 'produit';

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

// Jauge à 4 segments (décor) avec repère sous le segment du niveau, puis niveau en toutes lettres et phrase.
function afficherScore(donnees, filtre) {
  const { aleas, niveaux, textes } = donnees.diagnostic;
  const niveau = niveauGlobal(aleas, filtre);
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
  const libelle = libelleNiveau(niveaux, niveau);
  document.getElementById('score-niveau').textContent = `${textes.score.libelle} ${libelle}`;
  document.getElementById('score-phrase').textContent = textes.score.phrases[Math.min(Math.max(niveau, 1), textes.score.phrases.length) - 1];
  document.querySelector('.score').setAttribute('aria-busy', 'false');
  return libelle;
}

function mettreAJour(donnees, filtre, annoncer) {
  reinitialiserCalques(donnees, filtre);
  const nombre = afficherEquipements(donnees, filtre);
  const niveau = afficherScore(donnees, filtre);
  if (!annoncer) return;
  const { equipements, score } = donnees.diagnostic.textes;
  const phrase = nombre === 1 ? equipements.annonceUn : equipements.annonceN.replace('{n}', String(nombre));
  document.getElementById('annonce-diagnostic').textContent = `${phrase} ${score.annonce.replace('{niveau}', niveau)}`;
}

// Calques : cases à cocher et légende générées depuis les données ; masquer un calque = classe sur son groupe SVG.
function initialiserCalques(donnees) {
  const { aleas, textes } = donnees.diagnostic;
  const ids = [...new Set(aleas.map((a) => a.calque))];
  const liste = document.getElementById('liste-calques');
  const legende = document.getElementById('legende-calques');
  const modeleCalque = document.getElementById('modele-calque');
  const modeleLegende = document.getElementById('modele-legende');
  const adresse = legende.querySelector('li');
  for (const id of ids) {
    if (!SYMBOLE.test(id)) throw new Error(`Calque inconnu : « ${id} »`);
    const libelle = textes.carte.calques[id];
    const choix = modeleCalque.content.cloneNode(true);
    const case_ = choix.querySelector('input');
    case_.value = id;
    case_.addEventListener('change', () => basculerCalque(id, case_.checked));
    choix.querySelector('span').textContent = libelle;
    liste.append(choix);
    const item = modeleLegende.content.cloneNode(true);
    item.querySelector('li').setAttribute('data-calque', id);
    item.querySelector('.legende__zone').setAttribute('fill', `url(#motif-${id})`);
    item.querySelector('span').textContent = libelle;
    legende.insertBefore(item, adresse);
  }
  document.querySelector('.carte-schema').setAttribute('aria-busy', 'false');
}

function basculerCalque(id, visible) {
  for (const groupe of document.querySelectorAll(`.schema [data-calque="${id}"]`)) {
    groupe.classList.toggle('est-masque', !visible);
  }
}

// Un changement de filtre réinitialise les cases (« Tous » : les 4 ; un aléa : le sien) ; l'utilisateur peut ensuite les modifier.
function reinitialiserCalques(donnees, filtre) {
  const visibles = calquesParDefaut(donnees.diagnostic.aleas, filtre);
  for (const case_ of document.querySelectorAll('#liste-calques input')) {
    case_.checked = visibles.includes(case_.value);
    basculerCalque(case_.value, case_.checked);
  }
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
  // Un changement de pastille met à jour l'état puis prévient les autres blocs (équipements, score, carte).
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
    if (id) ecrireSession(CLE_PRODUIT, id);
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

  const effacer = () => {
    erreur.textContent = '';
    champ.removeAttribute('aria-invalid');
  };
  champ.addEventListener('input', effacer);
  formulaire.addEventListener('submit', (e) => {
    e.preventDefault();
    const resultat = valider(champ.value);
    if (!resultat.valide) {
      erreur.textContent = resoudre(donnees, 'diagnostic.textes.erreur');
      champ.setAttribute('aria-invalid', 'true');
      champ.focus();
      return;
    }
    effacer();
    champ.value = resultat.adresse;
    ecrireSession(CLE_STOCKAGE, resultat.adresse);
    aide.textContent = resoudre(donnees, 'diagnostic.textes.aide');
  });
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    // Aléa choisi sur l'accueil : lu une seule fois, puis supprimé ; absent ou inconnu = « Tous ».
    const etat = { filtre: aleaValide(donnees.diagnostic.aleas.map((a) => a.id), lireSession(CLE_ALEA, true)) ?? TOUS };
    initialiserAdresse(donnees);
    initialiserFiches();
    afficherPastilles(donnees, etat);
    initialiserCalques(donnees);
    mettreAJour(donnees, etat.filtre, false);
    document.dispatchEvent(new CustomEvent('diagnostic:filtre', { detail: { filtre: etat.filtre } }));
  });
}
