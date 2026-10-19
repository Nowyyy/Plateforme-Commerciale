// Générateur de PDF d'exemple, sans dépendance (API « node: » seulement).
// construirePdf({ titre, lignes }) : PDF 1.4, une page A4, Helvetica (WinAnsi), sans date ni identifiant aléatoire.
// Commande : node scripts/documents/generer.mjs écrit les documents de contenus.json dans assets/documents/ (jamais ailleurs).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DOSSIER_SORTIE = resolve(RACINE, 'assets', 'documents');
export const CHEMIN_CONTENUS = resolve(RACINE, 'scripts', 'documents', 'contenus.json');

const PAGE = { largeur: 595, hauteur: 842, marge: 56 };
const TITRE = { taille: 16, interligne: 24 };
const CORPS = { taille: 11, interligne: 16 };
const LARGEUR_MOYENNE = 0.55; // largeur moyenne d'un caractère Helvetica, en em (estimation prudente)

// Caractères hors Latin-1 utiles, avec leur octet WinAnsi (Windows-1252)
const WINANSI = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89],
  ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95],
  ['–', 0x96], ['—', 0x97], ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);
const ESPACES_FINES = new Set([' ', ' ', ' ', ' ', ' ', ' ', ' ']);

// Texte -> octets WinAnsi ; un caractère non supporté lève une erreur qui le nomme.
export function encoderWinAnsi(texte) {
  const octets = [];
  for (const c of String(texte)) {
    const code = c.codePointAt(0);
    if (ESPACES_FINES.has(c)) octets.push(0x20);
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) octets.push(code);
    else if (WINANSI.has(c)) octets.push(WINANSI.get(c));
    else throw new Error(`Caractère non supporté par WinAnsi : « ${c} » (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
  }
  return Uint8Array.from(octets);
}

// Chaîne littérale PDF : octets WinAnsi écrits tels quels, parenthèses et barre oblique inverse échappées.
export function litteralPdf(texte) {
  let sortie = '';
  for (const o of encoderWinAnsi(texte)) {
    if (o === 0x28 || o === 0x29 || o === 0x5c) sortie += `\\${String.fromCharCode(o)}`;
    else sortie += String.fromCharCode(o);
  }
  return `(${sortie})`;
}

// Chaîne de texte UTF-16BE en hexadécimal (titre du document : tout caractère reste lisible)
function titreHexa(texte) {
  let hexa = 'FEFF';
  for (let i = 0; i < texte.length; i += 1) hexa += texte.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
  return `<${hexa}>`;
}

// Renvoie à la ligne par mots avant la marge ; un mot trop long est coupé.
function renvoyer(texte, taille) {
  const max = Math.floor((PAGE.largeur - 2 * PAGE.marge) / (taille * LARGEUR_MOYENNE));
  const lignes = [];
  let courante = '';
  for (const mot of texte.split(' ')) {
    let reste = mot;
    while (reste.length > max) {
      if (courante) { lignes.push(courante); courante = ''; }
      lignes.push(reste.slice(0, max));
      reste = reste.slice(max);
    }
    const essai = courante ? `${courante} ${reste}` : reste;
    if (essai.length > max) { lignes.push(courante); courante = reste; } else courante = essai;
  }
  lignes.push(courante);
  return lignes;
}

// Flux de contenu : chaque ligne est positionnée par un Td (relatif à la ligne précédente).
function flux({ titre, lignes }) {
  const posees = [];
  for (const l of renvoyer(titre, TITRE.taille)) posees.push({ texte: l, ...TITRE });
  posees.push({ texte: '', ...CORPS });
  for (const ligne of lignes) {
    for (const l of ligne === '' ? [''] : renvoyer(ligne, CORPS.taille)) posees.push({ texte: l, ...CORPS });
  }
  const commandes = ['BT'];
  let y = PAGE.hauteur - PAGE.marge - TITRE.taille;
  let precedent = null;
  for (const { texte, taille, interligne } of posees) {
    if (y < PAGE.marge) throw new Error('Le contenu dépasse la page A4');
    commandes.push(`/F1 ${taille} Tf`, precedent === null ? `${PAGE.marge} ${y} Td` : `0 ${y - precedent} Td`);
    if (texte !== '') commandes.push(`${litteralPdf(texte)} Tj`);
    precedent = y;
    y -= interligne;
  }
  commandes.push('ET');
  return `${commandes.join('\n')}\n`;
}

// PDF 1.4 : Catalog, Pages, Page, Font, Contents, Info ; xref aux décalages calculés.
export function construirePdf({ titre, lignes }) {
  if (typeof titre !== 'string' || titre === '' || !Array.isArray(lignes)) throw new Error('construirePdf demande { titre, lignes }');
  const contenu = flux({ titre, lignes });
  const longueur = Buffer.from(contenu, 'latin1').length;
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R /Lang (fr-FR) >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.largeur} ${PAGE.hauteur}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${longueur} >>\nstream\n${contenu}endstream`,
    `<< /Title ${titreHexa(titre)} >>`,
  ];
  const morceaux = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const decalages = [];
  let position = morceaux[0].length;
  objets.forEach((corps, i) => {
    decalages.push(position);
    const morceau = Buffer.from(`${i + 1} 0 obj\n${corps}\nendobj\n`, 'latin1');
    morceaux.push(morceau);
    position += morceau.length;
  });
  const entrees = ['0000000000 65535 f \n', ...decalages.map((d) => `${String(d).padStart(10, '0')} 00000 n \n`)];
  morceaux.push(Buffer.from(
    `xref\n0 ${objets.length + 1}\n${entrees.join('')}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${position}\n%%EOF\n`,
    'latin1',
  ));
  return new Uint8Array(Buffer.concat(morceaux));
}

export function lireContenus(chemin = CHEMIN_CONTENUS) {
  const { documents } = JSON.parse(readFileSync(chemin, 'utf8'));
  if (!Array.isArray(documents) || documents.length === 0) throw new Error('contenus.json : liste « documents » absente');
  return documents.map((d) => ({ fichier: d.fichier, octets: construirePdf({ titre: d.titre, lignes: d.lignes }) }));
}

// Refuse toute destination hors de assets/documents/ (y compris par « .. » ou chemin absolu).
export function resoudreSortie(nom, dossier = DOSSIER_SORTIE) {
  const cible = resolve(dossier, nom);
  const rel = relative(dossier, cible);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel) || rel.includes(sep) || !rel.endsWith('.pdf')) {
    throw new Error(`Écriture refusée hors de assets/documents/ : « ${nom} »`);
  }
  return cible;
}

export function ecrireDocuments(dossier = DOSSIER_SORTIE) {
  if (resolve(dossier) !== DOSSIER_SORTIE) throw new Error(`Écriture refusée hors de assets/documents/ : « ${dossier} »`);
  mkdirSync(dossier, { recursive: true });
  const ecrits = [];
  for (const { fichier, octets } of lireContenus()) {
    const cible = resoudreSortie(fichier, dossier);
    writeFileSync(cible, octets);
    ecrits.push(cible);
  }
  return ecrits;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const chemin of ecrireDocuments()) console.log(`écrit : ${relative(RACINE, chemin)}`);
}
