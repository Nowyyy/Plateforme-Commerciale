import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ajouterLigne, besoinConfirmation, changerQuantite, cleLigne, compterArticles, construireLigne, lireListe,
  peutValider, restaurerLigne, retirerLigne, totauxPanier, validerLigne, validerPanier,
} from '../assets/js/lignes-logique.js';
import { evaluerCotes, remplirGabarit } from '../assets/js/cotes-logique.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const donnees = JSON.parse(lire('data/produit.json'));
const { produits } = donnees;
const { limites } = donnees.panier;
const batardeau = produits.find((p) => p.id === 'batardeau-modulable');
const clapet = produits.find((p) => p.id === 'clapet-anti-retour');

const ligne = (surcharge = {}) => ({
  produit: batardeau.id, mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, ...surcharge,
});
const avecCotes = (cotes) => ligne({ cotes: { largeur: 1200, hauteur: 400, tolerance: 0, ...cotes } });
const sansCotes = (produit = clapet, mode = 'diy') => ({ produit: produit.id, mode, cotes: null });
const session = (lignes, v = 2) => JSON.stringify({ v, lignes });
const profond = (valeur) => {
  if (valeur !== null && typeof valeur === 'object') {
    for (const enfant of Object.values(valeur)) profond(enfant);
    Object.freeze(valeur);
  }
  return valeur;
};
const clone = (valeur) => JSON.parse(JSON.stringify(valeur));
const etatDe = (...lignes) => ({ lignes: lignes.map((l) => ({ ...l, quantite: l.quantite ?? 1 })) });
const dixLignes = () => etatDe(...Array.from({ length: 10 }, (_, i) => avecCotes({ largeur: 800 + i })));
const entree = (l, quantite) => {
  const ligneComplete = { ...l, quantite };
  return { ligne: ligneComplete, cle: cleLigne(ligneComplete), validation: validerLigne(ligneComplete, produits) };
};

describe('cleLigne', () => {
  it('mêmes configurations, même clé, quelle que soit la quantité', () => {
    expect(cleLigne({ ...ligne(), quantite: 1 })).toBe(cleLigne({ ...ligne(), quantite: 7 }));
    expect(cleLigne(ligne())).toBe('batardeau-modulable|diy|1200|400|0');
  });
  it('chaque champ change la clé ; une ligne sans cotes est distincte', () => {
    const base = cleLigne(ligne());
    const variantes = [
      ligne({ produit: 'autre' }), ligne({ mode: 'pose' }), avecCotes({ largeur: 1201 }), avecCotes({ hauteur: 401 }), avecCotes({ tolerance: 5 }),
      ligne({ cotes: null }),
    ];
    const cles = variantes.map(cleLigne);
    for (const cle of cles) expect(cle).not.toBe(base);
    expect(new Set(cles).size).toBe(cles.length);
    expect(cleLigne(sansCotes())).toBe('clapet-anti-retour|diy|-');
  });
});

