import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  lireNumero, trouverCommande, commandeParDefaut, validerAcces, validerDemande, resoudreContexte, coordonneesInitiales,
  trierDemandes, filtrerDemandes, etapesDemande, RAISONSACCES, RAISONSSAV, CHAMPS_SAV, ETATS,
} from '../assets/js/sav-logique.js';
import { trierCommandes } from '../assets/js/compte-logique.js';
import {
  ecrireAccesSav, lireAccesSav, supprimerAccesSav, ecrireAchat, ouvrirSession, fermerSession, estConnecte, lireAchat, CLE_ACCES_SAV,
} from '../assets/js/compte-session.js';

const compte = JSON.parse(readFileSync('data/compte.json', 'utf8'));
const { commandes, limites, demandes, statutsDemande, motifs, client } = compte;
const MOTIFS = motifs.map((m) => m.id);
const stockageFactice = () => {
  const donnees = new Map();
  return { getItem: (c) => donnees.get(c) ?? null, setItem: (c, v) => donnees.set(c, String(v)), removeItem: (c) => donnees.delete(c), donnees };
};
const feuilles = (objet, chemin = 'sav') => (typeof objet === 'string' ? [[chemin, objet]]
  : Array.isArray(objet) ? objet.flatMap((e, i) => feuilles(e, `${chemin}[${i}]`))
    : Object.entries(objet).flatMap(([k, v]) => feuilles(v, `${chemin}.${k}`)));

const VALIDE = {
  ligne: '0', motif: 'pose', description: 'Le volet ne ferme plus depuis la pose.', prenom: 'Camille', nom: 'Exemple', email: 'client.demo@exemple.test',
  telephone: '', adresse: "1 rue de l'Exemple", codePostal: '00000', ville: 'Exempleville', consentement: true,
};
const CONTEXTE = { nbLignes: 2, motifs: MOTIFS };
const raison = (saisie, champ, contexte = CONTEXTE) => validerDemande(saisie, contexte, limites).erreurs.find((e) => e.champ === champ)?.raison ?? null;

