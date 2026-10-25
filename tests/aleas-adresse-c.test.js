import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calquesProposes, cochesInitiales, construireUrlGaspar, construireUrlRga, etatCalques, libelleCalque, lireExpositionRga, lireRisquesGaspar } from '../assets/js/carte-reelle-logique.js';
import { calquesParDefaut } from '../assets/js/diagnostic-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const config = diagnostic.carteReelle;
const html = lire('diagnostic.html');
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const MOTS = { cles: config.api.cles, calques: { inondation: config.detection.inondation.mots, feu: config.detection.feu.mots } };
const gaspar = (...libelles) => JSON.stringify({ results: libelles.length, data: [{ code_insee: '69123', risques_detail: libelles.map((l) => ({ libelle_risque_long: l })) }] });
const RGA = config.detection.argile;

// Format inféré, aucun échantillon réel : fixtures construites d'après la lecture tolérante décrite par la spécification.
describe('lireRisquesGaspar', () => {
  it('inondation et feux présents, absents, ou l\'un des deux', () => {
    expect(lireRisquesGaspar(gaspar('Inondation', 'Feu de forêt', 'Séisme'), MOTS)).toEqual({ ok: true, presents: { inondation: true, feu: true } });
    expect(lireRisquesGaspar(gaspar('Séisme', 'Mouvement de terrain'), MOTS)).toEqual({ ok: true, presents: { inondation: false, feu: false } });
    expect(lireRisquesGaspar(gaspar('Inondation'), MOTS).presents).toEqual({ inondation: true, feu: false });
    expect(lireRisquesGaspar(gaspar('Feu de forêt'), MOTS).presents).toEqual({ inondation: false, feu: true });
    expect(lireRisquesGaspar(JSON.stringify({ data: [] }), MOTS)).toEqual({ ok: true, presents: { inondation: false, feu: false } });
  });

  it('noms de clés alternatifs, accents, majuscules, mots voisins (crue, submersion, incendie)', () => {
    const jo = JSON.stringify({ a: { b: [{ libelle_risque_jo: 'INONDATION - Par une crue à débordement lent de cours d\'eau' }] } });
    expect(lireRisquesGaspar(jo, MOTS).presents.inondation).toBe(true);
    expect(lireRisquesGaspar(gaspar('Submersion marine'), MOTS).presents.inondation).toBe(true);
    expect(lireRisquesGaspar(gaspar('Crue torrentielle'), MOTS).presents.inondation).toBe(true);
    expect(lireRisquesGaspar(gaspar('INCENDIE de FORÊT'), MOTS).presents.feu).toBe(true);
    expect(lireRisquesGaspar(gaspar('Feux de Forêt'), MOTS).presents.feu).toBe(true);
    expect(lireRisquesGaspar(JSON.stringify({ libelle_RISQUE_long: 'Inondation' }), MOTS).presents.inondation).toBe(true);
    expect(lireRisquesGaspar(JSON.stringify({ autre_cle: 'Inondation' }), MOTS).presents.inondation).toBe(false); // seules les clés listées comptent
  });

  it('JSON invalide ou forme inattendue : illisible', () => {
    for (const brut of ['pas du json', '', '"texte"', '12', 'null', undefined, null, 42]) expect(lireRisquesGaspar(brut, MOTS), String(brut)).toEqual({ ok: false });
    expect(lireRisquesGaspar(gaspar('Inondation'), undefined)).toEqual({ ok: true, presents: {} });
  });
});

