// Carte réelle du diagnostic (E2-5), à la demande et avec l'accord du visiteur. Aucune requête vers un service tiers avant l'accord ;
// le consentement n'est jamais écrit (ni session, ni stockage local, ni cookie) : un rechargement le redemande.
// Calques : les cases du diagnostic pilotent des couches WMS de Géorisques ; fond OpenStreetMap, repli automatique sur le Plan IGN.
// Seule lecture de session : l'adresse (clé « adresse »). Leaflet (copié dans assets/vendor/) n'est chargé qu'après l'accord.
import { donneesPretes } from './rendu.js';
import { valider, CLE_STOCKAGE } from './adresse-validation.js';
import { analyserGeocodage, calquesActifs, chaineAttribution, construireUrlGeocodage, doitBasculer, gabaritFondValide, hoteAutorise, libellesLegende, optionsWms } from './carte-reelle-logique.js';

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
  const liens = donnees.site.liensExternes;
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
  const fonds = document.querySelector('.carte-reelle__fonds');
  const legendeReelle = el('legende-reelle');
  const legendeSchema = el('legende-calques');
  const mentionSchema = el('mention-schema');
  const mentionReelle = el('mention-reelle');
  const cases = () => [...document.querySelectorAll('#liste-calques input')];
  const radios = () => [...document.querySelectorAll('#liste-fonds input')];
  // `fond` : clé du fond affiché ; `manuel` : le visiteur a choisi un fond (plus de bascule automatique).
  const etatCarte = { carte: null, sequence: 0, enCours: false, fond: null, couche: null, manuel: false, erreurs: 0, charges: 0, debut: 0, minuterie: null, calques: new Map(), controle: null, attribution: '', miseEnPage: false, chaleurAvant: null };

  // Bouton d'ouverture : jamais `disabled` ; inactif sans adresse de session valide ou pendant le chargement.
  const rafraichirBouton = () => {
    const sansAdresse = adresseDeSession() === null;
    ouvrir.setAttribute('aria-disabled', String(sansAdresse || etatCarte.enCours));
    aide.textContent = sansAdresse ? textes.aideSansAdresse : textes.aide;
  };

  // Légende de la carte réelle et sélecteur de fond : construits une fois (textContent seulement).
  const construireLegende = () => {
    const modele = el('modele-legende-reelle');
    const adresse = legendeReelle.querySelector('li:not([data-calque])');
    for (const entree of libellesLegende(config, donnees.diagnostic.textes.carte.calques)) {
      const item = modele.content.cloneNode(true);
      item.querySelector('li').setAttribute('data-calque', entree.calque);
      item.querySelector('.legende__libelle').textContent = entree.libelle;
      item.querySelector('.legende__technique').textContent = entree.technique ?? entree.indisponible;
      legendeReelle.insertBefore(item, adresse);
    }
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

  // Légende, fonds et mention de la carte réelle : préparés dès l'accord (action du visiteur), défaits au retour.
  // « Chaleur extrême » : aria-disabled avec description (jamais disabled) tant que la carte réelle est affichée.
  const preparerMiseEnPage = (reelle) => {
    etatCarte.miseEnPage = reelle;
    fonds.hidden = !reelle;
    legendeReelle.hidden = !reelle;
    legendeSchema.hidden = reelle;
    mentionReelle.hidden = !reelle;
    mentionSchema.hidden = reelle;
    const chaleur = cases().find((c) => c.value === 'chaleur');
    if (!chaleur) return;
    if (reelle) {
      etatCarte.chaleurAvant = chaleur.checked;
      chaleur.checked = false;
      chaleur.setAttribute('aria-disabled', 'true');
      chaleur.setAttribute('aria-describedby', 'carte-reelle-chaleur-aide');
    } else {
      if (etatCarte.chaleurAvant !== null) chaleur.checked = etatCarte.chaleurAvant;
      etatCarte.chaleurAvant = null;
      chaleur.removeAttribute('aria-disabled');
      chaleur.removeAttribute('aria-describedby');
    }
    chaleur.closest('label').classList.toggle('est-indisponible', reelle);
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
    preparerMiseEnPage(false);
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
    etat.textContent = textes.basculeFond;
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
      creerCarte(L, resultat);
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
    preparerMiseEnPage(true);
    ouvrir.focus();
    afficher(adresse);
  });
  retour.addEventListener('click', () => revenir(true));
  document.addEventListener('adresse:modifiee', () => revenir(false));
  // « Chaleur extrême » ne bascule pas tant que la carte réelle est affichée ; les autres cases pilotent les couches.
  el('liste-calques').addEventListener('click', (e) => {
    if (e.target.matches('input[aria-disabled="true"]')) e.preventDefault();
  });
  el('liste-calques').addEventListener('change', () => synchroniserCalques());
  // Un changement de filtre réinitialise les cases (diagnostic.js) : la carte réelle suit, chaleur reste décochée.
  document.addEventListener('diagnostic:filtre', () => {
    if (!etatCarte.miseEnPage) return;
    const chaleur = cases().find((c) => c.value === 'chaleur');
    if (chaleur) {
      etatCarte.chaleurAvant = chaleur.checked;
      chaleur.checked = false;
    }
    synchroniserCalques();
  });
  construireLegende();
  construireFonds();
  rafraichirBouton();
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