describe('lot 8d-A : données de compte.json étendues', () => {
  it('motifs (5), motif de chaque demande, demandes liées à des commandes existantes, statuts dans l\'ordre de l\'indicateur', () => {
    expect(MOTIFS).toEqual(['livraison', 'fonctionnement', 'pose', 'piece', 'autre']);
    expect(motifs.map((m) => m.titre)).toEqual(['Défaut à la livraison', 'Défaut de fonctionnement', 'Problème de pose', 'Pièce manquante', 'Autre']);
    expect(demandes).toHaveLength(4);
    for (const demande of demandes) {
      expect(MOTIFS, demande.id).toContain(demande.motif);
      expect(commandes.map((c) => c.id), demande.id).toContain(demande.commande);
      expect(statutsDemande.map((s) => s.id), demande.id).toContain(demande.statut);
    }
    expect(statutsDemande.map((s) => s.id)).toEqual(['recue', 'en-analyse', 'intervention-planifiee', 'cloturee']);
  });
  it('« sav » est complet : aucun texte vide, valeurs d\'exemple et libellés imposés par la spécification', () => {
    for (const [chemin, valeur] of feuilles(compte.sav)) expect(valeur.trim(), chemin).not.toBe('');
    const { acces, demande, confirmation, etats, suivi } = compte.sav;
    expect(acces.champs.numero.aide).toContain('CMD-1037');
    expect(acces.champs.email.aide).toContain('client.demo@exemple.test');
    expect(acces.bouton).toBe('Continuer');
    expect(acces.connexion).toBe("J'ai un compte : me connecter");
    expect(demande.photos.emplacements).toEqual(['[Fichier exemple] Photo 1 (exemple)', '[Fichier exemple] Photo 2 (exemple)', '[Fichier exemple] Photo 3 (exemple)']);
    expect(demande.photos.aide).toBe("Aucun fichier n'est demandé dans ce démonstrateur.");
    expect(demande.photos.taille).toBe('5 Mo au plus par fichier (exemple).');
    expect(demande.envoi.bouton).toBe('Envoyer ma demande');
    expect(demande.envoi.consentement).toBe("J'accepte d'être recontacté à propos de cette demande.");
    expect([etats.achatManquant.titre, etats.accesRequis.titre]).toEqual(['Aucun achat sélectionné', 'Accès au SAV requis']);
    expect([confirmation.titre, confirmation.numero, confirmation.delai]).toEqual(['Demande reçue (exemple)', 'Numéro : SAV-000 (exemple)', 'Réponse sous 2 jours ouvrés (exemple).']);
    expect(confirmation.etapes.map((e) => e.titre)).toEqual(['Analyse de votre demande', 'Prise de contact par un conseiller', 'Intervention sur place']);
    expect(confirmation.concerne).toBe('Demande concernant : {titre} (commande {id})');
    expect(suivi.etapes.terminee).toBe('terminée');
    expect(suivi.etapes.actuelle).toBe('étape actuelle');
    expect(suivi.vide).toBe('Aucune demande avec ce statut');
    expect(suivi.filtres.map((f) => f.id)).toEqual(['tous', ...statutsDemande.map((s) => s.id)]);
    expect(demande.fil.compte).toHaveLength(4);
    expect(demande.fil.sansCompte).toHaveLength(3);
  });
  it('un texte pour chaque couple champ et raison de RAISONSACCES et RAISONSSAV, plus un repli', () => {
    for (const raisons of [RAISONSACCES, RAISONSSAV]) {
      for (const [champ, liste] of Object.entries(raisons)) {
        for (const r of liste) expect(compte.sav.messages[champ]?.[r], `${champ}.${r}`).toEqual(expect.any(String));
      }
    }
    expect(compte.sav.messages.repli).toEqual(expect.any(String));
    for (const champ of [...Object.keys(RAISONSACCES), ...CHAMPS_SAV]) expect(compte.sav.resume.liens[champ], champ).toEqual(expect.any(String));
  });
  it('limites cohérentes : numéro 3 à 8, description 20 à 1 000, reprises des lots 8b et 8c', () => {
    expect(limites.numero).toEqual({ min: 3, max: 8 });
    expect(limites.description).toEqual({ min: 20, max: 1000 });
    expect(limites.prenom).toEqual({ min: 1, max: 50 });
    expect(limites.nom).toEqual({ min: 1, max: 50 });
    expect(limites.adresse).toEqual({ min: 2, max: 100 });
    expect(limites.ville).toEqual({ min: 2, max: 60 });
    expect(limites.email).toEqual({ max: 254, localMax: 64 });
    for (const c of commandes) expect(c.id).toMatch(/^CMD-[0-9]{3,8}$/);
  });
});