describe('lireExpositionRga', () => {
  const rga = (corps) => lireExpositionRga(JSON.stringify(corps), RGA);

  it('forte, moyenne, faible, nulle', () => {
    expect(rga({ exposition: 'Exposition forte', codeExposition: '3' })).toEqual({ ok: true, niveau: 3 });
    expect(rga({ exposition: 'Exposition moyenne' })).toEqual({ ok: true, niveau: 2 });
    expect(rga({ data: { niveauExposition: 'FAIBLE' } })).toEqual({ ok: true, niveau: 1 });
    expect(rga({ exposition: 'Exposition nulle', codeExposition: '0' })).toEqual({ ok: true, niveau: 0 });
    expect(rga({ exposition: 'Non exposé' })).toEqual({ ok: true, niveau: 0 });
  });

  it('code numérique seul, texte prioritaire sur le code, forme inattendue', () => {
    expect(rga({ codeExposition: 2 })).toEqual({ ok: true, niveau: 2 });
    expect(rga({ codeExposition: '1' })).toEqual({ ok: true, niveau: 1 });
    expect(rga({ codeExposition: 7 })).toEqual({ ok: true, niveau: 0 });
    expect(rga({ exposition: 'Exposition faible', codeExposition: '3' })).toEqual({ ok: true, niveau: 1 });
    expect(rga({ exposition: '3' })).toEqual({ ok: true, niveau: 0 }); // valeur purement numérique : seul codeExposition compte
    expect(rga({})).toEqual({ ok: true, niveau: 0 });
    for (const brut of ['{', '"x"', '5', 'null', undefined]) expect(lireExpositionRga(brut, RGA), String(brut)).toEqual({ ok: false });
  });
});

describe('etatCalques', () => {
  const ok = (inondation, feu) => ({ ok: true, presents: { inondation, feu } });
  const calquesConfig = config;

  it('combinaisons des états : présent, absent, niveau des argiles', () => {
    const e = etatCalques({ gaspar: ok(true, false), rga: { ok: true, niveau: 2 }, calquesConfig });
    expect(e.etats).toEqual({ inondation: { etat: 'present', niveau: 0 }, argile: { etat: 'present', niveau: 2 }, feu: { etat: 'absent', niveau: 0 } });
    expect(e.secours).toBe(false);
    expect(Object.keys(e.etats)).not.toContain('chaleur');
    expect(etatCalques({ gaspar: ok(false, false), rga: { ok: true, niveau: 0 }, calquesConfig }).etats.argile).toEqual({ etat: 'absent', niveau: 0 });
  });

  it('un seul appel en échec : ses calques sont inconnus, pas de mode de secours', () => {
    const e = etatCalques({ gaspar: null, rga: { ok: true, niveau: 1 }, calquesConfig });
    expect(e.etats.inondation.etat).toBe('inconnu');
    expect(e.etats.feu.etat).toBe('inconnu');
    expect(e.etats.argile.etat).toBe('present');
    expect(e.secours).toBe(false);
    expect(etatCalques({ gaspar: ok(true, true), rga: { ok: false }, calquesConfig }).etats.argile.etat).toBe('inconnu');
  });

  it('tous les calques inconnus : mode de secours', () => {
    for (const entree of [{ gaspar: null, rga: null }, { gaspar: { ok: false }, rga: { ok: false } }, {}]) {
      const e = etatCalques({ ...entree, calquesConfig });
      expect(e.secours).toBe(true);
      expect(calquesProposes(e)).toEqual(['inondation', 'argile', 'feu']);
    }
    expect(etatCalques({ calquesConfig: {} })).toEqual({ etats: {}, secours: false });
  });
});

describe('calquesProposes et libelleCalque', () => {
  const textes = { ...config.textes.aleas, calques: diagnostic.textes.carte.calques };

  it('présents et inconnus proposés, absents masqués, ordre de la configuration', () => {
    const e = { etats: { inondation: { etat: 'absent' }, argile: { etat: 'present', niveau: 3 }, feu: { etat: 'inconnu' } }, secours: false };
    expect(calquesProposes(e)).toEqual(['argile', 'feu']);
    expect(calquesProposes({ etats: { inondation: { etat: 'absent' } } })).toEqual([]);
    for (const v of [undefined, null, 0, {}, [], 'x']) expect(calquesProposes(v)).toEqual([]);
  });

  it('libellés : recensé, présence non déterminée, exposition faible, moyenne ou forte', () => {
    expect(libelleCalque('inondation', 'present', 0, textes)).toEqual({ nom: 'Zone inondable', presence: 'recensé' });
    expect(libelleCalque('feu', 'inconnu', 0, textes)).toEqual({ nom: 'Feux de forêt', presence: 'présence non déterminée' });
    expect(libelleCalque('argile', 'present', 1, textes)).toEqual({ nom: 'Retrait-gonflement des argiles', presence: 'exposition faible' });
    expect(libelleCalque('argile', 'present', 2, textes).presence).toBe('exposition moyenne');
    expect(libelleCalque('argile', 'present', 3, textes).presence).toBe('exposition forte');
    expect(libelleCalque('argile', 'inconnu', 0, textes).presence).toBe('présence non déterminée');
    expect(libelleCalque('inconnu', 'present', 0, undefined)).toEqual({ nom: '', presence: '' });
  });
});

