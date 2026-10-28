import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { doitBasculer, libellesLegende } from '../assets/js/carte-reelle-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const html = lire('diagnostic.html');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const config = diagnostic.carteReelle;
const css = lire('css/diagnostic.css');
const cssCarte = lire('css/carte-reelle.css');
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const section = (role) => {
  const debut = html.indexOf(`data-role="${role}"`);
  return html.slice(debut, html.indexOf('</section>', debut));
};

describe('lot 4e-A : structure de diagnostic.html', () => {
  it('ordre des blocs, codes E2-1 à E2-7 une fois chacun, plus de bloc score, aucun id dupliqué (gabarits compris)', () => {
    const roles = [...html.matchAll(/data-role="([^"]+)"/g)].map((m) => m[1]);
    expect(roles).toEqual(['en-tete', 'adresse', 'carte', 'legende', 'exposition', 'equipements', 'pied']);
    expect([...html.matchAll(/data-bloc="(E2-\d)"/g)].map((m) => m[1])).toEqual(['E2-1', 'E2-2', 'E2-3', 'E2-4', 'E2-5', 'E2-6', 'E2-7']);
    expect(html).not.toMatch(/data-role="score"|diag__score|id="score-|class="score/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('légende et exposition dans des cadres blancs (même classe de carte) ; plus de choix de fond ; pastilles dans equipements', () => {
    for (const role of ['legende', 'exposition']) expect(section(role), role).toMatch(/class="carte bloc-carte/);
    expect(html).not.toMatch(/type="radio"[^>]*fond|liste-fonds|modele-fond|carte-reelle__fonds|legendeFond/);
    expect(section('adresse')).not.toMatch(/pastille|choix-alea|type="radio"/);
    const equipements = section('equipements');
    expect(equipements).toContain('id="choix-alea"');
    expect(equipements).toContain('id="modele-pastille"');
    expect(equipements).toMatch(/<legend data-texte="diagnostic\.textes\.legendeAlea">/);
  });

  it('la liste des pastilles est un gabarit sans nombre figé (aucune pastille écrite dans le HTML)', () => {
    expect(html.match(/<label class="pastille-choix">/g)).toHaveLength(1); // le gabarit
    expect(html).toMatch(/<template id="modele-pastille">/);
    expect(lire('assets/js/diagnostic.js')).toMatch(/modele\.content\.cloneNode\(true\)/);
  });

  it('exposition : jauge décorative, niveau, cases d\'aléas, lien Géorisques ; légende : gabarit et phrase', () => {
    const exposition = section('exposition');
    expect(exposition).toMatch(/<ol class="jauge" id="jauge" aria-hidden="true">/);
    for (const motif of ['id="exposition-niveau"', 'id="liste-calques"', 'id="modele-calque"', 'data-lien-externe="georisques"']) expect(exposition, motif).toContain(motif);
    const legende = section('legende');
    expect(legende).toContain('id="legende-reelle"');
    expect(legende).toContain('class="legende__technique visuellement-cache"');
    expect(legende).not.toContain('diagnostic.textes.legende.phrase'); // retretouche client lot 10c : plus de phrase sous la légende
  });
});

describe('lot 4e-A : CSS de la mise en page', () => {
  it('cadre de la carte : clamp(22rem, 65vh, 34rem), 30 rem dès 1200 px', () => {
    expect(cssCarte).toContain('block-size: clamp(22rem, 65vh, 34rem)');
    expect(cssCarte).toMatch(/@media \(min-width: 1200px\) \{\s*\.carte-cadre \{\s*block-size: 30rem;/);
  });

  it('grille dès 1200 px : colonnes 7fr / 3fr, exposition sur deux rangées, aucun order', () => {
    expect(css).toMatch(/@media \(min-width: 1200px\) \{\s*\.diag \{\s*grid-template-columns: minmax\(0, 7fr\) minmax\(0, 3fr\);/);
    expect(css).toMatch(/\.diag__exposition \{\s*grid-column: 2;\s*grid-row: 2 \/ span 2;/);
    expect(css).toMatch(/\.diag__legende \{\s*grid-column: 1;\s*grid-row: 3;/);
    expect(css).not.toMatch(/\border:\s*-?\d/);
  });

  it('équipements : une colonne, deux de 768 à 1199 px, trois dès 1200 px ; aucune valeur hexadécimale', () => {
    expect(css).toMatch(/\.equipements \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.equipements \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(min-width: 1200px\) \{\s*\.equipements \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    for (const source of [css, cssCarte]) expect(source).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
  });
});

describe('lot 4e-A : données', () => {
  it('textes de la légende, du panneau et des équipements non vides ; clés supprimées absentes', () => {
    const { legende, exposition, equipements } = diagnostic.textes;
    for (const texte of [legende.titre, exposition.titre, exposition.libelle, exposition.indicatif, exposition.phrase, equipements.titre, equipements.neutralise, equipements.voirFiche, equipements.comparer]) expect(texte.trim()).not.toBe('');
    expect(legende.phrase).toBeUndefined();
    expect(exposition.titre).toBe('Exposition à cette adresse');
    const brut = JSON.stringify(diagnostic);
    for (const cle of ['"score"', 'legendeFond', 'legendeCouches', 'chaleurNote', 'scoreIllustratif', 'noteGeorisques']) expect(brut, cle).not.toContain(cle);
  });

  it('légende : une entrée par couche de carteReelle, libellé générique, nom technique dans un texte masqué', () => {
    const entrees = libellesLegende(config);
    const couches = Object.values(config.calques).flat();
    expect(entrees.map((e) => e.nom)).toEqual(couches.map((c) => c.nom));
    for (const entree of entrees) {
      expect(entree.libelle).toMatch(/\(Géorisques\)$/);
      expect(entree.libelle).not.toContain(entree.nom);
      expect(entree.technique).toBe(`Couche : ${entree.nom}`);
    }
    expect(lire('assets/js/carte-reelle.js')).toMatch(/\.legende__technique'\)\.textContent = entree\.technique/);
  });
});

describe('lot 4e-A : modules', () => {
  it('repli automatique conservé : doitBasculer, annonce et aucune radio de fond', () => {
    expect(doitBasculer({ erreurs: 4, charges: 0, ecouleMs: 0 }, config.basculeFond)).toBe(true);
    expect(doitBasculer({ erreurs: 3, charges: 0, ecouleMs: 100 }, config.basculeFond)).toBe(false);
    expect(doitBasculer({ erreurs: 0, charges: 0, ecouleMs: config.basculeFond.delaiMs }, config.basculeFond)).toBe(true);
    const carte = lire('assets/js/carte-reelle.js');
    expect(carte).toContain('etatFond.textContent = textes.basculeFond');
    expect(carte).toContain("choisirFond('ign')");
    expect(carte).not.toMatch(/manuel|construireFonds|liste-fonds/);
    expect(config.textes.basculeFond).toContain('Plan IGN');
  });

  it('aucun stockage écrit ni appel réseau hors géocodage et API ; diagnostic.js sans réseau', () => {
    const carte = sansCommentaires(lire('assets/js/carte-reelle.js'));
    expect(carte.match(/\bfetch\(/g)).toHaveLength(2);
    expect(carte).not.toMatch(/setItem|removeItem|localStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML/);
    const diag = sansCommentaires(lire('assets/js/diagnostic.js'));
    expect(diag).not.toMatch(/\bfetch\(|localStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML/);
  });

  it('en-tête, pied et décor identiques à ceux de index.html (hors code de bloc)', () => {
    const accueil = lire('index.html');
    const sansCode = (t) => t.replace(/ data-bloc="E\d-\d+"/g, '');
    const extraire = (t, d, f) => sansCode(t.slice(t.indexOf(d), t.indexOf(f, t.indexOf(d))));
    for (const [d, f] of [['<div class="relief"', '<noscript>'], ['<header', '</header>'], ['<footer', '</footer>']]) expect(extraire(html, d, f), d).toBe(extraire(accueil, d, f));
  });

  it('le comparateur garde ses niveaux fixes : diagnostic.json conserve aleas[].niveau et niveaux', () => {
    expect(diagnostic.aleas.every((a) => Number.isInteger(a.niveau))).toBe(true);
    expect(diagnostic.niveaux).toHaveLength(4);
    const comparateur = readdirSync('tests').filter((f) => f.startsWith('comparateur-'));
    expect(comparateur.length).toBeGreaterThanOrEqual(3);
  });

  it('CLAUDE.md de moins de 9 000 caractères, conventions.md de 190 lignes au plus', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
    expect(lire('Docs/ref/conventions.md').split('\n').length).toBeLessThanOrEqual(190);
  });
});
