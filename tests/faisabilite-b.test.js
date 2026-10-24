import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import * as L from '../assets/outils/faisabilite-logique.js';

const lire = (f) => readFileSync(f, 'utf8');

describe('lot 4b-B : sondes', () => {
  it('huit sondes, identifiants uniques, libellés non vides, URL construites par un constructeur de la logique', () => {
    expect(L.SONDES).toHaveLength(8);
    expect(new Set(L.SONDES.map((s) => s.id)).size).toBe(8);
    const tuile = L.tuileDepuis(L.LIEU.lat, L.LIEU.lon, L.LIEU.zoom);
    const coord = { lat: L.LIEU.lat, lon: L.LIEU.lon };
    const attendu = {
      geocodage: L.urlGeocodage(L.LIEU.q),
      'osm-tuile': L.urlTuileOsm(tuile),
      'ign-tuile': L.urlTuilePlanIgn(tuile),
      'georisques-api': L.urlGeorisquesApi('georisques.gouv.fr', coord),
      'georisques-api-www': L.urlGeorisquesApi('www.georisques.gouv.fr', coord),
      'georisques-wms': L.urlWmsCapabilities('georisques.gouv.fr'),
      'georisques-wms-www': L.urlWmsCapabilities('www.georisques.gouv.fr'),
      'georisques-wms-image': L.urlWmsGetMap({ hote: 'georisques.gouv.fr', couche: 'C', bbox: L.bboxTuile3857(tuile.z, tuile.x, tuile.y) }),
    };
    for (const s of L.SONDES) {
      expect(s.libelle.length, s.id).toBeGreaterThan(3);
      expect(L.urlDeSonde(s.id, { couche: 'C', hote: 'georisques.gouv.fr' }), s.id).toBe(attendu[s.id]);
      expect(L.HOTES).toContain(new URL(attendu[s.id]).hostname);
    }
    expect(L.urlDeSonde('georisques-wms-image', {})).toBeNull();
    expect(L.urlDeSonde('inconnue', {})).toBeNull();
  });

  it('GetCapabilities volumineux (60 couches, accents et espaces) : extraction et choix', () => {
    const noms = [];
    for (let i = 0; i < 57; i++) noms.push(`Couche numéro ${i} (été)`);
    noms.splice(10, 0, 'Zone inondable – débordement de cours d\'eau');
    noms.splice(30, 0, 'Retrait-gonflement des argiles');
    noms.splice(45, 0, 'Feux de forêt : aléa');
    const xml = `<?xml version="1.0" encoding="UTF-8"?><WMS_Capabilities><Service><Name>WMS</Name></Service><Capability><Layer><Title>Racine</Title>${noms
      .map((n, i) => `<Layer queryable="1"><Name>${n}</Name><Title>t${i}</Title><Style><Name>style ${i}</Name></Style></Layer>`)
      .join('\n')}</Layer></Capability></WMS_Capabilities>`;
    const extraites = L.extraireCouches(xml);
    expect(extraites).toHaveLength(60);
    expect(extraites).toEqual(noms);
    expect(L.choisirCouches(extraites)).toEqual({
      inondation: 'Zone inondable – débordement de cours d\'eau',
      argiles: 'Retrait-gonflement des argiles',
      feux: 'Feux de forêt : aléa',
    });
  });

  it('conclure : carteReellePossible est vrai exactement quand géocodage, un fond et l\'image de calque sont ok ; inconnu seulement si une sonde non testée peut encore la rendre vraie', () => {
    const etats = ['ok', 'bloque', 'image-echec', 'non-testee'];
    let combinaisons = 0;
    for (const g of etats) for (const o of etats) for (const i of etats) for (const m of etats) {
      combinaisons++;
      const v = L.conclure([
        { id: 'geocodage', etat: g }, { id: 'osm-tuile', etat: o }, { id: 'ign-tuile', etat: i }, { id: 'georisques-wms-image', etat: m },
      ]);
      const regle = g === 'ok' && (o === 'ok' || i === 'ok') && m === 'ok';
      const sinon = (e) => (e === 'non-testee' ? 'ok' : e);
      const possible = sinon(g) === 'ok' && (sinon(o) === 'ok' || sinon(i) === 'ok') && sinon(m) === 'ok';
      expect(v.carteReellePossible === true, `${g}/${o}/${i}/${m}`).toBe(regle);
      expect(v.carteReellePossible === 'inconnu', `${g}/${o}/${i}/${m}`).toBe(!regle && possible);
      expect(v.fondsDisponibles).toEqual([o === 'ok' ? 'osm' : null, i === 'ok' ? 'ign' : null].filter(Boolean));
    }
    expect(combinaisons).toBe(256);
  });

  it('formaterRapport : limites, mention des extensions, aucun caractère de contrôle même si les données en contiennent', () => {
    const resultats = [{ id: 'geocodage', etat: 'ok', ms: 3, detail: 'a\u0000b\u0007c\td\ne' }];
    const rapport = L.formaterRapport({ date: 'D\u0001', origine: 'O', navigateur: 'N\u001b[0m', resultats, verdicts: L.conclure(resultats) });
    expect(rapport).toContain('Limites');
    expect(rapport).toMatch(/extension/);
    expect(rapport).toMatch(/bloqueur/);
    const controles = Array.from(rapport).filter((c) => {
      const code = c.charCodeAt(0);
      return (code < 32 && c !== '\n') || code === 127;
    });
    expect(controles).toEqual([]);
  });

  it('le script d\'essai réel n\'est référencé par aucun test ni par les scripts de package.json', () => {
    const nom = ['sonde', 'reelle'].join('-');
    const tests = [...readdirSync('tests'), ...readdirSync('tests/e2e').map((f) => `e2e/${f}`)]
      .filter((f) => f.endsWith('.js'))
      .map((f) => lire(`tests/${f}`));
    for (const t of tests) expect(t).not.toContain(nom);
    expect(JSON.stringify(JSON.parse(lire('package.json')).scripts)).not.toContain(nom);
    expect(lire('.github/workflows/pages.yml')).not.toContain(nom);
  });

  it('Docs/ref/faisabilite-carte.md existe et fait 40 lignes au plus', () => {
    expect(existsSync('Docs/ref/faisabilite-carte.md')).toBe(true);
    expect(lire('Docs/ref/faisabilite-carte.md').trimEnd().split('\n').length).toBeLessThanOrEqual(40);
  });

  it('page : zone de saisie facultative et bouton de relance présents, toujours un seul <button> dans le HTML, aucun name', () => {
    const html = lire('assets/outils/faisabilite.html');
    const js = lire('assets/outils/faisabilite.js');
    expect(html).toContain('Nom de couche à tester (facultatif)');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toMatch(/<(input|textarea|select)[^>]*\sname=/);
    expect(js).toContain('Relancer cette sonde');
    expect(js).toContain('Copier le rapport');
    expect(js).toContain('Copiez-le manuellement');
  });
});