describe('lot 8d-A : sav-logique.js, numéro et commandes', () => {
  it('lireNumero : formes acceptées, espaces ordinaires, U+00A0 et U+202F retirés', () => {
    for (const [saisie, id] of [['1037', 'CMD-1037'], ['CMD-1037', 'CMD-1037'], ['cmd 1037', 'CMD-1037'], ['Cmd1037', 'CMD-1037'], ['000', 'CMD-000'],
      ['  10 37  ', 'CMD-1037'], ['10 37', 'CMD-1037'], ['CMD - 1037', 'CMD-1037'], ['12345678', 'CMD-12345678']]) {
      expect(lireNumero(saisie), saisie).toEqual({ etat: 'ok', id });
    }
  });
  it('lireNumero : vide, trop court, trop long, lettres, autre type', () => {
    for (const saisie of ['', '   ', '  ', undefined, null]) expect(lireNumero(saisie), String(saisie)).toEqual({ etat: 'vide' });
    for (const saisie of ['CMD-12', '12', '123456789', 'CMD-123456789', 'ABC', 'CMD-', 'CMD-12a4', '12-34', 'XMD-1037', '１２３４']) {
      expect(lireNumero(saisie), String(saisie)).toEqual({ etat: 'invalide' });
    }
  });
  it('trouverCommande et commandeParDefaut (première commande à au moins 2 lignes, ordre de trierCommandes)', () => {
    expect(trouverCommande(commandes, 'CMD-1044')?.id).toBe('CMD-1044');
    expect(trouverCommande(commandes, 'CMD-9999')).toBeNull();
    expect(trouverCommande(commandes, undefined)).toBeNull();
    expect(trouverCommande(null, 'CMD-1044')).toBeNull();
    expect(trierCommandes(commandes)[0].id).toBe('CMD-1051');
    expect(commandeParDefaut(commandes).id).toBe('CMD-1051');
    const unique = [{ id: 'CMD-100', date: '2026-01-02', lignes: [{}] }, { id: 'CMD-101', date: '2026-01-01', lignes: [{}] }];
    expect(commandeParDefaut(unique).id).toBe('CMD-100');
    expect(commandeParDefaut([{ id: 'CMD-100', date: '2026-01-03', lignes: [{}] }, { id: 'CMD-101', date: '2026-01-01', lignes: [{}, {}] }]).id).toBe('CMD-101');
    expect(commandeParDefaut([])).toBeNull();
    expect(commandeParDefaut(undefined)).toBeNull();
  });
  it('resoudreContexte : les quatre états et leurs priorités', () => {
    expect(ETATS).toEqual(['compte', 'sans-compte', 'achat-manquant', 'acces-requis']);
    const un = (c) => resoudreContexte(c, commandes);
    expect(un({ connecte: true, achat: 'CMD-1037', acces: 'CMD-1044' })).toEqual({ etat: 'compte', commande: trouverCommande(commandes, 'CMD-1037') });
    expect(un({ connecte: true, achat: 'CMD-1037' }).etat).toBe('compte');
    expect(un({ connecte: true, achat: 'CMD-1037', acces: 'CMD-1044' }).commande.id).toBe('CMD-1037');
    expect(un({ connecte: false, achat: 'CMD-1037', acces: 'CMD-1044' })).toEqual({ etat: 'sans-compte', commande: trouverCommande(commandes, 'CMD-1044') });
    expect(un({ connecte: true, achat: 'CMD-9999', acces: 'CMD-1044' }).etat).toBe('sans-compte');
    expect(un({ connecte: true, achat: 'CMD-9999' })).toEqual({ etat: 'achat-manquant', commande: null });
    expect(un({ connecte: true })).toEqual({ etat: 'achat-manquant', commande: null });
    expect(un({ connecte: false, achat: 'CMD-1037' })).toEqual({ etat: 'acces-requis', commande: null });
    expect(un({ connecte: false, acces: 'CMD-9999' }).etat).toBe('acces-requis');
    expect(un({}).etat).toBe('acces-requis');
    expect(un(null).etat).toBe('acces-requis');
    expect(resoudreContexte({ connecte: true, achat: 'CMD-1037' }, undefined).etat).toBe('achat-manquant');
  });
  it('validerAcces : numéros et e-mails valides et invalides, e-mail jamais renvoyé, commande de repli', () => {
    const email = 'client.demo@exemple.test';
    const a = (numero, mail = email) => validerAcces({ numero, email: mail }, limites, commandes);
    expect(a('CMD-1037')).toEqual({ ok: true, erreurs: [], commandeId: 'CMD-1037' });
    expect(a('1044').commandeId).toBe('CMD-1044');
    expect(a('9999')).toEqual({ ok: true, erreurs: [], commandeId: 'CMD-1051' });
    expect(a('cmd 000').commandeId).toBe('CMD-1051');
    expect(a('', '').erreurs).toEqual([{ champ: 'numero', raison: 'vide' }, { champ: 'email', raison: 'vide' }]);
    expect(a('12').erreurs).toEqual([{ champ: 'numero', raison: 'format' }]);
    expect(a('CMD-1037', 'pas-un-email').erreurs).toEqual([{ champ: 'email', raison: 'format' }]);
    expect(a('CMD-1037', `${'a'.repeat(65)}@exemple.test`).erreurs).toEqual([{ champ: 'email', raison: 'longueur' }]);
    expect(a('12', 'x').commandeId).toBeNull();
    expect(JSON.stringify(a('CMD-1037'))).not.toContain('exemple.test');
    expect(JSON.stringify(a('CMD-1037', 'x@y'))).not.toContain('x@y');
    expect(validerAcces({ numero: '1037', email }, limites, []).commandeId).toBeNull();
    expect(() => validerAcces(null, null, null)).not.toThrow();
    expect(validerAcces(undefined, undefined, undefined).erreurs.map((e) => e.champ)).toEqual(['numero', 'email']);
  });
});

