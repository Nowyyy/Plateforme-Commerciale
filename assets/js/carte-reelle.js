// Carte réelle du diagnostic (E2-5), à la demande et avec l'accord du visiteur. Aucune requête vers un service tiers avant l'accord ;
// le consentement n'est jamais écrit (ni session, ni stockage local, ni cookie) : un rechargement le redemande.
// Seule lecture de session : l'adresse (clé « adresse »). Leaflet (copié dans assets/vendor/) n'est chargé qu'après l'accord.
import { donneesPretes } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { analyserGeocodage, chaineAttribution, construireUrlGeocodage, gabaritFondValide } from './carte-reelle-logique.js';

function adresseDeSession() {
  try {
    const verdict = valider(sessionStorage.getItem(CLE_STOCKAGE));
    return verdict.valide ? verdict.adresse : null;
  } catch {
    return null; // stockage indisponible : pas d'adresse
  }
}

// Une seule requête de géocodage, délai maximal `delaiMs`. Résultat { ok, ... } ou { ok: false, raison }.
async function geocoder(adresse, config) {
  const url = construireUrlGeocodage(adresse, config.geocodage.base);
  if (url === '') return { ok: false, raison: 'adresse' };
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), config.geocodage.delaiMs);
  try {
    const reponse = await fetch(url, { signal: controle.signal, credentials: 'omit' });
    if (!reponse.ok) return { ok: false, raison: 'http' };
    return analyserGeocodage(await reponse.text(), config.geocodage.seuil);
  } catch {
    return { ok: false, raison: 'reseau' };
  } finally {
    clearTimeout(minuterie);
  }
}

// Feuille de style et script de Leaflet : ajoutés une seule fois, même origine ; promesse conservée seulement en cas de succès.
let chargementLeaflet = null;

function chargerLeaflet(chemins) {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  if (chargementLeaflet) return chargementLeaflet;
  if (!document.querySelector('link[data-leaflet]')) {
    const feuille = document.createElement('link');
    feuille.rel = 'stylesheet';
    feuille.href = chemins.css;
    feuille.setAttribute('data-leaflet', '');
    document.head.append(feuille);
  }
  chargementLeaflet = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chemins.js;
    script.setAttribute('data-leaflet', '');
    script.addEventListener('load', () => (globalThis.L ? resolve(globalThis.L) : reject(new Error('Leaflet absent'))));
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Leaflet non chargé'));
    });
    document.head.append(script);
  });
  chargementLeaflet.catch(() => { chargementLeaflet = null; });
  return chargementLeaflet;
}

