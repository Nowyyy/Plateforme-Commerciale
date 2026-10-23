// Panier Hi-Fi (écran 4) : la commande de sessionStorage (clé « commande », lue sans être supprimée) est relue puis revalidée
// à chaque chargement. Les textes issus des données et les valeurs de session sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { formaterMm } from './cotes-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { delaisCommande, lireCommande, peutValider, validerCommande } from './panier-logique.js';

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

function supprimerSession(cle) {
  try {
    sessionStorage.removeItem(cle);
  } catch {
    // stockage indisponible : rien à supprimer
  }
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
}

// Aperçu schématique (E4-3) : les valeurs A et B viennent de la commande validée, posées par textContent.
function afficherApercu({ cotes }) {
  document.getElementById('apercu-valeur-a').textContent = `${formaterMm(cotes.largeur)} mm`;
  document.getElementById('apercu-valeur-b').textContent = `${formaterMm(cotes.hauteur)} mm`;
}

// Total (E4-4) : lignes de prix de la commande validée (libellés de la fiche), délais en texte.
function afficherTotal(donnees, { produit, mode, lignes }) {
  const { modes, panier } = donnees.produit;
  const liste = document.getElementById('total-lignes');
  liste.replaceChildren();
  for (const { cle, montant } of lignes) {
    const dt = element('dt', cle === 'total' ? 'total__ligne-total' : '', modes.lignes[cle]);
    const dd = element('dd', cle === 'total' ? 'total__ligne-total' : '', formaterPrix(montant));
    liste.append(dt, dd);
  }
  const delais = delaisCommande(produit, mode).map(({ cle, texte }) => {
    const libelle = cle === 'pose' ? panier.total.intervention : panier.total.livraison;
    return element('p', 'total__delai', `${libelle} ${texte}`);
  });
  document.getElementById('total-delais').replaceChildren(...delais);
}

// « Valider ma commande » : jamais disabled ; aria-disabled et classe d'action (ambre) seulement à l'état actif.
// La case n'est jamais mémorisée. Clic inactif : aide annoncée, focus sur la case. Clic actif : confirmation simulée.
function initialiserValidation(donnees, validation) {
  const { total } = donnees.produit.panier;
  const caseCochee = document.getElementById('responsabilite-case');
  const bouton = document.getElementById('total-valider');
  const etat = document.getElementById('total-etat');
  caseCochee.checked = false;

  const annoncerAide = () => {
    etat.textContent = '';
    requestAnimationFrame(() => { etat.textContent = total.aideInactif; });
  };
  const mettreAJour = () => {
    const actif = peutValider(caseCochee.checked, validation);
    bouton.setAttribute('aria-disabled', actif ? 'false' : 'true');
    bouton.classList.toggle('bouton--action', actif);
    bouton.classList.toggle('bouton--secondaire', !actif);
    etat.textContent = actif ? '' : total.aideInactif;
  };
  const confirmer = () => {
    const retour = element('a', 'bouton bouton--secondaire total__retour', total.confirmation.lien);
    retour.setAttribute('href', donnees.site.liens.accueil);
    etat.replaceChildren(
      element('p', 'total__confirmation-titre', total.confirmation.titre),
      element('p', 'total__confirmation-numero', total.confirmation.numero),
      element('p', 'total__confirmation-message', total.confirmation.message),
      retour,
    );
    etat.classList.add('total__etat--confirme');
    bouton.hidden = true;
    bouton.setAttribute('tabindex', '-1');
    caseCochee.disabled = true;
    supprimerSession(CLE_COMMANDE);
    etat.focus();
  };

  caseCochee.addEventListener('change', mettreAJour);
  bouton.addEventListener('click', () => {
    if (!peutValider(caseCochee.checked, validation)) {
      annoncerAide();
      caseCochee.focus();
      return;
    }
    confirmer();
  });
  mettreAJour();
}

// Retour sur la page depuis le cache de navigation : la page est rechargée (commande relue, case décochée).
function recharger() {
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
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
      afficherApercu(validation.commande);
      afficherTotal(donnees, validation.commande);
      initialiserValidation(donnees, validation);
      for (const role of ['responsabilite', 'total', 'paiement']) document.querySelector(`[data-role="${role}"]`).hidden = false;
    } else if (brut === null || brut.trim() === '') {
      afficherEtat(donnees, 'vide', donnees.site.liens.diagnostic);
    } else {
      afficherEtat(donnees, 'invalide', donnees.site.liens.produit);
    }
    document.getElementById('recap').setAttribute('aria-busy', 'false');
    recharger();
  });
}