describe('lireListe', () => {
  it('liste valide : lignes recopiées, aucune ignorée ; champs étrangers (prix) supprimés', () => {
    const brut = session([{ ...ligne(), quantite: 2, prix: { total: 1 } }, { ...sansCotes(), quantite: 1 }]);
    const lue = lireListe(brut, limites);
    expect(lue.ignorees).toBe(0);
    expect(lue.lignes).toEqual([{ ...ligne(), quantite: 2 }, { ...sansCotes(), quantite: 1 }]);
  });
  it('vide, null, non JSON, v 1 ou 3, lignes non tableau : liste vide sans exception', () => {
    for (const brut of [null, undefined, '', '  ', 'pas du json', '[]', '12', session([], 1), session([], 3), '{"v":2}', '{"v":2,"lignes":{}}', 42]) {
      expect(() => lireListe(brut, limites)).not.toThrow();
      expect(lireListe(brut, limites), String(brut)).toEqual({ lignes: [], ignorees: 0 });
    }
  });
  it('formes invalides écartées et comptées', () => {
    const invalides = [
      null, 'texte', [], { ...ligne(), quantite: 1, produit: '' }, { ...ligne(), quantite: 1, produit: 3 }, { ...ligne(), quantite: 1, mode: 'x' },
      { ...avecCotes({ largeur: 1.5 }), quantite: 1 }, { ...avecCotes({ largeur: -1 }), quantite: 1 }, { ...avecCotes({ hauteur: '400' }), quantite: 1 },
      { ...ligne({ cotes: { largeur: 1200 } }), quantite: 1 }, { ...ligne({ cotes: 'a' }), quantite: 1 }, { produit: 'x', mode: 'diy', quantite: 1 },
    ];
    const lue = lireListe(session([...invalides, { ...ligne(), quantite: 1 }]), limites);
    expect(lue.lignes).toHaveLength(1);
    expect(lue.ignorees).toBe(invalides.length);
  });
  it('quantités 0, -1, 1,5 et « 2 » refusées ; 11 plafonnée à 10', () => {
    for (const quantite of [0, -1, 1.5, '2', null, undefined]) {
      const lue = lireListe(session([{ ...ligne(), quantite }]), limites);
      expect(lue, String(quantite)).toEqual({ lignes: [], ignorees: 1 });
    }
    expect(lireListe(session([{ ...ligne(), quantite: 11 }]), limites).lignes[0].quantite).toBe(10);
    expect(lireListe(session([{ ...ligne(), quantite: 1000 }]), limites).lignes[0].quantite).toBe(10);
  });
  it('doublons fusionnés (somme plafonnée), au-delà de 10 lignes tronqué et compté', () => {
    const fusion = lireListe(session([{ ...ligne(), quantite: 4 }, { ...sansCotes(), quantite: 1 }, { ...ligne(), quantite: 3 }]), limites);
    expect(fusion.lignes).toEqual([{ ...ligne(), quantite: 7 }, { ...sansCotes(), quantite: 1 }]);
    const plafond = lireListe(session([{ ...ligne(), quantite: 8 }, { ...ligne(), quantite: 8 }]), limites);
    expect(plafond.lignes[0].quantite).toBe(10);
    const douze = Array.from({ length: 12 }, (_, i) => ({ ...avecCotes({ largeur: 800 + i }), quantite: 1 }));
    const tronquee = lireListe(session(douze), limites);
    expect(tronquee.lignes).toHaveLength(10);
    expect(tronquee.ignorees).toBe(2);
    expect(tronquee.lignes[9].cotes.largeur).toBe(809);
  });
  it('idempotente : relire sa propre sortie sérialisée donne les mêmes lignes', () => {
    const bruts = [
      session([{ ...ligne(), quantite: 4 }, { ...ligne(), quantite: 9 }, { ...sansCotes(), quantite: 0 }, { ...sansCotes(), quantite: 2 }]),
      session(Array.from({ length: 14 }, (_, i) => ({ ...avecCotes({ largeur: 800 + i }), quantite: 12 }))),
      session([]),
    ];
    for (const brut of bruts) {
      const premiere = lireListe(brut, limites);
      const seconde = lireListe(session(premiere.lignes), limites);
      expect(seconde.lignes).toEqual(premiere.lignes);
      expect(seconde.ignorees).toBe(0);
    }
  });
});

