import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  lireCompte, compteConnecte, formaterDate, totauxCommande, resumeLignes, trierCommandes, filtrerCommandes,
  demandesEnCours, documentsCommande, validerConnexion, validerInformations, RAISONSCOMPTE, STATUTS,
} from '../assets/js/compte-logique.js';
import { evaluerCotes } from '../assets/js/cotes-logique.js';
import { validerPanier, totauxPanier } from '../assets/js/lignes-logique.js';
import { estConnecte, ouvrirSession, fermerSession, ecrireAchat, lireAchat } from '../assets/js/compte-session.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const compte = JSON.parse(lire('data/compte.json'));
const produit = JSON.parse(lire('data/produit.json'));
const { limites } = compte;
const commande = (id) => compte.commandes.find((c) => c.id === id);
const feuilles = (objet) => Object.values(objet).flatMap((v) => (typeof v === 'string' ? [v] : v !== null && typeof v === 'object' ? feuilles(v) : []));

describe('lot 8c-A : cohérence de data/compte.json avec data/produit.json', () => {
  it('chaque ligne reprend titre, référence, icône, prix et cotes compatibles du produit ; produits sans configurateur : pas de cotes', () => {
    for (const cmd of compte.commandes) {
      expect(cmd.lignes.length).toBeLessThanOrEqual(produit.panier.limites.lignesMax);
      for (const l of cmd.lignes) {
        const p = produit.produits.find((x) => x.id === l.produit);
        expect(p, `${cmd.id} ${l.produit}`).toBeDefined();
        expect([l.titre, l.reference, l.icone]).toEqual([p.titre, p.reference, p.icone]);
        expect(l.prixUnitaire).toEqual({ materiel: p.prix, pose: p.pose });
        expect(['diy', 'pose']).toContain(l.mode);
        expect(Number.isInteger(l.quantite) && l.quantite >= 1 && l.quantite <= produit.panier.limites.quantiteMax).toBe(true);
        if (p.complet) {
          const e = evaluerCotes({ largeur: String(l.cotes.largeur), hauteur: String(l.cotes.hauteur), tolerance: String(l.cotes.tolerance) }, p.cotes);
          expect(e.etat, `${cmd.id} cotes`).toBe('compatible');
        } else expect(l.cotes, `${cmd.id} ${l.produit}`).toBeNull();
      }
    }
  });

  it('commandes : identifiants CMD-1029 à CMD-1051, dates valides, statuts tous utilisés, délais et artisan conformes aux règles du panier', () => {
    expect(compte.commandes).toHaveLength(4);
    expect(new Set(compte.commandes.map((c) => c.id)).size).toBe(4);
    for (const c of compte.commandes) {
      const n = Number(c.id.match(/^CMD-(\d{4})$/)?.[1]);
      expect(n >= 1029 && n <= 1051, c.id).toBe(true);
      expect(formaterDate(c.date), c.id).not.toBe('');
      expect(STATUTS).toContain(c.statut);
      const etat = { lignes: c.lignes.map(({ produit: id, mode, cotes, quantite }) => ({ produit: id, mode, cotes, quantite })) };
      const totaux = totauxPanier(validerPanier(etat, produit.produits).lignes);
      expect(c.livraison, c.id).toEqual({ delaiLivraison: totaux.delaiLivraison, delaiPose: totaux.delaiPose });
      expect(c.artisan === null, c.id).toBe(!c.lignes.some((l) => l.mode === 'pose'));
      if (c.artisan) expect([c.artisan.nom.length > 0, formaterDate(c.artisan.date) !== '']).toEqual([true, true]);
    }
    expect(new Set(compte.commandes.map((c) => c.statut))).toEqual(new Set(STATUTS));
    expect(compte.statuts.map((s) => s.id)).toEqual(STATUTS);
    expect(compte.commandes.some((c) => c.lignes.length > 1)).toBe(true);
    expect(commande('CMD-1037').lignes[0]).toMatchObject({ produit: 'batardeau-modulable', mode: 'pose', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 } });
    expect(commande('CMD-1044').lignes[0]).toMatchObject({ mode: 'diy', cotes: { largeur: 800, hauteur: 400 } });
  });

  it('demandes, catalogue de documents, client et textes', () => {
    expect(compte.demandes).toHaveLength(4);
    const idsDemande = compte.statutsDemande.map((s) => s.id);
    expect(idsDemande).toEqual(['recue', 'en-analyse', 'intervention-planifiee', 'cloturee']);
    expect(new Set(compte.demandes.map((d) => d.statut))).toEqual(new Set(idsDemande));
    for (const d of compte.demandes) {
      expect(compte.commandes.map((c) => c.id), d.id).toContain(d.commande);
      expect(d.id).toMatch(/^SAV-\d{4} \(exemple\)$/);
      expect(formaterDate(d.date)).not.toBe('');
    }
    expect(compte.documents.map((d) => d.id)).toEqual(['facture', 'notice', 'pv', 'attestation-pose', 'garantie-decennale']);
    for (const d of compte.documents) expect(existsSync(d.fichier), d.fichier).toBe(true);
    expect(compte.client).toMatchObject({ prenom: 'Camille', email: 'client.demo@exemple.test' });
    for (const t of feuilles(compte)) expect(t.trim().length).toBeGreaterThan(0);
    for (const [champ, raisons] of Object.entries(RAISONSCOMPTE)) {
      for (const r of raisons) expect(compte.messages[champ]?.[r]?.length, `${champ}/${r}`).toBeGreaterThan(0);
      expect(Object.keys(compte.messages[champ]).sort()).toEqual([...raisons].sort());
      expect(compte.formulaire.resume.liens[champ]?.length, champ).toBeGreaterThan(0);
    }
  });
});