describe('lot 8d-A : validerDemande', () => {
  it('une saisie complète est valide ; le téléphone est facultatif', () => {
    const r = validerDemande(VALIDE, CONTEXTE, limites);
    expect(r.ok).toBe(true);
    expect(r.erreurs).toEqual([]);
    expect(r.valeurs.ligne).toBe(0);
    expect(raison({ ...VALIDE, telephone: '01 00 00 00 00' }, 'telephone')).toBeNull();
    expect(raison({ ...VALIDE, telephone: '12' }, 'telephone')).toBe('format');
  });
  it('ligne : 0, dernier, hors bornes, texte, nombre, nbLignes égal à 1', () => {
    expect(raison({ ...VALIDE, ligne: '0' }, 'ligne')).toBeNull();
    expect(raison({ ...VALIDE, ligne: 1 }, 'ligne')).toBeNull();
    expect(raison({ ...VALIDE, ligne: '1' }, 'ligne')).toBeNull();
    for (const ligne of ['2', 2, -1, '-1', 1.5, '1.5', 'a', '01', ' 1', NaN, Infinity, true, {}, []]) expect(raison({ ...VALIDE, ligne }, 'ligne'), String(ligne)).toBe('invalide');
    for (const ligne of ['', undefined, null]) expect(raison({ ...VALIDE, ligne }, 'ligne'), String(ligne)).toBe('vide');
    expect(raison({ ...VALIDE, ligne: '0' }, 'ligne', { nbLignes: 1, motifs: MOTIFS })).toBeNull();
    expect(raison({ ...VALIDE, ligne: '1' }, 'ligne', { nbLignes: 1, motifs: MOTIFS })).toBe('invalide');
    expect(raison({ ...VALIDE, ligne: '0' }, 'ligne', { nbLignes: 0, motifs: MOTIFS })).toBe('invalide');
  });
  it('motif connu, inconnu, vide', () => {
    for (const id of MOTIFS) expect(raison({ ...VALIDE, motif: id }, 'motif'), id).toBeNull();
    expect(raison({ ...VALIDE, motif: 'inconnu' }, 'motif')).toBe('invalide');
    expect(raison({ ...VALIDE, motif: '' }, 'motif')).toBe('vide');
    expect(raison({ ...VALIDE, motif: undefined }, 'motif')).toBe('vide');
    expect(raison({ ...VALIDE, motif: 3 }, 'motif')).toBe('vide');
    expect(raison({ ...VALIDE, motif: 'pose' }, 'motif', { nbLignes: 2, motifs: motifs })).toBeNull();
  });
  it('description : 19, 20, 1 000 et 1 001 points de code, vide, caractère interdit, sauts de ligne admis', () => {
    expect(raison({ ...VALIDE, description: 'a'.repeat(19) }, 'description')).toBe('court');
    expect(raison({ ...VALIDE, description: 'a'.repeat(20) }, 'description')).toBeNull();
    expect(raison({ ...VALIDE, description: 'a'.repeat(1000) }, 'description')).toBeNull();
    expect(raison({ ...VALIDE, description: 'a'.repeat(1001) }, 'description')).toBe('long');
    expect(raison({ ...VALIDE, description: '😀'.repeat(1000) }, 'description')).toBeNull();
    expect(raison({ ...VALIDE, description: '😀'.repeat(1001) }, 'description')).toBe('long');
    expect(raison({ ...VALIDE, description: '   ' }, 'description')).toBe('vide');
    expect(raison({ ...VALIDE, description: `${'a'.repeat(20)}\u0007` }, 'description')).toBe('caractere');
    expect(raison({ ...VALIDE, description: `${'a'.repeat(10)}\n${'b'.repeat(10)}` }, 'description')).toBeNull();
  });
  it('prénom, nom, adresse, ville : vide, caractère, longueur', () => {
    for (const [champ, max] of [['prenom', 50], ['nom', 50], ['adresse', 100], ['ville', 60]]) {
      expect(raison({ ...VALIDE, [champ]: '' }, champ), champ).toBe('vide');
      expect(raison({ ...VALIDE, [champ]: 'a'.repeat(max + 1) }, champ), champ).toBe('longueur');
      expect(raison({ ...VALIDE, [champ]: 'a'.repeat(max) }, champ), champ).toBeNull();
      expect(raison({ ...VALIDE, [champ]: 'ab\u0001cd' }, champ), champ).toBe('caractere');
    }
    expect(raison({ ...VALIDE, adresse: 'a' }, 'adresse')).toBe('longueur');
  });
  it('e-mail : vide, format, longueur ; code postal : 4, 5 et 6 chiffres, espaces tolérés, lettres', () => {
    expect(raison({ ...VALIDE, email: '' }, 'email')).toBe('vide');
    expect(raison({ ...VALIDE, email: 'a@b' }, 'email')).toBe('format');
    expect(raison({ ...VALIDE, email: `${'a'.repeat(65)}@exemple.test` }, 'email')).toBe('longueur');
    expect(raison({ ...VALIDE, codePostal: '1234' }, 'codePostal')).toBe('format');
    expect(raison({ ...VALIDE, codePostal: '12345' }, 'codePostal')).toBeNull();
    expect(raison({ ...VALIDE, codePostal: '123456' }, 'codePostal')).toBe('format');
    expect(raison({ ...VALIDE, codePostal: ' 12 345 ' }, 'codePostal')).toBeNull();
    expect(raison({ ...VALIDE, codePostal: '12 345' }, 'codePostal')).toBeNull();
    expect(raison({ ...VALIDE, codePostal: '1234a' }, 'codePostal')).toBe('format');
    expect(raison({ ...VALIDE, codePostal: '' }, 'codePostal')).toBe('vide');
    expect(validerDemande({ ...VALIDE, codePostal: ' 12 345 ' }, CONTEXTE, limites).valeurs.codePostal).toBe('12345');
  });
  it('consentement : seul true est accepté', () => {
    expect(raison({ ...VALIDE, consentement: true }, 'consentement')).toBeNull();
    for (const consentement of [false, 'true', 1, 'on', undefined, null, {}]) expect(raison({ ...VALIDE, consentement }, 'consentement'), String(consentement)).toBe('vide');
  });
  it('une raison par champ, dans l\'ordre du formulaire', () => {
    const r = validerDemande({}, CONTEXTE, limites);
    expect(r.erreurs.map((e) => e.champ)).toEqual(['ligne', 'motif', 'description', 'prenom', 'nom', 'email', 'adresse', 'codePostal', 'ville', 'consentement']);
    expect(r.erreurs.map((e) => e.raison)).toEqual(['vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide']);
    expect(new Set(r.erreurs.map((e) => e.champ)).size).toBe(r.erreurs.length);
    expect(CHAMPS_SAV).toEqual(['ligne', 'motif', 'description', 'prenom', 'nom', 'email', 'telephone', 'adresse', 'codePostal', 'ville', 'consentement']);
  });
  it('avec compte : coordonnées préremplies, seuls ligne, motif, description et consentement restent à saisir', () => {
    const initiales = coordonneesInitiales('compte', client);
    const r = validerDemande({ ...initiales, ligne: '', motif: '', description: '', consentement: false }, CONTEXTE, limites);
    expect(r.erreurs.map((e) => e.champ)).toEqual(['ligne', 'motif', 'description', 'consentement']);
  });
});

