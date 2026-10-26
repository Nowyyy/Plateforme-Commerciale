// Lot 10a-C : accessibilité statique : liens répétés, repères, titres, images, contraste, reflow à 320 px, plafonds de documentation.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { analyserCouleur, composer, luminance, rapportContraste } from './outils/contraste.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const HIFI = ['index', 'diagnostic', 'produit', 'panier', 'pro', 'connexion', 'compte', 'achats', 'achat', 'informations', 'sav-acces', 'sav', 'demandes', 'comparateur'].map((n) => `${n}.html`);
const sansNoscript = (html) => html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
const cle = (donnees, chemin) => chemin.split('.').reduce((o, k) => o?.[k], donnees);
const donnees = {
  site: JSON.parse(lire('data/site.json')), accueil: JSON.parse(lire('data/accueil.json')), diagnostic: JSON.parse(lire('data/diagnostic.json')),
  produit: JSON.parse(lire('data/produit.json')), compte: JSON.parse(lire('data/compte.json')),
};

describe('lot 10a-C : noms accessibles des liens répétés', () => {
  it('les gabarits de liens répétés ont un nom distinct tiré des données : texte masqué (accueil) ou aria-label à gabarit de données (diagnostic, comparateur, achats, panier)', () => {
    const index = lire('index.html');
    expect(index.match(/<span data-texte-global="accueil\.(aleas|protection)\.lien"><\/span> <span class="visuellement-cache" data-texte="titre"><\/span>/g)).toHaveLength(2);
    expect(lire('assets/js/diagnostic.js')).toContain("lien.setAttribute('aria-label', `${textes.equipements.voirFiche} : ${equipement.titre}`)");
    expect(lire('assets/js/comparateur.js')).toContain("lien.setAttribute('aria-label', `${c.comparaison.voirFiche} : ${produit.titre}`)");
    expect(lire('assets/js/compte-vue.js')).toContain("bouton.setAttribute('aria-label', remplirGabarit(t.detailAria, { id: commande.id }))");
    const panier = lire('assets/js/panier.js');
    expect(panier.match(/remplirGabarit\(textes\.detail\.reprendreAria, \{ libelle: [^}]+description: descriptionLigne\(li\) \}\)/g)).toHaveLength(2);
  });
  it('toutes les clés de textes masqués ou de gabarits d\'étiquettes existent dans les données', () => {
    expect(cle(donnees, 'compte.commande.detailAria')).toBe('Voir le détail de la commande {id}');
    expect(cle(donnees, 'produit.panier.detail.reprendreAria')).toBe('{libelle} : {titre} ({description})');
    expect(cle(donnees, 'diagnostic.textes.equipements.voirFiche')).toBe('Voir la fiche');
    expect(cle(donnees, 'produit.comparateur.comparaison.voirFiche')).toBe('Voir la fiche');
    for (const liste of ['aleas', 'protection']) {
      expect(cle(donnees, `accueil.${liste}.lien`)).toBe('Voir les solutions');
      for (const carte of cle(donnees, `accueil.${liste}.liste`)) expect(carte.titre, `${liste}`).toEqual(expect.any(String));
    }
  });
});