describe('ajouterLigne', () => {
  it('nouvelle ligne puis fusion de la même configuration', () => {
    const a = ajouterLigne({ lignes: [] }, ligne(), 2, limites);
    expect(a.resultat).toBe('ajoutee');
    expect(a.etat.lignes).toEqual([{ ...ligne(), quantite: 2 }]);
    const b = ajouterLigne(a.etat, ligne(), 3, limites);
    expect(b.resultat).toBe('fusionnee');
    expect(b.etat.lignes).toEqual([{ ...ligne(), quantite: 5 }]);
    const c = ajouterLigne(b.etat, avecCotes({ largeur: 900 }), 1, limites);
    expect(c.etat.lignes).toHaveLength(2);
  });
  it('plafonnement en fusion et d\'une nouvelle ligne', () => {
    const base = etatDe({ ...ligne(), quantite: 8 });
    const fusion = ajouterLigne(base, ligne(), 5, limites);
    expect(fusion.resultat).toBe('plafonnee');
    expect(fusion.etat.lignes[0].quantite).toBe(10);
    const nouvelle = ajouterLigne({ lignes: [] }, ligne(), 11, limites);
    expect(nouvelle.resultat).toBe('plafonnee');
    expect(nouvelle.etat.lignes[0].quantite).toBe(10);
    const deja = ajouterLigne(etatDe({ ...ligne(), quantite: 10 }), ligne(), 1, limites);
    expect(deja.resultat).toBe('plafonnee');
    expect(deja.etat.lignes[0].quantite).toBe(10);
    expect(ajouterLigne(base, ligne(), 2, limites).resultat).toBe('fusionnee');
  });
  it('panier plein (10 lignes distinctes) : nouvelle ligne refusée, état inchangé ; fusion toujours possible', () => {
    const plein = dixLignes();
    const r = ajouterLigne(plein, avecCotes({ largeur: 1500 }), 1, limites);
    expect(r.resultat).toBe('pleine');
    expect(r.etat).toEqual(plein);
    expect(ajouterLigne(plein, avecCotes({ largeur: 800 }), 1, limites).resultat).toBe('fusionnee');
  });
  it('quantités refusées (0, 1,5, « a », négative) : état inchangé', () => {
    const base = etatDe(ligne());
    for (const quantite of [0, 1.5, 'a', -2, NaN, null, undefined]) {
      const r = ajouterLigne(base, ligne(), quantite, limites);
      expect(r.resultat, String(quantite)).toBe('refusee');
      expect(r.etat).toEqual(base);
    }
  });
});

describe('changerQuantite', () => {
  const etat = etatDe({ ...ligne(), quantite: 3 }, sansCotes());
  const cle = cleLigne(ligne());
  it('+1, -1 et pas arbitraire', () => {
    expect(changerQuantite(etat, cle, 1, limites)).toMatchObject({ quantite: 4 });
    expect(changerQuantite(etat, cle, -1, limites)).toMatchObject({ quantite: 2 });
    expect(changerQuantite(etat, cle, 5, limites).etat.lignes[0].quantite).toBe(8);
  });
  it('plancher 1, plafond 10', () => {
    expect(changerQuantite(etatDe({ ...ligne(), quantite: 1 }), cle, -1, limites).quantite).toBe(1);
    expect(changerQuantite(etatDe({ ...ligne(), quantite: 10 }), cle, 1, limites).quantite).toBe(10);
    expect(changerQuantite(etat, cle, -50, limites).quantite).toBe(1);
    expect(changerQuantite(etat, cle, 50, limites).quantite).toBe(10);
  });
  it('clé inconnue : état inchangé, quantité nulle ; les autres lignes ne bougent pas', () => {
    const r = changerQuantite(etat, 'inconnue', 1, limites);
    expect(r.etat).toEqual(etat);
    expect(r.quantite).toBeNull();
    expect(changerQuantite(etat, cle, 1, limites).etat.lignes[1]).toEqual(etat.lignes[1]);
  });
});

