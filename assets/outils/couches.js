/* global document, window, Image */
// Page d'outil du lot 4b-C : les requêtes vers les services tiers partent après un clic, l'une après l'autre ; rien n'est enregistré.
import {
  FAMILLES, JUGEMENTS, extraireCatalogue, grouperParFamille, filtrerCatalogue, lieuPourEntree, choisirSelection,
  urlGetMapCalque, urlTuileOsmLieu, urlApiGaspar, urlApiRga, aplatirJson, formaterRapportCouches,
} from './couches-logique.js';
import { urlWmsCapabilities, classerEchec } from './faisabilite-logique.js';

const DELAI_FETCH_MS = 10000;
const DELAI_IMAGE_MS = 15000;
const MAX_COUCHES = 6;
const POLITIQUE = 'strict-origin-when-cross-origin';
const HOTE = 'www.georisques.gouv.fr';

const LIEUX_API = {
  paris: { lat: 48.8566, lon: 2.3522 },
  toulouse: { lat: 43.6047, lon: 1.4442 },
};

const ETATS = {
  'en-cours': { icone: '…', texte: 'En cours' },
  ok: { icone: '✓', texte: 'OK' },
  http: { icone: '!', texte: 'Réponse HTTP en erreur ou illisible' },
  bloque: { icone: '✕', texte: 'Bloquée' },
  delai: { icone: '⏱', texte: 'Délai dépassé' },
  'image-echec': { icone: '✕', texte: 'Image non chargée' },
};

const $ = (id) => document.getElementById(id);
const boutons = [];
const selection = new Set();
let occupe = false;
let catalogue = [];
let etatCatalogue = { etat: 'non-lu', detail: '', nombre: 0 };
let cartes = [];
let lecturesApi = [];

// ---------- affichage commun ----------

function marque(etat, detail) {
  const def = ETATS[etat];
  const span = document.createElement('span');
  span.className = `etat etat--${etat}`;
  const icone = document.createElement('span');
  icone.className = 'etat__icone';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = def.icone;
  const texte = document.createElement('span');
  texte.textContent = detail ? `${def.texte} : ${detail}` : def.texte;
  span.append(icone, texte);
  return span;
}

function creerBouton(libelle, conteneur, action) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'bouton';
  b.textContent = libelle;
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') !== 'true') action();
  });
  conteneur.append(b);
  boutons.push(b);
  return b;
}

function majBoutons() {
  for (const b of boutons) {
    const inactif = occupe || (b === boutonGalerie && selection.size === 0);
    if (inactif) b.setAttribute('aria-disabled', 'true');
    else b.removeAttribute('aria-disabled');
  }
}

async function exclusif(tache) {
  if (occupe) return;
  occupe = true;
  majBoutons();
  try {
    await tache();
  } finally {
    occupe = false;
    majBoutons();
  }
}

const secondes = (ms) => `${Math.round(ms)} ms`;

// ---------- réseau ----------

async function lireTexte(url) {
  const debut = performance.now();
  const controle = new AbortController();
  let delaiDepasse = false;
  const minuteur = setTimeout(() => { delaiDepasse = true; controle.abort(); }, DELAI_FETCH_MS);
  try {
    const reponse = await fetch(url, {
      mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: POLITIQUE, signal: controle.signal,
    });
    const texte = await reponse.text().catch(() => '');
    const ms = performance.now() - debut;
    if (delaiDepasse) return { etat: 'delai', ms, detail: `plus de ${DELAI_FETCH_MS / 1000} s`, texte: '' };
    return { etat: reponse.ok ? 'ok' : 'http', statut: reponse.status, ms, texte, detail: `HTTP ${reponse.status}` };
  } catch (erreur) {
    const ms = performance.now() - debut;
    const classe = classerEchec(erreur, { delaiDepasse });
    if (classe === 'delai') return { etat: 'delai', ms, detail: `plus de ${DELAI_FETCH_MS / 1000} s`, texte: '' };
    return { etat: 'bloque', ms, detail: classe === 'bloque' ? 'TypeError : réseau, CORS ou bloqueur' : 'erreur inattendue', texte: '' };
  } finally {
    clearTimeout(minuteur);
  }
}

