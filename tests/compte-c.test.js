import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { documentsCommande } from '../assets/js/compte-logique.js';
import { resoudre } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const compte = JSON.parse(lire('data/compte.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('achat.html');
const produit = lire('produit.html');
const panier = lire('panier.html');
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const gabarit = (source, nom) => bloc(source, `<template data-gabarit="${nom}">`, '</template>');
const sansCode = (texte) => texte.replace(/ data-bloc="E\d+-\d+"/g, '');
const traces = (source) => [...source.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);

describe('lot 8c-C : achat.html', () => {
  it('codes E9-1 à E9-7 une fois chacun dans l\'ordre, fil d\'Ariane, un seul h1, aucun id dupliqué, rien d\'en ligne ni d\'externe', () => {
    expect([...html.matchAll(/data-bloc="(E\d+-\d+)"/g)].map((m) => m[1])).toEqual(['E9-1', 'E9-2', 'E9-3', 'E9-4', 'E9-5', 'E9-6', 'E9-7']);
    expect([...html.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1])).toEqual(['en-tete', 'resume', 'lignes', 'livraison', 'documents', 'sav', 'pied']);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toMatch(/<\/header>\s*<nav class="fil"[^>]*data-aria-label="compte\.pages\.achat\.fil\.aria"/);
    expect(html).toContain('data-lien="site.liens.compte"');
    expect(html).toContain('data-lien="site.liens.achats"');
    expect(html).toContain('class="fil__courant" aria-current="page"');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\sstyle=/);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    for (const cle of [...html.replace(/<template[\s\S]*?<\/template>/g, '').matchAll(/ data-(?:texte|lien|aria-label)="([^"]+)"/g)].map((m) => m[1])) {
      expect(() => resoudre({ site, compte }, cle), cle).not.toThrow();
    }
  });
  it('gabarit de ligne : <details>, aucun contrôle de quantité ni bouton « Retirer », aucun id', () => {
    const ligne = gabarit(html, 'ligne');
    expect(ligne).toContain('<details class="ligne__details">');
    expect(ligne).toContain('<summary');
    expect(ligne).not.toMatch(/\sid=/);
    expect(ligne).not.toMatch(/quantite__|data-quantite|ligne__retirer|<button|<output|role="group"/);
    expect(html).not.toMatch(/Tout déplier|recap__deplier/);
    for (const classe of ['ligne__nom', 'ligne__reference', 'ligne__mode', 'ligne__cotes', 'ligne__prix', 'ligne__total', 'ligne__liste-cotes', 'ligne__apercu', 'ligne__liste-delais']) {
      expect(ligne).toContain(classe);
    }
  });
  it('aperçu schématique : role="img", libellé par clé de données, groupes cote-a et cote-b, tracés identiques à produit.html et panier.html, aucune valeur hexadécimale', () => {
    const apercu = gabarit(html, 'apercu');
    expect(apercu).toMatch(/<svg [^>]*role="img"/);
    expect(apercu).toContain('class="schema__cote cote-a"');
    expect(apercu).toContain('class="schema__cote cote-b"');
    expect(apercu).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(apercu).not.toMatch(/\sid=/);
    const attendu = traces(gabarit(panier, 'apercu'));
    expect(traces(apercu)).toEqual(attendu);
    const groupe = (source, motif) => bloc(source, motif, '</g>');
    for (const cote of ['cote-a', 'cote-b']) {
      const attenduFiche = traces(groupe(produit, `<g id="${cote}" class="schema__cote">`));
      expect(attenduFiche.length, cote).toBeGreaterThan(0);
      expect(traces(groupe(apercu, `class="schema__cote ${cote}"`)), cote).toEqual(attenduFiche);
    }
    expect(compte.pages.achat.ligne.apercuAria).toMatch(/\{largeur\}.*\{hauteur\}/);
    expect(compte.pages.achat.ligne.lettres).toEqual({ a: 'A', b: 'B' });
  });
});

describe('lot 8c-C : documents, liens et styles', () => {
  it('pour chaque commande, la liste de documents attendue pointe vers des fichiers existants', () => {
    const attendu = { 'CMD-1051': 1, 'CMD-1029': 1, 'CMD-1044': 3, 'CMD-1037': 5 };
    for (const c of compte.commandes) {
      const liste = documentsCommande(c, compte.documents);
      expect(liste, c.id).toHaveLength(attendu[c.id]);
      for (const d of liste) {
        expect(existsSync(d.fichier), `${c.id} ${d.fichier}`).toBe(true);
        expect(d.fichier).toMatch(/^assets\/documents\/[a-z-]+\.pdf$/);
      }
    }
    expect(compte.pages.achat.documentsTextes.libelle).toBe('{titre} (PDF, exemple)');
    expect(gabarit(html, 'document')).toMatch(/<a [^>]*download[^>]*type="application\/pdf"/);
  });
  it('liens : achat et les autres existent ; sav et demandes pointent vers les pages Hi-Fi du lot 8d (avant : wireframes)', () => {
    for (const cle of ['connexion', 'compte', 'achats', 'achat', 'informations']) expect(existsSync(site.liens[cle]), cle).toBe(true);
    expect(site.liens.sav).toBe('sav.html');
    expect(site.liens.demandes).toBe('demandes.html');
    expect(existsSync(site.liens.sav) && existsSync(site.liens.demandes)).toBe(true);
  });
  it('css/compte.css sans valeur hexadécimale ; modules du lot sans appel réseau ni stockage hors compte et achat', () => {
    expect(lire('css/compte.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const m of ['achat.js', 'achats.js', 'compte.js', 'informations.js', 'connexion.js', 'compte-vue.js', 'compte-session.js', 'compte-lien.js']) {
      const src = lire(`assets/js/${m}`).replace(/\/\/.*$/gm, '');
      expect(src, m).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie/);
      for (const [, cle] of src.matchAll(/(?:getItem|setItem|removeItem)\(\s*([A-Za-z_.'"]+)/g)) expect(['CLE_COMPTE', 'CLE_ACHAT', 'cle'], `${m} ${cle}`).toContain(cle);
    }
    expect(lire('assets/js/compte-session.js')).toMatch(/CLE_COMPTE = 'compte'/);
    expect(lire('assets/js/compte-session.js')).toMatch(/CLE_ACHAT = 'achat'/);
  });
  it('le préchargement de police ajouté à diagnostic.html ne change ni l\'en-tête, ni le pied, ni le décor', () => {
    const diagnostic = lire('diagnostic.html');
    const index = lire('index.html');
    expect(diagnostic.match(/<link rel="preload" href="assets\/fonts\/inter-latin-600-normal\.woff2" as="font" type="font\/woff2" crossorigin>/g)).toHaveLength(1);
    expect(sansCode(bloc(diagnostic, '<header', '</header>'))).toBe(sansCode(bloc(index, '<header', '</header>')));
    expect(sansCode(bloc(diagnostic, '<footer', '</footer>'))).toBe(sansCode(bloc(index, '<footer', '</footer>')));
    expect(bloc(diagnostic, '<div class="relief"', '</svg>\n  </div>')).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
  });
});
