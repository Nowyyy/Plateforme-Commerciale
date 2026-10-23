// Configurateur de cotes (E3-5) : seul le produit « complet » en dispose ; les autres produits affichent un message.
// Saisie en entiers de millimètres, faisabilité évaluée à chaque frappe par evaluerCotes (logique pure).
// Les textes issus des données sont posés par textContent seulement.
import {
  CHAMPS, evaluerCotes, formaterMm, peutAjouter, premierChampACorriger, remplirGabarit, restaurerCotes,
} from './cotes-logique.js';
import { ajouterDepuisFiche, initialiserQuantite } from './ajout.js';

export const CLE_COTES = 'cotes';

// Champ de saisie -> cote du schéma et de la liste « Où mesurer »
const COTE_DU_CHAMP = { largeur: 'a', hauteur: 'b', tolerance: 'c' };

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : champs vides
  }
}

function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : la saisie n'est pas conservée
  }
}

// Repère du schéma et de la liste : groupe SVG en trait épais, élément de liste marqué (aria-current), jamais la couleur seule.
function initialiserRepere(section) {
  let focus = null;
  let survol = null;
  const marquer = () => {
    const actif = COTE_DU_CHAMP[focus ?? survol] ?? null;
    for (const cote of Object.values(COTE_DU_CHAMP)) {
      section.querySelector(`#cote-${cote}`).classList.toggle('est-actif', cote === actif);
      const item = section.querySelector(`.etapes__item[data-id="${cote}"]`);
      if (!item) continue;
      if (cote === actif) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }
  };
  const saisie = section.querySelector('#cotes-saisie');
  saisie.addEventListener('focusin', (e) => {
    focus = e.target.closest('.cote')?.dataset.cote ?? null;
    marquer();
  });
  saisie.addEventListener('focusout', () => {
    focus = null;
    marquer();
  });
  for (const bloc of saisie.querySelectorAll('.cote')) {
    bloc.addEventListener('mouseenter', () => {
      survol = bloc.dataset.cote;
      marquer();
    });
    bloc.addEventListener('mouseleave', () => {
      survol = null;
      marquer();
    });
  }
}

export function initialiserConfigurateur(donnees, produit) {
  const section = document.querySelector('[data-role="configurateur"]');
  if (!section) return;
  const outil = section.querySelector('.configurateur__outil');
  const nonComplet = section.querySelector('.configurateur__indisponible');
  if (!produit.complet || !produit.cotes) {
    outil.remove();
    nonComplet.hidden = false;
    return;
  }
  nonComplet.remove();

  const textes = donnees.produit.configurateur;
  const limites = produit.cotes;
  const champs = Object.fromEntries(CHAMPS.map((nom) => [nom, section.querySelector(`#cote-${nom}`)]));
  const erreurs = Object.fromEntries(CHAMPS.map((nom) => [nom, section.querySelector(`#erreur-${nom}`)]));
  const faisabilite = section.querySelector('#cotes-faisabilite');
  const indisponible = faisabilite.querySelector('#faisabilite-indisponible');
  const ajouter = section.querySelector('#cotes-ajouter');
  const quantite = initialiserQuantite(section.querySelector('#cotes-action .quantite'), donnees, produit);
  const gabaritPlage = (nom) => remplirGabarit(textes.saisie.plage[nom], { min: formaterMm(limites[nom].min), max: formaterMm(limites[nom].max) });
  section.querySelector('#plage-largeur').textContent = gabaritPlage('largeur');
  section.querySelector('#plage-hauteur').textContent = gabaritPlage('hauteur');

  const lireSaisie = () => Object.fromEntries(CHAMPS.map((nom) => [nom, champs[nom].value]));

  function afficherErreurs(evaluation) {
    for (const nom of CHAMPS) {
      const champ = evaluation.champs[nom];
      const invalide = champ.etat === 'invalide';
      let message = '';
      if (invalide) {
        message = champ.raison === 'trop-grande'
          ? remplirGabarit(textes.erreurs.toleranceMax, { max: formaterMm(limites.toleranceMax) })
          : textes.erreurs.nombre;
      }
      erreurs[nom].textContent = message;
      if (invalide) champs[nom].setAttribute('aria-invalid', 'true');
      else champs[nom].removeAttribute('aria-invalid');
    }
  }

  function afficherFaisabilite(evaluation) {
    const etat = evaluation.etat === 'compatible' || evaluation.etat === 'hors' ? evaluation.etat : 'saisir';
    faisabilite.dataset.etat = etat;
    faisabilite.querySelector('#faisabilite-titre').textContent = textes.etats[etat].titre;
    faisabilite.querySelector('#faisabilite-texte').textContent = textes.etats[etat].texte;
    const lignes = evaluation.ecarts.map(({ champ, sens, mm }) => {
      const li = document.createElement('li');
      li.textContent = remplirGabarit(textes.ecarts[champ][sens], { ecart: formaterMm(mm) });
      return li;
    });
    faisabilite.querySelector('#faisabilite-ecarts').replaceChildren(...lignes);
  }

  function mettreAJour(ecrire) {
    const saisie = lireSaisie();
    const evaluation = evaluerCotes(saisie, limites);
    afficherErreurs(evaluation);
    afficherFaisabilite(evaluation);
    // bouton jamais disabled : aria-disabled et classe (ambre seulement à l'état actif)
    const actif = peutAjouter(evaluation);
    ajouter.setAttribute('aria-disabled', actif ? 'false' : 'true');
    ajouter.classList.toggle('bouton--action', actif);
    ajouter.classList.toggle('bouton--secondaire', !actif);
    if (ecrire) {
      indisponible.textContent = '';
      ecrireSession(CLE_COTES, JSON.stringify({ produit: produit.id, ...saisie }));
    }
    return evaluation;
  }

  // Clic inactif : message dans la région de faisabilité, focus sur le premier champ à corriger.
  // Clic actif : ligne ajoutée à sessionStorage.panier (quantité du groupe voisin), confirmation sur la fiche, aucune navigation.
  function ajouterAuPanier() {
    const evaluation = evaluerCotes(lireSaisie(), limites);
    if (!peutAjouter(evaluation)) {
      indisponible.textContent = textes.action.indisponible;
      champs[premierChampACorriger(evaluation)].focus();
      return;
    }
    ajouterDepuisFiche({ donnees, produit, zone: section.querySelector('#cotes-action'), quantite: quantite.lire(), evaluation });
  }

  const restaure = restaurerCotes(lireSession(CLE_COTES), produit.id);
  for (const nom of CHAMPS) champs[nom].value = restaure[nom];
  mettreAJour(false);
  section.querySelector('#cotes-saisie').addEventListener('input', () => mettreAJour(true));
  ajouter.addEventListener('click', ajouterAuPanier);
  initialiserRepere(section);
  outil.setAttribute('aria-busy', 'false');
}
