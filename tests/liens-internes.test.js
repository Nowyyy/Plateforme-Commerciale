// Lot 10a-A : chaque href, src et ancre des pages, des wireframes et des données désigne un fichier publié ou un id présent.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const PUBLIES = lire('.github/workflows/pages.yml').match(/for p in ([^;]+);/)[1].split(/\s+/).filter(Boolean);
const HIFI = ['index', 'diagnostic', 'produit', 'panier', 'pro', 'connexion', 'compte', 'achats', 'achat', 'informations', 'sav-acces', 'sav', 'demandes', 'comparateur'].map((n) => `${n}.html`);
const WIREFRAMES = readdirSync('wireframes').filter((f) => f.endsWith('.html')).map((f) => `wireframes/${f}`);
const EXTERNES_DECLARES = Object.values(site.liensExternes);

const idsDe = (fichier) => new Set([...lire(fichier).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

// Renvoie la liste des problèmes d'une référence (chaîne vide = valide).
function verifier(depuis, reference) {
  if (/^(data:|mailto:|tel:|javascript:)/.test(reference) || reference === '#' || reference === '') return '';
  if (/^https?:\/\//.test(reference)) return EXTERNES_DECLARES.some((e) => reference.startsWith(e)) ? '' : `lien externe non déclaré dans liensExternes : ${reference}`;
  const [chemin, ancre] = reference.split('#');
  const cible = chemin === '' ? depuis : normalize(join(dirname(depuis), chemin));
  if (cible.startsWith('..')) return `sort du site : ${reference}`;
  if (!PUBLIES.includes(cible.split('/')[0])) return `non publié : ${reference}`;
  const fichier = existsSync(cible) && statSync(cible).isDirectory() ? join(cible, 'index.html') : cible;
  if (!existsSync(fichier)) return `fichier absent : ${reference}`;
  if (ancre && fichier.endsWith('.html') && !idsDe(fichier).has(ancre)) return `ancre absente : ${reference}`;
  return '';
}

function referencesHtml(fichier) {
  const html = lire(fichier);
  return [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
}

describe('lot 10a-A : liens internes des pages', () => {
  it('la liste publiée du workflow contient les 14 pages Hi-Fi, attente.html et accueil.html', () => {
    for (const f of [...HIFI, 'attente.html', 'accueil.html']) expect(PUBLIES, f).toContain(f);
  });
  it('les 14 pages Hi-Fi : chaque href, src et ancre désigne un fichier publié ou un id présent', () => {
    const problemes = HIFI.flatMap((f) => referencesHtml(f).map((r) => [f, verifier(f, r)]).filter(([, p]) => p).map(([page, p]) => `${page} : ${p}`));
    expect(problemes).toEqual([]);
  });
  it('les attributs data-lien des pages Hi-Fi désignent une entrée existante de site.liens', () => {
    const manquants = [];
    for (const f of HIFI) {
      for (const m of lire(f).matchAll(/data-lien="site\.liens\.([^"]+)"/g)) if (!(m[1] in site.liens)) manquants.push(`${f} : ${m[1]}`);
    }
    expect(manquants).toEqual([]);
  });
});

describe('lot 10a-A : liens internes des wireframes, de attente.html et d\'accueil.html', () => {
  it('attente.html et accueil.html', () => {
    const problemes = ['attente.html', 'accueil.html'].flatMap((f) => referencesHtml(f).map((r) => [f, verifier(f, r)]).filter(([, p]) => p).map(([page, p]) => `${page} : ${p}`));
    expect(problemes).toEqual([]);
  });
  it('les wireframes (écrans 1 à 13 et index.html)', () => {
    expect(WIREFRAMES.length).toBeGreaterThanOrEqual(14);
    const problemes = WIREFRAMES.flatMap((f) => referencesHtml(f).map((r) => [f, verifier(f, r)]).filter(([, p]) => p).map(([page, p]) => `${page} : ${p}`));
    expect(problemes).toEqual([]);
  });
});

describe('lot 10a-A : liens internes des données', () => {
  const idsHifi = new Set(HIFI.flatMap((f) => [...idsDe(f)]));
  const liensDeDonnees = [];
  for (const nom of readdirSync('data').filter((f) => f.endsWith('.json'))) {
    const parcourir = (valeur, chemin) => {
      if (typeof valeur === 'string') {
        if (/^(?!https?:)[\w./-]+\.(html|pdf|css|js|json|woff2)(#[\w-]+)?$/.test(valeur) || /^#[\w-]+$/.test(valeur) || /^wireframes\//.test(valeur)) liensDeDonnees.push([`${nom}${chemin}`, valeur]);
      } else if (valeur && typeof valeur === 'object') {
        for (const [cle, v] of Object.entries(valeur)) parcourir(v, `${chemin}.${cle}`);
      }
    };
    parcourir(JSON.parse(lire(`data/${nom}`)), '');
  }
  it('les données contiennent des liens à vérifier', () => {
    expect(liensDeDonnees.length).toBeGreaterThan(10);
  });
  it('chaque lien interne des data/*.json désigne un fichier publié ou un id présent dans une page Hi-Fi', () => {
    const problemes = [];
    for (const [ou, valeur] of liensDeDonnees) {
      if (valeur.startsWith('#')) {
        if (!idsHifi.has(valeur.slice(1))) problemes.push(`${ou} : ancre absente : ${valeur}`);
        continue;
      }
      // les liens de données sont écrits depuis la racine du site
      const p = verifier('index.html', valeur);
      if (p) problemes.push(`${ou} : ${p}`);
    }
    expect(problemes).toEqual([]);
  });
  it('liensExternes déclare des liens https', () => {
    for (const lien of EXTERNES_DECLARES) expect(lien).toMatch(/^https:\/\//);
  });
});
