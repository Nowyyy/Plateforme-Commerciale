// Demande de SAV (écran 10) : lit le contexte (compte, sans-compte, achat-manquant, acces-requis), puis branche le formulaire simulé
// (formulaire.js + sav-logique.js). Rien n'est envoyé ni enregistré : aucune requête, aucune écriture de session, aucune donnée dans l'URL.
// La confirmation ne répète aucune saisie : seuls le titre du produit et l'identifiant de la commande, tirés des données, y figurent.
import { donneesPretes } from './rendu.js';
import { remplirGabarit, formaterMm } from './cotes-logique.js';
import { brancherFormulaire } from './formulaire.js';
import { construireResume } from './pro-logique.js';
import { formaterDate, MODE_POSE } from './compte-logique.js';
import { resoudreContexte, validerDemande, coordonneesInitiales } from './sav-logique.js';
import { estConnecte, lireAchat, lireAccesSav } from './compte-session.js';

// Contexte courant, d'après la session (lecture seule) et les commandes de data/compte.json.
export function contexteCourant(donnees) {
  return resoudreContexte({ connecte: estConnecte(), achat: lireAchat(), acces: lireAccesSav() }, donnees.compte.commandes);
}

// « Demande concernant : {titre} (commande {id}) » : construit à partir des données de la commande seulement, jamais d'une saisie.
export function texteConcerne(gabarit, commande, index) {
  const ligne = Array.isArray(commande?.lignes) ? commande.lignes[index] : undefined;
  return remplirGabarit(gabarit, { titre: String(ligne?.titre ?? ''), id: String(commande?.id ?? '') });
}

// Éléments du fil d'Ariane de la variante : { texte, adresse? } ; le dernier n'a pas d'adresse.
export function elementsFil(modele, liens, id) {
  return modele.map((element) => ({
    texte: remplirGabarit(element.texte, { id }),
    adresse: element.lien !== undefined && typeof liens[element.lien] === 'string' ? liens[element.lien] : null,
  }));
}

function afficherFil(racine, donnees, contexte) {
  const { compte, site } = donnees;
  const modele = contexte.etat === 'compte' ? compte.sav.demande.fil.compte : compte.sav.demande.fil.sansCompte;
  const elements = elementsFil(modele, site.liens, contexte.commande.id);
  const liste = racine.querySelector('.fil__liste');
  liste.replaceChildren(...elements.map((element, i) => {
    const li = racine.createElement('li');
    if (element.adresse !== null && i < elements.length - 1) {
      const a = racine.createElement('a');
      a.setAttribute('href', element.adresse);
      a.textContent = element.texte;
      li.append(a);
    } else {
      const span = racine.createElement('span');
      if (i === elements.length - 1) {
        span.className = 'fil__courant';
        span.setAttribute('aria-current', 'page');
      }
      span.textContent = element.texte;
      li.append(span);
    }
    return li;
  }));
}

// État sans commande : le formulaire est remplacé par un message (h2, phrase, liens).
function afficherEtat(racine, textes, liens) {
  const [principal, secondaire] = racine.querySelectorAll('[data-etat-lien], [data-etat-lien-2]');
  racine.querySelector('[data-etat-titre]').textContent = textes.titre;
  racine.querySelector('[data-etat-phrase]').textContent = textes.phrase;
  principal.textContent = textes.lien;
  principal.setAttribute('href', liens.principal);
  if (liens.secondaire) {
    secondaire.textContent = textes.lienConnexion;
    secondaire.setAttribute('href', liens.secondaire);
    secondaire.hidden = false;
  }
  racine.querySelector('[data-corps]').hidden = true;
  racine.querySelector('[data-etat]').hidden = false;
  racine.querySelector('.fil').hidden = true;
}

function remplirLigne(gabarit, ligne, index, compte, unique) {
  const t = compte.pages.achat.ligne;
  const label = gabarit.content.firstElementChild.cloneNode(true);
  const radio = label.querySelector('input');
  radio.value = String(index);
  if (unique) radio.setAttribute('checked', '');
  label.querySelector('use').setAttribute('href', `#${ligne.icone}`);
  label.querySelector('.sav__titre').textContent = ligne.titre;
  label.querySelector('.sav__reference').textContent = remplirGabarit(t.reference, { reference: ligne.reference });
  label.querySelector('.sav__mode').textContent = remplirGabarit(t.mode, { mode: compte.commande.modes[ligne.mode === MODE_POSE ? 'pose' : 'diy'] });
  label.querySelector('.sav__cotes').textContent = ligne.cotes
    ? remplirGabarit(t.surMesure, { largeur: formaterMm(ligne.cotes.largeur), hauteur: formaterMm(ligne.cotes.hauteur) })
    : t.sansMesure;
  label.querySelector('.sav__quantite').textContent = `${t.quantite} ${ligne.quantite}`;
  return label;
}

