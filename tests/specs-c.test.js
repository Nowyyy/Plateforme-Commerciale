import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const produit = JSON.parse(lire('data/produit.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const html = lire('produit.html');
const batardeau = produit.produits.find((p) => p.id === 'batardeau-modulable');
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('lot 7-C : tableau des spécifications', () => {
  const debut = html.indexOf('data-role="specs"');
  const bloc = html.slice(debut, html.indexOf('data-role="documents"'));

  it('table avec caption, en-têtes de colonne, et lignes générées par gabarit à en-tête de ligne', () => {
    expect(bloc.match(/<table/g)).toHaveLength(1);
    expect(bloc).toMatch(/<caption[^>]*data-texte="produit\.specifications\.caption"/);
    expect(bloc).toMatch(/<th scope="col"[^>]*specifications\.colonnes\.caracteristique/);
    expect(bloc).toMatch(/<th scope="col"[^>]*specifications\.colonnes\.valeur/);
    expect(produit.specifications.colonnes).toEqual({ caracteristique: 'Caractéristique', valeur: 'Valeur' });
    const gabarit = bloc.match(/<template data-liste-produit="specs">([\s\S]*?)<\/template>/)[1];
    expect(gabarit).toMatch(/<tr>\s*<th scope="row">/);
    expect(gabarit).toMatch(/<td[^>]*data-texte="valeur"/);
    expect(gabarit).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(bloc.match(/<tr>/g)).toHaveLength(2); // en-tête + gabarit : le nombre de lignes vient des données
  });
});

describe('lot 7-C : pictogrammes', () => {
  const sprite = html.match(/<svg class="sprite"[\s\S]*?<\/svg>/)[0];
  it('les icônes de specs et le symbole de téléchargement existent dans le sprite ; sprite sans hexadécimal ni script', () => {
    const symboles = [...sprite.matchAll(/<symbol id="([a-z0-9-]+)"/g)].map((m) => m[1]);
    for (const nom of ['pression', 'chrono', 'anticorrosion', 'conformite', 'telecharger']) expect(symboles, nom).toContain(nom);
    for (const s of batardeau.specs) expect(symboles, s.id).toContain(s.icone);
    expect(html).toMatch(/<use href="#telecharger">/);
    expect(sprite).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(sprite).not.toContain('<script');
    expect(sprite).not.toMatch(/<text/);
  });
});

describe('lot 7-C : couleurs et cohérence', () => {
  it('produit.css et composants.css sans valeur hexadécimale de couleur', () => {
    for (const f of ['css/produit.css', 'css/composants.css']) expect(sansCommentaires(lire(f)), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('les spécifications reprennent les chiffres de la preuve de l\'accueil (60 cm, 12 minutes)', () => {
    const nombres = (t) => t.match(/\d+/g).map(Number);
    const parTitre = (mot) => batardeau.specs.find((s) => s.titre.includes(mot)).valeur;
    expect(nombres(parTitre('hydrostatique'))[0]).toBe(nombres(accueil.preuve.chiffres.find((c) => /cm/.test(c.valeur)).valeur)[0]);
    expect(nombres(parTitre('déploiement'))[0]).toBe(nombres(accueil.preuve.chiffres.find((c) => /min/.test(c.valeur)).valeur)[0]);
  });
});
