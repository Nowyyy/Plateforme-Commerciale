import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RAISONS, CHAMPS, compterCaracteres, normaliser, valider, construireResume } from '../assets/js/pro-logique.js';

const pro = JSON.parse(readFileSync('data/pro.json', 'utf8'));
const LIM = pro.limites;
const ALEAS = pro.aleas.map((a) => a.id);
const PARFAITE = {
  societe: 'Société Exemple', siret: '000 000 000 00000', prenom: 'Claire', nom: 'Exemple', email: 'claire@exemple.fr',
  telephone: '+33 6 12 34 56 78', aleas: [ALEAS[0]], description: 'Des batardeaux modulables (exemple).', message: '', consentement: true,
};
const v = (surcharge) => valider({ ...PARFAITE, ...surcharge }, LIM, ALEAS);
const raison = (surcharge, champ) => v(surcharge).erreurs.find((e) => e.champ === champ)?.raison ?? null;
const NBSP = ' ';
const FINE = ' ';
const deepFreeze = (o) => {
  if (o !== null && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
};

describe('pro-logique : compterCaracteres', () => {
  it('compte les points de code Unicode', () => {
    expect(compterCaracteres('')).toBe(0);
    expect(compterCaracteres('é')).toBe(1); // précomposé
    expect(compterCaracteres('é')).toBe(2); // combiné : deux points de code
    expect(compterCaracteres('😀')).toBe(1);
    expect(compterCaracteres('a\nb')).toBe(3);
    expect(compterCaracteres(undefined)).toBe(0);
  });
});

describe('pro-logique : champs', () => {
  it('société : vide, espaces seuls, bornes 2 et 100, caractères interdits', () => {
    expect(raison({ societe: '' }, 'societe')).toBe('vide');
    expect(raison({ societe: `  ${NBSP}${FINE} ` }, 'societe')).toBe('vide');
    expect(raison({ societe: 'a' }, 'societe')).toBe('longueur');
    expect(raison({ societe: 'ab' }, 'societe')).toBeNull();
    expect(raison({ societe: 'a'.repeat(100) }, 'societe')).toBeNull();
    expect(raison({ societe: 'a'.repeat(101) }, 'societe')).toBe('longueur');
    expect(raison({ societe: 'ab\u0001cd' }, 'societe')).toBe('caractere');
    expect(raison({ societe: 'ab\u007fcd' }, 'societe')).toBe('caractere');
    expect(raison({ societe: 'ab‮cd' }, 'societe')).toBe('caractere');
    expect(raison({ societe: 'ab⁧cd' }, 'societe')).toBe('caractere');
    expect(raison({ societe: 'ab\tcd' }, 'societe')).toBe('caractere');
    expect(raison({ societe: 'ab\ncd' }, 'societe')).toBe('caractere');
  });

  it('SIRET : 14 chiffres, espaces ordinaires, insécables et fines acceptés', () => {
    for (const siret of ['12345678901234', '123 456 789 01234', `123${NBSP}456${NBSP}789${NBSP}01234`, `123${FINE}456${FINE}789${FINE}01234`, '000 000 000 00000']) {
      expect(raison({ siret }, 'siret'), siret).toBeNull();
    }
    for (const siret of ['1234567890123', '123456789012345', '1234567890123a', '123-456-789-01234', '123.456.789.01234']) {
      expect(raison({ siret }, 'siret'), siret).toBe('format');
    }
    expect(raison({ siret: '' }, 'siret')).toBe('vide');
    expect(normaliser('siret', ` 123${NBSP}456 789${FINE}01234 `)).toBe('12345678901234');
    expect(v({ siret: '000 000 000 00000' }).valeurs.siret).toBe('00000000000000');
  });

  it('prénom et nom : bornes 1 et 50, caractère interdit, vide', () => {
    for (const champ of ['prenom', 'nom']) {
      expect(raison({ [champ]: '' }, champ)).toBe('vide');
      expect(raison({ [champ]: 'a' }, champ)).toBeNull();
      expect(raison({ [champ]: 'a'.repeat(50) }, champ)).toBeNull();
      expect(raison({ [champ]: 'a'.repeat(51) }, champ)).toBe('longueur');
      expect(raison({ [champ]: 'ab\u0007' }, champ)).toBe('caractere');
    }
  });

  it('e-mail : adresses valides', () => {
    for (const email of ['a@b.fr', 'prenom.nom+tag@sous.domaine.com', 'élodie@exemple.fr', 'a@exemple-é.fr', 'a@b.c1.fr', 'x@münchen.de']) {
      expect(raison({ email }, 'email'), email).toBeNull();
    }
  });

  it('e-mail : adresses invalides, longueurs, vide', () => {
    for (const email of ['a@b', '@b.fr', 'a@@b.fr', 'a b@c.fr', 'a@b..fr', '.a@b.fr', 'a.@b.fr', 'a..b@c.fr', 'a@-b.fr', 'a@b-.fr', 'a@b.fr.', 'a@b.f', 'a@b.12', 'sans-arobase.fr']) {
      expect(raison({ email }, 'email'), email).toBe('format');
    }
    expect(raison({ email: `${'a'.repeat(64)}@b.fr` }, 'email')).toBeNull();
    expect(raison({ email: `${'a'.repeat(65)}@b.fr` }, 'email')).toBe('longueur');
    const long = `a@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(60)}.${'f'.repeat(10)}.fr`;
    expect(long.length).toBeGreaterThan(254);
    expect(raison({ email: long }, 'email')).toBe('longueur');
    expect(raison({ email: '' }, 'email')).toBe('vide');
    expect(raison({ email: `  ${PARFAITE.email}  ` }, 'email')).toBeNull();
  });

  it('téléphone : facultatif, formats courants, 9 à 15 chiffres', () => {
    expect(raison({ telephone: '' }, 'telephone')).toBeNull();
    for (const telephone of ['+33 6 12 34 56 78', '0612345678', '06.12.34.56.78', '(01) 23 45 67 89', '06-12-34-56-78']) {
      expect(raison({ telephone }, 'telephone'), telephone).toBeNull();
    }
    for (const telephone of ['12345678', '1234567890123456', '06 12 34 56 7a', '++33612345678', '33+612345678']) {
      expect(raison({ telephone }, 'telephone'), telephone).toBe('format');
    }
    expect(raison({ telephone: '123456789012345' }, 'telephone')).toBeNull();
  });

  it('aléas : aucun, liste vide, identifiant inconnu, doublons ignorés, valeur non tableau', () => {
    expect(raison({ aleas: undefined }, 'aleas')).toBe('vide');
    expect(raison({ aleas: [] }, 'aleas')).toBe('vide');
    expect(raison({ aleas: 'inondations' }, 'aleas')).toBe('vide');
    expect(raison({ aleas: ['inconnu'] }, 'aleas')).toBe('invalide');
    expect(raison({ aleas: [ALEAS[0], 'inconnu'] }, 'aleas')).toBe('invalide');
    expect(raison({ aleas: [ALEAS[0], ALEAS[0], ALEAS[1]] }, 'aleas')).toBeNull();
    expect(v({ aleas: [ALEAS[0], ALEAS[0], ALEAS[1]] }).valeurs.aleas).toEqual([ALEAS[0], ALEAS[1]]);
    expect(raison({ aleas: [ALEAS[0]] }, 'aleas')).toBeNull();
  });

  it('description : 19, 20, 1 000 et 1 001 points de code, vide, sauts de ligne, tabulation', () => {
    expect(raison({ description: 'a'.repeat(19) }, 'description')).toBe('court');
    expect(raison({ description: 'a'.repeat(20) }, 'description')).toBeNull();
    expect(raison({ description: 'a'.repeat(1000) }, 'description')).toBeNull();
    expect(raison({ description: 'a'.repeat(1001) }, 'description')).toBe('long');
    expect(raison({ description: '😀'.repeat(1000) }, 'description')).toBeNull(); // 1 000 points de code, 2 000 unités UTF-16
    expect(raison({ description: '😀'.repeat(1001) }, 'description')).toBe('long');
    expect(raison({ description: '' }, 'description')).toBe('vide');
    expect(raison({ description: `  ${NBSP} \n ` }, 'description')).toBe('vide');
    expect(raison({ description: `${'a'.repeat(10)}\n${'b'.repeat(10)}` }, 'description')).toBeNull();
    expect(raison({ description: `${'a'.repeat(10)}\r\n${'b'.repeat(10)}` }, 'description')).toBeNull();
    expect(raison({ description: `${'a'.repeat(20)}\tb` }, 'description')).toBe('caractere');
    expect(v({ description: `\n${'a'.repeat(10)}\r\n${'b'.repeat(10)}\r` }).valeurs.description).toBe(`${'a'.repeat(10)}\n${'b'.repeat(10)}`);
  });

  it('message : facultatif, 1 000 et 1 001 caractères', () => {
    expect(raison({ message: '' }, 'message')).toBeNull();
    expect(raison({ message: 'a'.repeat(1000) }, 'message')).toBeNull();
    expect(raison({ message: 'a'.repeat(1001) }, 'message')).toBe('long');
    expect(raison({ message: 'a\u0000b' }, 'message')).toBe('caractere');
    expect(raison({ message: 'a\nb' }, 'message')).toBeNull();
  });

  it('consentement : seul true est accepté', () => {
    for (const consentement of [false, undefined, 'true', 1, null, {}, []]) {
      expect(raison({ consentement }, 'consentement'), String(consentement)).toBe('vide');
    }
    expect(raison({ consentement: true }, 'consentement')).toBeNull();
  });
});

describe('pro-logique : valider', () => {
  it('une saisie parfaite ne produit aucune erreur', () => {
    const r = v({});
    expect(r.ok).toBe(true);
    expect(r.erreurs).toEqual([]);
    expect(r.valeurs.siret).toBe('00000000000000');
  });

  it('toutes les erreurs ensemble : une raison par champ, dans l\'ordre du formulaire', () => {
    const r = valider({}, LIM, ALEAS);
    expect(r.ok).toBe(false);
    expect(r.erreurs.map((e) => e.champ)).toEqual(['societe', 'siret', 'prenom', 'nom', 'email', 'aleas', 'description', 'consentement']);
    expect(r.erreurs.map((e) => e.raison)).toEqual(['vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide', 'vide']);
    const tous = valider({ societe: 'a', siret: 'x', prenom: '', nom: 'x'.repeat(51), email: 'c', telephone: 'd', aleas: ['z'], description: 'e', message: 'm\u0000', consentement: false }, LIM, ALEAS);
    expect(tous.erreurs.map((e) => e.champ)).toEqual(CHAMPS);
    expect(new Set(tous.erreurs.map((e) => e.champ)).size).toBe(CHAMPS.length);
  });

  it('valeurs normalisées : espaces compactés, SIRET à 14 chiffres, bords retirés', () => {
    const r = v({ societe: `  Société${NBSP}${FINE}  Exemple  `, prenom: ' Claire  ', nom: ' Exemple ', email: ' a@b.fr ', telephone: ' 06 12  34 56 78 ' });
    expect(r.valeurs.societe).toBe('Société Exemple');
    expect(r.valeurs.prenom).toBe('Claire');
    expect(r.valeurs.nom).toBe('Exemple');
    expect(r.valeurs.email).toBe('a@b.fr');
    expect(r.valeurs.telephone).toBe('06 12 34 56 78');
    expect(normaliser('societe', 42)).toBe('');
    expect(normaliser('message', null)).toBe('');
  });

  it('est pure : arguments gelés non modifiés, mêmes entrées, mêmes sorties', () => {
    const saisie = deepFreeze({ ...PARFAITE, aleas: [ALEAS[0], ALEAS[0]], societe: '  Société   Exemple ' });
    const limites = deepFreeze(JSON.parse(JSON.stringify(LIM)));
    const aleas = deepFreeze([...ALEAS]);
    const copie = JSON.stringify([saisie, limites, aleas]);
    const a = valider(saisie, limites, aleas);
    const b = valider(saisie, limites, aleas);
    expect(a).toEqual(b);
    expect(JSON.stringify([saisie, limites, aleas])).toBe(copie);
  });

  it('ne lève jamais d\'exception, quelle que soit l\'entrée', () => {
    const entrees = [undefined, null, 42, 'texte', true, [], [1, 2], {}, { societe: 5, siret: {}, prenom: [], nom: {}, email: null, telephone: 3, aleas: 'x', description: 9, message: [], consentement: {} },
      { aleas: [1, null, {}, 'a'] }, { societe: Symbol.iterator.toString(), email: '@' }];
    for (const entree of entrees) {
      for (const limites of [undefined, null, 'x', {}, LIM, { societe: { min: 'a' } }]) {
        for (const connus of [undefined, null, 'x', [], ALEAS, [1, 2]]) {
          const r = valider(entree, limites, connus);
          expect(typeof r.ok).toBe('boolean');
          expect(Array.isArray(r.erreurs)).toBe(true);
        }
      }
    }
    expect(() => normaliser(undefined, undefined)).not.toThrow();
    expect(() => construireResume(undefined, undefined)).not.toThrow();
  });

  it('propriété sur une grille déterministe : ok ⇔ aucune erreur, raisons connues, idempotence', () => {
    const societes = ['', 'a', 'Société Exemple', 'x'.repeat(101), 'a\u0001b', `  ${NBSP}`];
    const sirets = ['', '000 000 000 00000', '1234567890123', 'abc', `123${FINE}456${FINE}789${FINE}01234`];
    const emails = ['', 'a@b.fr', 'a@b', 'élodie@exemple.fr', `${'a'.repeat(70)}@b.fr`];
    const descriptions = ['', 'court', 'a'.repeat(30), 'a'.repeat(1001), `${'a'.repeat(30)}\t`];
    const divers = [
      { telephone: '', aleas: [ALEAS[0]], message: '', consentement: true },
      { telephone: '123', aleas: [], message: 'm'.repeat(1001), consentement: false },
    ];
    let n = 0;
    for (const societe of societes) for (const siret of sirets) for (const email of emails) for (const description of descriptions) for (const autre of divers) {
      n += 1;
      const saisie = { societe, siret, prenom: 'Claire', nom: 'Exemple', email, description, ...autre };
      const r = valider(saisie, LIM, ALEAS);
      expect(r.ok).toBe(r.erreurs.length === 0);
      for (const { champ, raison: motif } of r.erreurs) expect(RAISONS[champ]).toContain(motif);
      const encore = valider(r.valeurs, LIM, ALEAS);
      expect(encore.valeurs).toEqual(r.valeurs);
      expect(encore.erreurs).toEqual(r.erreurs);
    }
    expect(n).toBeGreaterThanOrEqual(300);
  });

  it('construireResume : ordre conservé, pas de doublon de champ', () => {
    const libelles = { societe: 'Société', siret: 'SIRET', email: 'E-mail' };
    const erreurs = [{ champ: 'siret', raison: 'vide' }, { champ: 'societe', raison: 'vide' }, { champ: 'siret', raison: 'format' }, { champ: 'email', raison: 'format' }];
    expect(construireResume(erreurs, libelles)).toEqual([
      { champ: 'siret', libelle: 'SIRET' }, { champ: 'societe', libelle: 'Société' }, { champ: 'email', libelle: 'E-mail' },
    ]);
    expect(construireResume([], libelles)).toEqual([]);
    expect(construireResume('x', libelles)).toEqual([]);
  });
});
