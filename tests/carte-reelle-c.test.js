import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { HOTES_CARTE, construireUrlGeocodage, gabaritFondValide, optionsWms, couchesPourCalque, calquesActifs } from '../assets/js/carte-reelle-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const site = JSON.parse(lire('data/site.json'));
const config = diagnostic.carteReelle;

describe('information permanente sous le champ d\'adresse du diagnostic', () => {
  it('texte exact du lot 4d, nommant les trois services et l\'absence d\'enregistrement', () => {
    expect(diagnostic.textes.information).toBe("Pour vérifier l'adresse et afficher la carte, ce site interroge des services publics et ouverts : l'IGN (adresses et cartes) avec l'adresse saisie, Géorisques (zones de risque) avec les coordonnées de l'adresse, et OpenStreetMap (fond de carte). Ces services voient votre adresse IP. Ce site n'enregistre rien.");
    expect(accueil.recherche.microtexte.length).toBeGreaterThan(0); // remplacé par la même information à la partie B
  });
});

describe('l\'adresse n\'entre dans aucune URL de tuile', () => {
  const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';

  it('les constructeurs de tuiles et de calques n\'acceptent pas d\'adresse ; les gabarits n\'ont que les marques {z}, {x}, {y}', () => {
    const sorties = [JSON.stringify(optionsWms(ADRESSE, config)), JSON.stringify(couchesPourCalque(ADRESSE, config)), JSON.stringify(calquesActifs([{ id: ADRESSE, coche: true }], config)), String(gabaritFondValide(ADRESSE))];
    for (const s of sorties) expect(s).not.toContain('Tilleuls');
    for (const fond of Object.values(config.fonds)) {
      expect([...fond.gabarit.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]).sort()).toEqual(['x', 'y', 'z']);
    }
    expect(config.wms.base).not.toMatch(/[?&]/);
  });

  it('seul le géocodage construit une URL à partir de l\'adresse, et dans carte-reelle.js seul geocoder() la reçoit', () => {
    expect(construireUrlGeocodage(ADRESSE, config.geocodage.base)).toContain('Tilleuls');
    const src = lire('assets/js/carte-reelle.js');
    expect(src.match(/construireUrlGeocodage\(/g)).toHaveLength(1); // l'appel dans geocoder()
    expect(src.match(/await geocoder\(adresse, config\)/g)).toHaveLength(1);
  });
});

describe('hôtes de carteReelle', () => {
  it('aucune entrée ne contient d\'URL avec l\'hôte georisques.gouv.fr sans www', () => {
    const textes = [];
    const parcourir = (o) => { for (const v of Object.values(o)) (v !== null && typeof v === 'object' ? parcourir(v) : textes.push(String(v))); };
    parcourir(config);
    expect(textes.length).toBeGreaterThan(40);
    for (const t of textes) expect(t, t).not.toMatch(/https?:\/\/georisques\.gouv\.fr/i);
    expect(textes.filter((t) => /^https:\/\//.test(t)).map((t) => new URL(t.replaceAll('{', '').replaceAll('}', '')).hostname).every((h) => HOTES_CARTE.includes(h))).toBe(true);
  });
});

describe('écritures de session', () => {
  it('diagnostic.js n\'écrit que adresse et comparaison ; carte-reelle.js n\'écrit rien', () => {
    const src = lire('assets/js/diagnostic.js');
    const cles = [...src.matchAll(/ecrireSession\(([A-Z_]+),/g)].map((m) => m[1]);
    expect(cles.sort()).toEqual(['CLE_COMPARAISON', 'CLE_STOCKAGE']);
    expect(src.match(/setItem\(/g)).toHaveLength(1); // dans ecrireSession seulement
    const code = lire('assets/js/carte-reelle.js').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/setItem|ecrireSession|cookie|localStorage|indexedDB/);
  });
});

describe('URL externes du dépôt', () => {
  const EXCLUS = ['node_modules', '.git', 'Docs', 'tests', 'test-results', '.lighthouseci', 'vendor', '.github', 'package-lock.json'];
  const parcourir = (dossier) => readdirSync(dossier).flatMap((nom) => {
    if (EXCLUS.includes(nom)) return [];
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? parcourir(chemin) : [chemin];
  });
  const hotesLiens = Object.values(site.liensExternes).map((u) => new URL(u).hostname);

  it('chaque URL https:// des pages, scripts, styles et données a un hôte de HOTES_CARTE ou de liensExternes', () => {
    const fautives = [];
    for (const f of parcourir('.').filter((n) => /\.(js|mjs|json|html|css)$/.test(n))) {
      for (const m of lire(f).matchAll(/https?:\/\/[^\s"'<>)`\\]+/g)) {
        const url = m[0].replaceAll('{', '').replaceAll('}', '');
        let hote;
        try { hote = new URL(url).hostname; } catch { hote = url; }
        if (hote !== 'localhost' && !HOTES_CARTE.includes(hote) && !hotesLiens.includes(hote)) fautives.push(`${f} : ${m[0]}`);
      }
    }
    expect(fautives).toEqual([]);
  });
});

describe('poids des documents', () => {
  it('CLAUDE.md de moins de 9 000 caractères, conventions.md de 190 lignes au plus', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
    expect(lire('Docs/ref/conventions.md').split('\n').length).toBeLessThanOrEqual(190);
  });
});
