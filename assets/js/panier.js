// Panier Hi-Fi (écran 4) : la commande de sessionStorage (clé « commande », lue sans être supprimée) est relue puis revalidée
// à chaque chargement. Les textes issus des données et les valeurs de session sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { formaterMm } from './cotes-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { delaisCommande, lireCommande, validerCommande } from './panier-logique.js';

export const CLE_COMMANDE = 'commande';

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : le panier est vide
  }
}

function element(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

// Indicateur d'étapes : l'étape en cours porte aria-current="step" et un texte masqué visuellement.
function repererEtape({ etapeEnCours }) {
  const item = document.querySelector(`.etapes-commande__item[data-id="${etapeEnCours.id}"]`);
  if (!item) return;
  item.setAttribute('aria-current', 'step');
  item.append(' ', element('span', 'visuellement-cache', etapeEnCours.texte));
}

function ligneDefinition(liste, titre, valeur) {
  liste.append(element('dt', '', titre), element('dd', '', valeur));
}

function afficherRecapitulatif(donnees, { produit, mode, cotes }) {
  const { modes, panier } = donnees.produit;
  document.getElementById('recap-produit').textContent = produit.titre;
  document.getElementById('recap-reference').textContent = produit.reference;
  document.getElementById('recap-mode').textContent = modes[mode].titre;
  for (const nom of ['largeur', 'hauteur', 'tolerance']) {
    document.getElementById(`recap-${nom}`).textContent = `${formaterMm(cotes[nom])} mm`;
  }
  document.getElementById('recap-prix').textContent = formaterPrix(produit.prix);
  const delais = document.getElementById('recap-delais');
  delais.replaceChildren();
  for (const { cle, texte } of delaisCommande(produit, mode)) ligneDefinition(delais, panier.recapitulatif.delais[cle], texte);
  document.getElementById('recap-plein').hidden = false;
  for (const role of ['responsabilite', 'total', 'paiement']) document.querySelector(`[data-role="${role}"]`).hidden = false;
}

// État vide ou invalide : titre, phrase et lien dans la région d'état ; les blocs suivants restent masqués.
function afficherEtat(donnees, cle, lien) {
  const textes = donnees.produit.panier[cle];
  const retour = element('a', 'bouton bouton--secondaire recap__retour', textes.lien);
  retour.setAttribute('href', lien);
  document.getElementById('recap-etat').replaceChildren(element('h2', 'recap__titre-etat', textes.titre), element('p', 'recap__phrase', textes.phrase), retour);
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    repererEtape(donnees.produit.panier);
    const brut = lireSession(CLE_COMMANDE);
    const validation = validerCommande(lireCommande(brut), donnees.produit.produits);
    if (validation.ok) {
      afficherRecapitulatif(donnees, validation.commande);
    } else if (brut === null || brut.trim() === '') {
      afficherEtat(donnees, 'vide', donnees.site.liens.diagnostic);
    } else {
      afficherEtat(donnees, 'invalide', donnees.site.liens.produit);
    }
    document.getElementById('recap').setAttribute('aria-busy', 'false');
  });
}
