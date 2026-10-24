// Comparateur Hi-Fi (écran 14) : sélecteur d'aléa avec indicateur de niveau, choix de 2 à 3 produits du même aléa.
// La sélection vient de comparateur-logique.js (seule source de vérité) ; session « comparaison » : identifiants seulement.
// Les textes issus des données sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { formaterPrix, libelleNiveau, segmentsJauge } from './diagnostic-logique.js';
import { basculerProduit, produitsDeAlea, selectionInitiale, selectionPourAlea, serialiserSelection } from './comparateur-logique.js';

export const CLE_COMPARAISON = 'comparaison';
const NOM_ALEAS = 'alea-comparateur'; // posé à l'exécution (flèches dans le groupe), jamais dans le HTML

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : sélection par défaut
  }
}

function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : la sélection n'est pas conservée
  }
}

// Jauge à 4 segments décoratifs (aria-hidden dans le gabarit) : le niveau est dit par le texte voisin.
export function remplirJauge(liste, niveau, total) {
  liste.replaceChildren(...segmentsJauge(niveau, total).map((plein) => {
    const segment = document.createElement('li');
    segment.className = plein ? 'jauge__segment est-plein' : 'jauge__segment';
    return segment;
  }));
}

function afficherAleas(c, etat) {
  const conteneur = document.getElementById('comparateur-aleas');
  const modele = document.getElementById('modele-alea');
  for (const alea of c.aleas) {
    const pastille = modele.content.cloneNode(true);
    const radio = pastille.querySelector('input');
    radio.name = NOM_ALEAS;
    radio.value = alea.id;
    radio.checked = alea.id === etat.alea;
    pastille.querySelector('.pastille-alea__titre').textContent = alea.court;
    remplirJauge(pastille.querySelector('.jauge'), alea.niveau, c.niveaux.length);
    pastille.querySelector('.pastille-alea__niveau').textContent = c.niveauAlea.replace('{niveau}', libelleNiveau(c.niveaux, alea.niveau));
    conteneur.append(pastille);
  }
  conteneur.closest('fieldset').setAttribute('aria-busy', 'false');
}

// Cartes à cocher des produits de l'aléa choisi ; le <template> reste dans le conteneur.
function afficherProduits(c, produits, etat) {
  const conteneur = document.getElementById('comparateur-produits');
  const modele = document.getElementById('modele-produit');
  const disponibles = produitsDeAlea(produits, etat.alea);
  for (const ancienne of conteneur.querySelectorAll(':scope > label')) ancienne.remove();
  conteneur.append(...disponibles.map((produit) => {
    const carte = modele.content.cloneNode(true);
    const case_ = carte.querySelector('input');
    case_.value = produit.id;
    case_.checked = etat.ids.includes(produit.id);
    carte.querySelector('.carte-produit__titre').textContent = produit.titre;
    carte.querySelector('.carte-produit__reference').textContent = c.reference.replace('{reference}', produit.reference);
    carte.querySelector('.carte-produit__prix').textContent = c.prix.replace('{prix}', formaterPrix(produit.prix));
    return carte;
  }));
  const aide = document.getElementById('comparateur-aide-alea');
  const court = disponibles.length <= c.limites.min;
  aide.textContent = court ? c.aleaDeuxProduits : '';
  aide.hidden = !court;
  conteneur.closest('fieldset').setAttribute('aria-busy', 'false');
  return disponibles;
}

function annoncer(c, etat) {
  document.getElementById('comparateur-etat').textContent = c.messages.compares.replace('{n}', String(etat.ids.length));
}

// Chaque changement de sélection ou d'aléa : session à jour, puis événement pour le tableau.
function publier(etat) {
  ecrireSession(CLE_COMPARAISON, serialiserSelection(etat.alea, etat.ids));
  document.dispatchEvent(new CustomEvent('comparateur:selection', { detail: { alea: etat.alea, ids: [...etat.ids] } }));
}

function initialiser(donnees) {
  const c = donnees.produit.comparateur;
  const { produits } = donnees.produit;
  const etat = selectionInitiale({ brut: lireSession(CLE_COMPARAISON), produits, aleas: c.aleas, limites: c.limites });
  afficherAleas(c, etat);
  afficherProduits(c, produits, etat);

  document.getElementById('comparateur-aleas').addEventListener('change', (e) => {
    if (!e.target.matches(`input[name="${NOM_ALEAS}"]`)) return;
    Object.assign(etat, selectionPourAlea(e.target.value, produits, c.limites));
    afficherProduits(c, produits, etat);
    annoncer(c, etat);
    publier(etat);
  });

  document.getElementById('comparateur-produits').addEventListener('change', (e) => {
    const case_ = e.target;
    if (!case_.matches('input[type="checkbox"]')) return;
    const disponibles = produitsDeAlea(produits, etat.alea).map((p) => p.id);
    const { ids, resultat } = basculerProduit(etat.ids, case_.value, disponibles, c.limites);
    if (resultat === 'ajoute' || resultat === 'retire') {
      etat.ids = ids;
      annoncer(c, etat);
      publier(etat);
      return;
    }
    // refus : la case garde son état (jamais disabled), le focus reste dessus, un message l'explique
    case_.checked = etat.ids.includes(case_.value);
    case_.focus();
    if (resultat === 'max' || resultat === 'min') document.getElementById('comparateur-etat').textContent = c.messages[resultat];
  });

  publier(etat);
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