describe('lot 8d-A : pureté, robustesse et propriétés', () => {
  const geler = (valeur) => {
    if (valeur !== null && typeof valeur === 'object') for (const v of Object.values(valeur)) geler(v);
    return Object.freeze(valeur);
  };
  it('arguments gelés non modifiés, mêmes entrées, mêmes sorties', () => {
    const gele = geler(structuredClone({ commandes, limites, demandes, statutsDemande, client }));
    const saisie = geler({ ...VALIDE, ligne: 1 });
    const contexte = geler({ nbLignes: 2, motifs: [...MOTIFS] });
    const avant = JSON.stringify(gele);
    expect(validerDemande(saisie, contexte, gele.limites)).toEqual(validerDemande(saisie, contexte, gele.limites));
    expect(validerAcces(geler({ numero: '1037', email: 'a@exemple.test' }), gele.limites, gele.commandes)).toEqual(validerAcces({ numero: '1037', email: 'a@exemple.test' }, gele.limites, gele.commandes));
    for (const f of [
      () => commandeParDefaut(gele.commandes), () => trouverCommande(gele.commandes, 'CMD-1037'), () => trierDemandes(gele.demandes),
      () => filtrerDemandes(gele.demandes, 'recue', gele.statutsDemande), () => etapesDemande('recue', gele.statutsDemande),
      () => coordonneesInitiales('compte', gele.client), () => resoudreContexte({ connecte: true, achat: 'CMD-1037' }, gele.commandes),
    ]) expect(f).not.toThrow();
    expect(JSON.stringify(gele)).toBe(avant);
  });
  it('types inattendus : jamais d\'exception', () => {
    const bizarres = [undefined, null, 0, 1, NaN, '', 'x', true, false, [], {}, [1, 2], () => 1, Symbol('s'), 10n, new Date(0), { toString: () => 'x' }];
    for (const a of bizarres) {
      for (const b of bizarres) {
        expect(() => {
          lireNumero(a, b); trouverCommande(a, b); commandeParDefaut(a); validerAcces(a, b, b); validerAcces({ numero: a, email: a }, b, a);
          validerDemande(a, b, b); validerDemande({ ligne: a, motif: a, description: a, prenom: a, nom: a, email: a, telephone: a, adresse: a, codePostal: a, ville: a, consentement: a }, { nbLignes: a, motifs: a }, b);
          resoudreContexte(a, b); coordonneesInitiales(a, b); trierDemandes(a); filtrerDemandes(a, b, b); etapesDemande(a, b);
        }, `${String(typeof a)} ${String(typeof b)}`).not.toThrow();
      }
    }
  });
  it('propriété sur une grille de plus de 300 saisies : ok équivaut à aucune erreur, raisons connues, valeurs idempotentes', () => {
    const grilles = {
      ligne: ['0', 1, '2', '', 'x', -1], motif: ['pose', 'autre', 'nope', ''], description: ['a'.repeat(19), 'a'.repeat(20), 'a'.repeat(1001), '', 'ab\u0000'.repeat(10)],
      prenom: ['Camille', '', 'a'.repeat(51)], email: ['client.demo@exemple.test', 'x', '', 'a@b'], codePostal: ['00000', '1234', ' 7 5001 ', ''],
      consentement: [true, false, 'true'],
    };
    const cles = Object.keys(grilles);
    let total = 0;
    const parcourir = (i, courant) => {
      if (i === cles.length) {
        total += 1;
        const saisie = { ...VALIDE, ...courant };
        const r = validerDemande(saisie, CONTEXTE, limites);
        expect(r.ok).toBe(r.erreurs.length === 0);
        for (const { champ, raison: motif } of r.erreurs) expect(RAISONSSAV[champ], `${champ}:${motif}`).toContain(motif);
        const encore = validerDemande(r.valeurs, CONTEXTE, limites);
        expect(encore.valeurs).toEqual(r.valeurs);
        if (r.ok) expect(encore.ok).toBe(true);
        return;
      }
      for (const valeur of grilles[cles[i]]) parcourir(i + 1, { ...courant, [cles[i]]: valeur });
    };
    parcourir(0, {});
    expect(total).toBeGreaterThanOrEqual(300);
  });
});

