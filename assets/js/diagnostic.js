// Diagnostic Hi-Fi : adresse de session, mise à jour validée, filtre par aléa (pastilles radio).
// L'adresse et l'aléa ne passent jamais par l'URL ; l'adresse est affichée par valeur de champ / textContent seulement.
import { donneesPretes, resoudre } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { TOUS, aleaValide } from './diagnostic-logique.js';

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
    document.dispatchEvent(new CustomEvent('diagnostic:filtre', { detail: { filtre: etat.filtre } }));
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
    afficherPastilles(donnees, etat);
    document.dispatchEvent(new CustomEvent('diagnostic:filtre', { detail: { filtre: etat.filtre } }));
  });
}
