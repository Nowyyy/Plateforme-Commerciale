import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { TOUS, aleaPourComparaison, aleasProposes, niveauAlea, niveauGlobalExposition, phraseAleasNonRecenses, repartirEquipements, selectionEquipements } from '../assets/js/diagnostic-logique.js';
import { aleaParDefaut } from '../assets/js/comparateur-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const config = JSON.parse(lire('data/diagnostic.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const html = lire('diagnostic.html');
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const gele = (v) => (v !== null && typeof v === 'object' ? Object.freeze(Object.values(v).forEach(gele) ?? v) : v);

const etat = (e, niveau = 0) => ({ etat: e, niveau });
const etats = (inondation, argile, feu) => ({ inondation, argile, feu });
const AUCUN = etats(etat('absent'), etat('absent'), etat('absent'));
const INCONNUS = etats(etat('inconnu'), etat('inconnu'), etat('inconnu'));
const ids = (liste) => liste.map((e) => e.id);

describe('niveauAlea', () => {
  it('inondation et feux recensés = 2 (données communales : jamais au-dessus de « modéré »)', () => {
    expect(niveauAlea('inondation', 'present', 0, config)).toBe(2);
    expect(niveauAlea('feu', 'present', 0, config)).toBe(2);
  });
  it('argiles : exposition faible 1, moyenne 2, forte 3', () => {
    expect([1, 2, 3].map((n) => niveauAlea('argile', 'present', n, config))).toEqual([1, 2, 3]);
    expect(niveauAlea('argile', 'present', 0, config)).toBe(0);
    expect(niveauAlea('argile', 'present', 4, config)).toBe(0);
  });
  it('absent, inconnu, aléa inconnu ou configuration illisible : 0', () => {
    for (const e of ['absent', 'inconnu', 'autre', undefined]) expect(niveauAlea('inondation', e, 0, config)).toBe(0);
    expect(niveauAlea('seisme', 'present', 0, config)).toBe(0);
    expect(niveauAlea('constructor', 'present', 0, config)).toBe(0);
    expect(niveauAlea('inondation', 'present', 0, null)).toBe(0);
  });
});

describe('niveauGlobalExposition', () => {
  const cas = [
    ['aucun aléa recensé', AUCUN, { etat: 'aucun', niveau: 0, libelle: '', inconnus: [] }],
    ['toutes les lectures en échec', INCONNUS, { etat: 'indetermine', niveau: 0, libelle: '', inconnus: ['inondation', 'argile', 'feu'] }],
    ['inondation seule', etats(etat('present'), etat('absent'), etat('absent')), { etat: 'niveau', niveau: 2, libelle: 'modéré', inconnus: [] }],
    ['feux seuls', etats(etat('absent'), etat('absent'), etat('present')), { etat: 'niveau', niveau: 2, libelle: 'modéré', inconnus: [] }],
    ['argiles faibles seules', etats(etat('absent'), etat('present', 1), etat('absent')), { etat: 'niveau', niveau: 1, libelle: 'faible', inconnus: [] }],
    ['argiles fortes et inondation', etats(etat('present'), etat('present', 3), etat('absent')), { etat: 'niveau', niveau: 3, libelle: 'élevé', inconnus: [] }],
    ['plusieurs aléas modérés', etats(etat('present'), etat('present', 2), etat('present')), { etat: 'niveau', niveau: 2, libelle: 'modéré', inconnus: [] }],
    ['présence inconnue avec un aléa recensé', etats(etat('inconnu'), etat('present', 2), etat('inconnu')), { etat: 'niveau', niveau: 2, libelle: 'modéré', inconnus: ['inondation', 'feu'] }],
    ['aucun recensé mais un aléa inconnu', etats(etat('inconnu'), etat('absent'), etat('absent')), { etat: 'aucun', niveau: 0, libelle: '', inconnus: ['inondation'] }],
  ];
  for (const [nom, entree, attendu] of cas) it(nom, () => expect(niveauGlobalExposition(entree, config)).toEqual(attendu));

  it('jamais de niveau 4, pour toutes les combinaisons d\'états et d\'expositions', () => {
    const valeurs = [etat('absent'), etat('inconnu'), etat('present', 1), etat('present', 2), etat('present', 3)];
    for (const i of valeurs) for (const a of valeurs) for (const f of valeurs) {
      const g = niveauGlobalExposition(etats(i, a, f), config);
      expect(g.niveau).toBeLessThanOrEqual(3);
      expect(g.niveau === 0).toBe(g.etat !== 'niveau');
      if (g.niveau > 0) expect(config.niveaux).toContain(g.libelle);
    }
  });
  it('« aucun » ne parle jamais de « risque » dans les textes', () => {
    expect(config.textes.exposition.aucun).toBe('Aucun aléa recensé parmi ceux évalués (indicatif)');
    expect(config.textes.exposition.aucun).not.toMatch(/aucun risque/i);
    expect(JSON.stringify(config.textes.exposition)).not.toMatch(/aucun risque/i);
  });
});