function chargerImage(image, url) {
  return new Promise((resolve) => {
    const debut = performance.now();
    let fini = false;
    const terminer = (etat, detail) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      image.onload = null;
      image.onerror = null;
      resolve({ etat, ms: performance.now() - debut, detail });
    };
    const minuteur = setTimeout(() => terminer('delai', `plus de ${DELAI_IMAGE_MS / 1000} s`), DELAI_IMAGE_MS);
    image.onload = () => (image.naturalWidth > 0 ? terminer('ok', '') : terminer('image-echec', 'image sans dimension'));
    image.onerror = () => terminer('image-echec', 'image non chargée');
    image.referrerPolicy = POLITIQUE;
    image.src = url;
  });
}

// ---------- catalogue ----------

function ligneCouche(entree) {
  const li = document.createElement('li');
  const etiquette = document.createElement('label');
  etiquette.className = 'couche';
  const case_ = document.createElement('input');
  case_.type = 'checkbox';
  case_.dataset.nom = entree.nom;
  case_.checked = selection.has(entree.nom);
  case_.addEventListener('change', () => basculer(entree.nom, case_));
  const texte = document.createElement('span');
  texte.className = 'couche__texte';
  const nom = document.createElement('strong');
  nom.textContent = entree.nom;
  const titre = document.createElement('span');
  titre.textContent = entree.titre;
  texte.append(nom, titre);
  if (entree.resume) {
    const resume = document.createElement('span');
    resume.className = 'couche__resume';
    resume.textContent = entree.resume;
    texte.append(resume);
  }
  etiquette.append(case_, texte);
  li.append(etiquette);
  return li;
}

function synchroniser() {
  for (const c of document.querySelectorAll('input[data-nom]')) c.checked = selection.has(c.dataset.nom);
  $('etat-selection').textContent = `${selection.size} couche${selection.size > 1 ? 's' : ''} cochée${selection.size > 1 ? 's' : ''} sur ${MAX_COUCHES} au plus.`;
  majBoutons();
}

function basculer(nom, case_) {
  if (!case_.checked) {
    selection.delete(nom);
    synchroniser();
    return;
  }
  const { retenus, refuses } = choisirSelection([...selection, nom], catalogue, MAX_COUCHES);
  if (refuses.length > 0 || !retenus.includes(nom)) {
    case_.checked = false;
    synchroniser();
    $('etat-selection').textContent = `Six couches au plus : décochez une couche avant d'en cocher une autre (« ${nom} » refusée).`;
    return;
  }
  selection.add(nom);
  synchroniser();
}

function afficherRecherche() {
  const trouvees = filtrerCatalogue(catalogue, $('recherche').value);
  $('liste-tout').replaceChildren(...trouvees.map(ligneCouche));
  $('etat-recherche').textContent = `${trouvees.length} couche${trouvees.length > 1 ? 's' : ''} affichée${trouvees.length > 1 ? 's' : ''} sur ${catalogue.length}.`;
}

function afficherCatalogue() {
  const groupes = grouperParFamille(catalogue);
  const sections = Object.entries(FAMILLES).map(([cle, famille]) => {
    const details = document.createElement('details');
    details.className = 'famille';
    details.dataset.famille = cle;
    const resume = document.createElement('summary');
    resume.textContent = `${famille.libelle} (${groupes[cle].length})`;
    details.append(resume);
    if (groupes[cle].length === 0) {
      const vide = document.createElement('p');
      vide.className = 'aide';
      vide.textContent = 'Aucune couche reconnue par les motifs de cette famille : utilisez la recherche libre.';
      details.append(vide);
    }
    const ul = document.createElement('ul');
    ul.className = 'couches';
    ul.replaceChildren(...groupes[cle].map(ligneCouche));
    details.append(ul);
    return details;
  });
  $('familles').replaceChildren(...sections);
  $('titre-tout').textContent = `Tout le catalogue (${catalogue.length})`;
  $('recherche').value = '';
  afficherRecherche();
  synchroniser();
  $('catalogue').hidden = false;
}