describe('retirerLigne et restaurerLigne', () => {
  const etat = etatDe({ ...ligne(), quantite: 2 }, sansCotes(), avecCotes({ largeur: 900 }));
  const cle = cleLigne(sansCotes());
  it('retrait : ligne et index renvoyés ; clé inconnue : rien retiré', () => {
    const r = retirerLigne(etat, cle);
    expect(r.index).toBe(1);
    expect(r.retiree).toEqual(etat.lignes[1]);
    expect(r.etat.lignes).toHaveLength(2);
    const inconnu = retirerLigne(etat, 'x');
    expect(inconnu).toMatchObject({ retiree: null, index: -1 });
    expect(inconnu.etat).toEqual(etat);
  });
  it('restauration à la place d\'origine, avec la quantité', () => {
    const r = retirerLigne(etat, cle);
    const retour = restaurerLigne(r.etat, r.retiree, r.index, limites);
    expect(retour.resultat).toBe('restauree');
    expect(retour.etat).toEqual(etat);
    expect(restaurerLigne(r.etat, r.retiree, 99, limites).etat.lignes[2]).toEqual(r.retiree);
  });
  it('fusion avec une ligne identique ajoutée entre-temps', () => {
    const r = retirerLigne(etat, cle);
    const entre = ajouterLigne(r.etat, sansCotes(), 3, limites).etat;
    const retour = restaurerLigne(entre, r.retiree, r.index, limites);
    expect(retour.resultat).toBe('fusionnee');
    expect(retour.etat.lignes.find((l) => cleLigne(l) === cle).quantite).toBe(4);
    expect(retour.etat.lignes).toHaveLength(3);
  });
  it('panier plein : pleine, état inchangé', () => {
    const plein = dixLignes();
    const retour = restaurerLigne(plein, { ...sansCotes(), quantite: 2 }, 0, limites);
    expect(retour.resultat).toBe('pleine');
    expect(retour.etat).toEqual(plein);
  });
});

describe('construireLigne', () => {
  const compatible = evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '10' }, batardeau.cotes);
  const hors = evaluerCotes({ largeur: '600', hauteur: '400', tolerance: '' }, batardeau.cotes);
  it('produit complet compatible : cotes entiers', () => {
    expect(construireLigne(batardeau, 'pose', compatible, 2)).toEqual({
      produit: batardeau.id, mode: 'pose', cotes: { largeur: 1200, hauteur: 400, tolerance: 10 }, quantite: 2,
    });
    expect(construireLigne(batardeau, 'diy', compatible).quantite).toBe(1);
  });
  it('produit complet incompatible ou absent : cotes null', () => {
    expect(construireLigne(batardeau, 'diy', hors).cotes).toBeNull();
    expect(construireLigne(batardeau, 'diy', null).cotes).toBeNull();
  });
  it('produit non complet : cotes null, évaluation ignorée ; mode inconnu = diy', () => {
    expect(construireLigne(clapet, 'pose', compatible).cotes).toBeNull();
    expect(construireLigne(clapet, 'zzz', compatible).mode).toBe('diy');
  });
});