describe('aleasProposes', () => {
  const proposes = (e) => aleasProposes(e, config).map((p) => p.id);
  it('inondation seule, feux seuls, les deux (ordre des données)', () => {
    expect(proposes(etats(etat('present'), etat('absent'), etat('absent')))).toEqual(['inondations']);
    expect(proposes(etats(etat('absent'), etat('absent'), etat('present')))).toEqual(['feux-de-foret']);
    expect(proposes(etats(etat('present'), etat('absent'), etat('present')))).toEqual(['inondations', 'feux-de-foret']);
  });
  it('argiles seules : aucun aléa proposé (aucun équipement au catalogue)', () => {
    expect(proposes(etats(etat('absent'), etat('present', 3), etat('absent')))).toEqual([]);
    expect(proposes(AUCUN)).toEqual([]);
  });
  it('présence inconnue : proposé avec l\'état « inconnu » et le niveau 0', () => {
    expect(aleasProposes(INCONNUS, config)).toEqual([
      { id: 'inondations', calque: 'inondation', etat: 'inconnu', niveau: 0 },
      { id: 'feux-de-foret', calque: 'feu', etat: 'inconnu', niveau: 0 },
    ]);
  });
  it('grêle, vents et canicule n\'ont aucune source : jamais proposés, quels que soient les états', () => {
    for (const calque of ['argile', 'chaleur', 'grele-vents', 'canicule']) {
      const tous = { inondation: etat('present'), feu: etat('present'), argile: etat('present', 3), chaleur: etat('present'), [calque]: etat('present', 3) };
      expect(proposes(tous)).not.toContain('grele-vents');
      expect(proposes(tous)).not.toContain('canicule');
    }
  });
});

describe('repartirEquipements', () => {
  const catalogue = config.equipements;
  it('à tour de rôle entre les aléas ordonnés, par priorité croissante', () => {
    expect(ids(repartirEquipements(catalogue, ['inondations', 'feux-de-foret']))).toEqual(['batardeau-modulable', 'sprinkler-de-toiture', 'clapet-anti-retour']);
    expect(ids(repartirEquipements(catalogue, ['feux-de-foret', 'inondations']))).toEqual(['sprinkler-de-toiture', 'batardeau-modulable', 'grille-pare-braises']);
  });
  it('au plus 3 équipements, sans doublon, un seul aléa : ses trois premiers', () => {
    expect(ids(repartirEquipements(catalogue, ['inondations']))).toEqual(['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']);
    expect(repartirEquipements(catalogue, ['inondations', 'inondations', 'grele-vents', 'canicule'], 10)).toHaveLength(8); // plafond relevé : tous les équipements des trois aléas, sans doublon
    const partages = [{ id: 'a', aleas: ['x', 'y'], priorite: 1 }, { id: 'b', aleas: ['y'], priorite: 2 }];
    expect(ids(repartirEquipements(partages, ['x', 'y']))).toEqual(['a', 'b']);
  });
  it('aléa à un seul équipement : il est consommé puis les autres continuent', () => {
    const peu = [{ id: 'a', aleas: ['x'], priorite: 1 }, { id: 'b', aleas: ['y'], priorite: 2 }, { id: 'c', aleas: ['y'], priorite: 3 }, { id: 'd', aleas: ['y'], priorite: 4 }];
    expect(ids(repartirEquipements(peu, ['x', 'y']))).toEqual(['a', 'b', 'c']);
  });
  it('ordre des aléas respecté ; aucun aléa : liste vide', () => {
    expect(repartirEquipements(catalogue, [])).toEqual([]);
    expect(repartirEquipements(catalogue, ['inconnu'])).toEqual([]);
  });
  it('propriété : pour toutes les combinaisons d\'états, seuls des équipements des aléas proposés', () => {
    const valeurs = [etat('absent'), etat('inconnu'), etat('present', 1), etat('present', 2), etat('present', 3)];
    for (const i of valeurs) for (const a of valeurs) for (const f of valeurs) {
      const e = etats(i, a, f);
      const proposes = aleasProposes(e, config).map((p) => p.id);
      const choisis = selectionEquipements({ equipements: config.equipements, pastille: TOUS, etats: e, config, exploration: false });
      expect(choisis.length).toBeLessThanOrEqual(3);
      expect(new Set(ids(choisis)).size).toBe(choisis.length);
      for (const equipement of choisis) expect(equipement.aleas.some((x) => proposes.includes(x))).toBe(true);
      expect(choisis.length === 0).toBe(proposes.length === 0);
    }
  });
});