describe('cochesInitiales', () => {
  const proposes = ['inondation', 'feu'];

  it('sans filtre : tous les calques proposés ; avec filtre : le calque de l\'aléa s\'il est proposé ; aléa absent ou masqué : aucun', () => {
    expect(cochesInitiales(proposes, calquesParDefaut(diagnostic.aleas, 'tous'))).toEqual(['inondation', 'feu']);
    expect(cochesInitiales(proposes, calquesParDefaut(diagnostic.aleas, 'inondations'))).toEqual(['inondation']);
    expect(cochesInitiales(proposes, calquesParDefaut(diagnostic.aleas, 'feux-de-foret'))).toEqual(['feu']);
    expect(cochesInitiales(proposes, calquesParDefaut(diagnostic.aleas, 'grele-vents'))).toEqual([]);
    expect(cochesInitiales(['argile'], calquesParDefaut(diagnostic.aleas, 'inondations'))).toEqual([]);
    expect(cochesInitiales([], ['inondation'])).toEqual([]);
    for (const v of [undefined, null, 5, {}]) expect(cochesInitiales(v, v)).toEqual([]);
  });
});

describe('pureté et robustesse des fonctions du lot 4d-C', () => {
  it('arguments gelés non modifiés, types inattendus sans exception, aucun accès DOM, réseau ou horloge', () => {
    const fige = JSON.parse(JSON.stringify(config));
    const gele = (o) => { Object.freeze(o); for (const v of Object.values(o)) if (v && typeof v === 'object') gele(v); return o; };
    gele(fige);
    expect(() => { etatCalques({ gaspar: Object.freeze({ ok: true, presents: Object.freeze({ inondation: true }) }), rga: null, calquesConfig: fige }); lireRisquesGaspar(gaspar('x'), fige.detection); lireExpositionRga('{}', fige.detection.argile); }).not.toThrow();
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1]) {
      expect(() => { lireRisquesGaspar(v, v); lireExpositionRga(v, v); etatCalques(v); calquesProposes(v); libelleCalque(v, v, v, v); cochesInitiales(v, v); construireUrlGaspar(v, v, v, v); construireUrlRga(v, v, v); }, String(v)).not.toThrow();
    }
    expect(lire('assets/js/carte-reelle-logique.js')).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest)\b/);
  });
});

describe('données du lot 4d-C', () => {
  it('mots de détection, textes du panneau et des états, note de chaleur, ligne de source', () => {
    expect(config.detection.inondation.mots).toEqual(['inondation', 'crue', 'submersion']);
    expect(config.detection.feu.mots).toEqual(['feu de foret', 'feux de foret', 'incendie']);
    expect(config.detection.argile).toMatchObject({ source: 'rga', cle: 'expos', cleCode: 'codeExposition', niveaux: { forte: 3, moyenne: 2, faible: 1 } });
    expect(config.api.cles).toEqual(['libelle_risque_long', 'libelle_risque_jo']);
    expect(Object.keys(config.detection).sort()).toEqual(['argile', 'feu', 'inondation']);
    const a = config.textes.aleas;
    for (const [cle, valeur] of Object.entries({ ...a, ...a.exposition }).filter(([, v]) => typeof v !== 'object')) expect(typeof valeur === 'string' && valeur.trim() !== '', cle).toBe(true);
    expect(a.titre).toBe('Aléas recensés à cette adresse');
    expect(a.aucun).toBe('Aucun aléa recensé à cette adresse parmi ceux affichables sur la carte.');
    expect(a.secours).toBe("Les aléas de cette adresse n'ont pas pu être déterminés ; tous les calques disponibles sont proposés.");
    expect(a.source).toBe("Source : Géorisques (aléas recensés à l'échelle de la commune pour l'inondation et les feux de forêt, à l'adresse pour les argiles).");
    expect(a.annonceN).toBe('{n} aléas recensés à cette adresse.');
    expect(config.textes.chaleurNote).toBe("Aucune carte de chaleur n'est disponible auprès de Géorisques.");
    expect(config.calques.chaleur).toEqual([]);
  });
});

