import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as logique from '../assets/js/adresse-assistee-logique.js';
import { nettoyerSaisie, doitInterroger, construireUrlCompletion, construireUrlRecherche, analyserCompletion, analyserSuggestionsRecherche, decisionVerification, indexSuivant } from '../assets/js/adresse-assistee-logique.js';
import { analyserGeocodage } from '../assets/js/carte-reelle-logique.js';
import { valider } from '../assets/js/adresse-validation.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const config = diagnostic.carteReelle;
const COMPLETION = config.geocodage.completion;
const RECHERCHE = config.geocodage.base;
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const resultat = (lon, lat, score, type) => analyserGeocodage(JSON.stringify({ features: [{ geometry: { coordinates: [lon, lat] }, properties: { label: '12 Rue des Tilleuls 69003 Lyon', score, type } }] }), 0.5);

describe('nettoyerSaisie', () => {
  it('compacte les espaces, remplace les caractères de contrôle, borne à 200 caractères', () => {
    expect(nettoyerSaisie('  12   rue\u0000des\nTilleuls\u007f  ')).toBe('12 rue des Tilleuls');
    expect(nettoyerSaisie('a'.repeat(300))).toHaveLength(200);
    expect(nettoyerSaisie(null)).toBe('');
    expect(nettoyerSaisie(42)).toBe('');
  });
});

describe('doitInterroger', () => {
  it('2 caractères non, 3 oui, identique à la dernière interrogation non, égal à la sélection non', () => {
    expect(doitInterroger('12', null, null)).toBe(false);
    expect(doitInterroger('  1 2 ', null, null)).toBe(true); // 3 caractères après nettoyage
    expect(doitInterroger('12 ', null, null)).toBe(false);
    expect(doitInterroger('12 r', null, null)).toBe(true);
    expect(doitInterroger('abc', null, null)).toBe(true);
    expect(doitInterroger('12 rue', '12 rue', null)).toBe(false);
    expect(doitInterroger('12  rue', '12 rue', null)).toBe(false);
    expect(doitInterroger('12 rue des Tilleuls', '12 rue', '12 rue des Tilleuls')).toBe(false);
    expect(doitInterroger('12 rue des', '12 rue', '12 rue des Tilleuls')).toBe(true);
    expect(doitInterroger(undefined, undefined, undefined)).toBe(false);
  });
});

describe('construireUrlCompletion et construireUrlRecherche', () => {
  it('hôte data.geopf.fr, type=StreetAddress, maximumResponses=5, texte encodé (apostrophe, accents, virgule)', () => {
    const url = construireUrlCompletion("4 place de l'Hôtel de Ville, Paris", COMPLETION);
    const u = new URL(url);
    expect(u.hostname).toBe('data.geopf.fr');
    expect(u.pathname).toBe('/geocodage/completion/');
    expect(u.searchParams.get('text')).toBe("4 place de l'Hôtel de Ville, Paris");
    expect(u.searchParams.get('type')).toBe('StreetAddress');
    expect(u.searchParams.get('maximumResponses')).toBe('5');
    expect(url).toContain('%C3%B4');
    expect(url).toContain('%2C');
    expect(construireUrlCompletion('12 rue', COMPLETION, 99)).toContain('maximumResponses=5');
  });

  it('search : q encodé et limit (1 à 5) ; base non autorisée ou texte vide : chaîne vide', () => {
    const u = new URL(construireUrlRecherche('12 rue des Tilleuls', 1, RECHERCHE));
    expect(u.pathname).toBe('/geocodage/search');
    expect(u.searchParams.get('q')).toBe('12 rue des Tilleuls');
    expect(u.searchParams.get('limit')).toBe('1');
    expect(construireUrlRecherche('12 rue', 5, RECHERCHE)).toContain('limit=5');
    expect(construireUrlRecherche('12 rue', 50, RECHERCHE)).toContain('limit=5');
    expect(construireUrlRecherche('12 rue', 1, 'https://example.org/search')).toBe('');
    expect(construireUrlCompletion('  ', COMPLETION)).toBe('');
    expect(construireUrlCompletion('12 rue', 'https://georisques.gouv.fr/x')).toBe('');
  });
});