const ANCRES = {
  ligne: 'ligne', motif: 'motif', description: 'description', prenom: 'prenom', nom: 'nom', email: 'email', telephone: 'telephone',
  adresse: 'adresse', codePostal: 'code-postal', ville: 'ville', consentement: 'consentement',
};
const COORDONNEES = ['prenom', 'nom', 'email', 'telephone', 'adresse', 'codePostal', 'ville'];

function brancher(racine, donnees, contexte) {
  const { compte } = donnees;
  const { commande } = contexte;
  const controle = (id) => racine.getElementById(id);
  const formulaire = racine.querySelector('.formulaire');
  const radios = (groupe) => [...controle(groupe).querySelectorAll('input[type="radio"]')];

  racine.querySelector('[data-commande]').textContent = remplirGabarit(compte.commande.numero, { id: commande.id });
  racine.querySelector('[data-commande-date]').textContent = remplirGabarit(compte.sav.demande.produit.date, { date: formaterDate(commande.date) });

  const gabarit = racine.querySelector('template[data-gabarit="ligne-sav"]');
  const conteneur = racine.querySelector('[data-lignes]');
  const unique = commande.lignes.length === 1;
  conteneur.replaceChildren(gabarit, ...commande.lignes.map((ligne, i) => remplirLigne(gabarit, ligne, i, compte, unique)));

  // Les radios d'un groupe partagent un nom posé ici (jamais dans le HTML) pour que les flèches parcourent le groupe ;
  // le formulaire n'est jamais soumis et aucun nom n'est lu.
  const motifs = radios('motif');
  for (const radio of motifs) {
    radio.value = radio.closest('label').dataset.id;
    radio.name = 'sav-motif';
  }
  for (const radio of radios('ligne')) radio.name = 'sav-ligne';

  const initiales = coordonneesInitiales(contexte.etat, compte.client);
  const valeursInitiales = COORDONNEES.map((champ) => ({ controle: controle(ANCRES[champ]), valeur: initiales[champ] }));
  for (const { controle: element, valeur } of valeursInitiales) element.value = valeur;

  const champs = {};
  for (const [champ, ancre] of Object.entries(ANCRES)) {
    const groupe = champ === 'ligne' || champ === 'motif';
    champs[champ] = {
      ancre,
      zone: groupe ? controle(ancre) : controle(ancre).closest('.formulaire__champ'),
      erreur: controle(`erreur-${ancre}`),
      controles: () => [controle(ancre)],
    };
    if (groupe) champs[champ].focus = () => radios(ancre)[0];
  }

  const choisi = (groupe) => radios(groupe).find((r) => r.checked)?.value ?? '';
  const lire = () => ({
    ligne: choisi('ligne'),
    motif: choisi('motif'),
    ...Object.fromEntries([...COORDONNEES, 'description'].map((champ) => [champ, controle(ANCRES[champ]).value])),
    consentement: controle('consentement').checked,
  });

  const carte = racine.querySelector('[data-carte-formulaire]');
  const confirmation = racine.querySelector('[data-role="confirmation"]');
  const region = confirmation.querySelector('[data-confirmation]');
  let derniereLigne = null;

  for (const lien of confirmation.querySelectorAll('[data-variante]')) lien.hidden = lien.getAttribute('data-variante') !== contexte.etat;

  brancherFormulaire({
    formulaire,
    champs,
    lire,
    valider: (saisie) => {
      const resultat = validerDemande(saisie, { nbLignes: commande.lignes.length, motifs: compte.motifs }, compte.limites);
      derniereLigne = resultat.valeurs.ligne;
      return resultat;
    },
    texte: (champ, raison) => compte.sav.messages[champ]?.[raison] ?? compte.sav.messages.repli,
    resume: {
      titre: (n) => remplirGabarit(n === 1 ? compte.formulaire.resume.singulier : compte.formulaire.resume.pluriel, { n }),
      liens: (erreurs) => construireResume(erreurs, compte.sav.resume.liens),
    },
    valeursInitiales,
    // Champs déjà réinitialisés : la confirmation ne répète aucune saisie.
    apres: () => {
      confirmation.querySelector('[data-concerne]').textContent = texteConcerne(compte.sav.confirmation.concerne, commande, derniereLigne);
      carte.hidden = true;
      confirmation.hidden = false;
      region.focus();
    },
  });
}

export function initialiser(donnees, racine = document) {
  const { compte, site } = donnees;
  const contexte = contexteCourant(donnees);
  racine.documentElement.dataset.contexte = contexte.etat;
  if (contexte.etat === 'achat-manquant') {
    afficherEtat(racine, compte.sav.etats.achatManquant, { principal: site.liens.achats });
  } else if (contexte.etat === 'acces-requis') {
    afficherEtat(racine, compte.sav.etats.accesRequis, { principal: site.liens.savAcces, secondaire: site.liens.connexion });
  } else {
    afficherFil(racine, donnees, contexte);
    brancher(racine, donnees, contexte);
  }
  racine.documentElement.dataset.formulaire = 'pret';
  return contexte;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