describe('selectionEquipements', () => {
  const base = { equipements: config.equipements, config };
  const deux = etats(etat('present'), etat('present', 3), etat('present'));
  it('« Tous » : à tour de rôle entre les aléas proposés, niveau décroissant puis ordre des données', () => {
    expect(ids(selectionEquipements({ ...base, pastille: TOUS, etats: deux, exploration: false }))).toEqual(['batardeau-modulable', 'sprinkler-de-toiture', 'clapet-anti-retour']);
  });
  it('pastille d\'aléa : ses équipements par priorité, trois au plus', () => {
    expect(ids(selectionEquipements({ ...base, pastille: 'feux-de-foret', etats: deux, exploration: false }))).toEqual(['sprinkler-de-toiture', 'grille-pare-braises']);
    expect(ids(selectionEquipements({ ...base, pastille: 'inondations', etats: deux, exploration: false }))).toHaveLength(3);
  });
  it('pastille d\'un aléa non proposé : retombe sur « Tous »', () => {
    const feuxSeuls = etats(etat('absent'), etat('absent'), etat('present'));
    expect(ids(selectionEquipements({ ...base, pastille: 'inondations', etats: feuxSeuls, exploration: false }))).toEqual(['sprinkler-de-toiture', 'grille-pare-braises']);
  });
  it('mode exploration : les quatre aléas du catalogue, niveaux d\'exemple', () => {
    const tous = selectionEquipements({ ...base, pastille: TOUS, etats: AUCUN, exploration: true });
    expect(ids(tous)).toEqual(['batardeau-modulable', 'bouclier-de-baie', 'cool-roofing']);
    expect(ids(selectionEquipements({ ...base, pastille: 'canicule', etats: AUCUN, exploration: true }))).toEqual(['cool-roofing', 'isolant-reflecteur']);
    expect(selectionEquipements({ ...base, pastille: TOUS, etats: AUCUN, exploration: false })).toEqual([]);
  });
});

describe('aleaPourComparaison', () => {
  const defaut = aleaParDefaut(config.aleas);
  it('la pastille active', () => {
    expect(aleaPourComparaison('feux-de-foret', etats(etat('present'), etat('absent'), etat('present')), config, defaut)).toBe('feux-de-foret');
  });
  it('« Tous » : l\'aléa proposé de niveau le plus élevé, à égalité le premier', () => {
    expect(aleaPourComparaison(TOUS, etats(etat('present'), etat('absent'), etat('present')), config, defaut)).toBe('inondations');
    expect(aleaPourComparaison(TOUS, etats(etat('inconnu'), etat('absent'), etat('present')), config, defaut)).toBe('feux-de-foret');
  });
  it('aucun aléa proposé : l\'aléa par défaut du lot 9', () => {
    expect(aleaPourComparaison(TOUS, AUCUN, config, defaut)).toBe(defaut);
    expect(aleaPourComparaison('valeur-inconnue', null, config, defaut)).toBe(defaut);
  });
});