describe('analyserCompletion', () => {
  const entree = (fulltext, x, y) => ({ fulltext, x, y });
  const json = (results) => JSON.stringify({ status: 'OK', results });

  it('réponse nominale : libellé, longitude, latitude', () => {
    expect(analyserCompletion(json([entree('12 Rue des Tilleuls 69003 Lyon', 4.8357, 45.764)]))).toEqual({ ok: true, suggestions: [{ libelle: '12 Rue des Tilleuls 69003 Lyon', lon: 4.8357, lat: 45.764 }] });
  });

  it('champs manquants et coordonnées hors de France ignorés ; coordonnées numériques en texte tolérées', () => {
    const lues = analyserCompletion(json([entree('', 4.8, 45.7), { fulltext: 'Sans coordonnées' }, entree('Madrid', -3.7, 40.4), entree('La Réunion', 55.45, -20.88), entree('Bonne', '4.8', '45.7'), null, 'x']));
    expect(lues).toEqual({ ok: true, suggestions: [{ libelle: 'Bonne', lon: 4.8, lat: 45.7 }] });
  });

  it('plus de 5 entrées : tronquées à 5', () => {
    const six = Array.from({ length: 8 }, (_, i) => entree(`Adresse ${i}`, 4.8, 45.7));
    expect(analyserCompletion(json(six)).suggestions).toHaveLength(5);
  });

  it('JSON invalide ou autre forme : refus sans exception', () => {
    expect(analyserCompletion('pas du json')).toEqual({ ok: false, raison: 'json' });
    for (const brut of ['{}', '[]', 'null', JSON.stringify({ features: [] }), JSON.stringify({ results: 'x' }), '', undefined]) expect(analyserCompletion(brut), String(brut)).toMatchObject({ ok: false });
    expect(analyserCompletion(json([]))).toEqual({ ok: true, suggestions: [] });
  });
});

describe('analyserSuggestionsRecherche', () => {
  it('GeoJSON nominal, vide, invalide', () => {
    const geo = (label, coords) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: { label } });
    expect(analyserSuggestionsRecherche(JSON.stringify({ features: [geo('12 Rue des Tilleuls 69003 Lyon', [4.8357, 45.764]), geo('Hors France', [55, -20]), geo('', [4, 45])] }))).toEqual({ ok: true, suggestions: [{ libelle: '12 Rue des Tilleuls 69003 Lyon', lon: 4.8357, lat: 45.764 }] });
    expect(analyserSuggestionsRecherche(JSON.stringify({ features: [] }))).toEqual({ ok: true, suggestions: [] });
    expect(analyserSuggestionsRecherche('{')).toEqual({ ok: false, raison: 'json' });
    expect(analyserSuggestionsRecherche(JSON.stringify({ results: [] }))).toMatchObject({ ok: false });
    expect(analyserSuggestionsRecherche(JSON.stringify({ features: Array.from({ length: 9 }, () => geo('A', [4, 45])) })).suggestions).toHaveLength(5);
  });
});

describe('decisionVerification', () => {
  const selection = { libelle: '12 Rue des Tilleuls 69003 Lyon', lon: 4.8357, lat: 45.764 };

  it('sélection inchangée : accepté sans résultat de service', () => {
    expect(decisionVerification({ texte: '12 Rue des Tilleuls 69003 Lyon', selection, resultat: null })).toEqual({ decision: 'accepte', adresse: '12 Rue des Tilleuls 69003 Lyon', source: 'selection' });
  });

  it('texte modifié après la sélection : le service décide', () => {
    expect(decisionVerification({ texte: '12 Rue des Tilleuls 69003 Lyon bis', selection, resultat: null })).toEqual({ decision: 'indisponible' });
    expect(decisionVerification({ texte: '14 rue des Tilleuls', selection, resultat: resultat(4.8, 45.7, 0.8, 'housenumber') }).decision).toBe('accepte');
  });

  it('housenumber à 0,5 accepté (libellé officiel repris), 0,49 refusé ; street et locality acceptés', () => {
    expect(decisionVerification({ texte: '12 rue des Tilleuls', resultat: resultat(4.8, 45.7, 0.5, 'housenumber') })).toEqual({ decision: 'accepte', adresse: '12 Rue des Tilleuls 69003 Lyon', source: 'service' });
    expect(decisionVerification({ texte: '12 rue des Tilleuls', resultat: resultat(4.8, 45.7, 0.49, 'housenumber') })).toEqual({ decision: 'refuse', raison: 'introuvable' });
    for (const type of ['street', 'locality']) expect(decisionVerification({ texte: 'rue des Tilleuls', resultat: resultat(4.8, 45.7, 0.9, type) }).decision, type).toBe('accepte');
  });

  it('commune seule : « précisez » ; type inconnu : introuvable ; hors de France : refus ; aucun résultat : introuvable', () => {
    expect(decisionVerification({ texte: 'Lyon', resultat: resultat(4.8, 45.7, 0.95, 'municipality') })).toEqual({ decision: 'refuse', raison: 'municipalite' });
    expect(decisionVerification({ texte: 'Lyon', resultat: resultat(4.8, 45.7, 0.95, 'autre') })).toEqual({ decision: 'refuse', raison: 'introuvable' });
    expect(decisionVerification({ texte: 'Madrid', resultat: resultat(-3.7, 40.4, 0.95, 'housenumber') })).toEqual({ decision: 'refuse', raison: 'hors-france' });
    expect(decisionVerification({ texte: 'xyz', resultat: analyserGeocodage(JSON.stringify({ features: [] }), 0.5) })).toEqual({ decision: 'refuse', raison: 'introuvable' });
  });

  it('service injoignable ou réponse illisible : indisponible ; types configurables ; entrées inattendues sans exception', () => {
    expect(decisionVerification({ texte: '12 rue des Tilleuls', resultat: null })).toEqual({ decision: 'indisponible' });
    expect(decisionVerification({ texte: '12 rue', resultat: analyserGeocodage('pas du json', 0.5) })).toEqual({ decision: 'indisponible' });
    expect(decisionVerification({ texte: '12 rue', resultat: resultat(4.8, 45.7, 0.9, 'street'), types: ['housenumber'] })).toEqual({ decision: 'refuse', raison: 'introuvable' });
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1]) expect(() => decisionVerification(v), String(v)).not.toThrow();
  });
});

