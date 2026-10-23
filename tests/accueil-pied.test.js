import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resoudrePied, baliseEntree } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const html = lire('index.html');
const texte = (v) => typeof v === 'string' && v.trim().length > 0;

describe('data/site.json : pied de page', () => {
  it('colonnes non vides, entrées avec un texte non vide, présentation renseignée', () => {
    expect(texte(site.pied.presentation)).toBe(true);
    expect(site.pied.colonnes.length).toBeGreaterThan(0);
    const colonnes = resoudrePied(site);
    for (const colonne of colonnes) {
      expect(texte(colonne.titre)).toBe(true);
      expect(colonne.entrees.length).toBeGreaterThan(0);
      for (const entree of colonne.entrees) expect(texte(entree.texte)).toBe(true);
    }
  });
  it('la colonne « Le site » reprend les libellés et liens de la navigation sans les dupliquer', () => {
    const [premiere] = resoudrePied(site);
    expect(premiere.entrees.map((e) => e.texte)).toEqual(
      ['pro', 'compte', 'panier'].map((k) => site.navigation[k]),
    );
    expect(premiere.entrees.map((e) => e.lien)).toEqual(
      [site.liens.pro, site.liens.connexion, site.liens.panier],
    );
    expect(JSON.stringify(site.pied)).not.toContain('Comment ça marche');
    expect(site.pied.colonnes[0].navigation.map((n) => n.cle)).not.toContain('aleas');
    expect(site.pied.colonnes[0].navigation.map((n) => n.cle)).not.toContain('fonctionnement');
  });
  it('chaque lien se résout : fichier existant, ou ancre présente dans index.html', () => {
    const liens = resoudrePied(site).flatMap((c) => c.entrees).filter((e) => e.lien !== undefined);
    expect(liens.length).toBeGreaterThanOrEqual(4);
    for (const { lien } of liens) {
      if (lien.startsWith('#')) expect(html, lien).toContain(`id="${lien.slice(1)}"`);
      else expect(existsSync(lien), lien).toBe(true);
    }
    const sav = resoudrePied(site)[1].entrees;
    expect(sav[0]).toEqual({ texte: 'Service après-vente', lien: 'sav-acces.html' });
    expect(sav.slice(1).every((e) => e.lien === undefined && e.texte.includes('(à venir)'))).toBe(true);
  });
  it('un lien inconnu fait échouer le rendu du pied', () => {
    const faux = { ...site, pied: { colonnes: [{ titre: 'x', entrees: [{ texte: 'y', lien: 'absent' }] }] } };
    expect(() => resoudrePied(faux)).toThrow(/absent/);
  });
});

describe('rendu d\'une entrée sans lien', () => {
  it('sans lien : balise span (aucune balise <a>) ; avec lien : a', () => {
    expect(baliseEntree({ texte: 'Mentions légales (à venir)' })).toBe('span');
    expect(baliseEntree({ texte: 'x', lien: '' })).toBe('span');
    expect(baliseEntree({ texte: 'Panier', lien: 'wireframes/panier.html' })).toBe('a');
  });
});

describe('index.html : pied et ordre complet des blocs', () => {
  it('un seul <footer>, le pied (data-bloc E1-10)', () => {
    expect(html.match(/<footer[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<footer class="pied" data-bloc="E1-10" data-role="pied">/);
    expect(html).not.toContain('site.pied.texte');
  });
  it('les 10 blocs dans l\'ordre, chaque code E1-1 à E1-10 exactement une fois', () => {
    const roles = ['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'reassurance', 'preuve', 'avis', 'pied'];
    const positions = roles.map((r) => html.indexOf(`data-role="${r}"`));
    for (const [i, p] of positions.entries()) {
      expect(p, roles[i]).toBeGreaterThan(-1);
      expect(html.indexOf(`data-role="${roles[i]}"`, p + 1), `${roles[i]} en double`).toBe(-1);
    }
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    roles.forEach((role, i) => {
      const code = `E1-${i + 1}`;
      expect(html.match(new RegExp(`data-bloc="${code}"`, 'g')), code).toHaveLength(1);
      expect(html).toMatch(new RegExp(`data-bloc="${code}" data-role="${role}"`));
    });
  });
});
