// Lot 10a-B : CSS commun extrait d'accueil.css, code mort retiré, préchargement, aide d'adresse, carte sans Leaflet, relief, hygiène.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { aideVisible, etatValidation } from '../assets/js/adresse-assistee-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const HIFI = ['index', 'diagnostic', 'produit', 'panier', 'pro', 'connexion', 'compte', 'achats', 'achat', 'informations', 'sav-acces', 'sav', 'demandes', 'comparateur'].map((n) => `${n}.html`);
const feuilles = (page) => [...lire(page).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
const ids = (html) => [...html.replace(/<template[\s\S]*?<\/template>/g, '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

describe('lot 10a-B : CSS commun extrait d\'accueil.css', () => {
  it('commun.css existe et est chargé par les 14 pages, après composants.css ; accueil.css seulement par l\'accueil, après commun.css', () => {
    expect(existsSync('css/commun.css')).toBe(true);
    for (const page of HIFI) {
      const liste = feuilles(page);
      expect(liste.slice(0, 4), page).toEqual(['css/tokens.css', 'css/base.css', 'css/composants.css', 'css/commun.css']);
      expect(liste.includes('css/accueil.css'), page).toBe(page === 'index.html');
    }
    const accueil = feuilles('index.html');
    expect(accueil.indexOf('css/accueil.css')).toBeGreaterThan(accueil.indexOf('css/commun.css'));
  });
  it('accueil.css ne contient plus de règle partagée (en-tête, navigation, pied, relief, bandeau) ; commun.css les contient', () => {
    const accueil = lire('css/accueil.css');
    const commun = lire('css/commun.css');
    for (const selecteur of ['.entete {', '.nav {', '.pied {', '.relief {', '.bandeau-demo {']) {
      expect(accueil, `accueil.css : ${selecteur}`).not.toContain(selecteur);
    }
    for (const selecteur of ['.entete {', '.pied {', '.relief {', '.bandeau-demo {']) expect(commun, `commun.css : ${selecteur}`).toContain(selecteur);
    for (const classe of ['hero__titre', 'carte-bloc', 'avis__etoiles']) expect(accueil, classe).toContain(classe);
  });
  it('toute classe de commun.css est utilisée par une page autre que l\'accueil ou par l\'accueil lui-même (aucune règle orpheline)', () => {
    const pages = HIFI.map(lire).join('\n') + readdirSync('assets/js').map((f) => lire(`assets/js/${f}`)).join('\n') + readdirSync('data').map((f) => lire(`data/${f}`)).join('\n');
    const classes = [...new Set([...lire('css/commun.css').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))];
    const orphelines = classes.filter((c) => !new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(pages));
    expect(orphelines.filter((c) => !c.startsWith('leaflet'))).toEqual([]);
  });
  it('les feuilles chargées par chaque page existent', () => {
    for (const page of [...HIFI, 'attente.html']) for (const f of feuilles(page)) expect(existsSync(f), `${page} : ${f}`).toBe(true);
  });
});

describe('lot 10a-B : code mort retiré, préchargements', () => {
  it('ETAPES (sav-logique), pages.compte.aucuneCommande et navigation.fonctionnement n\'existent plus, sans référence restante', () => {
    expect(lire('assets/js/sav-logique.js')).not.toMatch(/export const ETAPES\b/);
    expect(JSON.parse(lire('data/compte.json')).pages.compte).not.toHaveProperty('aucuneCommande');
    expect(JSON.parse(lire('data/site.json')).navigation).not.toHaveProperty('fonctionnement');
    const sources = [...HIFI, ...readdirSync('assets/js').map((f) => `assets/js/${f}`), ...readdirSync('tests').filter((f) => f.endsWith('.js') && !f.startsWith('qualite-10a')).map((f) => `tests/${f}`)].map(lire).join('\n');
    expect(sources).not.toContain('aucuneCommande');
    expect(sources).not.toContain('navigation.fonctionnement');
  });
  it('Docs/apercus.txt est conservé : des tests le lisent encore (documenté dans qualite.md)', () => {
    expect(existsSync('Docs/apercus.txt')).toBe(true);
    const lecteurs = readdirSync('tests').filter((f) => f.endsWith('.test.js') && lire(`tests/${f}`).includes('Docs/apercus.txt'));
    expect(lecteurs.length).toBeGreaterThan(0);
    expect(lire('Docs/ref/qualite.md')).toContain('Docs/apercus.txt');
  });
  it('le préchargement d\'Inter 600 est retiré partout ; aucun préchargement orphelin (fichier présent, police déclarée dans base.css)', () => {
    const base = lire('css/base.css');
    for (const page of HIFI) {
      const html = lire(page);
      expect(html, page).not.toContain('inter-latin-600-normal.woff2" as="font"');
      for (const [, href] of html.matchAll(/<link rel="preload" href="([^"]+)"/g)) {
        expect(existsSync(href), `${page} : ${href}`).toBe(true);
        expect(base, `${page} : ${href}`).toContain(href.replace('assets/', '../assets/'));
      }
    }
  });
});

describe('lot 10a-B : aide de la saisie d\'adresse', () => {
  const base = { texte: '12 rue A', selection: { libelle: '12 rue A' }, adresseCourante: '', panne: false, valideLocal: true };
  it('aideVisible : masquée pour une adresse choisie et inchangée, visible dans tous les autres cas', () => {
    expect(aideVisible(etatValidation(base))).toBe(false);
    expect(aideVisible(etatValidation({ ...base, texte: '12 rue AB' }))).toBe(true); // modifiée
    expect(aideVisible(etatValidation({ ...base, selection: null }))).toBe(true); // non choisie
    expect(aideVisible(etatValidation({ ...base, texte: '', selection: null }))).toBe(true); // vide
    expect(aideVisible(etatValidation({ ...base, selection: null, panne: true }))).toBe(false); // panne : adresse utilisée telle quelle, bouton actif
    expect(aideVisible(etatValidation({ ...base, adresseCourante: '12 rue A' }))).toBe(false); // déjà affichée (diagnostic)
    for (const v of [undefined, null, 0, '', [], {}]) expect(() => aideVisible(v)).not.toThrow();
    expect(aideVisible(undefined)).toBe(true);
  });
  it('le bouton de l\'accueil et du diagnostic a un aria-describedby qui désigne un élément existant de la page, masqué par l\'attribut hidden seulement', () => {
    for (const page of ['index.html', 'diagnostic.html']) {
      const html = lire(page);
      const cible = html.match(/<button type="submit"[^>]*aria-describedby="([^"]+)"/)[1];
      expect(html.match(new RegExp(`id="${cible}"`, 'g')), page).toHaveLength(1);
    }
    const src = lire('assets/js/adresse-assistee.js');
    expect(src).toContain('aide.hidden = !aideVisible(');
    expect(src).not.toMatch(/aide\.(remove|textContent\s*=)/);
  });
});

describe('lot 10a-B : lectures de l\'API sans Leaflet', () => {
  const src = lire('assets/js/carte-reelle.js');
  it('un échec de Leaflet, du fond ou de la création de la carte garde les lectures et les rend ; un échec du géocodage ne lit rien', () => {
    expect(src).toContain('const echecCarte = async (texte, lecture, annule) => {');
    expect(src).toMatch(/echecCarte = async[\s\S]*?detruire\(true\);[\s\S]*?await lecture;[\s\S]*?rendreAleas\(aleas\)/);
    expect(src.match(/return echecCarte\(textes\.erreur, lecture, annule\)/g)).toHaveLength(3);
    const apresGeocodage = src.slice(src.indexOf('const resultat = await geocoder'), src.indexOf('const lecture = lireAleas'));
    expect(apresGeocodage).toContain('return echec(');
    expect(apresGeocodage).not.toContain('echecCarte');
    expect(src).toMatch(/if \(!garderLectures\) etatCarte\.controleApi\?\.abort\(\)/);
    expect(src).toMatch(/const echec = \(texte\) => \{\n\s+detruire\(\);/);
  });
});

describe('lot 10a-B : hygiène du code et du relief', () => {
  it('aucune valeur hexadécimale dans css/ (hors tokens.css) ni dans assets/js/ (hors vendor)', () => {
    const HEX = /#[0-9a-fA-F]{3,8}\b(?![\w-])/;
    const fichiers = [...readdirSync('css').filter((f) => f !== 'tokens.css' && f !== 'wireframe.css').map((f) => `css/${f}`), ...readdirSync('assets/js').map((f) => `assets/js/${f}`)];
    for (const f of fichiers) {
      const sansUrl = lire(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '').replace(/href="#[^"]*"|'#[\w-]+'|"#[\w-]+"|`#[^`]*`/g, '').replace(/getElementById|querySelector[^)]*\)|closest\([^)]*\)|\bid=[^ >]*/g, '');
      const hex = sansUrl.match(HEX);
      expect(hex, `${f} : ${hex?.[0]}`).toBeNull();
    }
  });
  it('aucun id dupliqué dans les 14 pages Hi-Fi (gabarits exclus)', () => {
    for (const page of HIFI) {
      const liste = ids(lire(page));
      const doublons = liste.filter((id, i) => liste.indexOf(id) !== i);
      expect(doublons, page).toEqual([]);
    }
  });
  it('relief : groupe 2 masqué sous 768 px, réglages par page dans [5 %, 95 %], décor, couleur et opacité inchangés', () => {
    const css = lire('css/commun.css');
    expect(css).toMatch(/\.relief__groupe--2 \{\n\s+display: none;/);
    expect(css).toContain('color: var(--color-relief);');
    expect(css).toContain('opacity: var(--opacite-relief-mobile);');
    const reglages = [...css.matchAll(/body:has\((.+?)\) \.relief__groupe--([12]) \{\n\s+inset-block-start: ([\d.]+)%;/g)];
    expect(reglages.length).toBe(8);
    for (const [, , , pct] of reglages) {
      expect(Number(pct)).toBeGreaterThanOrEqual(5);
      expect(Number(pct)).toBeLessThanOrEqual(95);
    }
    // le décor identique d'une page à l'autre (en-tête, pied, relief) reste copié à l'identique
    const relief = (page) => lire(page).match(/<div class="relief"[\s\S]*?<\/svg>\n {2}<\/div>/)[0];
    for (const page of HIFI) expect(relief(page), page).toBe(relief('index.html'));
  });
  it('CLAUDE.md reste sous 7 500 caractères', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThanOrEqual(7500);
  });
});