describe('lot 8c-A : session et dates', () => {
  it('lireCompte et compteConnecte : valide, v différent, connecte "true", JSON invalide, null', () => {
    expect(lireCompte('{"v":1,"connecte":true}')).toEqual({ v: 1, connecte: true });
    for (const brut of ['{"v":2,"connecte":true}', '{"v":1,"connecte":"true"}', '{"v":1}', '{oups', 'null', '[]', '', null, undefined, 3, {}]) {
      expect(lireCompte(brut), String(brut)).toBeNull();
      expect(compteConnecte(brut)).toBe(false);
    }
    expect(compteConnecte('{"v":1,"connecte":true,"email":"x"}')).toBe(true);
  });

  it('compte-session : écriture et suppression avec un stockage factice ; stockage qui lève une exception : non connecté', () => {
    const memoire = new Map();
    const stockage = { getItem: (k) => memoire.get(k) ?? null, setItem: (k, v) => memoire.set(k, v), removeItem: (k) => memoire.delete(k) };
    expect(estConnecte(stockage)).toBe(false);
    expect(ouvrirSession(stockage)).toBe(true);
    expect(JSON.parse(memoire.get('compte'))).toEqual({ v: 1, connecte: true });
    expect(estConnecte(stockage)).toBe(true);
    expect(ecrireAchat('CMD-1037', stockage)).toBe(true);
    expect(lireAchat(stockage)).toBe('CMD-1037');
    expect(ecrireAchat('', stockage)).toBe(false);
    fermerSession(stockage);
    expect([...memoire.keys()]).toEqual([]);
    const casse = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    expect(estConnecte(casse)).toBe(false);
    expect(ouvrirSession(casse)).toBe(false);
    expect(lireAchat(casse)).toBeNull();
    expect(() => fermerSession(casse)).not.toThrow();
  });

  it('formaterDate : valide, 29 février (bissextile ou non), invalide', () => {
    expect(formaterDate('2026-09-12')).toBe('12 septembre 2026');
    expect(formaterDate('2026-08-01')).toBe('1er août 2026');
    expect(formaterDate('2028-02-29')).toBe('29 février 2028');
    for (const x of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '12/09/2026', '2026-9-1', '', null, undefined, 20260912]) expect(formaterDate(x), String(x)).toBe('');
  });
});