describe('lot 8d-A : suivi des demandes et coordonnées', () => {
  it('trierDemandes (date décroissante, puis identifiant croissant) et filtrerDemandes', () => {
    expect(trierDemandes(demandes).map((d) => d.id)).toEqual(['SAV-1001 (exemple)', 'SAV-1002 (exemple)', 'SAV-1003 (exemple)', 'SAV-1004 (exemple)']);
    const egalite = [{ id: 'B', date: '2026-01-01' }, { id: 'A', date: '2026-01-01' }, { id: 'C', date: '2026-02-01' }];
    expect(trierDemandes(egalite).map((d) => d.id)).toEqual(['C', 'A', 'B']);
    expect(egalite.map((d) => d.id)).toEqual(['B', 'A', 'C']);
    expect(filtrerDemandes(demandes, 'tous', statutsDemande)).toHaveLength(4);
    expect(filtrerDemandes(demandes, 'toutes', statutsDemande)).toHaveLength(4);
    expect(filtrerDemandes(demandes, 'inconnu', statutsDemande)).toHaveLength(4);
    expect(filtrerDemandes(demandes, undefined)).toHaveLength(4);
    for (const s of statutsDemande) expect(filtrerDemandes(demandes, s.id, statutsDemande).map((d) => d.statut)).toEqual([s.id]);
    expect(filtrerDemandes(demandes, 'recue').map((d) => d.id)).toEqual(['SAV-1001 (exemple)']);
  });
  it('etapesDemande : terminee avant le statut, actuelle, a-venir après ; statut inconnu : tout a-venir ; une étape actuelle par demande', () => {
    expect(etapesDemande('intervention-planifiee', statutsDemande).map((e) => e.etat)).toEqual(['terminee', 'terminee', 'actuelle', 'a-venir']);
    expect(etapesDemande('recue', statutsDemande).map((e) => e.etat)).toEqual(['actuelle', 'a-venir', 'a-venir', 'a-venir']);
    expect(etapesDemande('cloturee', statutsDemande).map((e) => e.etat)).toEqual(['terminee', 'terminee', 'terminee', 'actuelle']);
    expect(etapesDemande('?', statutsDemande).map((e) => e.etat)).toEqual(['a-venir', 'a-venir', 'a-venir', 'a-venir']);
    expect(etapesDemande('recue', statutsDemande)[0]).toEqual({ id: 'recue', titre: 'Reçue', etat: 'actuelle' });
    expect(etapesDemande('recue', null)).toEqual([]);
    for (const d of demandes) {
      const etapes = etapesDemande(d.statut, statutsDemande);
      expect(etapes.filter((e) => e.etat === 'actuelle')).toHaveLength(1);
      expect(etapes.filter((e) => e.etat === 'terminee')).toHaveLength(statutsDemande.findIndex((s) => s.id === d.statut));
    }
  });
  it('coordonneesInitiales : client de démonstration avec compte, vides sinon', () => {
    expect(coordonneesInitiales('compte', client)).toEqual({
      prenom: 'Camille', nom: 'Exemple', email: 'client.demo@exemple.test', telephone: '01 00 00 00 00',
      adresse: "1 rue de l'Exemple", codePostal: '00000', ville: 'Exempleville',
    });
    const vide = { prenom: '', nom: '', email: '', telephone: '', adresse: '', codePostal: '', ville: '' };
    for (const etat of ['sans-compte', 'achat-manquant', 'acces-requis', undefined]) expect(coordonneesInitiales(etat, client), String(etat)).toEqual(vide);
    expect(coordonneesInitiales('compte', null)).toEqual(vide);
  });
});

