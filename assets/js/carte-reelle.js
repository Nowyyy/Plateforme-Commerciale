// Carte réelle du diagnostic (E2-3), seule carte de la page : affichée d'elle-même dès qu'une adresse valide est en session.
// Aucune requête tierce sans adresse valide. Le géocodage part au chargement ; Leaflet (copié dans assets/vendor/) n'est chargé
// qu'après le premier rendu. Rien n'est écrit : seule lecture de session, la clé « adresse ».
// Calques : seuls ceux des aléas recensés à l'adresse (API Géorisques, coordonnées seulement) sont proposés ; les cases pilotent
// des couches WMS ; fond OpenStreetMap, repli automatique sur le Plan IGN (aucun choix de fond).
import { donneesPretes } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { TOUS, calquesParDefaut } from './diagnostic-logique.js';
import { analyserGeocodage, calquesActifs, calquesProposes, chaineAttribution, cochesInitiales, construireUrlGaspar, construireUrlGeocodage, construireUrlRga, doitBasculer, entreesLegende, etatCalques, etatLegende, gabaritFondValide, hoteAutorise, libelleCalque, libellesLegende, lireExpositionRga, lireRisquesGaspar, optionsWms, urlLegendeWms } from './carte-reelle-logique.js';

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

// Lecture d'une réponse de l'API Géorisques (CORS, sans identifiants, délai maximal) ; null en cas d'échec ou de code non 2xx.
async function lireTexteApi(url, delai, signal) {
  if (url === '') return null;
  const controle = new AbortController();
  const arret = () => controle.abort();
  signal.addEventListener('abort', arret, { once: true });
  const minuterie = setTimeout(arret, delai);
  try {
    const reponse = await fetch(url, { mode: 'cors', credentials: 'omit', signal: controle.signal });
    return reponse.ok ? await reponse.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(minuterie);
    signal.removeEventListener('abort', arret);
  }
}

// Seules lectures de l'API : risques de la commune (gaspar) puis exposition aux argiles (rga) ; coordonnées seulement, jamais l'adresse.
const lireGaspar = (point, config, signal) => lireTexteApi(construireUrlGaspar(point.lat, point.lon, config.api.gaspar, config.api.rayon), config.api.delaiMs, signal);
const lireRga = (point, config, signal) => lireTexteApi(construireUrlRga(point.lat, point.lon, config.api.rga), config.api.delaiMs, signal);

async function lireAleas(point, config, signal) {
  const mots = { cles: config.api.cles, calques: Object.fromEntries(Object.entries(config.detection).filter(([, regle]) => regle.source === 'gaspar').map(([calque, regle]) => [calque, regle.mots])) };
  const brutGaspar = await lireGaspar(point, config, signal); // lectures séquentielles
  const brutRga = await lireRga(point, config, signal);
  return {
    gaspar: brutGaspar === null ? null : lireRisquesGaspar(brutGaspar, mots),
    rga: brutRga === null ? null : lireExpositionRga(brutRga, config.detection.argile),
  };
}

