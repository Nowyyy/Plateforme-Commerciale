import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('panier.html');
const produitHtml = lire('produit.html');
const produit = JSON.parse(lire('data/produit.json'));
const svg = html.slice(html.indexOf('<svg class="schema"'), html.indexOf('</svg>', html.indexOf('<svg class="schema"')) + 6);
const groupe = (texte, id) => {
  const debut = texte.indexOf(`<g id="${id}"`);
  return texte.slice(debut, texte.indexOf('</g>', debut) + 4);
};
// tracé normalisé : le groupe sans ses textes (clés de données propres à chaque page), espaces réduits
const trace = (g) => g.replace(/<text\b[^>]*>.*?<\/text>/gs, '').replace(/\s+/g, ' ').replace(/> </g, '><').trim();

describe('aperçu schématique du panier', () => {
  it('SVG : role img, title et desc, groupes cote-a et cote-b, sans C, sans couleur ni script, textes limités', () => {
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<title [^>]*data-texte="produit\.panier\.responsabilite\.schema\.title"/);
    expect(svg).toMatch(/<desc [^>]*data-texte="produit\.panier\.responsabilite\.schema\.desc"/);
    expect(svg).toContain('id="cote-a"');
    expect(svg).toContain('id="cote-b"');
    expect(svg).not.toContain('id="cote-c"');
    expect(svg).not.toMatch(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b|rgb\(/);
    expect(svg).not.toContain('<script');
    const textes = [...svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/gs)];
    expect(textes).toHaveLength(4);
    for (const [, attributs, contenu] of textes) {
      expect(attributs).toMatch(/data-texte="produit\.panier\.responsabilite\.schema\.lettres\.[ab]"|id="apercu-valeur-[ab]"/);
      expect(contenu).toBe('');
    }
    for (const cle of ['a', 'b']) expect(typeof produit.panier.responsabilite.schema.lettres[cle]).toBe('string');
  });
  it('le tracé des groupes cote-a et cote-b est celui de produit.html', () => {
    for (const id of ['cote-a', 'cote-b']) {
      const copie = trace(groupe(html, id));
      expect(copie.length, id).toBeGreaterThan(50);
      expect(copie, id).toBe(trace(groupe(produitHtml, id)));
    }
    const decor = (t) => trace(t.slice(t.indexOf('<defs>'), t.indexOf('<g id="cote-')));
    expect(decor(svg)).toBe(decor(produitHtml.slice(produitHtml.indexOf('<svg class="schema"'))));
  });
});

describe('bloc total et responsabilité', () => {
  it('un seul bouton « Valider ma commande », type button, sans disabled, aria-disabled et aria-describedby ; aucun autre bouton d\'action', () => {
    const boutons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    expect(boutons).toHaveLength(2); // bouton du menu + validation
    const validation = boutons.find((b) => b.includes('total-valider'));
    expect(validation).toContain('type="button"');
    expect(validation).not.toMatch(/\sdisabled[\s=>]/);
    expect(validation).toContain('aria-disabled="true"');
    expect(validation).toContain('aria-describedby="total-etat"');
    expect(validation).toContain('data-texte="produit.panier.total.bouton"');
    expect(produit.panier.total.bouton).toBe('Valider ma commande');
    expect(html).not.toContain('bouton--action');
    expect(html).not.toMatch(/<button[^>]*type="submit"|<form\b/);
  });
  it('case à cocher avec label, jamais cochée ni mémorisée dans le HTML', () => {
    expect(html).toMatch(/<label class="case" for="responsabilite-case">/);
    const champ = html.match(/<input[^>]*id="responsabilite-case"[^>]*>/)[0];
    expect(champ).toContain('type="checkbox"');
    expect(champ).not.toContain('checked');
    expect(champ).toContain('aria-describedby="responsabilite-avertissement"');
    expect(lire('assets/js/panier.js')).not.toMatch(/setItem/);
  });
  it('css/panier.css et css/composants.css sans valeur hexadécimale', () => {
    for (const f of ['css/panier.css', 'css/composants.css']) expect(lire(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('les libellés de lignes de prix sont ceux de modes ; aucun doublon dans panier', () => {
    const { modes, panier } = produit;
    expect(Object.keys(modes.lignes)).toEqual(['materiel', 'pose', 'total']);
    const libellesModes = Object.values(modes.lignes);
    const valeurs = JSON.stringify(panier);
    for (const l of libellesModes) expect(valeurs, l).not.toContain(`"${l}"`);
    expect(lire('assets/js/panier.js')).toContain('modes.lignes[cle]');
  });
});
