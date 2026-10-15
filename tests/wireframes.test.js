import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const PAGES = ['index', 'accueil', 'diagnostic', 'produit', 'panier'];
const lire = (nom) => readFileSync(`wireframes/${nom}.html`, 'utf8');

describe('wireframes : socle', () => {
  it('les 5 pages ont lang="fr", noindex, un seul h1 et le bandeau démonstrateur', () => {
    for (const nom of PAGES) {
      const html = lire(nom);
      expect(html, nom).toContain('<html lang="fr">');
      expect(html, nom).toContain('<meta name="robots" content="noindex">');
      expect(html.match(/<h1[\s>]/g), nom).toHaveLength(1);
      expect(html, nom).toContain('Démonstrateur : contenus fictifs, aucune vente');
      expect(html, nom).toContain('aria-label="Revue des wireframes"');
    }
  });

  it('aucun <script ni URL http(s):// dans wireframes/*.html et css/wireframe.css', () => {
    const fichiers = readdirSync('wireframes')
      .filter((f) => f.endsWith('.html'))
      .map((f) => `wireframes/${f}`)
      .concat('css/wireframe.css');
    for (const f of fichiers) {
      const texte = readFileSync(f, 'utf8');
      expect(texte, f).not.toMatch(/<script/i);
      expect(texte, f).not.toMatch(/https?:\/\//i);
    }
  });

  it('tous les liens relatifs des 5 pages pointent vers des fichiers existants', () => {
    for (const nom of PAGES) {
      const html = lire(nom);
      const cibles = [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
      for (const cible of cibles) {
        if (cible.startsWith('data:') || cible.startsWith('#')) continue;
        const chemin = normalize(join(dirname(`wireframes/${nom}.html`), cible.split('#')[0]));
        expect(existsSync(chemin), `${nom} -> ${cible}`).toBe(true);
      }
    }
  });

  it('le workflow publie wireframes, déclare permissions: et évite secrets. et pull_request_target', () => {
    const texte = readFileSync('.github/workflows/pages.yml', 'utf8');
    expect(texte).toMatch(/\bwireframes\b/);
    expect(texte).toContain('permissions:');
    expect(texte).not.toContain('secrets.');
    expect(texte).not.toContain('pull_request_target');
  });
});

function bloc(html, code) {
  const debut = html.indexOf(`data-bloc="${code}"`);
  const fin = html.indexOf('data-bloc="', debut + 1);
  return html.slice(debut, fin === -1 ? html.length : fin);
}

function blocRole(html, role) {
  const debut = html.indexOf(`data-role="${role}"`);
  expect(debut, role).toBeGreaterThan(-1);
  const fin = html.indexOf('data-role="', debut + 1);
  return html.slice(debut, fin === -1 ? html.length : fin);
}

const attributs = (html, nom) => [...html.matchAll(new RegExp(`data-${nom}="([^"]+)"`, 'g'))].map((m) => m[1]);

function exactementUneFois(html, codes) {
  for (const code of codes) {
    expect(html.split(`data-bloc="${code}"`).length - 1, code).toBe(1);
  }
}

describe('wireframes : accueil et diagnostic', () => {
  const accueil = lire('accueil');
  const diagnostic = lire('diagnostic');

  it('accueil contient exactement une fois chacun des codes E1-1 à E1-10', () => {
    exactementUneFois(accueil, Array.from({ length: 10 }, (_, i) => `E1-${i + 1}`));
  });

  it('diagnostic contient exactement une fois E2-1 à E2-6, et E2-5 contient 3 cartes', () => {
    exactementUneFois(diagnostic, Array.from({ length: 6 }, (_, i) => `E2-${i + 1}`));
    const e25 = bloc(diagnostic, 'E2-5');
    expect(e25.match(/<li class="wf-carte"/g)).toHaveLength(3);
  });

  it('le bloc aléas liste des aléas en exemple (nombre non figé) avec un lien vers diagnostic.html par carte ; le bloc recherche a un lien vers diagnostic.html', () => {
    const e15 = blocRole(accueil, 'aleas');
    for (const titre of ['Inondations et crues', 'Grêle et vents violents', 'Feux de forêt', 'Canicule et chaleur extrême']) {
      expect(e15).toContain(`<h3>${titre}</h3>`);
    }
    expect(e15).toContain('nombre d\'aléas n\'est pas figé');
    const cartes = e15.split('<li class="wf-carte"').slice(1);
    expect(cartes.length).toBeGreaterThanOrEqual(4);
    for (const carte of cartes) expect(carte).toContain('href="diagnostic.html"');
    expect(blocRole(accueil, 'recherche')).toContain('href="diagnostic.html"');
  });

  it('l\'ordre des blocs de l\'accueil est : en-tête, hero, recherche, aléas, personne, étapes, réassurance, avis, crash-test, pied', () => {
    const titres = ['Hero', 'Recherche d\'adresse', 'Les aléas', 'Protection de la personne', 'Comment ça marche', 'Réassurance', 'Avis clients', 'Preuve : crash-test'];
    titres.forEach((titre, i) => expect(bloc(accueil, `E1-${i + 2}`), titre).toContain(`>${titre}</h2>`));
    expect(accueil.indexOf('data-bloc="E1-10"')).toBeGreaterThan(accueil.indexOf('data-bloc="E1-9"'));
  });

  it('les data-role de l\'accueil suivent l\'ordre du HTML et les data-bloc vont de E1-1 à E1-10', () => {
    expect(attributs(accueil, 'role')).toEqual(['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'reassurance', 'avis', 'preuve', 'pied']);
    expect(attributs(accueil, 'bloc')).toEqual(Array.from({ length: 10 }, (_, i) => `E1-${i + 1}`));
  });

  it('le bloc avis garde son contenu : 5 carrés de note, une note, un nombre d\'avis, un [Logo exemple]', () => {
    const avis = blocRole(accueil, 'avis');
    expect(avis.match(/<span class="wf-carre-etoile/g)).toHaveLength(5);
    expect(avis).toContain('0,0 / 5');
    expect(avis).toContain('000 avis');
    expect(avis.match(/\[Logo exemple\]/g)).toHaveLength(1);
  });

  it('le bloc avis affiche 5 étoiles en carrés, la note, le nombre d\'avis et un logo exemple ; le bloc protection couvre les gilets chauffant, refroidissant et anti-chute avec un lien par carte', () => {
    const e12 = blocRole(accueil, 'avis');
    expect(e12.match(/<span class="wf-carre-etoile/g)).toHaveLength(5);
    expect(e12).toContain('0,0 / 5 · 000 avis');
    expect(e12).toContain('[Logo exemple]');
    const e16 = blocRole(accueil, 'protection');
    for (const gilet of ['Gilets chauffants', 'Gilets refroidissants', 'Gilets anti-chute']) expect(e16).toContain(gilet);
    const cartes = e16.split('<li class="wf-carte"').slice(1);
    expect(cartes.length).toBeGreaterThanOrEqual(3);
    for (const carte of cartes) expect(carte).toContain('href="diagnostic.html"');
  });
});

describe('wireframes : fiche produit, panier et parcours', () => {
  const produit = lire('produit');
  const panier = lire('panier');

  it('produit contient exactement une fois chacun des codes E3-1 à E3-8', () => {
    exactementUneFois(produit, Array.from({ length: 8 }, (_, i) => `E3-${i + 1}`));
  });

  it('panier contient exactement une fois chacun des codes E4-1 à E4-6', () => {
    exactementUneFois(panier, Array.from({ length: 6 }, (_, i) => `E4-${i + 1}`));
  });

  it('le panier indique le délai de livraison dans E4-2 (usine, pose) et dans E4-4', () => {
    const e42 = bloc(panier, 'E4-2');
    expect(e42).toContain('Délai de livraison directe usine');
    expect(e42).toContain('Délai d\'intervention de l\'artisan (si option pose)');
    expect(bloc(panier, 'E4-4')).toContain('Livraison estimée');
  });

  it('E3-5 a 3 champs numériques avec label et 3 variantes de faisabilité ; E3-4 a 2 variantes', () => {
    const e35 = bloc(produit, 'E3-5');
    const champs = [...e35.matchAll(/<input type="number" id="([^"]+)"/g)].map((m) => m[1]);
    expect(champs).toHaveLength(3);
    for (const id of champs) expect(e35).toContain(`<label for="${id}">`);
    expect(e35.match(/<div class="wf-variante">/g)).toHaveLength(3);
    expect(bloc(produit, 'E3-4').match(/<div class="wf-variante">/g)).toHaveLength(2);
  });

  it('les liens du parcours existent : recherche (accueil), E2-5, E3-5 et E4-2', () => {
    expect(blocRole(lire('accueil'), 'recherche')).toContain('href="diagnostic.html"');
    expect(bloc(lire('diagnostic'), 'E2-5')).toContain('href="produit.html"');
    expect(bloc(produit, 'E3-5')).toContain('href="panier.html"');
    expect(bloc(panier, 'E4-2')).toContain('href="produit.html"');
  });
});