async function lireCatalogue() {
  const statut = $('etat-catalogue');
  statut.replaceChildren(marque('en-cours', 'lecture du catalogue'));
  const r = await lireTexte(urlWmsCapabilities(HOTE));
  const lues = r.etat === 'ok' ? extraireCatalogue(r.texte) : [];
  if (r.etat !== 'ok' || lues.length === 0) {
    const etat = r.etat === 'ok' ? 'http' : r.etat;
    const detail = r.etat === 'ok' ? 'aucune couche lisible dans la réponse' : r.detail;
    etatCatalogue = { etat, detail: `${detail}, ${secondes(r.ms)}`, nombre: 0 };
    statut.replaceChildren(marque(etat, etatCatalogue.detail));
    return;
  }
  catalogue = lues;
  selection.clear();
  etatCatalogue = { etat: 'ok', detail: secondes(r.ms), nombre: lues.length };
  const ok = marque('ok');
  ok.lastChild.textContent = `${lues.length} couche${lues.length > 1 ? 's' : ''} lue${lues.length > 1 ? 's' : ''} en ${secondes(r.ms)}`;
  statut.replaceChildren(ok);
  afficherCatalogue();
  $('titre-catalogue').focus();
}

// ---------- galerie ----------

function creerCarte(entree, lieu, index) {
  const article = document.createElement('article');
  article.className = 'carte';
  const titre = document.createElement('h3');
  titre.textContent = entree.nom;
  const sousTitre = document.createElement('p');
  sousTitre.textContent = entree.titre || 'Titre absent';
  const info = document.createElement('p');
  info.className = 'carte__info';
  info.textContent = `Lieu : ${lieu.libelle} (zoom ${lieu.zoom})`;
  const mesures = document.createElement('p');
  mesures.className = 'carte__info';
  const etat = document.createElement('p');
  etat.className = 'carte__etat';
  etat.append(marque('en-cours'));
  const tuile = document.createElement('div');
  tuile.className = 'tuile';
  const fond = document.createElement('img');
  fond.className = 'tuile__img';
  fond.width = 256;
  fond.height = 256;
  fond.loading = 'eager';
  fond.alt = `Fond OpenStreetMap de ${lieu.libelle}, tuile de 256 pixels au zoom ${lieu.zoom}`;
  const calque = document.createElement('img');
  calque.className = 'tuile__img';
  calque.width = 256;
  calque.height = 256;
  calque.loading = 'eager';
  calque.hidden = true;
  calque.alt = `Calque Géorisques ${entree.nom}${entree.titre ? ` (${entree.titre})` : ''} superposé au fond de carte de ${lieu.libelle}`;
  tuile.append(fond, calque);
  const jeu = document.createElement('fieldset');
  jeu.className = 'jugement';
  const legende = document.createElement('legend');
  legende.textContent = 'Votre jugement';
  jeu.append(legende);
  for (const [code, libelle] of Object.entries(JUGEMENTS)) {
    const etiquette = document.createElement('label');
    etiquette.className = 'jugement__choix';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `jugement-${index}`;
    radio.value = code;
    etiquette.append(radio, document.createTextNode(libelle));
    jeu.append(etiquette);
  }
  article.append(titre, sousTitre, info, mesures, etat, tuile, jeu);
  return { article, mesures, etat, fond, calque, jeu };
}

async function afficherGalerie() {
  const retenues = catalogue.filter((e) => selection.has(e.nom));
  if (retenues.length === 0) return;
  $('galerie-zone').hidden = false;
  $('galerie').replaceChildren();
  cartes = [];
  const statut = $('etat-galerie');
  const jeton = performance.now().toFixed(0);
  let index = 0;
  for (const entree of retenues) {
    index += 1;
    statut.textContent = `Couche ${index} sur ${retenues.length} : ${entree.nom} (environ 15 secondes au plus par couche).`;
    const lieu = lieuPourEntree(entree);
    const carte = creerCarte(entree, lieu, index);
    $('galerie').append(carte.article);
    const base = urlGetMapCalque({ couche: entree.nom, lieu });
    carte.fond.src = urlTuileOsmLieu(lieu);
    const premier = await chargerImage(new Image(), `${base}&essai=${jeton}-${index}-1`);
    const second = await chargerImage(carte.calque, `${base}&essai=${jeton}-${index}-2`);
    const reussi = premier.etat === 'ok' && second.etat === 'ok';
    const detail = [premier, second].map((m) => m.detail).filter(Boolean)[0] ?? '';
    carte.calque.hidden = second.etat !== 'ok';
    carte.mesures.textContent = `Durées : ${premier.etat === 'ok' ? secondes(premier.ms) : '-'} ; ${second.etat === 'ok' ? secondes(second.ms) : '-'}`;
    carte.etat.replaceChildren(reussi ? marque('ok') : marque('image-echec', detail));
    cartes.push({
      entree, lieu, jeu: carte.jeu, etat: reussi ? 'ok' : 'image-echec',
      durees: [premier, second].filter((m) => m.etat === 'ok').map((m) => m.ms),
    });
  }
  statut.textContent = `Galerie terminée : ${retenues.length} couche${retenues.length > 1 ? 's' : ''}. Choisissez un jugement pour chaque tuile.`;
  $('titre-galerie').focus();
}