describe('lot 8c-A : commandes', () => {
  it('totauxCommande (DIY, pose, quantités) et resumeLignes', () => {
    expect(totauxCommande(commande('CMD-1044').lignes)).toEqual({ articles: 1, materiel: 690, pose: 0, total: 690 });
    expect(totauxCommande(commande('CMD-1037').lignes)).toEqual({ articles: 3, materiel: 690 + 520, pose: 280 + 200, total: 1210 + 480 });
    expect(totauxCommande(commande('CMD-1051').lignes)).toEqual({ articles: 3, materiel: 149 + 840, pose: 0, total: 989 });
    expect(totauxCommande([])).toEqual({ articles: 0, materiel: 0, pose: 0, total: 0 });
    expect(resumeLignes(commande('CMD-1051'))).toEqual(['Clapet anti-retour × 1', 'Pompe de relevage × 2']);
  });

  it('trierCommandes, filtrerCommandes, demandesEnCours', () => {
    expect(trierCommandes(compte.commandes).map((c) => c.id)).toEqual(['CMD-1051', 'CMD-1044', 'CMD-1037', 'CMD-1029']);
    expect(trierCommandes([{ id: 'B', date: '2026-01-01' }, { id: 'A', date: '2026-01-01' }]).map((c) => c.id)).toEqual(['A', 'B']);
    expect(filtrerCommandes(compte.commandes, 'livre').map((c) => c.id)).toEqual(['CMD-1029']);
    expect(filtrerCommandes(compte.commandes, 'tous')).toHaveLength(4);
    expect(filtrerCommandes(compte.commandes, 'inconnu')).toHaveLength(4);
    expect(filtrerCommandes(compte.commandes, undefined)).toHaveLength(4);
    expect(demandesEnCours(compte.demandes).map((d) => d.id)).toEqual(['SAV-1001 (exemple)', 'SAV-1002 (exemple)']);
    expect(demandesEnCours(compte.demandes, 5).map((d) => d.statut)).not.toContain('cloturee');
    expect(demandesEnCours(compte.demandes, 5)).toHaveLength(3);
  });

  it('documentsCommande : DIY sans mesure = facture ; sur mesure = facture, notice, PV ; pose = cinq documents', () => {
    const ids = (c) => documentsCommande(c, compte.documents).map((d) => d.id);
    expect(ids(commande('CMD-1051'))).toEqual(['facture']);
    expect(ids(commande('CMD-1029'))).toEqual(['facture']);
    expect(ids(commande('CMD-1044'))).toEqual(['facture', 'notice', 'pv']);
    expect(ids(commande('CMD-1037'))).toEqual(['facture', 'notice', 'pv', 'attestation-pose', 'garantie-decennale']);
    expect(ids({ lignes: [{ mode: 'pose', cotes: null }] })).toEqual(['facture', 'attestation-pose', 'garantie-decennale']);
  });

  it('pureté : arguments gelés, aucun argument modifié', () => {
    const fige = (o) => { Object.values(o).forEach((v) => v !== null && typeof v === 'object' && fige(v)); return Object.freeze(o); };
    const c = fige(structuredClone(compte));
    expect(() => {
      trierCommandes(c.commandes); filtrerCommandes(c.commandes, 'livre'); demandesEnCours(c.demandes);
      documentsCommande(c.commandes[0], c.documents); totauxCommande(c.commandes[0].lignes); resumeLignes(c.commandes[0]);
      validerInformations(fige({ prenom: 'A' }), c.limites); validerConnexion(fige({ email: 'a@b.fr' }), c.limites);
    }).not.toThrow();
  });
});

