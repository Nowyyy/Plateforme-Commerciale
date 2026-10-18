// Logique pure de la page « Lots » : aucune lecture de Git ni du système de fichiers.
// Les données (apercu.txt, bilan, état de fusion) arrivent en paramètres.

export const TYPES = ['wireframe', 'hifi', 'technique'];

const MOTIF_BRANCHE = /^lot-(\d+)([a-z]?)$/;
const MOTIF_CARACTERES_SURS = /^[A-Za-z0-9._/-]+$/;
// eslint-disable-next-line no-control-regex
const MOTIF_CONTROLE = /[\u0000-\u001f\u007f]/;

// Identifiant d'une branche : « lot-2b » donne { id: 'lot-2b', numero: '2b', nombre: 2, lettre: 'b' } ; sinon null.
export function lireIdentifiant(branche) {
  const m = MOTIF_BRANCHE.exec(String(branche));
  if (!m) return null;
  return { id: branche, numero: `${m[1]}${m[2]}`, nombre: Number(m[1]), lettre: m[2] };
}

// Numéro croissant, puis lettre (sans lettre avant « b », « b » avant « c »).
export function comparerLots(a, b) {
  if (a.nombre !== b.nombre) return a.nombre - b.nombre;
  if (a.lettre === b.lettre) return 0;
  return a.lettre < b.lettre ? -1 : 1;
}

// Cible relative sûre, ou null. Une cible qui finit par « / » désigne son index.html.
export function validerCible(cible) {
  if (typeof cible !== 'string') return null;
  const c = cible.trim();
  if (c === '' || MOTIF_CONTROLE.test(c)) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(c)) return null;
  if (c.startsWith('/') || c.includes('\\') || c.split('/').includes('..') || c.includes('..')) return null;
  if (!MOTIF_CARACTERES_SURS.test(c)) return null;
  return c.endsWith('/') ? `${c}index.html` : c;
}

// Format : cible sur la première ligne ; lignes optionnelles « type: … » et « titre: … ».
// Les anciens fichiers (cible seule) restent valides.
export function lireApercu(texte) {
  if (typeof texte !== 'string') return { erreur: 'apercu.txt absent' };
  const lignes = texte.replace(/\r/g, '').split('\n');
  const cible = validerCible(lignes[0]);
  if (cible === null) return { erreur: `cible invalide : « ${lignes[0] ?? ''} »` };
  const resultat = { cible };
  for (const ligne of lignes.slice(1)) {
    const m = /^\s*(type|titre)\s*:\s*(.*?)\s*$/i.exec(ligne);
    if (!m) continue;
    const cle = m[1].toLowerCase();
    if (cle === 'type') {
      const type = m[2].toLowerCase();
      if (!TYPES.includes(type)) return { erreur: `type inconnu : « ${m[2]} »` };
      resultat.type = type;
    } else if (m[2] !== '') {
      resultat.titre = m[2];
    }
  }
  return resultat;
}

export function classer(apercu) {
  if (apercu.type) return apercu.type;
  return apercu.cible.startsWith('wireframes/') ? 'wireframe' : 'hifi';
}

// Premier titre du bilan, sans le préfixe « # Lot <numero> — ».
export function extraireTitre(bilan, numero) {
  if (typeof bilan === 'string') {
    const ligne = bilan.replace(/\r/g, '').split('\n').find((l) => /^#\s+\S/.test(l));
    if (ligne) {
      const brut = ligne.replace(/^#\s+/, '').trim();
      const sans = brut.replace(new RegExp(`^Lot\\s+${numero}\\s*[—–-]\\s*`, 'i'), '').trim();
      if (sans !== '') return sans;
    }
  }
  return `Lot ${numero}`;
}

// Un lot à partir des données d'une branche, ou { ignore: raison } (jamais d'exception).
// entree : { branche, apercu (texte ou null), bilan (texte ou null), fusionne (true, false ou null = inconnu) }
export function construireLot(entree) {
  const ident = lireIdentifiant(entree.branche);
  if (!ident) return { ignore: `branche ignorée (nom non conforme) : ${entree.branche}` };
  if (entree.apercu === null || entree.apercu === undefined) {
    return { ignore: `${ident.id} ignoré : pas d'apercu.txt`, silencieux: true };
  }
  const apercu = lireApercu(entree.apercu);
  if (apercu.erreur) return { ignore: `${ident.id} ignoré : ${apercu.erreur}` };
  const type = classer(apercu);
  const titre = apercu.titre ?? extraireTitre(entree.bilan, ident.numero);
  const avertissements = [];
  if (entree.fusionne !== true && entree.fusionne !== false) {
    avertissements.push(`${ident.id} : fusion indéterminée (historique insuffisant), traité comme « en cours »`);
  }
  return {
    lot: {
      id: ident.id,
      numero: ident.numero,
      nombre: ident.nombre,
      lettre: ident.lettre,
      type,
      cible: apercu.cible,
      titre,
      libelle: titre === `Lot ${ident.numero}` ? titre : `Lot ${ident.numero} — ${titre}`,
      fusionne: entree.fusionne === true,
    },
    avertissements,
  };
}

// Toutes les branches : lots valides triés, avertissements lisibles.
export function preparerLots(entrees) {
  const lots = [];
  const avertissements = [];
  for (const entree of entrees) {
    const r = construireLot(entree);
    if (r.ignore) {
      if (!r.silencieux) avertissements.push(r.ignore);
      continue;
    }
    lots.push(r.lot);
    avertissements.push(...r.avertissements);
  }
  lots.sort(comparerLots);
  return { lots, avertissements };
}

function vue(lot) {
  return {
    id: lot.id,
    numero: lot.numero,
    libelle: lot.libelle,
    titre: lot.titre,
    etat: lot.fusionne ? 'fusionne' : 'en-cours',
    href: lot.fusionne ? `../${lot.cible}` : `../${lot.id}/${lot.cible}`,
  };
}

function dernier(lots, type) {
  const ceuxLa = lots.filter((l) => l.type === type);
  return ceuxLa.length ? ceuxLa[ceuxLa.length - 1] : null;
}

// Les trois éléments de la page. Les lots techniques n'y figurent jamais.
export function choisirVues(lots) {
  const tries = [...lots].sort(comparerLots);
  const wireframe = dernier(tries, 'wireframe');
  const hifi = dernier(tries, 'hifi');
  const anciens = tries
    .filter((l) => l.type === 'hifi' && l !== hifi)
    .reverse()
    .map((l) => ({ id: l.id, numero: l.numero, libelle: l.libelle, titre: l.titre, href: `../${l.id}/${l.cible}` }));
  return {
    wireframe: wireframe ? vue(wireframe) : null,
    hifi: hifi ? vue(hifi) : null,
    anciens,
  };
}