describe('lot 8d-A : session acces-sav', () => {
  it('lecture, écriture, valeur invalide lue comme absente, aucune autre clé', () => {
    const s = stockageFactice();
    expect(lireAccesSav(s)).toBeNull();
    expect(ecrireAccesSav('CMD-1037', s)).toBe(true);
    expect(s.donnees.get(CLE_ACCES_SAV)).toBe('CMD-1037');
    expect(lireAccesSav(s)).toBe('CMD-1037');
    expect(lireAccesSav(s)).toBe('CMD-1037');
    for (const invalide of ['1037', 'CMD-12', 'CMD-123456789', 'cmd-1037', 'CMD-10a7', '', ' CMD-1037']) {
      s.setItem(CLE_ACCES_SAV, invalide);
      expect(lireAccesSav(s), invalide).toBeNull();
    }
    for (const refuse of ['1037', 'CMD-12', '', undefined, null, 1037]) expect(ecrireAccesSav(refuse, stockageFactice()), String(refuse)).toBe(false);
    expect([...s.donnees.keys()]).toEqual([CLE_ACCES_SAV]);
    supprimerAccesSav(s);
    expect(lireAccesSav(s)).toBeNull();
  });
  it('stockage indisponible : aucune exception, écriture refusée, lecture absente', () => {
    const casse = { getItem() { throw new Error('indisponible'); }, setItem() { throw new Error('indisponible'); }, removeItem() { throw new Error('indisponible'); } };
    expect(ecrireAccesSav('CMD-1037', casse)).toBe(false);
    expect(lireAccesSav(casse)).toBeNull();
    expect(() => supprimerAccesSav(casse)).not.toThrow();
    expect(() => fermerSession(casse)).not.toThrow();
  });
  it('la déconnexion efface compte, achat et acces-sav', () => {
    const s = stockageFactice();
    ouvrirSession(s);
    ecrireAchat('CMD-1037', s);
    ecrireAccesSav('CMD-1044', s);
    expect(estConnecte(s) && lireAchat(s) === 'CMD-1037' && lireAccesSav(s) === 'CMD-1044').toBe(true);
    fermerSession(s);
    expect(estConnecte(s)).toBe(false);
    expect(lireAchat(s)).toBeNull();
    expect(lireAccesSav(s)).toBeNull();
    expect(s.donnees.size).toBe(0);
  });
});
