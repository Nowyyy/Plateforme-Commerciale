// Panier Hi-Fi (écran 4) : sessionStorage.panier (v 2, plusieurs lignes, sans prix) est relu puis revalidé à chaque rendu.
// Prix, délais et totaux sont recalculés à partir de data/produit.json. Les textes issus des données et les valeurs de session
// sont posés par textContent seulement ; les lignes viennent de gabarits <template> (aucun id dans les clones).
import { donneesPretes } from './rendu.js';
import { formaterMm, remplirGabarit } from './cotes-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { delaisCommande } from './panier-logique.js';
import {
  besoinConfirmation, changerQuantite, lireListe, peutValider, restaurerLigne, retirerLigne, statutListe, totauxPanier,
  validerPanier, VERSION_PANIER,
} from './lignes-logique.js';

export const CLE_PANIER = 'panier';
const CLE_PRODUIT = 'produit';
const CLE_MODE = 'mode';
const CLE_COTES = 'cotes';

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : le panier est vide
  }
}

function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}

function supprimerSession(cle) {
  try {
    sessionStorage.removeItem(cle);
  } catch {
    // stockage indisponible : rien à supprimer
  }
}

function element(balise, classe, texte) {
  const el = document.createElement(balise);
  if (classe) el.className = classe;
  if (texte !== undefined) el.textContent = texte;
  return el;
}

const par = (racine, selecteur) => racine.querySelector(selecteur);
const mot = (mots, n, cle) => (n === 1 ? mots[cle] : mots[`${cle}s`]);

// Indicateur d'étapes : l'étape en cours porte aria-current="step" et un texte masqué visuellement.
function repererEtape({ etapeEnCours }) {
  const item = document.querySelector(`.etapes-commande__item[data-id="${etapeEnCours.id}"]`);
  if (!item) return;
  item.setAttribute('aria-current', 'step');
  item.append(' ', element('span', 'visuellement-cache', etapeEnCours.texte));
}

// Prévient le compteur d'en-tête (l'événement storage ne part pas dans l'onglet qui écrit).
const notifier = () => document.dispatchEvent(new CustomEvent('panier:modifie'));

// Écrit les lignes (clé supprimée quand le panier est vide) ; faux si le stockage refuse l'écriture.
function enregistrer(etat) {
  const ecrit = etat.lignes.length === 0
    ? (supprimerSession(CLE_PANIER), true)
    : ecrireSession(CLE_PANIER, JSON.stringify({ v: VERSION_PANIER, lignes: etat.lignes }));
  notifier();
  return ecrit;
}

