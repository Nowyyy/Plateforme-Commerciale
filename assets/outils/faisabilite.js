/* global document, window, Image */
// Page d'outil du lot 4b : les requêtes vers les services tiers partent après un clic, une sonde à la fois ; rien n'est enregistré.
import {
  SONDES, urlDeSonde, analyserGeocodage, extraireCouches, choisirCouches,
  classerEchec, evaluerSonde, conclure, formaterRapport, lignesVerdicts,
} from './faisabilite-logique.js';

const DELAI_MS = 10000;
const POLITIQUE = 'strict-origin-when-cross-origin';

const ETATS = {
  'a-lancer': { icone: '–', texte: 'À lancer' },
  'en-cours': { icone: '…', texte: 'En cours' },
  ok: { icone: '✓', texte: 'OK' },
  http: { icone: '!', texte: 'Réponse HTTP lisible' },
  bloque: { icone: '✕', texte: 'Bloquée' },
  delai: { icone: '⏱', texte: 'Délai dépassé' },
  'image-echec': { icone: '✕', texte: 'Image non chargée' },
  'non-testee': { icone: '–', texte: 'Non testée' },
};

const $ = (id) => document.getElementById(id);
const bouton = $('lancer');
const progression = $('progression');
const corps = $('sondes');
const lignes = new Map();
let enCours = false;
let contexte = null;
let resultats = [];
const boutons = [bouton];

function construireTable() {
  SONDES.forEach((sonde, index) => {
    const tr = document.createElement('tr');
    tr.dataset.sonde = sonde.id;
    const nom = document.createElement('th');
    nom.scope = 'row';
    nom.textContent = `${index + 1}. ${sonde.libelle}`;
    const etat = document.createElement('td');
    const duree = document.createElement('td');
    const detail = document.createElement('td');
    tr.append(nom, etat, duree, detail);
    corps.append(tr);
    lignes.set(sonde.id, { tr, etat, duree, detail });
  });
}

function afficher(id, etat, ms = null, detail = '') {
  const l = lignes.get(id);
  const def = ETATS[etat];
  l.tr.dataset.etat = etat;
  const marque = document.createElement('span');
  marque.className = `etat etat--${etat}`;
  const icone = document.createElement('span');
  icone.className = 'etat__icone';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = def.icone;
  const texte = document.createElement('span');
  texte.textContent = def.texte;
  marque.append(icone, texte);
  l.etat.replaceChildren(marque);
  l.duree.textContent = ms === null ? '' : `${ms} ms`;
  l.detail.textContent = detail;
}

function reinitialiser() {
  for (const s of SONDES) afficher(s.id, 'a-lancer');
  $('conclusions').hidden = true;
  $('rapport').hidden = true;
  $('copie-statut').textContent = '';
}

// ---------- sondes ----------

async function sondeFetch(id, url, analyser) {
  const debut = performance.now();
  const controle = new AbortController();
  let delaiDepasse = false;
  const minuteur = setTimeout(() => { delaiDepasse = true; controle.abort(); }, DELAI_MS);
  try {
    const reponse = await fetch(url, {
      mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: POLITIQUE, signal: controle.signal,
    });
    const texte = await reponse.text().catch(() => '');
    const ms = performance.now() - debut;
    if (delaiDepasse) return { id, etat: 'delai', ms, detail: `plus de ${DELAI_MS / 1000} s` };
    return { id, ms, ...analyser(reponse, texte) };
  } catch (erreur) {
    const classe = classerEchec(erreur, { delaiDepasse });
    const ms = performance.now() - debut;
    if (classe === 'delai') return { id, etat: 'delai', ms, detail: `plus de ${DELAI_MS / 1000} s` };
    return {
      id, etat: 'bloque', ms,
      detail: classe === 'bloque' ? 'TypeError : réseau, CORS ou bloqueur' : 'erreur inattendue',
    };
  } finally {
    clearTimeout(minuteur);
  }
}

function sondeImage(id, url) {
  return new Promise((resolve) => {
    const debut = performance.now();
    const image = new Image();
    let fini = false;
    const terminer = (etat, detail) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuteur);
      image.onload = null;
      image.onerror = null;
      resolve({ id, etat, ms: performance.now() - debut, detail });
    };
    const minuteur = setTimeout(() => terminer('delai', `plus de ${DELAI_MS / 1000} s`), DELAI_MS);
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) terminer('ok', `image ${image.naturalWidth} × ${image.naturalHeight}`);
      else terminer('image-echec', 'image sans dimension');
    };
    image.onerror = () => terminer('image-echec', 'image non chargée (couche inconnue, service en erreur ou blocage)');
    image.referrerPolicy = POLITIQUE;
    image.src = `${url}${url.includes('?') ? '&' : '?'}essai=${Date.now()}`;
  });
}

const httpDetail = (reponse) => `HTTP ${reponse.status}${reponse.status === 404 ? ' (réponse lisible, chemin non conclu)' : ''}`;

function analyserApi(reponse) {
  return reponse.ok ? { etat: 'ok', detail: `HTTP ${reponse.status}` } : { etat: 'http', detail: httpDetail(reponse) };
}

function analyserWms(contexte, hote) {
  return (reponse, texte) => {
    if (!reponse.ok) return { etat: 'http', detail: httpDetail(reponse) };
    const noms = extraireCouches(texte);
    const choix = choisirCouches(noms);
    if (choix.inondation && !contexte.couche) {
      contexte.couche = choix.inondation;
      contexte.hote = hote;
    }
    const detail = [
      `${noms.length} couche${noms.length > 1 ? 's' : ''}`,
      `inondation : ${choix.inondation ?? 'aucune'}`,
      `argiles : ${choix.argiles ?? 'aucune'}`,
      `feux de forêt : ${choix.feux ?? 'aucune'}`,
      'chaleur : aucune couche attendue',
    ].join(' ; ');
    return { etat: 'ok', detail };
  };
}