describe('indexSuivant', () => {
  it('bas, haut, bouclage, liste vide, autre touche', () => {
    expect(indexSuivant(5, -1, 'ArrowDown')).toBe(0);
    expect(indexSuivant(5, 0, 'ArrowDown')).toBe(1);
    expect(indexSuivant(5, 4, 'ArrowDown')).toBe(0);
    expect(indexSuivant(5, -1, 'ArrowUp')).toBe(4);
    expect(indexSuivant(5, 0, 'ArrowUp')).toBe(4);
    expect(indexSuivant(5, 3, 'ArrowUp')).toBe(2);
    expect(indexSuivant(0, -1, 'ArrowDown')).toBe(-1);
    expect(indexSuivant(5, 2, 'a')).toBe(2);
    expect(indexSuivant(NaN, 'x', 'ArrowDown')).toBe(-1);
  });
});

describe('pureté de adresse-assistee-logique.js', () => {
  it('aucune référence à document, window, fetch, Date ni stockage ; arguments gelés non modifiés ; types inattendus sans exception', () => {
    expect(lire('assets/js/adresse-assistee-logique.js')).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest|setTimeout)\b/);
    const sel = Object.freeze({ libelle: 'A B C' });
    expect(() => decisionVerification(Object.freeze({ texte: 'A B C', selection: sel, resultat: null, types: Object.freeze(['street']) }))).not.toThrow();
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1, Symbol.iterator.toString()]) {
      expect(() => { nettoyerSaisie(v); doitInterroger(v, v, v, v); construireUrlCompletion(v, v, v); construireUrlRecherche(v, v, v); analyserCompletion(v); analyserSuggestionsRecherche(v); indexSuivant(v, v, v); }, String(v)).not.toThrow();
    }
    expect(Object.keys(logique).sort()).toEqual(['analyserCompletion', 'analyserSuggestionsRecherche', 'construireUrlCompletion', 'construireUrlRecherche', 'decisionVerification', 'doitInterroger', 'indexSuivant', 'nettoyerSaisie']);
  });
});

describe('markup des champs d\'adresse (index.html et diagnostic.html)', () => {
  for (const [page, idChamp] of [['index.html', 'adresse'], ['diagnostic.html', 'adresse-evaluee']]) {
    it(`${page} : combobox ARIA, listbox, région d'état, aucun name, aucun id dupliqué`, () => {
      const html = lire(page);
      const champ = html.match(new RegExp(`<input[^>]*id="${idChamp}"[^>]*>`))[0];
      for (const attribut of ['role="combobox"', 'aria-autocomplete="list"', 'aria-expanded="false"', 'aria-controls="adresse-liste"']) expect(champ, attribut).toContain(attribut);
      expect(champ).not.toMatch(/\sname=/);
      expect(html).toMatch(/<ul class="suggestions" id="adresse-liste" role="listbox" hidden><\/ul>/);
      expect(html).toMatch(/<p class="visuellement-cache" id="adresse-statut" role="status"><\/p>/);
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    });
  }

  it('information présente sous les deux champs (data-texte) ; index.html charge accueil et diagnostic', () => {
    expect(lire('index.html')).toMatch(/id="adresse-microtexte" data-texte="accueil\.recherche\.microtexte"/);
    expect(lire('diagnostic.html')).toMatch(/id="adresse-information" data-texte="diagnostic\.textes\.information"/);
    expect(lire('index.html')).toContain('<html lang="fr" data-donnees="accueil diagnostic">');
  });
});