describe('validerLigne', () => {
  it('les dix produits et les deux modes : prix recalculés', () => {
    for (const produit of produits) {
      for (const mode of ['diy', 'pose']) {
        const l = produit.complet ? { ...ligne(), mode } : { produit: produit.id, mode, cotes: null };
        const v = validerLigne(l, produits);
        expect(v.ok, `${produit.id} ${mode}`).toBe(true);
        expect(v.unitaire).toEqual({ materiel: produit.prix, pose: mode === 'pose' ? produit.pose : 0, total: produit.prix + (mode === 'pose' ? produit.pose : 0) });
        expect(v.cotes === null).toBe(!produit.complet);
        expect(v.lignesPrix.at(-1).montant).toBe(v.unitaire.total);
      }
    }
  });
  it('produits non complets refusés avec des cotes ; complet refusé sans cotes', () => {
    for (const produit of produits.filter((p) => !p.complet)) {
      expect(validerLigne({ produit: produit.id, mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 } }, produits)).toEqual({ ok: false, raison: 'cotes' });
    }
    expect(validerLigne(ligne({ cotes: null }), produits)).toEqual({ ok: false, raison: 'cotes' });
  });
  it('bornes du batardeau : 700, 1 600, 300 et 600', () => {
    const ok = (largeur, hauteur, tolerance = 0) => validerLigne(avecCotes({ largeur, hauteur, tolerance }), produits).ok;
    expect(ok(700, 300)).toBe(true);
    expect(ok(1600, 600)).toBe(true);
    expect(ok(699, 400)).toBe(false);
    expect(ok(1601, 400)).toBe(false);
    expect(ok(1200, 299)).toBe(false);
    expect(ok(1200, 601)).toBe(false);
  });
  it('tolérance : 705 avec 10 refusée, 710 acceptée ; non entiers refusés', () => {
    expect(validerLigne(avecCotes({ largeur: 705, tolerance: 10 }), produits).ok).toBe(false);
    expect(validerLigne(avecCotes({ largeur: 710, tolerance: 10 }), produits).ok).toBe(true);
    expect(validerLigne(avecCotes({ largeur: 1200.5 }), produits).ok).toBe(false);
    expect(validerLigne(avecCotes({ tolerance: 51 }), produits).ok).toBe(false);
  });
  it('raisons produit, mode, cotes ; prix mensongers ignorés', () => {
    expect(validerLigne({ ...ligne(), produit: 'inconnu' }, produits)).toEqual({ ok: false, raison: 'produit' });
    expect(validerLigne(ligne({ mode: 'x' }), produits)).toEqual({ ok: false, raison: 'mode' });
    expect(validerLigne(avecCotes({ largeur: 699 }), produits)).toEqual({ ok: false, raison: 'cotes' });
    const menteuse = validerLigne({ ...ligne(), prix: { materiel: 1, pose: 1, total: 1 }, quantite: 2 }, produits);
    expect(menteuse.unitaire.total).toBe(batardeau.prix);
    expect(validerLigne(null, produits)).toEqual({ ok: false, raison: 'produit' });
    expect(validerLigne(ligne(), undefined)).toEqual({ ok: false, raison: 'produit' });
  });
});

describe('validerPanier', () => {
  it('mélange de lignes valides et invalides, ordre conservé', () => {
    const etat = etatDe(ligne(), avecCotes({ largeur: 699 }), sansCotes(), { ...ligne(), produit: 'inconnu' });
    const r = validerPanier(etat, produits);
    expect(r.valides).toBe(2);
    expect(r.invalides).toBe(2);
    expect(r.vide).toBe(false);
    expect(r.lignes.map((l) => l.validation.ok)).toEqual([true, false, true, false]);
    expect(r.lignes.map((l) => l.cle)).toEqual(etat.lignes.map(cleLigne));
    expect(validerPanier({ lignes: [] }, produits)).toMatchObject({ vide: true, valides: 0, invalides: 0 });
  });
});

describe('totauxPanier', () => {
  const grille = produits.find((p) => p.id === 'sprinkler-de-toiture');
  it('somme exacte, pose seulement en mode pose', () => {
    const entrees = [entree(ligne({ mode: 'pose' }), 2), entree(ligne({ mode: 'diy', cotes: { largeur: 900, hauteur: 400, tolerance: 0 } }), 1), entree(sansCotes(clapet, 'pose'), 3)];
    const t = totauxPanier(entrees);
    expect(t.materiel).toBe(2 * batardeau.prix + batardeau.prix + 3 * clapet.prix);
    expect(t.pose).toBe(2 * batardeau.pose + 3 * clapet.pose);
    expect(t.total).toBe(t.materiel + t.pose);
    expect(t).toMatchObject({ lignes: 3, articles: 6, articlesPose: 5, lignesSurMesure: 2 });
    expect(totauxPanier([entree(ligne(), 4)]).pose).toBe(0);
  });
  it('lignes invalides exclues', () => {
    const t = totauxPanier([entree(avecCotes({ largeur: 699 }), 5), entree(sansCotes(), 1)]);
    expect(t).toMatchObject({ lignes: 1, articles: 1, materiel: clapet.prix });
    expect(totauxPanier([])).toMatchObject({ lignes: 0, total: 0, delaiLivraison: null, delaiPose: null });
  });
  it('délais maximaux par livraisonSemainesMax et poseSemainesMax ; égalité : première ligne', () => {
    const t = totauxPanier([entree(sansCotes(clapet, 'diy'), 1), entree(sansCotes(grille, 'diy'), 1), entree(ligne(), 1)]);
    expect(t.delaiLivraison).toBe(grille.delaiLivraison);
    expect(t.delaiPose).toBeNull();
    const pose = totauxPanier([entree(sansCotes(clapet, 'pose'), 1), entree(sansCotes(grille, 'pose'), 1)]);
    expect(pose.delaiPose).toBe(grille.delaiPose);
    const isolant = produits.find((p) => p.id === 'isolant-reflecteur');
    expect(isolant.livraisonSemainesMax).toBe(clapet.livraisonSemainesMax);
    expect(isolant.delaiLivraison).not.toBe(clapet.delaiLivraison);
    expect(totauxPanier([entree(sansCotes(isolant), 1), entree(sansCotes(clapet), 1)]).delaiLivraison).toBe(isolant.delaiLivraison);
    expect(totauxPanier([entree(sansCotes(clapet), 1), entree(sansCotes(isolant), 1)]).delaiLivraison).toBe(clapet.delaiLivraison);
  });
});