async function executer(sonde, contexte) {
  const url = urlDeSonde(sonde.id, contexte);
  switch (sonde.id) {
    case 'geocodage':
      return sondeFetch(sonde.id, url, (reponse, texte) => {
        if (!reponse.ok) return { etat: 'http', detail: httpDetail(reponse) };
        const analyse = analyserGeocodage(texte);
        if (!analyse.ok) return { etat: 'http', detail: `HTTP ${reponse.status}, analyse impossible : ${analyse.raison}` };
        contexte.coordonnees = { lat: analyse.lat, lon: analyse.lon };
        const score = analyse.score === null ? 'score absent' : `score ${analyse.score.toFixed(2)}`;
        return { etat: 'ok', detail: `${analyse.libelle || 'libellé absent'} (${score})` };
      });
    case 'osm-tuile':
    case 'ign-tuile':
      return sondeImage(sonde.id, url);
    case 'georisques-api':
    case 'georisques-api-www':
      return sondeFetch(sonde.id, url, analyserApi);
    case 'georisques-wms':
      return sondeFetch(sonde.id, url, analyserWms(contexte, 'georisques.gouv.fr'));
    case 'georisques-wms-www':
      return sondeFetch(sonde.id, url, analyserWms(contexte, 'www.georisques.gouv.fr'));
    case 'georisques-wms-image':
      if (!url) return { id: sonde.id, etat: 'non-testee', ms: null, detail: 'non testée (aucune couche connue)' };
      return sondeImage(sonde.id, url);
    default:
      return { id: sonde.id, etat: 'non-testee', ms: null, detail: '' };
  }
}

// ---------- rapport ----------

function afficherSynthese(resultats) {
  const verdicts = conclure(resultats);
  $('liste-conclusions').replaceChildren(...lignesVerdicts(verdicts).map((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    return li;
  }));
  $('texte-rapport').value = formaterRapport({
    date: new Date().toISOString(),
    origine: window.location.origin,
    navigateur: navigator.userAgent,
    resultats,
    verdicts,
  });
  $('conclusions').hidden = false;
  $('rapport').hidden = false;
}

function prepareBoutonCopie() {
  const copier = document.createElement('button');
  copier.type = 'button';
  copier.className = 'bouton';
  copier.textContent = 'Copier le rapport';
  copier.addEventListener('click', async () => {
    const zone = $('texte-rapport');
    const statut = $('copie-statut');
    try {
      await navigator.clipboard.writeText(zone.value);
      statut.textContent = 'Rapport copié.';
    } catch {
      zone.focus();
      zone.select();
      statut.textContent = 'Copie automatique impossible. Copiez-le manuellement : le texte est sélectionné.';
    }
  });
  $('actions-rapport').append(copier);
}

// ---------- parcours ----------

function basculerBoutons(inactif) {
  for (const b of boutons) {
    if (inactif) b.setAttribute('aria-disabled', 'true');
    else b.removeAttribute('aria-disabled');
  }
}

async function lancer() {
  if (enCours) return;
  enCours = true;
  basculerBoutons(true);
  reinitialiser();
  contexte = { coordonnees: null, couche: null, hote: null };
  resultats = [];
  for (const [index, sonde] of SONDES.entries()) {
    progression.textContent = `Sonde ${index + 1} sur ${SONDES.length} : ${sonde.libelle}`;
    afficher(sonde.id, 'en-cours');
    const resultat = evaluerSonde(await executer(sonde, contexte));
    resultats.push(resultat);
    afficher(resultat.id, resultat.etat, resultat.ms, resultat.detail);
  }
  afficherSynthese(resultats);
  $('zone-couche').hidden = contexte.couche !== null;
  progression.textContent = `Test terminé : ${SONDES.length} sondes lancées, résultats ci-dessous.`;
  basculerBoutons(false);
  enCours = false;
  $('titre-resultats').focus();
}

async function relancerImage() {
  if (enCours || !contexte) return;
  const champ = $('nom-couche');
  const nom = champ.value.trim();
  if (!nom) {
    progression.textContent = 'Saisissez un nom de couche avant de relancer la sonde.';
    champ.focus();
    return;
  }
  enCours = true;
  basculerBoutons(true);
  const sonde = SONDES.at(-1);
  progression.textContent = `Relance de la sonde ${SONDES.length} sur ${SONDES.length} : couche saisie.`;
  afficher(sonde.id, 'en-cours');
  const brut = await executer(sonde, { ...contexte, couche: nom, hote: contexte.hote ?? 'georisques.gouv.fr' });
  const resultat = evaluerSonde({ ...brut, detail: `couche saisie « ${nom} » : ${brut.detail}` });
  resultats = resultats.map((r) => (r.id === sonde.id ? resultat : r));
  afficher(resultat.id, resultat.etat, resultat.ms, resultat.detail);
  afficherSynthese(resultats);
  progression.textContent = `Sonde ${SONDES.length} relancée : ${ETATS[resultat.etat].texte}.`;
  basculerBoutons(false);
  enCours = false;
}

function prepareBoutonRelance() {
  const relancer = document.createElement('button');
  relancer.type = 'button';
  relancer.className = 'bouton';
  relancer.textContent = 'Relancer cette sonde';
  relancer.addEventListener('click', () => {
    if (relancer.getAttribute('aria-disabled') !== 'true') relancerImage();
  });
  boutons.push(relancer);
  $('actions-couche').append(relancer);
}

construireTable();
reinitialiser();
prepareBoutonCopie();
prepareBoutonRelance();
bouton.addEventListener('click', lancer);
$('contenu').hidden = false;