describe('données de la saisie assistée', () => {
  it('textes des deux pages non vides et identiques ; information identique ; mots clés ; seuils', () => {
    const textes = diagnostic.textes.assistee;
    expect(accueil.recherche.assistee).toEqual(textes);
    for (const [cle, valeur] of Object.entries(textes)) expect(typeof valeur === 'string' && valeur.trim() !== '', cle).toBe(true);
    expect(textes.aucune).toBe('Aucune suggestion');
    expect(textes.suggestionsN).toBe('{n} suggestions');
    expect(textes.indisponible).toBe('Suggestions indisponibles pour le moment.');
    expect(textes.choisie).toBe('Adresse choisie : {libelle}');
    expect(textes.reconnue).toBe('Adresse reconnue : {libelle}');
    expect(textes.introuvable).toBe('Adresse introuvable. Choisissez une adresse dans la liste de suggestions.');
    expect(textes.municipalite).toBe('Précisez une adresse avec le numéro et la rue.');
    expect(textes.nonVerifiee).toBe("Vérification impossible pour le moment : l'adresse est utilisée telle quelle.");
    expect(accueil.recherche.microtexte).toBe(diagnostic.textes.information);
    for (const mot of ['IGN', 'Géorisques', 'OpenStreetMap', 'adresse IP', "n'enregistre rien"]) expect(accueil.recherche.microtexte).toContain(mot);
    expect(config.saisie).toEqual({ minCaracteres: 3, delaiMs: 300, delaiRequeteMs: 6000, maxSuggestions: 5 });
    expect(config.geocodage.typesAcceptes).toEqual(['housenumber', 'street', 'locality']);
  });
});

describe('CSS de la liste de suggestions', () => {
  it('liste superposée (position absolue sous le champ), option active par un trait et du gras, aucune valeur hexadécimale', () => {
    const css = lire('css/composants.css');
    const regle = (sel) => { const d = css.indexOf(`\n${sel} {`); expect(d, sel).toBeGreaterThanOrEqual(0); return css.slice(d, css.indexOf('}', d)); };
    expect(regle('.champ-assiste')).toContain('position: relative');
    expect(regle('.suggestions')).toContain('position: absolute');
    expect(regle('.suggestions')).toContain('inset-inline: 0');
    expect(regle('.suggestions__option[aria-selected="true"]')).toMatch(/border-inline-start-color: var\(--color-navy\)/);
    expect(regle('.suggestions__option[aria-selected="true"]')).toContain('font-weight: 600');
    expect(regle('.suggestions__option')).toContain('min-block-size: var(--touch-min)');
    expect(css).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
  });
});

describe('module adresse-assistee.js (DOM)', () => {
  const src = sansCommentaires(lire('assets/js/adresse-assistee.js'));

  it('aucun appel réseau hors fetch des deux chemins autorisés, aucun stockage, aucune URL en dur, jamais de name posé', () => {
    expect(src.match(/\bfetch\(/g)).toHaveLength(1);
    expect(src).toContain('credentials: \'omit\'');
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML|\.name\s*=|setAttribute\('name'/);
    expect(src.match(/construireUrl(Completion|Recherche)\(/g)).toHaveLength(3); // complétion, repli, vérification
    expect(src).toContain('new AbortController');
  });

  it('la validation locale du lot 2 est appelée avant le réseau (accueil et diagnostic)', () => {
    for (const fichier of ['assets/js/adresse.js', 'assets/js/diagnostic.js']) {
      const code = sansCommentaires(lire(fichier));
      const local = code.indexOf('valider(champ.value)');
      const reseau = code.indexOf('assistant.verifier()');
      expect(local, fichier).toBeGreaterThan(0);
      expect(reseau, fichier).toBeGreaterThan(local);
      expect(code.slice(local, reseau)).toContain('return;');
    }
  });
});

describe('valider (lot 2) inchangée', () => {
  it('mêmes résultats qu\'avant', () => {
    expect(valider('12 rue des Tilleuls, 69000 Lyon')).toEqual({ valide: true, adresse: '12 rue des Tilleuls, 69000 Lyon', raison: null });
    expect(valider('  ')).toMatchObject({ valide: false, raison: 'vide' });
    expect(valider('Rue')).toMatchObject({ valide: false, raison: 'courte' });
    expect(valider('a'.repeat(201))).toMatchObject({ valide: false, raison: 'longue' });
    expect(valider('123456789')).toMatchObject({ valide: false, raison: 'sans-lettre' });
  });
});