function initialiser(donnees) {
  const config = donnees.diagnostic.carteReelle;
  const { textes } = config;
  const el = (id) => document.getElementById(id);
  const ouvrir = el('carte-reelle-ouvrir');
  const retour = el('carte-reelle-retour');
  const aide = el('carte-reelle-aide');
  const panneau = el('carte-reelle-consentement');
  const titre = el('carte-reelle-consentement-titre');
  const etat = el('carte-reelle-etat');
  const conteneur = el('carte-reelle');
  const schema = document.querySelector('.schema');
  const champ = el('adresse-evaluee');
  const etatCarte = { carte: null, sequence: 0, enCours: false };

  // Bouton d'ouverture : jamais `disabled` ; inactif sans adresse de session valide ou pendant le chargement.
  const rafraichirBouton = () => {
    const sansAdresse = adresseDeSession() === null;
    ouvrir.setAttribute('aria-disabled', String(sansAdresse || etatCarte.enCours));
    aide.textContent = sansAdresse ? textes.aideSansAdresse : textes.aide;
  };

  const detruire = () => {
    if (etatCarte.carte) {
      etatCarte.carte.remove();
      etatCarte.carte = null;
      // Leaflet laisse ses classes, son tabindex et son style sur le conteneur : retour à l'état d'origine
      conteneur.className = 'carte-reelle';
      conteneur.removeAttribute('tabindex');
      conteneur.removeAttribute('style');
    }
    conteneur.hidden = true;
    schema.toggleAttribute('hidden', false);
    retour.hidden = true;
    ouvrir.hidden = false;
  };

  // Retour au schéma : annule un chargement en cours (la séquence change), détruit la carte, ferme le panneau.
  const revenir = (focus) => {
    const actif = etatCarte.carte !== null || etatCarte.enCours;
    etatCarte.sequence += 1;
    etatCarte.enCours = false;
    panneau.hidden = true;
    detruire();
    if (actif) etat.textContent = textes.retourFait;
    rafraichirBouton();
    if (focus) ouvrir.focus();
  };

  const echec = (message) => {
    etatCarte.enCours = false;
    detruire();
    etat.textContent = message;
    rafraichirBouton();
    ouvrir.focus();
  };

  const creerCarte = (L, point) => {
    const { vue } = config;
    const fond = config.fonds[config.fondParDefaut];
    const carte = L.map(conteneur, { zoomControl: false, attributionControl: false, minZoom: vue.zoomMin, maxZoom: vue.zoomMax });
    L.control.zoom({ zoomInTitle: textes.zoomAvant, zoomOutTitle: textes.zoomArriere }).addTo(carte);
    const attributions = fond.attributions.map((cle) => config.attributions[cle]);
    L.control.attribution({ prefix: false }).addAttribution(chaineAttribution(attributions, donnees.site.liensExternes)).addTo(carte);
    L.tileLayer(fond.gabarit, { maxZoom: vue.zoomMax, minZoom: vue.zoomMin }).addTo(carte);
    carte.setView([point.lat, point.lon], vue.zoom);
    L.circleMarker([point.lat, point.lon], { radius: 9, className: 'carte-reelle__repere', interactive: false }).addTo(carte);
    return carte;
  };

  async function afficher(adresse) {
    const sequence = (etatCarte.sequence += 1);
    etatCarte.enCours = true;
    rafraichirBouton();
    etat.textContent = textes.chargement;
    const annule = () => sequence !== etatCarte.sequence;
    const resultat = await geocoder(adresse, config);
    if (annule()) return;
    if (!resultat.ok) return echec(resultat.raison === 'hors-france' ? textes.horsFrance : textes.erreur);
    let L;
    try {
      L = await chargerLeaflet(config.leaflet);
    } catch {
      if (annule()) return;
      return echec(textes.erreur);
    }
    if (annule()) return;
    if (!gabaritFondValide(config.fonds[config.fondParDefaut].gabarit)) return echec(textes.erreur);
    // Le cadre 4:3 du schéma est repris par la carte : conteneur affiché, schéma masqué (non détruit).
    schema.toggleAttribute('hidden', true);
    conteneur.hidden = false;
    try {
      etatCarte.carte = creerCarte(L, resultat);
    } catch {
      return echec(textes.erreur);
    }
    etatCarte.enCours = false;
    ouvrir.hidden = true;
    retour.hidden = false;
    etat.textContent = textes.affichee;
    conteneur.focus();
  }

  ouvrir.addEventListener('click', () => {
    if (ouvrir.getAttribute('aria-disabled') === 'true') {
      if (adresseDeSession() === null) champ.focus();
      return;
    }
    etat.textContent = '';
    panneau.hidden = false;
    titre.focus();
  });
  el('carte-reelle-garder').addEventListener('click', () => {
    panneau.hidden = true;
    ouvrir.focus();
  });
  el('carte-reelle-accepter').addEventListener('click', () => {
    const adresse = adresseDeSession();
    panneau.hidden = true;
    if (adresse === null) {
      rafraichirBouton();
      ouvrir.focus();
      return;
    }
    ouvrir.focus();
    afficher(adresse);
  });
  retour.addEventListener('click', () => revenir(true));
  document.addEventListener('adresse:modifiee', () => revenir(false));
  rafraichirBouton();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