describe('propriétés sur une grille de scénarios', () => {
  const scenarios = [];
  const cotesOk = [{ largeur: 700, hauteur: 300, tolerance: 0 }, { largeur: 1200, hauteur: 400, tolerance: 10 }, { largeur: 1600, hauteur: 600, tolerance: 0 }, { largeur: 1000, hauteur: 450, tolerance: 25 }];
  for (const produit of produits) {
    for (const mode of ['diy', 'pose']) {
      for (const q of [1, 2, 3, 5]) {
        const cotes = produit.complet ? cotesOk[(q + mode.length) % cotesOk.length] : null;
        scenarios.push({ produit, ligne: { produit: produit.id, mode, cotes }, q });
      }
    }
  }
  it('la grille compte 80 scénarios (10 produits x 2 modes x 4 quantités) ; la propriété de fusion en parcourt 240', () => {
    expect(scenarios.length).toBe(80);
    expect(scenarios.length * 3).toBeGreaterThanOrEqual(200);
  });
  const construire = (suite) => suite.reduce((etat, s) => ajouterLigne(etat, s.ligne, s.q, limites).etat, { lignes: [] });
  const totaux = (etat) => totauxPanier(validerPanier(etat, produits).lignes);
  it('l\'ordre d\'ajout n\'influe pas sur les totaux', () => {
    for (let debut = 0; debut < scenarios.length; debut += 1) {
      const suite = [scenarios[debut], scenarios[(debut + 7) % 80], scenarios[(debut + 31) % 80], scenarios[(debut + 53) % 80]];
      const direct = totaux(construire(suite));
      const inverse = totaux(construire([...suite].reverse()));
      for (const champ of ['lignes', 'articles', 'materiel', 'pose', 'total', 'articlesPose', 'lignesSurMesure']) {
        expect(inverse[champ], `scénario ${debut} ${champ}`).toBe(direct[champ]);
      }
    }
  });
  it('ajouter q1 puis q2 de la même configuration = ajouter q1 + q2 (hors plafond)', () => {
    for (const s of scenarios) {
      for (const q2 of [1, 2, 4]) {
        const deux = ajouterLigne(ajouterLigne({ lignes: [] }, s.ligne, s.q, limites).etat, s.ligne, q2, limites).etat;
        const un = ajouterLigne({ lignes: [] }, s.ligne, s.q + q2, limites).etat;
        expect(deux, `${s.produit.id} ${s.q}+${q2}`).toEqual(un);
      }
    }
  });
  it('ajouter puis retirer une nouvelle ligne rend l\'état initial', () => {
    const base = construire(scenarios.slice(0, 5).map((s) => ({ ...s, ligne: { ...s.ligne, mode: s.ligne.mode } })));
    for (const s of scenarios) {
      const a = ajouterLigne(base, s.ligne, s.q, limites);
      if (a.resultat !== 'ajoutee') continue;
      expect(retirerLigne(a.etat, cleLigne(s.ligne)).etat).toEqual(base);
    }
  });
  it('les totaux égalent la somme des lignes', () => {
    for (let debut = 0; debut < scenarios.length; debut += 1) {
      const etat = construire([scenarios[debut], scenarios[(debut + 13) % 80], scenarios[(debut + 41) % 80]]);
      const t = totaux(etat);
      const attendu = etat.lignes.reduce((s, l) => {
        const p = produits.find((x) => x.id === l.produit);
        return s + l.quantite * (p.prix + (l.mode === 'pose' ? p.pose : 0));
      }, 0);
      expect(t.total, `scénario ${debut}`).toBe(attendu);
      expect(t.articles).toBe(etat.lignes.reduce((s, l) => s + l.quantite, 0));
    }
  });
});

