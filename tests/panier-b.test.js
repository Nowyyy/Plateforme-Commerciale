import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';
import { validerLigne } from '../assets/js/lignes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('panier.html');
const produitHtml = lire('produit.html');
const donnees = JSON.parse(lire('data/produit.json'));
const site = JSON.parse(lire('data/site.json'));
const { panier, produits } = donnees;
const gabarit = (nom) => {
  const debut = html.indexOf(`<template data-gabarit="${nom}">`);
  return html.slice(debut, html.indexOf('</template>', debut));
};
const ligne = gabarit('ligne');
const apercu = gabarit('apercu');
// tracé normalisé : un groupe sans ses textes, espaces réduits
const trace = (g) => g.replace(/<text\b[^>]*>.*?<\/text>/gs, '').replace(/\s+/g, ' ').replace(/> </g, '><').trim();
const chemins = (texte) => [...texte.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const groupeProduit = (id) => {
  const debut = produitHtml.indexOf(`<g id="${id}"`);
  return produitHtml.slice(debut, produitHtml.indexOf('</g>', debut) + 4);
};
const groupeApercu = (classe) => {
  const debut = apercu.indexOf(`<g class="schema__cote cote-${classe}">`);
  return apercu.slice(debut, apercu.indexOf('</g>', debut) + 4);
};

describe('panier.html : lignes', () => {
  it('codes E4-1 à E4-6 et rôles une fois chacun, dans l\'ordre ; gabarit de ligne avec details, groupe de quantité et « Retirer »', () => {
    const ordre = ['en-tete', 'recapitulatif', 'responsabilite', 'total', 'paiement', 'pied'];
    const positions = ordre.map((role, i) => {
      expect(html.match(new RegExp(`data-bloc="E4-${i + 1}"`, 'g')), `E4-${i + 1}`).toHaveLength(1);
      expect(html.match(new RegExp(`data-role="${role}"`, 'g')), role).toHaveLength(1);
      return html.indexOf(`data-role="${role}"`);
    });
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(ligne).toContain('<li class="ligne">');
    expect(ligne).toContain('<article class="ligne__article">');
    expect(ligne).toContain('<h2 class="ligne__nom">');
    expect(ligne).toMatch(/<details class="ligne__details">\s*<summary/);
    expect(ligne).toMatch(/<div class="quantite" role="group">/);
    expect(ligne.match(/data-quantite="(moins|plus)"/g)).toHaveLength(2);
    expect(ligne).toMatch(/<output class="quantite__valeur" aria-live="polite">/);
    expect(ligne).toContain('ligne__retirer');
    expect(panier.retirer).toBe('Retirer');
  });
  it('aucun id dupliqué dans le HTML source ni dans les gabarits ; aucun script en ligne ni URL absolue', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size, ids.filter((id, i) => ids.indexOf(id) !== i).join(',')).toBe(ids.length);
    expect(ligne).not.toMatch(/\sid=/);
    expect(apercu).not.toMatch(/\sid=/);
    expect(html.match(/<script(?![^>]*\bsrc=)/g)).toBeNull();
    expect(html).not.toMatch(/https?:\/\//);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
  });
  it('un seul bouton « Valider ma commande », type button, sans disabled, aria-disabled et aria-describedby ; aucun bouton ambre dans le HTML', () => {
    const boutons = [...html.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
    const validation = boutons.filter((b) => b.includes('total-valider'));
    expect(validation).toHaveLength(1);
    expect(validation[0]).toContain('type="button"');
    expect(validation[0]).not.toMatch(/\sdisabled[\s=>]/);
    expect(validation[0]).toContain('aria-disabled="true"');
    expect(validation[0]).toContain('aria-describedby="total-etat"');
    expect(panier.total.bouton).toBe('Valider ma commande');
    for (const b of boutons) expect(b, b).toContain('type="button"');
    expect(html).not.toContain('bouton--action');
    expect(html).not.toMatch(/<form\b|type="submit"/);
  });
  it('case à cocher avec label, jamais cochée dans le HTML ; panier.js ne mémorise rien de la case', () => {
    expect(html).toMatch(/<label class="case" for="responsabilite-case">/);
    const champ = html.match(/<input[^>]*id="responsabilite-case"[^>]*>/)[0];
    expect(champ).toContain('type="checkbox"');
    expect(champ).not.toContain('checked');
    expect(champ).toContain('aria-describedby="responsabilite-avertissement"');
    expect(lire('assets/js/panier.js')).not.toMatch(/setItem\(\s*['"]?[^,]*(case|responsabilite)/i);
  });
});

describe('aperçu schématique d\'une ligne (gabarit)', () => {
  it('SVG : role img, aria-label posé par les données, groupes cote-a et cote-b, sans C, sans couleur, id ni script', () => {
    expect(apercu).toContain('role="img"');
    expect(apercu).not.toContain('aria-label=');
    expect(apercu).not.toMatch(/<title|<desc|<defs|<pattern|<script/);
    expect(apercu).toContain('schema__cote cote-a');
    expect(apercu).toContain('schema__cote cote-b');
    expect(apercu).not.toMatch(/cote-c/);
    expect(apercu).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    const textes = [...apercu.matchAll(/<text\b[^>]*>(.*?)<\/text>/gs)];
    expect(textes).toHaveLength(4);
    for (const [, contenu] of textes) expect(contenu).toBe('');
    expect(panier.detail.apercuAria).toMatch(/\{largeur\}/);
    expect(panier.detail.apercuAria).toMatch(/\{hauteur\}/);
    expect(panier.detail.apercuAria).toContain('exemple');
  });
  it('les attributs d des flèches A et B sont identiques à ceux du schéma de produit.html', () => {
    for (const [id, classe] of [['cote-a', 'a'], ['cote-b', 'b']]) {
      const attendu = chemins(groupeProduit(id));
      expect(attendu.length, id).toBeGreaterThanOrEqual(2);
      expect(chemins(groupeApercu(classe)), id).toEqual(attendu);
      const sansTexte = (t) => trace(t).replace(/ (id|class)="[^"]*"/g, '');
      expect(sansTexte(groupeApercu(classe)), id).toBe(sansTexte(groupeProduit(id)));
    }
    const decor = (t) => [...t.matchAll(/<rect class="schema__(mur|ouverture|barriere|seuil)"[^>]*>/g)].map((m) => m[0]);
    expect(decor(apercu)).toEqual(decor(produitHtml.slice(produitHtml.indexOf('<svg class="schema"'))));
  });
});

describe('feuilles de style et données du panier', () => {
  it('css/panier.css et css/composants.css sans valeur hexadécimale de couleur', () => {
    for (const f of ['css/panier.css', 'css/composants.css']) expect(lire(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('toutes les clés data-texte, data-lien, data-aria-label et data-liste de panier.html se résolvent', () => {
    const echecs = [];
    for (const [, attribut, cle] of [...html.matchAll(/data-(texte|lien|aria-label)="([^"]+)"/g)].filter((m) => /^(site|produit)\./.test(m[2]))) {
      try { resoudre({ site, produit: donnees }, cle); } catch { echecs.push(`${attribut}=${cle}`); }
    }
    expect(echecs).toEqual([]);
  });
  it('un texte pour chaque raison de refus de validerLigne, et chaque icone de produit désigne un symbole du sprite', () => {
    const batardeau = produits.find((p) => p.complet);
    const raisons = new Set([
      validerLigne({ produit: 'x', mode: 'diy', cotes: null }, produits).raison,
      validerLigne({ produit: batardeau.id, mode: 'x', cotes: null }, produits).raison,
      validerLigne({ produit: batardeau.id, mode: 'diy', cotes: null }, produits).raison,
    ]);
    expect([...raisons].sort()).toEqual(['cotes', 'mode', 'produit']);
    expect(Object.keys(panier.raisons).sort()).toEqual([...raisons].sort());
    for (const texte of Object.values(panier.raisons)) expect(texte.trim().length).toBeGreaterThan(0);
    for (const p of produits) expect(html, p.icone).toContain(`<symbol id="${p.icone}"`);
  });
  it('les libellés de lignes de prix sont ceux de modes, sans doublon dans panier ; textes réutilisés de la fiche déclarés', () => {
    const { modes } = donnees;
    expect(Object.keys(modes.lignes)).toEqual(['materiel', 'pose', 'total']);
    const valeurs = JSON.stringify(panier);
    for (const l of Object.values(modes.lignes)) expect(valeurs, l).not.toContain(`"${l}"`);
    expect(lire('assets/js/panier.js')).toContain('modes.lignes.total');
    for (const cle of ['quantite', 'quantiteAria', 'moinsAria', 'plusAria', 'moins', 'plus']) expect(donnees.ajout[cle], cle).toBeTruthy();
  });
  it('aucun module JavaScript ne lit la clé « commande »', () => {
    for (const f of ['panier.js', 'panier-logique.js', 'ajout.js', 'configurateur.js', 'produit.js']) {
      expect(lire(`assets/js/${f}`), f).not.toMatch(/['"]commande['"]/);
    }
  });
});