describe('phraseAleasNonRecenses', () => {
  it('« Feux de forêt : non recensé. Grêle, vents, canicule : non évalués. »', () => {
    expect(phraseAleasNonRecenses(etats(etat('present'), etat('present', 2), etat('absent')), config)).toBe('Feux de forêt : non recensé. Grêle, vents, canicule : non évalués.');
  });
  it('deux aléas non recensés au pluriel ; aucun : seulement les non évalués ; lectures en échec : non évalués seulement', () => {
    expect(phraseAleasNonRecenses(AUCUN, config)).toBe('Inondations, Feux de forêt : non recensés. Grêle, vents, canicule : non évalués.');
    expect(phraseAleasNonRecenses(etats(etat('present'), etat('absent'), etat('present')), config)).toBe('Grêle, vents, canicule : non évalués.');
    expect(phraseAleasNonRecenses(INCONNUS, config)).toBe('Grêle, vents, canicule : non évalués.');
  });
});

describe('données : exposition et detection', () => {
  it('exposition.niveaux : valeurs entières de 1 à 3, aucune au-delà de « modéré » pour les données communales', () => {
    const { niveaux } = config.exposition;
    expect(niveaux.inondation).toEqual({ present: 2 });
    expect(niveaux.feu).toEqual({ present: 2 });
    expect(niveaux.argile).toEqual({ 1: 1, 2: 2, 3: 3 });
    for (const regles of Object.values(niveaux)) for (const v of Object.values(regles)) expect(Number.isInteger(v) && v >= 1 && v <= 3).toBe(true);
    expect(config.niveaux).toEqual(['faible', 'modéré', 'élevé', 'très élevé']);
  });
  it('detection : seuls inondations et feux ont une source ; équipements existants et cohérents avec le catalogue', () => {
    expect(Object.keys(config.detection).sort()).toEqual(['feux-de-foret', 'inondations']);
    for (const [alea, source] of Object.entries(config.detection)) {
      expect(config.aleas.map((a) => a.id)).toContain(alea);
      expect(Object.keys(config.carteReelle.calques)).toContain(source.calque);
      expect(config.carteReelle.detection[source.calque].source).toBe('gaspar');
      const attendus = config.equipements.filter((e) => e.aleas.includes(alea)).map((e) => e.id).sort();
      expect([...source.equipements].sort()).toEqual(attendus);
    }
    for (const id of ['grele-vents', 'canicule']) expect(config.detection[id]).toBeUndefined();
    expect(config.equipements.some((e) => e.aleas.includes('argile'))).toBe(false);
  });
  it('identifiants d\'aléa identiques à ceux de data/accueil.json ; textes du calcul et de prudence non vides', () => {
    expect(accueil.aleas.liste.map((a) => a.id)).toEqual(config.aleas.map((a) => a.id));
    const t = config.textes.exposition;
    expect(t.prudence).toBe("Indicatif : ce niveau ne remplace ni l'état des risques réglementaire ni l'avis d'un professionnel.");
    expect(t.calcul.titre).toBe('Comment est-il calculé ?');
    expect(t.calcul.paragraphes.length).toBeGreaterThanOrEqual(2);
    for (const texte of [...t.calcul.paragraphes, t.sansAdresse, t.indetermine, t.inconnus, t.nonRecense, t.nonRecenses, t.nonEvalues]) expect(texte.trim()).not.toBe('');
    expect(t.sansAdresse).toBe('Niveau non déterminé : saisissez une adresse.');
    expect(t.indetermine).toBe("Niveau non déterminé : les aléas de cette adresse n'ont pas pu être lus");
    const e = config.textes.equipements;
    expect(e.aucun).toBe('Aucun aléa recensé à cette adresse ne correspond à un équipement du catalogue.');
    expect(e.explorer).toBe('Explorer tous les aléas');
    expect(e.exploration).toBe("Aléas non recensés à cette adresse : équipements présentés à titre d'exemple.");
    expect(e.aleaAccueilAbsent).toBe("L'aléa choisi sur l'accueil n'est pas recensé à cette adresse.");
  });
});