// Leaflet n'est demandé qu'après le premier rendu : événement load, puis temps libre du navigateur (sinon un tour de boucle).
function apresPremierRendu() {
  return new Promise((resolve) => {
    const lancer = () => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 2000 });
      else setTimeout(resolve, 0);
    };
    if (document.readyState === 'complete') lancer();
    else window.addEventListener('load', lancer, { once: true });
  });
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
  const liens = donnees.site.liensExternes;
  const el = (id) => document.getElementById(id);
  const conteneur = el('carte-reelle');
  const message = el('carte-reelle-message');
  const etat = el('carte-reelle-etat');
  const reessayer = el('carte-reelle-reessayer');
  const etatFond = el('carte-reelle-fond-etat');
  const legende = el('legende-reelle');
  const cases = () => [...document.querySelectorAll('#liste-calques input')];
  // `fond` : clé du fond affiché (OpenStreetMap, puis Plan IGN après un repli automatique).
  const etatCarte = { carte: null, sequence: 0, fond: null, couche: null, erreurs: 0, charges: 0, debut: 0, minuterie: null, calques: new Map(), controle: null, attribution: '', controleApi: null, aleas: null };

  // Cadre : message (sans adresse, chargement, échec) ou carte ; le bouton « Réessayer » n'accompagne que les échecs.
  const afficherMessage = (texte, echec) => {
    message.hidden = false;
    etat.textContent = texte;
    reessayer.hidden = !echec;
  };
  const masquerMessage = () => {
    message.hidden = true;
    etat.textContent = '';
    reessayer.hidden = true;
  };

  // États des aléas de l'adresse, annoncés au diagnostic (niveau d'exposition, pastilles, équipements) : sans adresse, lecture, lus.
  const signaler = (phase, etats = null) => document.dispatchEvent(new CustomEvent('aleas:etat', { detail: { phase, etats } }));
  const aleasTextes = textes.aleas;
  const zoneMessage = el('aleas-message');
  const zoneSecours = el('aleas-secours');
  const annonce = el('aleas-annonce');

  // Panneau « Aléas recensés à cette adresse » : message d'attente ou de lecture, aucune case.
  const reinitialiserAleas = (message) => {
    for (const choix of el('liste-calques').querySelectorAll('label')) choix.remove();
    etatCarte.aleas = null;
    zoneMessage.textContent = message;
    zoneMessage.hidden = false;
    zoneSecours.hidden = true;
    annonce.textContent = '';
  };

  // Cases : une par calque proposé (présent ou inconnu), cochées selon le filtre d'aléa ; mode de secours si tout est inconnu.
  const rendreAleas = (lecture) => {
    const resultat = etatCalques({ gaspar: lecture.gaspar, rga: lecture.rga, calquesConfig: config });
    const proposes = calquesProposes(resultat);
    reinitialiserAleas('');
    etatCarte.aleas = { resultat, proposes };
    const coches = cochesInitiales(proposes, calquesParDefaut(donnees.diagnostic.aleas, TOUS));
    const modele = el('modele-calque');
    for (const id of proposes) {
      const { etat, niveau } = resultat.etats[id];
      const libelle = libelleCalque(id, etat, niveau, { ...aleasTextes, calques: donnees.diagnostic.textes.carte.calques });
      const choix = modele.content.cloneNode(true);
      const case_ = choix.querySelector('input');
      case_.value = id;
      case_.checked = coches.includes(id);
      choix.querySelector('.calque-choix__nom').textContent = libelle.nom;
      choix.querySelector('.calque-choix__presence').textContent = libelle.presence;
      el('liste-calques').append(choix);
    }
    const presents = Object.values(resultat.etats).filter((e) => e.etat === 'present').length;
    zoneMessage.hidden = proposes.length > 0;
    zoneMessage.textContent = proposes.length > 0 ? '' : aleasTextes.aucun;
    zoneSecours.hidden = !resultat.secours;
    zoneSecours.textContent = resultat.secours ? aleasTextes.secours : '';
    if (resultat.secours) annonce.textContent = aleasTextes.secours;
    else if (proposes.length === 0) annonce.textContent = aleasTextes.aucun;
    else annonce.textContent = presents === 1 ? aleasTextes.annonceUn : aleasTextes.annonceN.replace('{n}', String(presents));
    synchroniserCalques();
    signaler('lus', resultat.etats);
  };

  // Légende officielle : une entrée par couche (libellé, puis image GetLegendGraphic du service). L'image n'est demandée qu'au premier
  // affichage de l'entrée (case cochée, carte affichée) ; décocher masque l'entrée sans la détruire (cache). Échec : texte, jamais de pastille.
  const legendeConfig = config.legende;
  const etatLegendeZone = el('legende-etat');
  const entreesLegendeDom = new Map(); // `${calque}\u0000${couche}` -> { li, img, echec, etat, minuterie }
  const cleEntree = (calque, couche) => `${calque}\u0000${couche}`;
  const construireLegende = () => {
    const modele = el('modele-legende-reelle');
    const adresse = legende.querySelector('li:not([data-calque])');
    legende.style.setProperty('--legende-reserve', `${legendeConfig.hauteurReservee}rem`);
    for (const entree of libellesLegende(config)) {
      const item = modele.content.cloneNode(true);
      const li = item.querySelector('li');
      li.setAttribute('data-calque', entree.calque);
      li.setAttribute('data-couche', entree.nom);
      item.querySelector('.legende__libelle').textContent = entree.libelle;
      item.querySelector('.legende__technique').textContent = entree.technique;
      const img = item.querySelector('.legende__img');
      img.alt = legendeConfig.textes.alt.replace('{libelle}', entree.libelle);
      img.style.opacity = String(config.vue.opacite);
      entreesLegendeDom.set(cleEntree(entree.calque, entree.nom), { li, img, echec: item.querySelector('.legende__echec'), etat: 'inactif', minuterie: null });
      legende.insertBefore(item, adresse);
    }
  };
  const annoncerChargement = () => {
    const enCours = [...entreesLegendeDom.values()].some((e) => e.etat === 'chargement');
    etatLegendeZone.textContent = enCours ? legendeConfig.textes.chargement : '';
  };
  const conclureLegende = (entree, evenement) => {
    if (entree.etat !== 'chargement') return;
    clearTimeout(entree.minuterie);
    const etat = etatLegende(evenement);
    entree.etat = etat === 'ok' ? 'ok' : 'echec';
    if (etat === 'ok') {
      entree.img.hidden = false;
      entree.li.classList.add('legende__item--prete'); // la réserve est levée : l'entrée prend la hauteur de son image
    } else {
      entree.img.hidden = true;
      entree.img.removeAttribute('src');
      entree.echec.textContent = legendeConfig.textes.indisponible;
      entree.echec.hidden = false;
    }
    annoncerChargement();
  };
  const demanderLegende = (calque, couche) => {
    const entree = entreesLegendeDom.get(cleEntree(calque, couche));
    if (!entree || entree.etat !== 'inactif') return;
    const url = urlLegendeWms(couche, config);
    entree.etat = 'chargement';
    if (!hoteAutorise(url)) {
      conclureLegende(entree, { type: 'error' });
      return;
    }
    entree.img.addEventListener('load', () => conclureLegende(entree, { type: 'load', largeur: entree.img.naturalWidth, hauteur: entree.img.naturalHeight }), { once: true });
    entree.img.addEventListener('error', () => conclureLegende(entree, { type: 'error' }), { once: true });
    entree.minuterie = setTimeout(() => conclureLegende(entree, { type: 'delai' }), legendeConfig.delai);
    entree.img.src = url;
    annoncerChargement();
  };
  // Entrées affichées : cases cochées, seulement une fois la carte affichée. Les entrées en échec sont réarmées à la destruction de la carte.
  const majLegende = () => {
    const proposes = cases().map((c) => c.value);
    const coches = cases().filter((c) => c.checked).map((c) => c.value);
    const affichees = etatCarte.carte ? entreesLegende({ coches, proposes, config }) : [];
    const cles = new Set(affichees.map((e) => cleEntree(e.calque, e.couche)));
    for (const [cle, entree] of entreesLegendeDom) entree.li.hidden = !cles.has(cle);
    for (const e of affichees) demanderLegende(e.calque, e.couche);
  };
  const rearmerLegendesEnEchec = () => {
    for (const entree of entreesLegendeDom.values()) {
      if (entree.etat !== 'echec') continue;
      entree.etat = 'inactif';
      entree.echec.hidden = true;
      entree.echec.textContent = '';
    }
  };
  // garderLectures : l'échec ne vient que de la carte, les lectures de l'API (coordonnées seulement) se poursuivent.
  const detruire = (garderLectures = false) => {
    clearTimeout(etatCarte.minuterie);
    if (etatCarte.carte) {
      etatCarte.carte.remove();
      etatCarte.carte = null;
      // Leaflet laisse ses classes, son tabindex et son style sur le conteneur : retour à l'état d'origine
      conteneur.className = 'carte-reelle';
      conteneur.removeAttribute('tabindex');
      conteneur.removeAttribute('style');
    }
    Object.assign(etatCarte, { fond: null, couche: null, erreurs: 0, charges: 0, debut: 0, minuterie: null, controle: null, attribution: '' });
    etatCarte.calques.clear();
    rearmerLegendesEnEchec();
    if (!garderLectures) etatCarte.controleApi?.abort();
    etatFond.textContent = '';
    majLegende();
    conteneur.hidden = true;
  };

  const echec = (texte) => {
    detruire();
    reinitialiserAleas(aleasTextes.attente);
    afficherMessage(texte, true);
    signaler('lus', etatCalques({ gaspar: null, rga: null, calquesConfig: config }).etats); // aucune lecture possible : présence non déterminée
  };

  // Échec de la carte seule (Leaflet, fond ou création) après un géocodage réussi : message habituel avec « Réessayer », mais les lectures
  // de l'API Géorisques, qui ne dépendent que des coordonnées, aboutissent quand même et alimentent le panneau et le niveau calculé.
  const echecCarte = async (texte, lecture, annule) => {
    detruire(true);
    afficherMessage(texte, true);
    const aleas = await lecture;
    if (annule()) return;
    rendreAleas(aleas);
  };

  // Attributions : celles du fond affiché, plus Géorisques tant qu'un calque est affiché ; chaîne construite par chaineAttribution.
  const majAttribution = () => {
    if (!etatCarte.controle) return;
    const cles = [...config.fonds[etatCarte.fond].attributions];
    if (etatCarte.calques.size > 0) cles.push('georisques');
    const suivante = chaineAttribution(cles.map((cle) => config.attributions[cle]), liens);
    etatCarte.controle.removeAttribution(etatCarte.attribution);
    etatCarte.controle.addAttribution(suivante);
    etatCarte.attribution = suivante;
  };

  // Repli automatique du fond par défaut sur le Plan IGN (règle pure doitBasculer) ; le visiteur ne choisit pas le fond.
  const verifierBascule = (delaiEcoule) => {
    if (etatCarte.fond !== config.fondParDefaut || !etatCarte.carte) return;
    const ecouleMs = delaiEcoule ? config.basculeFond.delaiMs : performance.now() - etatCarte.debut;
    if (!doitBasculer({ erreurs: etatCarte.erreurs, charges: etatCarte.charges, ecouleMs }, config.basculeFond)) return;
    choisirFond('ign');
    etatFond.textContent = textes.basculeFond;
  };

  function choisirFond(cle) {
    const L = globalThis.L;
    const fond = config.fonds[cle];
    if (!etatCarte.carte || !fond || !gabaritFondValide(fond.gabarit)) return;
    clearTimeout(etatCarte.minuterie);
    Object.assign(etatCarte, { erreurs: 0, charges: 0, debut: 0, minuterie: null });
    if (etatCarte.couche) etatCarte.carte.removeLayer(etatCarte.couche);
    const couche = L.tileLayer(fond.gabarit, { minZoom: config.vue.zoomMin, maxZoom: config.vue.zoomMax });
    couche.on('tileloadstart', () => {
      if (etatCarte.debut !== 0 || etatCarte.couche !== couche) return;
      etatCarte.debut = performance.now();
      etatCarte.minuterie = setTimeout(() => verifierBascule(true), config.basculeFond.delaiMs);
    });
    couche.on('tileload', () => {
      if (etatCarte.couche !== couche) return;
      etatCarte.charges += 1;
      clearTimeout(etatCarte.minuterie);
    });
    couche.on('tileerror', () => {
      if (etatCarte.couche !== couche) return;
      etatCarte.erreurs += 1;
      verifierBascule(false);
    });
    etatCarte.couche = couche;
    etatCarte.fond = cle;
    couche.addTo(etatCarte.carte);
    couche.bringToBack();
    majAttribution();
  }

  // Les cases pilotent les couches : ajout et retrait (jamais d'opacité nulle) ; une requête WMS par calque.
  const synchroniserCalques = () => {
    if (!etatCarte.carte) return;
    const L = globalThis.L;
    const actifs = calquesActifs(cases().map((c) => ({ id: c.value, coche: c.checked })), config);
    for (const id of Object.keys(config.calques)) {
      const present = etatCarte.calques.has(id);
      if (actifs.includes(id) && !present) {
        const o = optionsWms(id, config);
        if (!hoteAutorise(o.base)) continue;
        const couche = L.tileLayer.wms(o.base, { layers: o.couches.join(','), version: o.version, format: o.format, transparent: o.transparent ? 'TRUE' : 'FALSE', opacity: o.opacite, styles: '', uppercase: true, minZoom: config.vue.zoomMin, maxZoom: config.vue.zoomMax });
        couche.addTo(etatCarte.carte);
        etatCarte.calques.set(id, couche);
      } else if (!actifs.includes(id) && present) {
        etatCarte.carte.removeLayer(etatCarte.calques.get(id));
        etatCarte.calques.delete(id);
      }
    }
    majLegende();
    majAttribution();
  };

  const creerCarte = (L, point) => {
    const { vue } = config;
    const carte = L.map(conteneur, { zoomControl: false, attributionControl: false, minZoom: vue.zoomMin, maxZoom: vue.zoomMax });
    L.control.zoom({ zoomInTitle: textes.zoomAvant, zoomOutTitle: textes.zoomArriere }).addTo(carte);
    etatCarte.controle = L.control.attribution({ prefix: false }).addTo(carte);
    etatCarte.carte = carte;
    carte.setView([point.lat, point.lon], vue.zoom);
    choisirFond(config.fondParDefaut);
    synchroniserCalques();
    L.circleMarker([point.lat, point.lon], { radius: 9, className: 'carte-reelle__repere', interactive: false }).addTo(carte);
    return carte;
  };

  // Séquence complète : adresse de session, géocodage, Leaflet (après le premier rendu), carte. Toute nouvelle séquence annule la précédente.
  async function demarrer() {
    const sequence = (etatCarte.sequence += 1);
    const annule = () => sequence !== etatCarte.sequence;
    detruire();
    reinitialiserAleas(aleasTextes.attente);
    const adresse = adresseDeSession();
    if (adresse === null) {
      afficherMessage(textes.sansAdresse, false);
      signaler('sans-adresse');
      return;
    }
    afficherMessage(textes.chargement, false);
    signaler('lecture');
    const resultat = await geocoder(adresse, config);
    if (annule()) return;
    if (!resultat.ok) return echec(resultat.raison === 'hors-france' ? textes.horsFrance : textes.erreur);
    // Lecture des aléas de l'adresse (coordonnées seulement), en parallèle du chargement de Leaflet.
    zoneMessage.textContent = aleasTextes.lecture;
    etatCarte.controleApi = new AbortController();
    const lecture = lireAleas(resultat, config, etatCarte.controleApi.signal);
    await apresPremierRendu();
    if (annule()) return;
    let L;
    try {
      L = await chargerLeaflet(config.leaflet);
    } catch {
      if (annule()) return;
      return echecCarte(textes.erreur, lecture, annule);
    }
    if (annule()) return;
    if (!gabaritFondValide(config.fonds[config.fondParDefaut].gabarit)) return echecCarte(textes.erreur, lecture, annule);
    conteneur.hidden = false;
    try {
      creerCarte(L, resultat);
    } catch {
      return echecCarte(textes.erreur, lecture, annule);
    }
    masquerMessage();
    const aleas = await lecture;
    if (annule()) return;
    rendreAleas(aleas);
  }

  reessayer.addEventListener('click', () => {
    demarrer();
    etat.focus(); // le bouton disparaît : le focus passe au message d'état
  });
  // « Mettre à jour » (diagnostic.js) : nouvelle adresse valide, la carte est détruite puis recréée.
  document.addEventListener('adresse:modifiee', () => demarrer());
  el('liste-calques').addEventListener('change', () => synchroniserCalques());
  construireLegende();
  majLegende();
  demarrer();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