describe('lot 8c-A : validerConnexion', () => {
  const ok = { email: 'camille@exemple.test', motDePasse: 'x' };
  it('e-mails valides et invalides', () => {
    expect(validerConnexion(ok, limites)).toEqual({ ok: true, erreurs: [] });
    expect(validerConnexion({ ...ok, email: '  camille@exemple.test ' }, limites).ok).toBe(true);
    const raison = (email) => validerConnexion({ ...ok, email }, limites).erreurs[0]?.raison;
    expect(raison('')).toBe('vide');
    for (const e of ['sans-arobase', 'a@b', 'a@@b.fr', '@b.fr', 'a b@c.fr', 'a..b@c.fr', 'a@b.c1']) expect(raison(e), e).toBe('format');
    expect(raison(`${'a'.repeat(65)}@exemple.test`)).toBe('longueur');
  });
  it('mot de passe : vide, 128 et 129 caractères, contrôles ; une erreur par champ dans l\'ordre', () => {
    const raison = (motDePasse) => validerConnexion({ ...ok, motDePasse }, limites).erreurs[0]?.raison;
    expect(raison('')).toBe('vide');
    expect(raison('a'.repeat(128))).toBeUndefined();
    expect(raison('a'.repeat(129))).toBe('longueur');
    expect(raison('ab\u0000c')).toBe('caractere');
    expect(raison('ab‮c')).toBe('caractere');
    expect(raison('  mot de passe avec espaces  ')).toBeUndefined();
    expect(validerConnexion({}, limites).erreurs).toEqual([{ champ: 'email', raison: 'vide' }, { champ: 'motDePasse', raison: 'vide' }]);
    expect(Object.keys(validerConnexion(ok, limites))).not.toContain('valeurs');
  });
});

describe('lot 8c-A : robustesse', () => {
  const hostiles = [undefined, null, 0, NaN, true, 'texte', [], [1], {}, { email: 5, motDePasse: {} }, { prenom: [], codePostal: 12345 }, () => 1, Symbol.iterator];
  it('entrées de types inattendus : jamais d\'exception', () => {
    for (const x of hostiles) {
      expect(() => {
        lireCompte(x); compteConnecte(x); formaterDate(x); totauxCommande(x); resumeLignes(x); trierCommandes(x);
        filtrerCommandes(x, x, x); demandesEnCours(x, x); documentsCommande(x, x); validerConnexion(x, x); validerInformations(x, x);
      }, String(x)).not.toThrow();
    }
    expect(validerInformations(undefined, null).ok).toBe(false);
  });

  it('grille de plus de 200 saisies : ok équivaut à aucune erreur, raisons dans RAISONSCOMPTE, une seule raison par champ', () => {
    const emails = ['', 'a@b.fr', 'x', 'a@b.c', 'camille@exemple.test', `${'a'.repeat(70)}@b.fr`, ' a@b.fr '];
    const textes = ['', 'A', 'Camille', 'a'.repeat(50), 'a'.repeat(51), 'a\u0001b', 'x'.repeat(101)];
    const postaux = ['', '1234', '12345', '123456', '12 345', 'abcde'];
    let n = 0;
    for (const email of emails) for (const prenom of textes) for (const codePostal of postaux) {
      const saisie = { prenom, nom: 'Nom', email, telephone: '', adresse: 'Rue', complement: '', codePostal, ville: 'Ville' };
      const r = validerInformations(saisie, limites);
      n += 1;
      expect(r.ok).toBe(r.erreurs.length === 0);
      expect(new Set(r.erreurs.map((e) => e.champ)).size).toBe(r.erreurs.length);
      for (const { champ, raison } of r.erreurs) expect(RAISONSCOMPTE[champ]).toContain(raison);
      const c = validerConnexion({ email, motDePasse: prenom }, limites);
      expect(c.ok).toBe(c.erreurs.length === 0);
      for (const { champ, raison } of c.erreurs) expect(RAISONSCOMPTE[champ]).toContain(raison);
    }
    expect(n).toBeGreaterThanOrEqual(200);
  });
});