describe('pureté et robustesse des nouvelles fonctions', () => {
  it('arguments gelés non modifiés, résultats identiques à deux appels', () => {
    const c = gele(structuredClone(config));
    const e = gele(structuredClone(etats(etat('present'), etat('present', 2), etat('inconnu'))));
    const avant = JSON.stringify([c, e]);
    for (const appel of [
      () => niveauAlea('argile', 'present', 2, c),
      () => niveauGlobalExposition(e, c),
      () => aleasProposes(e, c),
      () => repartirEquipements(c.equipements, ['inondations', 'feux-de-foret']),
      () => selectionEquipements({ equipements: c.equipements, pastille: TOUS, etats: e, config: c, exploration: false }),
      () => aleaPourComparaison(TOUS, e, c, 'inondations'),
      () => phraseAleasNonRecenses(e, c),
    ]) expect(appel()).toEqual(appel());
    expect(JSON.stringify([c, e])).toBe(avant);
  });
  it('types inattendus : jamais d\'exception', () => {
    const bizarres = [undefined, null, 0, NaN, '', 'x', {}, [], () => 1, { aleas: 'x', detection: 3, equipements: {} }, { aleas: [null, 1, { id: 2 }], detection: { a: null } }];
    for (const v of bizarres) {
      expect(() => niveauAlea(v, v, v, v)).not.toThrow();
      expect(() => niveauGlobalExposition(v, v)).not.toThrow();
      expect(() => aleasProposes(v, v)).not.toThrow();
      expect(() => repartirEquipements(v, v, v)).not.toThrow();
      expect(() => selectionEquipements(v)).not.toThrow();
      expect(() => selectionEquipements({ equipements: v, pastille: v, etats: v, config: v, exploration: true })).not.toThrow();
      expect(() => aleaPourComparaison(v, v, v, v)).not.toThrow();
      expect(() => phraseAleasNonRecenses(v, v)).not.toThrow();
    }
    expect(niveauGlobalExposition(null, null)).toEqual({ etat: 'indetermine', niveau: 0, libelle: '', inconnus: [] });
    expect(repartirEquipements(config.equipements, ['inondations'], 'x')).toHaveLength(3);
  });
  it('aucun accès DOM, réseau, stockage ni horloge dans diagnostic-logique.js', () => {
    expect(sansCommentaires(lire('assets/js/diagnostic-logique.js'))).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest|Math\.random)\b/);
  });
});

describe('diagnostic.html, CSS et modules (lot 4e-B)', () => {
  it('pastilles : fieldset par gabarit sans name écrit, région d\'état, bouton « Explorer » masqué, détails du calcul, aucun id dupliqué', () => {
    const equipements = html.slice(html.indexOf('data-role="equipements"'), html.indexOf('</section>', html.indexOf('data-role="equipements"')));
    expect(equipements).toMatch(/<fieldset class="diag__alea" id="choix-alea">/);
    expect(equipements).toMatch(/<template id="modele-pastille">\s*<label class="pastille-choix"><input type="radio"><span><\/span><\/label>/);
    expect(equipements).toMatch(/<button type="button" class="bouton bouton--secondaire" id="equipements-explorer"[^>]*hidden>/);
    expect(equipements).toMatch(/id="annonce-diagnostic" role="status"/);
    expect(equipements).not.toMatch(/bouton--action/);
    expect(html).toMatch(/<details class="exposition__calcul">\s*<summary data-texte="diagnostic\.textes\.exposition\.calcul\.titre">/);
    expect(html).not.toMatch(/<details[^>]* open/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('CSS sans valeur hexadécimale', () => {
    for (const f of ['css/diagnostic.css', 'css/carte-reelle.css']) expect(lire(f)).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
  });
  it('diagnostic.js : aucun réseau, aucun stockage hors adresse, alea et comparaison ; le name des radios est posé à l\'exécution', () => {
    const src = sansCommentaires(lire('assets/js/diagnostic.js'));
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie|innerHTML/);
    expect(src).toContain("radio.name = 'alea'");
    expect(src).not.toContain('diagnostic:filtre');
    expect(sansCommentaires(lire('assets/js/carte-reelle.js'))).not.toContain('diagnostic:filtre');
  });
  it('le comparateur lit toujours les niveaux fixes d\'exemple', () => {
    const produit = JSON.parse(lire('data/produit.json'));
    expect(produit.comparateur.aleas.map((a) => [a.id, a.niveau])).toEqual(config.aleas.map((a) => [a.id, a.niveau]));
    expect(produit.comparateur.niveaux).toEqual(config.niveaux);
    expect(sansCommentaires(lire('assets/js/comparateur.js'))).not.toMatch(/niveauGlobalExposition|aleasProposes/);
    expect(aleaParDefaut(config.aleas)).toBe('inondations');
  });
});
