import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import {
  construirePdf, encoderWinAnsi, litteralPdf, lireContenus, resoudreSortie, ecrireDocuments,
} from '../scripts/documents/generer.mjs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const html = lire('produit.html');
const batardeau = produit.produits.find((p) => p.id === 'batardeau-modulable');
const pdf = construirePdf({ titre: 'Titre d\'essai', lignes: ['Ligne un', '', 'Ligne (deux) \\ fin'] });
const texte = Buffer.from(pdf).toString('latin1');
const PHRASE = 'Aucune valeur de ce document n\'a de valeur contractuelle ou réglementaire.';

describe('construirePdf', () => {
  it('commence par %PDF-1.4, finit par %%EOF et contient catalogue, langue et startxref', () => {
    expect(texte.startsWith('%PDF-1.4')).toBe(true);
    expect(texte.trimEnd().endsWith('%%EOF')).toBe(true);
    for (const marque of ['/Type /Catalog', '/Lang (fr-FR)', 'startxref', '/BaseFont /Helvetica', '/Encoding /WinAnsiEncoding', '/MediaBox [0 0 595 842]']) {
      expect(texte, marque).toContain(marque);
    }
  });

  it('table xref exacte : chaque entrée pointe sur « N 0 obj », startxref pointe sur xref', () => {
    const debut = Number(texte.match(/startxref\n(\d+)\n%%EOF/)[1]);
    expect(texte.slice(debut, debut + 4)).toBe('xref');
    const [, premier, nombre] = texte.slice(debut).match(/^xref\n(\d+) (\d+)\n/);
    expect([premier, nombre]).toEqual(['0', '7']);
    const entrees = [...texte.slice(debut).matchAll(/^(\d{10}) (\d{5}) ([nf]) \n/gm)];
    expect(entrees).toHaveLength(7);
    expect(entrees[0].slice(1)).toEqual(['0000000000', '65535', 'f']);
    entrees.slice(1).forEach((e, i) => {
      expect(texte.slice(Number(e[1])).startsWith(`${i + 1} 0 obj\n`), `objet ${i + 1}`).toBe(true);
    });
    expect(texte).toMatch(/\/Length (\d+) >>\nstream\n/);
    const longueur = Number(texte.match(/\/Length (\d+) >>/)[1]);
    const flux = texte.slice(texte.indexOf('stream\n') + 7, texte.indexOf('endstream'));
    expect(flux.length).toBe(longueur);
  });

  it('déterministe : mêmes entrées, mêmes octets ; aucune date ni identifiant', () => {
    const autre = construirePdf({ titre: 'Titre d\'essai', lignes: ['Ligne un', '', 'Ligne (deux) \\ fin'] });
    expect(Buffer.from(autre).equals(Buffer.from(pdf))).toBe(true);
    expect(texte).not.toMatch(/CreationDate|ModDate|\/ID|Producer|Creator/);
  });

  it('renvoie à la ligne et refuse un contenu qui dépasse la page', () => {
    const long = construirePdf({ titre: 'T', lignes: [`${'mot '.repeat(60)}fin`] });
    expect(Buffer.from(long).toString('latin1').match(/ Tj/g).length).toBeGreaterThan(2);
    expect(() => construirePdf({ titre: 'T', lignes: Array.from({ length: 80 }, () => 'x') })).toThrow(/dépasse/);
  });
});

describe('encodage WinAnsi', () => {
  it('convertit é, ’, œ, € ; espaces fines remplacées ; caractère non supporté nommé', () => {
    expect([...encoderWinAnsi('é’œ€—«')]).toEqual([0xe9, 0x92, 0x9c, 0x80, 0x97, 0xab]);
    expect([...encoderWinAnsi('a b c')]).toEqual([0x61, 0x20, 0x62, 0x20, 0x63]);
    expect(() => encoderWinAnsi('ok 漢')).toThrow(/漢/);
    expect(() => construirePdf({ titre: 'T', lignes: ['é 漢'] })).toThrow(/漢/);
  });

  it('échappe parenthèses et barre oblique inverse', () => {
    expect(litteralPdf('a(b)c\\d')).toBe('(a\\(b\\)c\\\\d)');
  });
});

describe('fichiers générés', () => {
  const contenus = lireContenus();
  it('les deux PDF existent, pèsent moins de 50 Ko, sont identiques à la génération et marqués fictifs', () => {
    expect(contenus).toHaveLength(2);
    for (const { fichier, octets } of contenus) {
      const chemin = `assets/documents/${fichier}`;
      expect(existsSync(chemin), chemin).toBe(true);
      expect(statSync(chemin).size).toBeLessThan(50 * 1024);
      expect(Buffer.from(octets).equals(readFileSync(chemin)), `${chemin} dérive du générateur`).toBe(true);
      const contenu = readFileSync(chemin).toString('latin1');
      expect(contenu).toContain('DOCUMENT FICTIF');
      expect(contenu).toContain(PHRASE);
    }
  });
});

describe('liens de documents', () => {
  it('chaque fichier désigne un fichier existant ; liens avec download et type ; libellé « (PDF, exemple) » ; aucune URL absolue', () => {
    for (const d of batardeau.documents) {
      expect(existsSync(d.fichier), d.fichier).toBe(true);
      expect(d.fichier).not.toMatch(/^([a-z]+:|\/)/i);
    }
    const modele = html.slice(html.indexOf('data-liste-produit="documents"'), html.indexOf('</template>', html.indexOf('data-liste-produit="documents"')));
    expect(modele).toMatch(/<a [^>]*download[^>]*type="application\/pdf"/);
    expect(modele).toMatch(/data-lien-element="fichier"/);
    expect(modele).not.toMatch(/https?:/);
    expect(produit.documentsTextes.libelle).toContain('(PDF, exemple)');
    expect(produit.documentsTextes.libelle).toContain('{titre}');
  });
});

describe('écriture', () => {
  it('refuse d\'écrire hors de assets/documents/', () => {
    for (const nom of ['../evil.pdf', '/tmp/evil.pdf', 'sous/dossier.pdf', 'fichier.txt', '..']) {
      expect(() => resoudreSortie(nom), nom).toThrow(/refusée/);
    }
    expect(() => ecrireDocuments('/tmp')).toThrow(/refusée/);
    expect(resoudreSortie('pv-essais-exemple.pdf').endsWith('assets/documents/pv-essais-exemple.pdf')).toBe(true);
  });
});