describe('pureté : arguments gelés non modifiés', () => {
  it('toutes les fonctions acceptent des arguments gelés en profondeur', () => {
    const etat = profond(clone(dixLignes()));
    const petit = profond(clone(etatDe({ ...ligne(), quantite: 3 }, sansCotes())));
    const l = profond(clone(ligne()));
    const lim = profond(clone(limites));
    const prods = profond(clone(produits));
    const brut = session([{ ...ligne(), quantite: 3 }, { ...ligne(), quantite: 4 }]);
    const avant = JSON.stringify([etat, petit, l, lim]);
    expect(() => {
      lireListe(brut, lim);
      ajouterLigne(petit, l, 2, lim);
      ajouterLigne(etat, l, 2, lim);
      changerQuantite(petit, cleLigne(l), 1, lim);
      retirerLigne(petit, cleLigne(l));
      restaurerLigne(petit, { ...l, quantite: 2 }, 0, lim);
      construireLigne(prods[0], 'pose', evaluerCotes({ largeur: '1200', hauteur: '400', tolerance: '' }, prods[0].cotes), 2);
      const v = validerPanier(petit, prods);
      totauxPanier(v.lignes);
      besoinConfirmation(v.lignes);
      validerLigne(l, prods);
    }).not.toThrow();
    expect(JSON.stringify([etat, petit, l, lim])).toBe(avant);
  });
});

describe('compterArticles', () => {
  it('cas nominaux', () => {
    expect(compterArticles(session([{ ...ligne(), quantite: 2 }, { ...sansCotes(), quantite: 3 }]))).toBe(5);
    expect(compterArticles(session([]))).toBe(0);
  });
  it('illisible : 0 ; quantités invalides ignorées', () => {
    for (const brut of [null, undefined, '', 'x', '[]', session([], 1), '{"v":2,"lignes":3}', 5]) expect(compterArticles(brut)).toBe(0);
    expect(compterArticles(session([{ quantite: 0 }, { quantite: 1.5 }, { quantite: '2' }, null, { quantite: 4 }]))).toBe(4);
  });
  it('plafond 99 par défaut ; plafond choisi par l\'appelant', () => {
    const beaucoup = session([{ ...ligne(), quantite: 60 }, { ...sansCotes(), quantite: 70 }]);
    expect(compterArticles(beaucoup)).toBe(99);
    expect(compterArticles(beaucoup, 100)).toBe(100);
    expect(compterArticles(session([{ ...ligne(), quantite: 99 }]))).toBe(99);
  });
});

