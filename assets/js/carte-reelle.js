// Carte réelle du diagnostic (E2-3), seule carte de la page : affichée d'elle-même dès qu'une adresse valide est en session.
// Aucune requête tierce sans adresse valide. Le géocodage part au chargement ; Leaflet (copié dans assets/vendor/) n'est chargé
// qu'après le premier rendu. Rien n'est écrit : seule lecture de session, la clé « adresse ».
// Calques : les cases pilotent des couches WMS de Géorisques ; fond OpenStreetMap, repli automatique sur le Plan IGN.
import { donneesPretes } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { TOUS, calquesParDefaut } from './diagnostic-logique.js';
import { analyserGeocodage, calquesActifs, chaineAttribution, construireUrlGeocodage, couchesPourCalque, doitBasculer, gabaritFondValide, hoteAutorise, libellesLegende, optionsWms } from './carte-reelle-logique.js';

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
  const radios = () => [...document.querySelectorAll('#liste-fonds input')];
  // `fond` : clé du fond affiché ; `manuel` : le visiteur a choisi un fond (plus de bascule automatique).
  const etatCarte = { carte: null, sequence: 0, fond: null, couche: null, manuel: false, erreurs: 0, charges: 0, debut: 0, minuterie: null, calques: new Map(), controle: null, attribution: '' };

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

  // Cases des calques : une par calque qui a au moins une couche (chaleur : note statique, jamais de case).
  const construireCalques = () => {
    const modele = el('modele-calque');
    const filtre = document.querySelector('input[name="alea"]:checked')?.value ?? TOUS;
    const coches = calquesParDefaut(donnees.diagnostic.aleas, filtre);
    for (const id of Object.keys(config.calques)) {
      if (couchesPourCalque(id, config).length === 0) continue;
      const choix = modele.content.cloneNode(true);
      const case_ = choix.querySelector('input');
      case_.value = id;
      case_.checked = coches.includes(id);
      choix.querySelector('span').textContent = donnees.diagnostic.textes.carte.calques[id];
      el('liste-calques').append(choix);
    }
  };
  // Légende : une entrée par couche, visible seulement tant que son calque est affiché.
  const construireLegende = () => {
    const modele = el('modele-legende-reelle');
    const adresse = legende.querySelector('li:not([data-calque])');
    for (const entree of libellesLegende(config)) {
      const item = modele.content.cloneNode(true);
      item.querySelector('li').setAttribute('data-calque', entree.calque);
      item.querySelector('.legende__libelle').textContent = entree.libelle;
      item.querySelector('.legende__technique').textContent = entree.technique;
      legende.insertBefore(item, adresse);
    }
  };
  const majLegende = () => {
    for (const item of legende.querySelectorAll('li[data-calque]')) item.hidden = !etatCarte.calques.has(item.getAttribute('data-calque'));
  };
  const construireFonds = () => {
    const modele = el('modele-fond');
    for (const [cle, fond] of Object.entries(config.fonds)) {
      if (!gabaritFondValide(fond.gabarit)) continue;
      const choix = modele.content.cloneNode(true);
      const radio = choix.querySelector('input');
      radio.name = 'fond-carte'; // posé à l'exécution (flèches dans le groupe), jamais dans le HTML
      radio.value = cle;
      radio.checked = cle === config.fondParDefaut;
      choix.querySelector('span').textContent = fond.libelle;
      el('liste-fonds').append(choix);
    }
    el('liste-fonds').addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"]') && etatCarte.carte) choisirFond(e.target.value, true);
    });
  };

  const detruire = () => {
    clearTimeout(etatCarte.minuterie);
    if (etatCarte.carte) {
      etatCarte.carte.remove();
      etatCarte.carte = null;
      // Leaflet laisse ses classes, son tabindex et son style sur le conteneur : retour à l'état d'origine
      conteneur.className = 'carte-reelle';
      conteneur.removeAttribute('tabindex');
      conteneur.removeAttribute('style');
    }
    Object.assign(etatCarte, { fond: null, couche: null, manuel: false, erreurs: 0, charges: 0, debut: 0, minuterie: null, controle: null, attribution: '' });
    etatCarte.calques.clear();
    for (const radio of radios()) radio.checked = radio.value === config.fondParDefaut;
    etatFond.textContent = '';
    majLegende();
    conteneur.hidden = true;
  };

  const echec = (texte) => {
    detruire();
    afficherMessage(texte, true);
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

  // Repli automatique du fond par défaut : seulement avant tout choix manuel (règle pure doitBasculer).
  const verifierBascule = (delaiEcoule) => {
    if (etatCarte.manuel || etatCarte.fond !== config.fondParDefaut || !etatCarte.carte) return;
    const ecouleMs = delaiEcoule ? config.basculeFond.delaiMs : performance.now() - etatCarte.debut;
    if (!doitBasculer({ erreurs: etatCarte.erreurs, charges: etatCarte.charges, ecouleMs }, config.basculeFond)) return;
    choisirFond('ign', false);
    etatFond.textContent = textes.basculeFond;
  };

  function choisirFond(cle, manuel) {
    const L = globalThis.L;
    const fond = config.fonds[cle];
    if (!etatCarte.carte || !fond || !gabaritFondValide(fond.gabarit)) return;
    if (manuel) etatCarte.manuel = true;
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
    for (const radio of radios()) radio.checked = radio.value === cle;
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
    choisirFond(config.fondParDefaut, false);
    synchroniserCalques();
    L.circleMarker([point.lat, point.lon], { radius: 9, className: 'carte-reelle__repere', interactive: false }).addTo(carte);
    return carte;
  };

  // Séquence complète : adresse de session, géocodage, Leaflet (après le premier rendu), carte. Toute nouvelle séquence annule la précédente.
  async function demarrer() {
    const sequence = (etatCarte.sequence += 1);
    const annule = () => sequence !== etatCarte.sequence;
    detruire();
    const adresse = adresseDeSession();
    if (adresse === null) {
      afficherMessage(textes.sansAdresse, false);
      return;
    }
    afficherMessage(textes.chargement, false);
    const resultat = await geocoder(adresse, config);
    if (annule()) return;
    if (!resultat.ok) return echec(resultat.raison === 'hors-france' ? textes.horsFrance : textes.erreur);
    await apresPremierRendu();
    if (annule()) return;
    let L;
    try {
      L = await chargerLeaflet(config.leaflet);
    } catch {
      if (annule()) return;
      return echec(textes.erreur);
    }
    if (annule()) return;
    if (!gabaritFondValide(config.fonds[config.fondParDefaut].gabarit)) return echec(textes.erreur);
    conteneur.hidden = false;
    try {
      creerCarte(L, resultat);
    } catch {
      return echec(textes.erreur);
    }
    masquerMessage();
  }

  reessayer.addEventListener('click', () => {
    demarrer();
    etat.focus(); // le bouton disparaît : le focus passe au message d'état
  });
  // « Mettre à jour » (diagnostic.js) : nouvelle adresse valide, la carte est détruite puis recréée.
  document.addEventListener('adresse:modifiee', () => demarrer());
  el('liste-calques').addEventListener('change', () => synchroniserCalques());
  // Un changement de filtre réinitialise les cases (« Tous » : toutes ; un aléa : la sienne) et la carte suit.
  document.addEventListener('diagnostic:filtre', (e) => {
    const coches = calquesParDefaut(donnees.diagnostic.aleas, e.detail?.filtre ?? TOUS);
    for (const case_ of cases()) case_.checked = coches.includes(case_.value);
    synchroniserCalques();
  });
  construireCalques();
  construireLegende();
  construireFonds();
  majLegende();
  demarrer();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
