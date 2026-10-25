// Logique pure de la page « catalogue des couches » (lot 4b-C) : aucun accès au DOM, au réseau, au stockage ni à l'horloge ; aucun argument n'est modifié ; jamais d'exception.
// Les URL externes ne visent que les hôtes de HOTES ; Géorisques est toujours appelé avec « www ».
import { tuileDepuis, bboxTuile3857, urlTuileOsm, urlWmsGetMap, HOTES } from './faisabilite-logique.js';

export { HOTES };

const HOTE_GEORISQUES = 'www.georisques.gouv.fr';
const MAX_XML = 8_000_000;
const MAX_RESUME = 160;

export const LIEUX = {
  inondation: { libelle: 'Paris', lat: 48.8566, lon: 2.3522, zoom: 12 },
  argiles: { libelle: 'Toulouse', lat: 43.6047, lon: 1.4442, zoom: 11 },
  feux: { libelle: 'Aix-en-Provence', lat: 43.5297, lon: 5.4474, zoom: 11 },
  chaleur: { libelle: 'Paris', lat: 48.8566, lon: 2.3522, zoom: 12 },
  autre: { libelle: 'Paris', lat: 48.8566, lon: 2.3522, zoom: 12 },
};

// Motifs d'affichage appliqués au texte normalisé (minuscules, sans accents). Pas de limite de mot native : le trait de soulignement est un caractère de mot.
const SEP_DEBUT = '(?:^|[^a-z0-9])';
const SEP_FIN = '(?:[^a-z0-9]|$)';
const jeton = (alternatives) => new RegExp(`${SEP_DEBUT}(?:${alternatives})${SEP_FIN}`);

export const FAMILLES = {
  inondation: { libelle: 'Inondation', motif: new RegExp(`inond|crue|submersion|${jeton('ppri|tri|azi').source}`) },
  argiles: { libelle: 'Argiles', motif: new RegExp(`argil|alearg|retrait|gonflement|${jeton('rga').source}`) },
  feux: { libelle: 'Feux de forêt', motif: new RegExp(`incend|foret|debroussaill|${jeton('feux?|old').source}`) },
  chaleur: { libelle: 'Chaleur', motif: new RegExp(`chaleur|canicule|temperature|${SEP_DEBUT}ilot`) },
};

const CLES_FAMILLES = Object.keys(FAMILLES);

const estNombre = (v) => typeof v === 'number' && Number.isFinite(v);
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const texte = (v) => (typeof v === 'string' ? v : '');

