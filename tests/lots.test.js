import { describe, it, expect } from 'vitest';
import {
  lireApercu, classer, validerCible, extraireTitre, comparerLots, lireIdentifiant,
  construireLot, preparerLots, choisirVues,
} from '../scripts/lots/logique.mjs';

const entree = (branche, apercu, extra = {}) => ({ branche, apercu, bilan: null, fusionne: false, ...extra });

describe('lecture de apercu.txt', () => {
  it('ancien format : cible seule', () => {
    expect(lireApercu('wireframes/\n')).toEqual({ cible: 'wireframes/index.html' });
    expect(lireApercu('accueil.html')).toEqual({ cible: 'accueil.html' });
  });
  it('nouveau format : type et titre', () => {
    expect(lireApercu('accueil.html\r\ntype: hifi\r\ntitre: Accueil Hi-Fi\r\n')).toEqual({
      cible: 'accueil.html', type: 'hifi', titre: 'Accueil Hi-Fi',
    });
  });
  it('type inconnu : erreur lisible', () => {
    expect(lireApercu('accueil.html\ntype: autre').erreur).toMatch(/type inconnu/);
  });
});

describe('classification', () => {
  it('wireframes/ donne wireframe, le reste hifi, type: l\'emporte', () => {
    expect(classer(lireApercu('wireframes/'))).toBe('wireframe');
    expect(classer(lireApercu('accueil.html'))).toBe('hifi');
    expect(classer(lireApercu('wireframes/index.html\ntype: technique'))).toBe('technique');
  });
});

describe('cibles invalides', () => {
  it.each(['../secret.html', 'a/../b.html', 'https://exemple.fr/', '//exemple.fr/x', '/absolu.html', 'a\u0007b.html', '', '   ', 'a b.html'])(
    'ignore %j', (c) => {
      expect(validerCible(c)).toBeNull();
      expect(lireApercu(c).erreur).toBeDefined();
    });
  it('un lot à cible invalide est ignoré sans exception', () => {
    const r = construireLot(entree('lot-9', '../x'));
    expect(r.ignore).toMatch(/lot-9 ignoré/);
  });
});

describe('titre', () => {
  it('titre: prioritaire, puis titre du bilan sans préfixe, puis « Lot <id> »', () => {
    const bilan = '# Lot 1c — Wireframes Lo-Fi\ntexte';
    expect(construireLot(entree('lot-1c', 'wireframes/\ntitre: Court', { bilan })).lot.titre).toBe('Court');
    expect(construireLot(entree('lot-1c', 'wireframes/', { bilan })).lot.titre).toBe('Wireframes Lo-Fi');
    const sans = construireLot(entree('lot-1c', 'wireframes/'));
    expect(sans.lot.titre).toBe('Lot 1c');
    expect(sans.lot.libelle).toBe('Lot 1c');
    expect(extraireTitre('pas de titre', '2')).toBe('Lot 2');
  });
});

describe('ordre des lots', () => {
  it('1 < 1b < 1c < 2 < 2b < 3a < 3b < 8 < 8b < 10', () => {
    const attendu = ['1', '1b', '1c', '2', '2b', '3a', '3b', '8', '8b', '10'];
    const melange = [...attendu].reverse().sort(() => 0);
    const idents = melange.map((n) => lireIdentifiant(`lot-${n}`)).sort(comparerLots);
    expect(idents.map((i) => i.numero)).toEqual(attendu);
  });
});

describe('branches mal nommées', () => {
  it.each(['lot-x', 'lotte', 'lot-2-test', 'lot-', 'lot-2B', 'lot-2bb'])('ignore %s', (b) => {
    expect(lireIdentifiant(b)).toBeNull();
    expect(construireLot(entree(b, 'accueil.html')).ignore).toBeDefined();
  });
});

const jeu = [
  entree('lot-1', 'wireframes/', { fusionne: true }),
  entree('lot-1c', 'wireframes/', { fusionne: true }),
  entree('lot-2', 'accueil.html', { fusionne: true }),
  entree('lot-3a', 'accueil.html', { fusionne: true }),
  entree('lot-3b', 'accueil.html\ntitre: Suite', { fusionne: false }),
];

describe('choix des vues', () => {
  it('Hi-Fi en cours : boutons, liens et anciens triés', () => {
    const { lots } = preparerLots(jeu);
    const v = choisirVues(lots);
    expect(v.wireframe.href).toBe('../wireframes/index.html');
    expect(v.wireframe.etat).toBe('fusionne');
    expect(v.hifi.href).toBe('../lot-3b/accueil.html');
    expect(v.hifi.etat).toBe('en-cours');
    expect(v.anciens.map((a) => a.id)).toEqual(['lot-3a', 'lot-2']);
    expect(v.anciens[0].href).toBe('../lot-3a/accueil.html');
    expect(v.anciens.map((a) => a.id)).not.toContain('lot-3b');
  });
  it('tout fusionné : liens vers la version de main', () => {
    const { lots } = preparerLots(jeu.map((e) => ({ ...e, fusionne: true })));
    const v = choisirVues(lots);
    expect(v.hifi.href).toBe('../accueil.html');
    expect(v.wireframe.href).toBe('../wireframes/index.html');
  });
  it('aucun lot Hi-Fi, un seul lot Hi-Fi, aucun lot wireframe', () => {
    const wf = preparerLots([jeu[0], jeu[1]]).lots;
    expect(choisirVues(wf)).toMatchObject({ hifi: null, anciens: [] });
    const un = preparerLots([jeu[2]]).lots;
    const vUn = choisirVues(un);
    expect(vUn.hifi.id).toBe('lot-2');
    expect(vUn.anciens).toEqual([]);
    expect(vUn.wireframe).toBeNull();
  });
  it('fusion indéterminée : en cours, avec avertissement', () => {
    const r = preparerLots([entree('lot-2', 'accueil.html', { fusionne: null })]);
    expect(r.lots[0].fusionne).toBe(false);
    expect(r.avertissements.join(' ')).toMatch(/fusion indéterminée/);
  });
});

describe('lot technique', () => {
  it('absent de tous les résultats', () => {
    const { lots } = preparerLots([...jeu, entree('lot-4', 'wireframes/index.html\ntype: technique\ntitre: Outils')]);
    expect(lots.find((l) => l.id === 'lot-4').type).toBe('technique');
    const v = choisirVues(lots);
    expect(JSON.stringify(v)).not.toContain('lot-4');
  });
  it('lot sans apercu.txt (lot-0) ignoré sans bruit', () => {
    const r = preparerLots([entree('lot-0', null)]);
    expect(r.lots).toEqual([]);
    expect(r.avertissements).toEqual([]);
  });
});