// ---------- API ----------

async function lireApi() {
  lecturesApi = [];
  const sortie = $('resultats-api');
  sortie.replaceChildren();
  const requetes = [
    { libelle: 'Risques de la commune (Gaspar), Paris', url: urlApiGaspar(LIEUX_API.paris) },
    { libelle: 'Retrait-gonflement des argiles (RGA), Toulouse', url: urlApiRga(LIEUX_API.toulouse) },
  ];
  for (const [i, requete] of requetes.entries()) {
    $('etat-api').textContent = `Lecture ${i + 1} sur ${requetes.length} : ${requete.libelle}`;
    const r = await lireTexte(requete.url);
    let lignes = [];
    let etat = r.etat;
    let detail = r.detail;
    if (r.texte) {
      try {
        lignes = aplatirJson(JSON.parse(r.texte), { maxLignes: 40, maxLongueur: 80 });
      } catch {
        lignes = [`(contenu non JSON) ${r.texte.slice(0, 80)}`];
        if (etat === 'ok') { etat = 'http'; detail = 'JSON illisible'; }
      }
    }
    lecturesApi.push({ libelle: requete.libelle, etat, statut: r.statut ? `HTTP ${r.statut}` : '', ms: r.ms, lignes });
    const bloc = document.createElement('div');
    bloc.className = 'api';
    const titre = document.createElement('h3');
    titre.textContent = requete.libelle;
    const etatP = document.createElement('p');
    etatP.append(marque(etat, `${detail}, ${secondes(r.ms)}`));
    bloc.append(titre, etatP);
    if (lignes.length > 0) {
      const pre = document.createElement('pre');
      pre.className = 'lignes';
      pre.textContent = lignes.join('\n');
      bloc.append(pre);
    }
    sortie.append(bloc);
  }
  $('etat-api').textContent = 'Lecture de l\'API terminée.';
}

// ---------- rapport ----------

function genererRapport() {
  const jugements = cartes.map((c) => c.jeu.querySelector('input:checked')?.value ?? '');
  $('texte-rapport').value = formaterRapportCouches({
    date: new Date().toISOString(),
    origine: window.location.origin,
    navigateur: navigator.userAgent,
    catalogue: etatCatalogue,
    familles: grouperParFamille(catalogue),
    cartes: cartes.map((c, i) => ({
      nom: c.entree.nom, titre: c.entree.titre, lieu: c.lieu.libelle, durees: c.durees, etat: c.etat, jugement: jugements[i],
    })),
    api: lecturesApi,
  });
  $('copie-statut').textContent = 'Rapport généré : copiez-le avec le bouton ci-dessus.';
}

async function copierRapport() {
  const zone = $('texte-rapport');
  const statut = $('copie-statut');
  if (!zone.value) {
    statut.textContent = "Générez d'abord le rapport.";
    return;
  }
  try {
    await navigator.clipboard.writeText(zone.value);
    statut.textContent = 'Rapport copié.';
  } catch {
    zone.focus();
    zone.select();
    statut.textContent = 'Copie automatique impossible. Copiez-le manuellement : le texte est sélectionné.';
  }
}

// ---------- démarrage ----------

let boutonGalerie = null;
const boutonCatalogue = $('lire-catalogue');
boutons.push(boutonCatalogue);
boutonCatalogue.addEventListener('click', () => {
  if (boutonCatalogue.getAttribute('aria-disabled') !== 'true') exclusif(lireCatalogue);
});
boutonGalerie = creerBouton("Afficher les tuiles d'essai", $('actions-galerie'), () => exclusif(afficherGalerie));
creerBouton("Lire l'API Géorisques", $('actions-api'), () => exclusif(lireApi));
creerBouton('Générer le rapport', $('actions-rapport'), genererRapport);
creerBouton('Copier le rapport', $('actions-rapport'), copierRapport);
$('recherche').addEventListener('input', afficherRecherche);
majBoutons();
$('contenu').hidden = false;