describe('diagnostic.html : panneau « Aléas recensés à cette adresse »', () => {
  it('légende, message, mention de secours, groupe de cases par gabarit, source, région d\'état, aucun id dupliqué', () => {
    expect(html).toMatch(/<fieldset class="calques">\s*<legend data-texte="diagnostic\.carteReelle\.textes\.aleas\.titre">/);
    expect(html).toMatch(/id="aleas-message"/);
    expect(html).toMatch(/id="aleas-secours"[^>]*hidden/);
    expect(html).toMatch(/<template id="modele-calque">\s*<label class="calque-choix"><input type="checkbox"><span class="calque-choix__texte">/);
    expect(html).toMatch(/id="aleas-source" data-texte="diagnostic\.carteReelle\.textes\.aleas\.source"/);
    expect(html).toMatch(/id="aleas-annonce" role="status"/);
    expect(html).not.toMatch(/<input type="checkbox"[^>]*\sid=/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('CSS du lot 4d-C', () => {
  it('aucune valeur hexadécimale, présence en texte secondaire', () => {
    for (const f of ['css/diagnostic.css', 'css/carte-reelle.css']) expect(lire(f), f).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
    expect(lire('css/diagnostic.css')).toMatch(/\.calque-choix__presence \{[^}]*var\(--color-text-secondary\)/);
  });
});

describe('API Géorisques : URL', () => {
  it('hôte www.georisques.gouv.fr, chemins gaspar/risques et rga, latlon en lon,lat, aucune adresse', () => {
    const g = new URL(construireUrlGaspar(45.764, 4.8357, config.api.gaspar, config.api.rayon));
    expect(g.hostname).toBe('www.georisques.gouv.fr');
    expect(g.pathname).toBe('/api/v1/gaspar/risques');
    expect(g.searchParams.get('latlon')).toBe('4.8357,45.764');
    expect(g.searchParams.get('rayon')).toBe('1000');
    const r = new URL(construireUrlRga(45.764, 4.8357, config.api.rga));
    expect(r.pathname).toBe('/api/v1/rga');
    expect(r.searchParams.get('latlon')).toBe('4.8357,45.764');
    expect([...r.searchParams.keys()]).toEqual(['latlon']);
    expect(construireUrlGaspar(40.4, -3.7, config.api.gaspar, 1000)).toBe(''); // hors de France
    expect(construireUrlRga(45, 4, 'https://georisques.gouv.fr/api/v1/rga')).toBe(''); // sans www
    expect(construireUrlGaspar(45, 4, config.api.gaspar, 0)).toBe('');
    const georisques = JSON.stringify(config).match(/https:\/\/www\.georisques\.gouv\.fr[^"]*/g);
    expect([...new Set(georisques)].sort()).toEqual(['https://www.georisques.gouv.fr/api/v1/gaspar/risques', 'https://www.georisques.gouv.fr/api/v1/rga', 'https://www.georisques.gouv.fr/services']);
  });
});

describe('carte-reelle.js : lectures de l\'API', () => {
  const src = sansCommentaires(lire('assets/js/carte-reelle.js'));

  it('aucun appel à l\'API en dehors de lireGaspar et lireRga ; coordonnées seulement ; CORS sans identifiants', () => {
    expect(src.match(/construireUrlGaspar\(/g)).toHaveLength(1);
    expect(src.match(/construireUrlRga\(/g)).toHaveLength(1);
    expect(src).toMatch(/const lireGaspar = [^\n]*construireUrlGaspar\(point\.lat, point\.lon,/);
    expect(src).toMatch(/const lireRga = [^\n]*construireUrlRga\(point\.lat, point\.lon,/);
    expect(src.match(/\blireTexteApi\(/g)).toHaveLength(3); // définition et deux lectures
    expect(src).toContain("mode: 'cors', credentials: 'omit'");
    expect(src.indexOf('await lireGaspar')).toBeLessThan(src.indexOf('await lireRga')); // séquentielles
    expect(src).not.toMatch(/adresse[^\n]*lireGaspar|lireRga[^\n]*adresse/);
  });
});

describe('poids des documents', () => {
  it('CLAUDE.md de moins de 9 000 caractères et conventions.md de 190 lignes au plus', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
    expect(lire('Docs/ref/conventions.md').split('\n').length).toBeLessThanOrEqual(190);
  });
});