const normaliser = (v) => texte(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nettoyer = (v, max = 300) => Array.from(String(v ?? ''), (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c)).join('').replace(/ {2,}/g, ' ').trim().slice(0, max);
const tronquer = (v, max) => {
  const lettres = Array.from(v);
  return lettres.length > max ? `${lettres.slice(0, max - 1).join('')}…` : v;
};

// ---------- Catalogue ----------

const ENTITES = /<!\[CDATA\[([\s\S]*?)\]\]>|&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi;
const NOMMEES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decoder(brut) {
  return brut.replace(ENTITES, (m, cdata, entite) => {
    if (cdata !== undefined) return cdata;
    const e = entite.toLowerCase();
    if (e[0] !== '#') return NOMMEES[e];
    const code = e[1] === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10);
    if (!Number.isInteger(code) || code < 32 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '';
    return String.fromCodePoint(code);
  });
}

const compacter = (v) => decoder(v).replace(/\s+/g, ' ').trim();
const nombreOuNull = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Analyse tolérante de texte : relève Name, Title, Abstract, CRS et échelles de chaque <Layer>, balises avec ou sans préfixe d'espace de noms.
export function extraireCatalogue(xml) {
  const source = texte(xml)
    .slice(0, MAX_XML)
    .replace(/<(?:\w+:)?(Style|Attribution)(?=[\s>/])[\s\S]*?<\/(?:\w+:)?\1\s*>/g, '');
  const motif = /<(?:\w+:)?Layer(?=[\s>/])[^>]*>|<\/(?:\w+:)?Layer\s*>|<(?:\w+:)?(Name|Title|Abstract|CRS|SRS|MinScaleDenominator|MaxScaleDenominator)(?=[\s>/])[^>]*>([\s\S]*?)<\/(?:\w+:)?\1\s*>/g;
  const pile = [];
  const couches = [];
  for (const m of source.matchAll(motif)) {
    const balise = m[0];
    if (/^<\//.test(balise)) {
      pile.pop();
    } else if (m[1] === undefined) {
      const parent = pile.at(-1);
      const couche = {
        nom: '', titre: '', resume: '',
        crs: parent ? [...parent.crs] : [],
        min: parent ? parent.min : null,
        max: parent ? parent.max : null,
      };
      couches.push(couche);
      if (!/\/>$/.test(balise)) pile.push(couche);
    } else if (pile.length > 0) {
      const courante = pile.at(-1);
      const valeur = compacter(m[2]);
      switch (m[1]) {
        case 'Name': if (!courante.nom) courante.nom = valeur; break;
        case 'Title': if (!courante.titre) courante.titre = valeur; break;
        case 'Abstract': if (!courante.resume) courante.resume = valeur; break;
        case 'CRS':
        case 'SRS': courante.crs.push(valeur.toUpperCase()); break;
        case 'MinScaleDenominator': courante.min = nombreOuNull(valeur); break;
        default: courante.max = nombreOuNull(valeur);
      }
    }
  }
  const vus = new Set();
  const catalogue = [];
  for (const c of couches) {
    if (!c.nom || vus.has(c.nom)) continue;
    vus.add(c.nom);
    catalogue.push({
      nom: nettoyer(c.nom, 200),
      titre: nettoyer(c.titre, 300),
      resume: tronquer(nettoyer(c.resume, 2000), MAX_RESUME),
      crs3857: c.crs.includes('EPSG:3857'),
      echelleMin: c.min,
      echelleMax: c.max,
    });
  }
  return catalogue;
}

// ---------- Familles ----------

export function classerFamilles(entree) {
  const e = estObjet(entree) ? entree : {};
  const cible = normaliser(`${texte(e.nom)} ${texte(e.titre)} ${texte(e.resume)}`);
  return CLES_FAMILLES.filter((cle) => FAMILLES[cle].motif.test(cible));
}

export function grouperParFamille(catalogue) {
  const groupes = Object.fromEntries(CLES_FAMILLES.map((cle) => [cle, []]));
  for (const entree of Array.isArray(catalogue) ? catalogue : []) {
    if (!estObjet(entree)) continue;
    for (const cle of classerFamilles(entree)) groupes[cle].push(entree);
  }
  return groupes;
}

export function filtrerCatalogue(catalogue, recherche) {
  const liste = Array.isArray(catalogue) ? catalogue.filter(estObjet) : [];
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean);
  if (mots.length === 0) return liste;
  return liste.filter((e) => {
    const cible = normaliser(`${texte(e.nom)} ${texte(e.titre)} ${texte(e.resume)}`);
    return mots.every((mot) => cible.includes(mot));
  });
}

export function lieuPourEntree(entree) {
  const [premiere] = classerFamilles(entree);
  return LIEUX[premiere ?? 'autre'];
}

export function choisirSelection(noms, catalogue, max = 6) {
  const limite = Number.isInteger(max) && max >= 0 ? max : 6;
  const connus = new Set((Array.isArray(catalogue) ? catalogue : []).filter(estObjet).map((e) => e.nom));
  const retenus = [];
  const refuses = [];
  for (const nom of Array.isArray(noms) ? noms : []) {
    if (typeof nom !== 'string' || retenus.includes(nom) || refuses.some((r) => r.nom === nom)) continue;
    if (!connus.has(nom)) refuses.push({ nom, raison: 'inconnu' });
    else if (retenus.length >= limite) refuses.push({ nom, raison: 'limite' });
    else retenus.push(nom);
  }
  return { retenus, refuses };
}

// ---------- Constructeurs d'URL ----------

const lieuValide = (lieu) => (estObjet(lieu) && estNombre(lieu.lat) && estNombre(lieu.lon) && estNombre(lieu.zoom) ? lieu : LIEUX.autre);

export function tuilePourLieu(lieu) {
  const l = lieuValide(lieu);
  return tuileDepuis(l.lat, l.lon, l.zoom);
}