describe('besoinConfirmation et peutValider', () => {
  const sans = [entree(sansCotes(), 1)];
  const mesure = [entree(ligne(), 1), entree(sansCotes(), 1)];
  const invalide = [entree(avecCotes({ largeur: 699 }), 1)];
  it('besoinConfirmation : seulement pour une ligne valide sur mesure', () => {
    expect(besoinConfirmation(sans)).toBe(false);
    expect(besoinConfirmation(mesure)).toBe(true);
    expect(besoinConfirmation(invalide)).toBe(false);
    expect(besoinConfirmation([])).toBe(false);
  });
  it('peutValider : toutes les combinaisons', () => {
    for (const caseCochee of [false, true]) {
      for (const besoin of [false, true]) {
        for (const valides of [0, 1, 3]) {
          for (const invalides of [0, 2]) {
            const attendu = valides >= 1 && invalides === 0 && (!besoin || caseCochee);
            expect(peutValider({ caseCochee, besoinConfirmation: besoin, valides, invalides }), `${caseCochee} ${besoin} ${valides} ${invalides}`).toBe(attendu);
          }
        }
      }
    }
  });
});

describe('données du panier et de l\'ajout', () => {
  it('limites positives', () => {
    expect(limites.quantiteMax).toBeGreaterThan(0);
    expect(limites.lignesMax).toBeGreaterThan(0);
  });
  it('délais numériques égaux au dernier entier des textes ; icone non vide', () => {
    expect(produits).toHaveLength(10);
    for (const p of produits) {
      const dernier = (t) => Number(t.match(/\d+/g).at(-1));
      expect(p.livraisonSemainesMax, p.id).toBe(dernier(p.delaiLivraison));
      expect(p.poseSemainesMax, p.id).toBe(dernier(p.delaiPose));
      expect(typeof p.icone).toBe('string');
      expect(p.icone.length).toBeGreaterThan(0);
    }
  });
  it('objet ajout complet : textes non vides et marques attendues', () => {
    const { ajout } = donnees;
    for (const [cle, texte] of Object.entries(ajout)) {
      expect(typeof texte, cle).toBe('string');
      expect(texte.trim().length, cle).toBeGreaterThan(0);
    }
    const marques = {
      quantiteAria: ['produit'], moinsAria: ['produit'], plusAria: ['produit'], ajoutee: ['quantite', 'titre'], fusionnee: ['quantite', 'titre'],
      plafonnee: ['max', 'titre'], pleine: ['max'], articles: ['articles'], article: ['articles'],
    };
    for (const [cle, attendues] of Object.entries(marques)) {
      expect([...ajout[cle].matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).sort(), cle).toEqual(attendues);
    }
    for (const cle of ['quantite', 'moins', 'plus', 'bouton', 'voirPanier', 'continuer', 'stockage']) expect(ajout[cle], cle).toBeDefined();
    expect(remplirGabarit(ajout.ajoutee, { titre: 'T', quantite: 2 })).toBe('Ajouté au panier : T × 2.');
    expect(remplirGabarit(ajout.pleine, { max: 10 })).toBe('Le panier est plein (10 lignes). Retirez une ligne pour continuer.');
  });
});

describe('clé « commande » du lot 8', () => {
  it('aucun module JavaScript ne la lit ni ne l\'écrit', () => {
    const modules = readdirSync('assets/js').filter((f) => f.endsWith('.js'));
    expect(modules.length).toBeGreaterThan(10);
    for (const f of modules) {
      const source = lire(`assets/js/${f}`);
      expect(source, f).not.toMatch(/['"]commande['"]/);
      expect(source, f).not.toMatch(/lireCommande|validerCommande|construireCommande/);
    }
  });
});

describe('configurateur : message des produits non complets', () => {
  it('le message et le lien sont inchangés', () => {
    expect(donnees.configurateur.nonComplet).toEqual({
      message: 'Configurateur, spécifications et documents disponibles seulement pour la fiche complète du batardeau modulable dans ce démonstrateur.',
      lien: 'Retour au diagnostic',
    });
    const html = lire('produit.html');
    expect(html).toContain('data-texte="produit.configurateur.nonComplet.message"');
    expect(html).toMatch(/configurateur__indisponible" hidden/);
  });
});