function demarrerPanier(donnees) {
  const { produits, panier: textes, ajout, modes } = donnees.produit;
  const { limites } = textes;
  const liens = donnees.site.liens;
  const zone = {
    entete: document.getElementById('recap-entete'),
    sousTitre: document.getElementById('recap-sous-titre'),
    deplier: document.getElementById('recap-deplier'),
    etat: document.getElementById('recap-etat'),
    vide: document.getElementById('recap-vide'),
    liste: document.getElementById('recap-lignes'),
    gabaritLigne: document.querySelector('template[data-gabarit="ligne"]'),
    gabaritApercu: document.querySelector('template[data-gabarit="apercu"]'),
    responsabilite: document.querySelector('[data-role="responsabilite"]'),
    phrase: document.getElementById('responsabilite-phrase'),
    voirCotes: document.getElementById('responsabilite-voir'),
    caseCochee: document.getElementById('responsabilite-case'),
    total: document.querySelector('[data-role="total"]'),
    totalLignes: document.getElementById('total-lignes'),
    totalDelais: document.getElementById('total-delais'),
    valider: document.getElementById('total-valider'),
    totalEtat: document.getElementById('total-etat'),
    paiement: document.querySelector('[data-role="paiement"]'),
  };

  const brut = lireSession(CLE_PANIER);
  const statutInitial = statutListe(brut, limites);
  let etat = { lignes: lireListe(brut, limites).lignes };
  let modifie = false;
  let confirme = false;
  let annulation = null;
  const ouverts = new Set();
  zone.caseCochee.checked = false;

  const produitDe = (id) => produits.find((p) => p.id === id);
  const titreDe = (ligne) => produitDe(ligne.produit)?.titre ?? ligne.produit;

  // ----- annonces (région d'état du récapitulatif) -----
  function annoncer(texte, avecAnnulation = false) {
    const enfants = [element('p', 'recap__annonce', texte)];
    if (avecAnnulation) {
      const annuler = element('button', 'bouton bouton--secondaire recap__annuler', textes.annuler);
      annuler.type = 'button';
      enfants.push(annuler);
    }
    zone.etat.replaceChildren(...enfants);
  }

  // ----- ligne -----
  function remplirApercu(conteneur, cotes) {
    const svg = zone.gabaritApercu.content.cloneNode(true);
    const [lettreA, lettreB] = svg.querySelectorAll('.schema__lettre');
    lettreA.textContent = textes.detail.lettres.a;
    lettreB.textContent = textes.detail.lettres.b;
    svg.querySelector('.schema__valeur--a').textContent = `${formaterMm(cotes.largeur)} mm`;
    svg.querySelector('.schema__valeur--b').textContent = `${formaterMm(cotes.hauteur)} mm`;
    svg.querySelector('svg').setAttribute('aria-label', remplirGabarit(textes.detail.apercuAria, {
      largeur: formaterMm(cotes.largeur), hauteur: formaterMm(cotes.hauteur),
    }));
    conteneur.append(svg);
  }

  function remplirDefinitions(liste, paires) {
    for (const [libelle, valeur] of paires) liste.append(element('dt', '', libelle), element('dd', '', valeur));
  }

  function construireLigne({ ligne, cle, validation }) {
    const li = zone.gabaritLigne.content.firstElementChild.cloneNode(true);
    li.dataset.cle = cle;
    const produit = validation.ok ? validation.produit : produitDe(ligne.produit);
    const titre = titreDe(ligne);
    par(li, '.ligne__nom').textContent = titre;
    if (produit) {
      par(li, '.ligne__reference').textContent = remplirGabarit(textes.ligne.reference, { reference: produit.reference });
      par(li, '.ligne__pictogramme use').setAttribute('href', `#${produit.icone}`);
    } else {
      par(li, '.ligne__reference').remove();
      par(li, '.ligne__visuel').classList.add('ligne__visuel--inconnu');
      par(li, '.ligne__pictogramme').remove();
    }
    const modeTitre = modes[ligne.mode]?.titre;
    if (modeTitre) par(li, '.ligne__mode').textContent = remplirGabarit(textes.ligne.mode, { mode: modeTitre });
    else par(li, '.ligne__mode').remove();

    const retirer = par(li, '.ligne__retirer');
    retirer.textContent = textes.retirer;
    retirer.setAttribute('aria-label', remplirGabarit(textes.retirerAria, { titre }));
    const groupe = par(li, '.quantite');
    const detail = par(li, '.ligne__details');
    const reprendreSeul = par(li, '.ligne__reprendre-seul');

    if (!validation.ok) {
      par(li, '.ligne__cotes').remove();
      par(li, '.ligne__prix').remove();
      par(li, '.ligne__total').remove();
      par(li, '.ligne__invalide').textContent = remplirGabarit(textes.ligne.aVerifier, { raison: textes.raisons[validation.raison] });
      li.classList.add('ligne--invalide');
      groupe.remove();
      detail.remove();
      if (produit) reprendreSeul.textContent = textes.detail.reprendre;
      else reprendreSeul.remove();
      return li;
    }

    par(li, '.ligne__invalide').remove();
    reprendreSeul.remove();
    const { unitaire } = validation;
    par(li, '.ligne__cotes').textContent = validation.cotes
      ? remplirGabarit(textes.ligne.surMesure, { largeur: formaterMm(validation.cotes.largeur), hauteur: formaterMm(validation.cotes.hauteur) })
      : textes.ligne.sansMesure;
    par(li, '.ligne__prix').textContent = remplirGabarit(textes.ligne.prixUnitaire, { prix: formaterPrix(unitaire.total), quantite: ligne.quantite });
    par(li, '.ligne__total').textContent = remplirGabarit(textes.ligne.totalLigne, { total: formaterPrix(unitaire.total * ligne.quantite) });

    groupe.setAttribute('aria-label', remplirGabarit(ajout.quantiteAria, { produit: titre }));
    par(li, '.quantite__libelle').textContent = ajout.quantite;
    const moins = par(li, '[data-quantite="moins"]');
    const plus = par(li, '[data-quantite="plus"]');
    moins.textContent = ajout.moins;
    plus.textContent = ajout.plus;
    moins.setAttribute('aria-label', remplirGabarit(ajout.moinsAria, { produit: titre }));
    plus.setAttribute('aria-label', remplirGabarit(ajout.plusAria, { produit: titre }));
    moins.setAttribute('aria-disabled', ligne.quantite <= 1 ? 'true' : 'false');
    plus.setAttribute('aria-disabled', ligne.quantite >= limites.quantiteMax ? 'true' : 'false');
    par(li, 'output').textContent = String(ligne.quantite);

    par(li, '.ligne__resume').textContent = textes.detail.resume;
    detail.open = ouverts.has(cle);
    if (validation.cotes) {
      const { largeur, hauteur, tolerance } = validation.cotes;
      remplirDefinitions(par(li, '.ligne__liste-cotes'), [
        [textes.detail.cotes.largeur, `${formaterMm(largeur)} mm`],
        [textes.detail.cotes.hauteur, `${formaterMm(hauteur)} mm`],
        [textes.detail.cotes.tolerance, `${formaterMm(tolerance)} mm`],
      ]);
      par(li, '.ligne__liste-cotes').setAttribute('aria-label', textes.detail.cotesAria);
      remplirApercu(par(li, '.ligne__apercu'), validation.cotes);
    } else {
      par(li, '.ligne__liste-cotes').remove();
      par(li, '.ligne__apercu').remove();
    }
    const delais = par(li, '.ligne__liste-delais');
    delais.setAttribute('aria-label', textes.detail.delaisAria);
    remplirDefinitions(delais, delaisCommande(validation.produit, validation.mode).map(({ cle: nom, texte }) => [textes.detail.delais[nom], texte]));
    const reprendre = par(li, '.ligne__reprendre');
    reprendre.textContent = validation.cotes ? textes.detail.reprendreCotes : textes.detail.reprendre;
    reprendre.classList.add('lien-action');
    const aide = par(li, '.ligne__aide');
    if (validation.cotes) aide.textContent = textes.detail.aide;
    else aide.remove();
    if (confirme) {
      par(li, '.ligne__actions').remove();
      reprendre.remove();
      aide?.remove();
    }
    return li;
  }

  // ----- rendu complet -----
  function restaurerFocus(cible) {
    if (!cible) return;
    const li = [...zone.liste.children].find((l) => l.dataset.cle === cible.cle);
    (li && par(li, cible.selecteur))?.focus();
  }

  function afficherVide(cle, lien) {
    const t = textes[cle];
    const retour = element('a', 'bouton bouton--secondaire recap__retour', t.lien);
    retour.setAttribute('href', lien);
    zone.vide.replaceChildren(element('h2', 'recap__titre-etat', t.titre), element('p', 'recap__phrase', t.phrase), retour);
    zone.vide.hidden = false;
  }

  function majEntete(validation, totaux) {
    const lignes = validation.lignes.length;
    zone.sousTitre.textContent = remplirGabarit(textes.sousTitre, {
      lignes,
      articles: totaux.articles,
      motLignes: mot(textes.mots, lignes, 'ligne'),
      motArticles: mot(textes.mots, totaux.articles, 'article'),
    });
    const details = [...zone.liste.querySelectorAll('.ligne__details')];
    zone.deplier.hidden = details.length === 0 || confirme;
    majDeplier();
  }

  function majDeplier() {
    const details = [...zone.liste.querySelectorAll('.ligne__details')];
    const tous = details.length > 0 && details.every((d) => d.open);
    zone.deplier.textContent = tous ? textes.replierTout : textes.deplierTout;
    zone.deplier.setAttribute('aria-expanded', tous ? 'true' : 'false');
  }

  function majResponsabilite(validation) {
    if (confirme) return;
    const besoin = besoinConfirmation(validation.lignes);
    const surMesure = totauxPanier(validation.lignes).lignesSurMesure;
    zone.responsabilite.hidden = !besoin;
    if (!besoin) zone.caseCochee.checked = false;
    zone.phrase.textContent = remplirGabarit(surMesure === 1 ? textes.responsabilite.phraseSingulier : textes.responsabilite.phrasePluriel, { n: surMesure });
  }

  function majTotal(validation, totaux) {
    if (confirme) return;
    zone.total.hidden = validation.lignes.length === 0;
    zone.paiement.hidden = validation.lignes.length === 0;
    const lignes = [
      [remplirGabarit(textes.total.materiel, { n: totaux.articles, mot: mot(textes.mots, totaux.articles, 'article') }), totaux.materiel, false],
    ];
    if (totaux.articlesPose > 0) {
      lignes.push([remplirGabarit(textes.total.pose, { n: totaux.articlesPose, mot: mot(textes.mots, totaux.articlesPose, 'article') }), totaux.pose, false]);
    }
    lignes.push([modes.lignes.total, totaux.total, true]);
    zone.totalLignes.replaceChildren(...lignes.flatMap(([libelle, montant, fort]) => [
      element('dt', fort ? 'total__ligne-total' : '', libelle),
      element('dd', fort ? 'total__ligne-total' : '', formaterPrix(montant)),
    ]));
    const delais = [];
    if (totaux.delaiLivraison) delais.push(element('p', 'total__delai', remplirGabarit(textes.total.livraison, { delai: totaux.delaiLivraison })));
    if (totaux.delaiPose) delais.push(element('p', 'total__delai', remplirGabarit(textes.total.intervention, { delai: totaux.delaiPose })));
    zone.totalDelais.replaceChildren(...delais);
  }

  // « Valider ma commande » : jamais disabled ; aria-disabled et classe d'action (ambre) seulement à l'état actif.
  function majValidation(validation) {
    if (confirme) return;
    const besoin = besoinConfirmation(validation.lignes);
    const actif = peutValider({ caseCochee: zone.caseCochee.checked, besoinConfirmation: besoin, valides: validation.valides, invalides: validation.invalides });
    zone.valider.setAttribute('aria-disabled', actif ? 'false' : 'true');
    zone.valider.classList.toggle('bouton--action', actif);
    zone.valider.classList.toggle('bouton--secondaire', !actif);
    let aide = '';
    if (!actif) aide = validation.invalides > 0 ? textes.total.aideInvalide : textes.total.aideCase;
    zone.totalEtat.textContent = aide;
  }

  function rendre({ focus = null } = {}) {
    const validation = validerPanier(etat, produits);
    const totaux = totauxPanier(validation.lignes);
    zone.liste.replaceChildren(zone.gabaritLigne, ...validation.lignes.map(construireLigne));
    zone.vide.hidden = true;
    const plein = validation.lignes.length > 0;
    zone.entete.hidden = !plein;
    if (plein) {
      majEntete(validation, totaux);
    } else if (!modifie && statutInitial === 'illisible') {
      afficherVide('illisible', liens.diagnostic);
    } else {
      afficherVide('vide', liens.diagnostic);
    }
    majResponsabilite(validation);
    majTotal(validation, totaux);
    majValidation(validation);
    restaurerFocus(focus);
    return validation;
  }

  // Modification de la liste : écriture en session, annonce, nouvel état d'annulation.
  function appliquer(nouvelEtat, { annonce, annulable = null, focus = null }) {
    etat = nouvelEtat;
    modifie = true;
    annulation = annulable;
    enregistrer(etat);
    rendre({ focus });
    if (annonce) annoncer(annonce, annulable !== null);
  }

  // ----- événements -----
  zone.liste.addEventListener('click', (e) => {
    if (confirme) return;
    const li = e.target.closest('.ligne');
    if (!li) return;
    const cle = li.dataset.cle;
    const entree = validerPanier(etat, produits).lignes.find((l) => l.cle === cle);
    if (!entree) return;
    const bouton = e.target.closest('button');
    if (!bouton) return;
    const titre = titreDe(entree.ligne);
    if (bouton.matches('[data-quantite]')) {
      if (bouton.getAttribute('aria-disabled') === 'true') return;
      const delta = bouton.dataset.quantite === 'plus' ? 1 : -1;
      const { etat: suivant, quantite } = changerQuantite(etat, cle, delta, limites);
      appliquer(suivant, {
        annonce: remplirGabarit(textes.annonces.quantite, { titre, quantite }),
        focus: { cle, selecteur: `[data-quantite="${bouton.dataset.quantite}"]` },
      });
    } else if (bouton.matches('.ligne__retirer')) {
      const { etat: suivant, retiree, index } = retirerLigne(etat, cle);
      if (!retiree) return;
      appliquer(suivant, { annonce: remplirGabarit(textes.annonces.retiree, { titre }), annulable: { ligne: retiree, index } });
      zone.etat.querySelector('.recap__annuler')?.focus();
    } else if (bouton.matches('.ligne__reprendre, .ligne__reprendre-seul')) {
      reprendre(entree.ligne);
    }
  });

  zone.liste.addEventListener('toggle', (e) => {
    const li = e.target.closest('.ligne');
    if (!li) return;
    if (e.target.open) ouverts.add(li.dataset.cle);
    else ouverts.delete(li.dataset.cle);
    majDeplier();
  }, true);

  zone.deplier.addEventListener('click', () => {
    const details = [...zone.liste.querySelectorAll('.ligne__details')];
    const ouvrir = !details.every((d) => d.open);
    for (const d of details) d.open = ouvrir;
    majDeplier();
  });

  zone.etat.addEventListener('click', (e) => {
    if (!e.target.closest('.recap__annuler') || annulation === null) return;
    const { ligne, index } = annulation;
    const { etat: suivant, resultat } = restaurerLigne(etat, ligne, index, limites);
    const titre = titreDe(ligne);
    if (resultat === 'pleine') {
      annulation = null;
      annoncer(remplirGabarit(textes.annonces.pleine, { titre, max: limites.lignesMax }));
      return;
    }
    appliquer(suivant, { annonce: remplirGabarit(textes.annonces.restauree, { titre }) });
    const cle = validerPanier(suivant, produits).lignes.find((l) => l.ligne.produit === ligne.produit && l.ligne.mode === ligne.mode
      && JSON.stringify(l.ligne.cotes) === JSON.stringify(ligne.cotes))?.cle;
    if (cle) restaurerFocus({ cle, selecteur: '.ligne__retirer' });
  });

  // Reprise à la fiche : produit, mode et cotes de la ligne sont écrits en session (jamais dans l'URL), puis la fiche s'ouvre.
  function reprendre(ligne) {
    ecrireSession(CLE_PRODUIT, ligne.produit);
    ecrireSession(CLE_MODE, ligne.mode);
    const { cotes } = ligne;
    if (cotes && ['largeur', 'hauteur', 'tolerance'].every((nom) => Number.isInteger(cotes[nom]))) {
      ecrireSession(CLE_COTES, JSON.stringify({
        produit: ligne.produit, largeur: String(cotes.largeur), hauteur: String(cotes.hauteur), tolerance: String(cotes.tolerance),
      }));
    }
    window.location.assign(new URL(liens.produit, window.location.href));
  }

  zone.voirCotes.addEventListener('click', () => {
    const details = [...zone.liste.querySelectorAll('.ligne')].filter((li) => par(li, '.ligne__liste-cotes')).map((li) => par(li, '.ligne__details'));
    for (const d of details) d.open = true;
    majDeplier();
    par(details[0]?.closest('.ligne') ?? zone.liste, '.ligne__resume')?.focus();
  });

  zone.caseCochee.addEventListener('change', () => majValidation(validerPanier(etat, produits)));

  zone.valider.addEventListener('click', () => {
    if (confirme) return;
    const validation = validerPanier(etat, produits);
    const besoin = besoinConfirmation(validation.lignes);
    if (!peutValider({ caseCochee: zone.caseCochee.checked, besoinConfirmation: besoin, valides: validation.valides, invalides: validation.invalides })) {
      const aide = validation.invalides > 0 ? textes.total.aideInvalide : textes.total.aideCase;
      zone.totalEtat.textContent = '';
      requestAnimationFrame(() => { zone.totalEtat.textContent = aide; });
      if (validation.invalides === 0 && besoin) zone.caseCochee.focus();
      return;
    }
    const retour = element('a', 'bouton bouton--secondaire total__retour', textes.total.confirmation.lien);
    retour.setAttribute('href', liens.accueil);
    zone.totalEtat.replaceChildren(
      element('p', 'total__confirmation-titre', textes.total.confirmation.titre),
      element('p', 'total__confirmation-numero', textes.total.confirmation.numero),
      element('p', 'total__confirmation-message', textes.total.confirmation.message),
      retour,
    );
    zone.totalEtat.classList.add('total__etat--confirme');
    zone.valider.hidden = true;
    zone.valider.setAttribute('tabindex', '-1');
    zone.caseCochee.disabled = true;
    supprimerSession(CLE_PANIER);
    notifier();
    confirme = true;
    annulation = null;
    zone.etat.replaceChildren();
    rendre();
    zone.totalEtat.focus();
  });

  rendre();
  zone.paiement.hidden = etat.lignes.length === 0;
  document.getElementById('recap').setAttribute('aria-busy', 'false');
}

// Retour sur la page depuis le cache de navigation : la page est rechargée (panier relu, case décochée).
function recharger() {
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    repererEtape(donnees.produit.panier);
    demarrerPanier(donnees);
    recharger();
  });
}