export function urlGetMapCalque(options) {
  const o = estObjet(options) ? options : {};
  const t = tuilePourLieu(o.lieu);
  return urlWmsGetMap({ hote: HOTE_GEORISQUES, couche: texte(o.couche), bbox: bboxTuile3857(t.z, t.x, t.y) });
}

export function urlTuileOsmLieu(lieu) {
  return urlTuileOsm(tuilePourLieu(lieu));
}

function urlApi(chemin, coordonnees, parametres) {
  const c = estObjet(coordonnees) ? coordonnees : {};
  const lat = estNombre(c.lat) ? c.lat : 0;
  const lon = estNombre(c.lon) ? c.lon : 0;
  const u = new URL(`https://www.georisques.gouv.fr/api/v1/${chemin}`);
  u.searchParams.set('latlon', `${lon},${lat}`);
  for (const [cle, valeur] of parametres) u.searchParams.set(cle, valeur);
  return u.toString();
}

export const urlApiGaspar = (coordonnees) => urlApi('gaspar/risques', coordonnees, [['rayon', '1000']]);
export const urlApiRga = (coordonnees) => urlApi('rga', coordonnees, []);

// ---------- Aplatissement d'une réponse JSON ----------

const PROFONDEUR_MAX = 6;

function valeurSimple(v, maxLongueur) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') {
    const propre = nettoyer(v, 100000);
    return propre.length > maxLongueur ? `${propre.slice(0, maxLongueur)} …` : propre;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'bigint') return v.toString();
  return '(non sérialisable)';
}

export function aplatirJson(valeur, options) {
  const o = estObjet(options) ? options : {};
  const maxLignes = Number.isInteger(o.maxLignes) && o.maxLignes > 0 ? Math.min(o.maxLignes, 500) : 40;
  const maxLongueur = Number.isInteger(o.maxLongueur) && o.maxLongueur > 0 ? Math.min(o.maxLongueur, 1000) : 80;
  const lignes = [];
  const ancetres = [];
  const ajouter = (chemin, v) => lignes.push(`${chemin}: ${v}`);

  function parcourir(v, chemin, profondeur) {
    if (lignes.length > maxLignes) return;
    const conteneur = v !== null && typeof v === 'object';
    if (!conteneur) return ajouter(chemin, valeurSimple(v, maxLongueur));
    if (ancetres.includes(v)) return ajouter(chemin, '(référence circulaire)');
    if (profondeur >= PROFONDEUR_MAX) return ajouter(chemin, '… (profondeur maximale)');
    ancetres.push(v);
    try {
      if (Array.isArray(v)) {
        if (v.length === 0) ajouter(chemin, '[]');
        v.slice(0, 3).forEach((element, i) => parcourir(element, `${chemin}[${i}]`, profondeur + 1));
        if (v.length > 3) ajouter(chemin, `… ${v.length} éléments`);
      } else {
        const cles = Object.keys(v);
        if (cles.length === 0) ajouter(chemin, '{}');
        for (const cle of cles) parcourir(v[cle], chemin === '' ? nettoyer(cle, 80) : `${chemin}.${nettoyer(cle, 80)}`, profondeur + 1);
      }
    } finally {
      ancetres.pop();
    }
  }

  try {
    parcourir(valeur, '', 0);
  } catch {
    return ['(valeur non lisible)'];
  }
  if (lignes.length > maxLignes) {
    lignes.length = maxLignes;
    lignes[maxLignes - 1] = '… (lignes suivantes omises)';
  }
  return lignes.map((l) => (l.startsWith(': ') ? `(racine)${l}` : l));
}

// ---------- Durées ----------

export function resumerDurees(ms) {
  const valeurs = (Array.isArray(ms) ? ms : []).filter((v) => estNombre(v) && v >= 0).sort((a, b) => a - b);
  if (valeurs.length === 0) return null;
  const milieu = Math.floor(valeurs.length / 2);
  const mediane = valeurs.length % 2 === 1 ? valeurs[milieu] : (valeurs[milieu - 1] + valeurs[milieu]) / 2;
  return { min: Math.round(valeurs[0]), max: Math.round(valeurs.at(-1)), mediane: Math.round(mediane) };
}

// ---------- Rapport ----------

export const JUGEMENTS = {
  bien: 'Montre bien la zone',
  rien: 'Ne montre rien',
  illisible: 'Illisible',
};