describe('lot 10a-C : repères, titres, images', () => {
  it('chaque page a un header, un main et un footer ; lang="fr" ; un title non vide et unique', () => {
    const titres = new Set();
    for (const page of HIFI) {
      const html = lire(page);
      expect(html.match(/<header[\s>]/g), page).toHaveLength(1);
      expect(html.match(/<main[\s>]/g), page).toHaveLength(1);
      expect(html.match(/<footer[\s>]/g), page).toHaveLength(1);
      expect(html, page).toMatch(/<html lang="fr"/);
      const titre = html.match(/<title>([^<]+)<\/title>/)?.[1].trim();
      expect(titre, page).toBeTruthy();
      expect(titres.has(titre), `title dupliqué : ${titre}`).toBe(false);
      titres.add(titre);
    }
  });
  it('aucun nav sans nom quand il y en a plusieurs par page ; noms (clés de données) distincts', () => {
    for (const page of HIFI) {
      const navs = [...lire(page).matchAll(/<nav\b[^>]*>/g)].map((m) => m[0]);
      const noms = navs.map((n) => n.match(/(?:data-aria-label|aria-label)="([^"]+)"/)?.[1]);
      if (navs.length > 1) for (const nom of noms) expect(nom, `${page} : ${navs.join(' ')}`).toBeTruthy();
      expect(new Set(noms).size, page).toBe(noms.length);
    }
  });
  it('un seul h1 par page (hors noscript)', () => {
    for (const page of HIFI) expect(sansNoscript(lire(page)).match(/<h1[\s>]/g), page).toHaveLength(1);
  });
  it('aucun niveau de titre sauté dans l\'ordre du document (HTML statiques et gabarits), le h1 en premier', () => {
    for (const page of HIFI) {
      const niveaux = [...sansNoscript(lire(page)).matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
      expect(niveaux[0], `${page} : premier titre`).toBe(1);
      niveaux.reduce((precedent, n, i) => {
        expect(n <= precedent + 1, `${page} : h${precedent} puis h${n} (titre n° ${i + 1})`).toBe(true);
        return n;
      }, 0);
    }
  });
  it('aucune <img> sans alt dans les pages, les wireframes et les modules JavaScript', () => {
    const fichiers = [...HIFI, 'attente.html', 'accueil.html', ...readdirSync('wireframes').map((f) => `wireframes/${f}`).filter((f) => f.endsWith('.html')), ...readdirSync('assets/js').map((f) => `assets/js/${f}`)];
    for (const f of fichiers) for (const [balise] of lire(f).matchAll(/<img\b[^>]*>/g)) expect(balise, f).toMatch(/\salt=/);
  });
});

describe('lot 10a-C : contraste et reflow', () => {
  it('rapport de contraste : blanc sur noir 21:1, marine sur blanc, symétrie, composition d\'une couleur translucide', () => {
    expect(rapportContraste({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5);
    const marine = analyserCouleur('#0f1d38');
    expect(rapportContraste(marine, { r: 255, g: 255, b: 255 })).toBeGreaterThan(15);
    expect(rapportContraste(marine, { r: 255, g: 255, b: 255 })).toBeCloseTo(rapportContraste({ r: 255, g: 255, b: 255 }, marine), 10);
    expect(luminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(analyserCouleur('rgba(15, 29, 56, 0.5)')).toEqual({ r: 15, g: 29, b: 56, a: 0.5 });
    expect(composer({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 }).r).toBeCloseTo(127.5, 5);
  });
  it('couples focus et fond du site : l\'indicateur de focus (vert, marine) atteint 3:1 sur le fond de page, le blanc, l\'ambre et le marine', () => {
    const tokens = lire('css/tokens.css');
    const jeton = (nom) => {
      const m = tokens.match(new RegExp(`${nom}:\\s*([^;]+);`))[1].trim();
      const ref = m.match(/^var\((--[\w-]+)\)$/);
      return ref ? jeton(ref[1]) : analyserCouleur(m);
    };
    const blanc = { r: 255, g: 255, b: 255 };
    for (const fond of [jeton('--color-bg'), blanc, jeton('--color-pastille')]) expect(rapportContraste(jeton('--color-focus'), fond)).toBeGreaterThanOrEqual(3);
    expect(rapportContraste(jeton('--color-focus-action'), jeton('--color-amber'))).toBeGreaterThanOrEqual(3);
    expect(rapportContraste(jeton('--color-focus-on-navy'), jeton('--color-navy'))).toBeGreaterThanOrEqual(3);
  });
  it('reflow à 320 px : aucune largeur fixe de plus de 20 rem (320 px) hors requêtes min-width et zones défilantes prévues', () => {
    const exceptions = new Set(['comparateur.css', 'carte-reelle.css', 'wireframe.css', 'attente.css']); // tableau défilant (région focalisable), carte Leaflet
    const problemes = [];
    for (const f of readdirSync('css').filter((n) => n.endsWith('.css') && !exceptions.has(n) && n !== 'tokens.css')) {
      const css = lire(`css/${f}`).replace(/\/\*[\s\S]*?\*\//g, '');
      // on retire les blocs @media (min-width…) : ils ne s'appliquent pas à 320 px
      let hors = css;
      for (let i = hors.indexOf('@media (min-width'); i >= 0; i = hors.indexOf('@media (min-width')) {
        let profondeur = 0, j = hors.indexOf('{', i);
        do { profondeur += hors[j] === '{' ? 1 : hors[j] === '}' ? -1 : 0; j += 1; } while (profondeur > 0 && j < hors.length);
        hors = hors.slice(0, i) + hors.slice(j);
      }
      for (const m of hors.matchAll(/(?:^|[;{\s])((?:min-)?(?:inline-size|width)):\s*(\d+(?:\.\d+)?)(px|rem)\s*;/g)) {
        const px = m[3] === 'rem' ? Number(m[2]) * 16 : Number(m[2]);
        if (px > 320) problemes.push(`${f} : ${m[1]}: ${m[2]}${m[3]}`);
      }
    }
    expect(problemes).toEqual([]);
  });
  it('CLAUDE.md, conventions (index et fichiers) et qualite.md respectent leurs plafonds', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThanOrEqual(7500);
    expect(lire('Docs/ref/conventions.md').trimEnd().split('\n').length).toBeLessThanOrEqual(40);
    for (const f of readdirSync('Docs/ref/conventions')) expect(lire(`Docs/ref/conventions/${f}`).trimEnd().split('\n').length, f).toBeLessThanOrEqual(150);
    expect(lire('Docs/ref/qualite.md').trimEnd().split('\n').length).toBeLessThanOrEqual(80);
  });
});