const LIBELLES_ETAT = {
  ok: 'ok',
  http: 'réponse HTTP lisible ou en erreur',
  bloque: 'bloqué (réseau, CORS ou bloqueur)',
  delai: 'délai dépassé',
  'image-echec': "échec de l'image",
  'non-lu': 'non lu',
};

const libelleEtat = (etat) => (typeof etat === 'string' && Object.hasOwn(LIBELLES_ETAT, etat) ? LIBELLES_ETAT[etat] : 'non lu');
const libelleJugement = (j) => (typeof j === 'string' && Object.hasOwn(JUGEMENTS, j) ? JUGEMENTS[j] : 'non renseigné');
const duree = (v) => (estNombre(v) && v >= 0 ? `${Math.round(v)} ms` : '-');
const liste = (v) => (Array.isArray(v) ? v.filter(estObjet) : []);

export function formaterRapportCouches(parametres) {
  const p = estObjet(parametres) ? parametres : {};
  const catalogue = estObjet(p.catalogue) ? p.catalogue : {};
  const familles = estObjet(p.familles) ? p.familles : {};
  const cartes = liste(p.cartes);
  const api = liste(p.api);
  const lignes = [
    'Rapport du catalogue des couches Géorisques',
    `Horodatage (date et heure) : ${nettoyer(p.date)}`,
    `Origine de la page : ${nettoyer(p.origine)}`,
    `Navigateur : ${nettoyer(p.navigateur)}`,
    '',
    'Catalogue',
    `- État : ${libelleEtat(catalogue.etat)}${catalogue.detail ? ` (${nettoyer(catalogue.detail)})` : ''}`,
    `- Couches lues : ${estNombre(catalogue.nombre) ? Math.trunc(catalogue.nombre) : 0}`,
  ];
  for (const cle of CLES_FAMILLES) {
    const entrees = liste(familles[cle]);
    lignes.push('', `Famille ${FAMILLES[cle].libelle} (${entrees.length} couche${entrees.length > 1 ? 's' : ''})`);
    for (const e of entrees.slice(0, 25)) lignes.push(`- ${nettoyer(e.nom, 120)} | ${nettoyer(e.titre, 160)}`);
    if (entrees.length > 25) lignes.push(`- … ${entrees.length - 25} autres non listées`);
  }
  lignes.push('', `Tuiles d'essai (${cartes.length})`);
  if (cartes.length === 0) lignes.push('- aucune tuile affichée');
  const toutes = [];
  for (const c of cartes) {
    const durees = Array.isArray(c.durees) ? c.durees : [];
    toutes.push(...durees);
    lignes.push(
      `- ${nettoyer(c.nom, 120)} | ${nettoyer(c.titre, 160)} | lieu : ${nettoyer(c.lieu, 60)} | durées : ${durees.map(duree).join(' ; ') || '-'} | état : ${libelleEtat(c.etat)} | jugement : ${libelleJugement(c.jugement)}`,
    );
  }
  const resume = resumerDurees(toutes);
  if (resume) lignes.push(`- Durées de chargement : min ${resume.min} ms, médiane ${resume.mediane} ms, max ${resume.max} ms`);
  lignes.push('', 'API Géorisques');
  if (api.length === 0) lignes.push('- non lue');
  for (const r of api) {
    lignes.push(`- ${nettoyer(r.libelle, 120)} : ${libelleEtat(r.etat)}${r.statut ? `, ${nettoyer(r.statut, 60)}` : ''} (${duree(r.ms)})`);
    for (const l of (Array.isArray(r.lignes) ? r.lignes : []).slice(0, 40)) lignes.push(`    ${nettoyer(l, 200)}`);
  }
  lignes.push(
    '',
    'Limites',
    "- Un TypeError (réseau, CORS, bloqueur) est indistinguable dans le navigateur : une extension de confidentialité peut fausser les durées et les états.",
    "- Le jugement est subjectif : il décrit ce que le propriétaire voit sur une tuile de 256 pixels, à un seul niveau de zoom et en un seul lieu par famille.",
    "- Les durées sont mesurées une fois, depuis un seul navigateur et un seul réseau ; une tuile mise en cache par le service peut paraître plus rapide.",
    '- Ce rapport donne des états et des jugements ; il ne recommande aucune couche.',
  );
  return lignes.join('\n');
}
