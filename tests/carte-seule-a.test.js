import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import * as logique from '../assets/js/carte-reelle-logique.js';
import { hoteAutorise, gabaritFondValide, HOTES_CARTE } from '../assets/js/carte-reelle-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const html = lire('diagnostic.html');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const config = diagnostic.carteReelle;
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

describe('diagnostic.html (lot 4d-A) : carte seule', () => {
  it('ordre en-tete, adresse, carte, legende, exposition, equipements, pied ; codes E2-1 à E2-7 une fois chacun ; aucun order CSS', () => {
    const roles = [...html.matchAll(/data-role="([^"]+)"/g)].map((m) => m[1]);
    expect(roles).toEqual(['en-tete', 'adresse', 'carte', 'legende', 'exposition', 'equipements', 'pied']);
    const codes = [...html.matchAll(/data-bloc="(E2-\d)"/g)].map((m) => m[1]);
    expect(codes).toEqual(['E2-1', 'E2-2', 'E2-3', 'E2-4', 'E2-5', 'E2-6', 'E2-7']);
    expect(lire('css/diagnostic.css')).not.toMatch(/\border:\s*-?\d/);
  });

  it('aucun consentement, aucun SVG de schéma, un seul conteneur de carte, aucun id dupliqué', () => {
    expect(html).not.toMatch(/consentement|carte-schema|class="schema"|motif-|mention-schema|carte-reelle-ouvrir|carte-reelle-retour/);
    expect(html.match(/id="carte-reelle"/g)).toHaveLength(1);
    expect(html.match(/<svg class="schema/g)).toBeNull();
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('le bloc carte contient le titre et le cadre, sans panneau ; le lien Comparer reste dans equipements', () => {
    const carte = html.slice(html.indexOf('data-role="carte"'), html.indexOf('data-role="legende"'));
    expect(carte).toContain('<h2');
    expect(carte).toContain('class="carte-cadre"');
    expect(html).not.toMatch(/carte-panneau|carte-grille/);
    const equipements = html.slice(html.indexOf('data-role="equipements"'), html.indexOf('</main>'));
    expect(equipements).toContain('site.liens.comparateur');
  });
});

describe('données du lot 4d-A', () => {
  it('information permanente : IGN, Géorisques, OpenStreetMap, adresse IP, « n\'enregistre rien »', () => {
    const texte = diagnostic.textes.information;
    for (const mot of ['IGN', 'Géorisques', 'OpenStreetMap', 'adresse IP', "n'enregistre rien"]) expect(texte).toContain(mot);
    expect(html).toMatch(/id="adresse-information" data-texte="diagnostic\.textes\.information"/);
    expect(diagnostic.textes.mention).toBeUndefined();
  });

  it('plus aucune clé de consentement ni de schéma ; messages de la carte présents', () => {
    expect(JSON.stringify(diagnostic)).not.toMatch(/consentement|svgTitre|svgDescription|"retour"|retourFait|"garder"|"accepter"/i);
    expect(diagnostic.textes.carte.mention).toBeUndefined();
    expect(config.textes.sansAdresse).toBe('Saisissez une adresse pour afficher la carte.');
    expect(config.textes.chargement).toBe('Chargement de la carte…');
    expect(config.textes.erreur).toBe("La carte n'a pas pu être affichée : service indisponible ou adresse introuvable. Vérifiez l'adresse ci-dessus.");
    expect(config.textes.horsFrance).toBe("La carte n'est disponible que pour la France métropolitaine.");
    expect(config.textes.reessayer).toBe('Réessayer');
  });
});

describe('CSS du lot 4d-A', () => {
  const tokens = lire('css/tokens.css');
  const css = ['css/diagnostic.css', 'css/carte-reelle.css'].map(lire).join('\n');

  it('chaque jeton --calque-* est utilisé, aucun jeton de schéma ; aucune valeur hexadécimale', () => {
    for (const [, nom] of tokens.matchAll(/(--calque-[a-z]+):/g)) expect(css, nom).toContain(`var(${nom})`);
    expect(tokens).not.toMatch(/--carte-(fond|bati|rue|parcelle)/);
    expect(css).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
    expect(css).not.toMatch(/\.schema|\.motif|\.calque__|carte-schema/);
  });

  it('cadre : clamp(22rem, 65vh, 34rem) puis 30 rem dès 1200 px ; cartes d\'équipement de visuel fixe (8 rem)', () => {
    expect(css).toContain('block-size: clamp(22rem, 65vh, 34rem)');
    expect(css).toMatch(/@media \(min-width: 1200px\) \{\s*\.carte-cadre \{\s*block-size: 30rem;/);
    expect(css).not.toMatch(/grid-template-rows: repeat\(3, 1fr\)/);
    expect(css).not.toMatch(/\.diag__equipements \{\s*display: flex/);
    expect(css).toMatch(/\.equipement__visuel \{[^}]*block-size: 8rem/);
  });
});

describe('carte-reelle-logique.js (lot 4d-A)', () => {
  it('aucune fonction de consentement ; fonctions attendues conservées', () => {
    expect(Object.keys(logique).filter((k) => /consent|accord/i.test(k))).toEqual([]);
    for (const nom of ['hoteAutorise', 'gabaritFondValide', 'construireUrlGeocodage', 'analyserGeocodage', 'dansFrance', 'doitBasculer', 'chaineAttribution', 'couchesPourCalque', 'optionsWms', 'calquesActifs', 'libellesLegende']) {
      expect(typeof logique[nom], nom).toBe('function');
    }
  });

  it('pureté : arguments gelés non modifiés, types inattendus sans exception, aucun accès DOM, réseau ou horloge', () => {
    const fige = Object.freeze({ calques: Object.freeze({ a: Object.freeze([Object.freeze({ nom: 'X', libelle: 'x' })]) }), textes: Object.freeze({ nomTechnique: '{nom}' }) });
    expect(logique.libellesLegende(fige)).toEqual([{ calque: 'a', nom: 'X', libelle: 'x', technique: 'X' }]);
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1]) expect(() => logique.libellesLegende(v), String(v)).not.toThrow();
    expect(lire('assets/js/carte-reelle-logique.js')).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest)\b/);
  });
});

describe('hôtes autorisés et fonds', () => {
  it('hoteAutorise : trois hôtes, georisques.gouv.fr sans www refusé ; gabarits des fonds valides', () => {
    expect(HOTES_CARTE).toEqual(['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org']);
    expect(hoteAutorise('https://data.geopf.fr/geocodage/completion/?text=a')).toBe(true);
    expect(hoteAutorise('https://georisques.gouv.fr/api')).toBe(false);
    expect(hoteAutorise('https://example.org/')).toBe(false);
    for (const fond of Object.values(config.fonds)) expect(gabaritFondValide(fond.gabarit)).toBe(true);
  });
});

describe('modules diagnostic.js et carte-reelle.js', () => {
  it('aucun stockage écrit ni appel réseau hors le fetch du géocodage', () => {
    const carte = sansCommentaires(lire('assets/js/carte-reelle.js'));
    expect(carte.match(/\bfetch\(/g)).toHaveLength(2); // géocodage et lireTexteApi (API Géorisques)
    expect(carte).not.toMatch(/setItem|removeItem|localStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML|https?:\/\//);
    expect(carte.match(/sessionStorage\.\w+/g)).toEqual(['sessionStorage.getItem']);
    const diag = sansCommentaires(lire('assets/js/diagnostic.js'));
    expect(diag).not.toMatch(/\bfetch\(|localStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML/);
  });

  it('Leaflet est chargé paresseusement : aucune balise dans le HTML, référencé seulement par carte-reelle.js, après le premier rendu', () => {
    const pages = readdirSync('.').filter((f) => f.endsWith('.html'));
    for (const page of pages) expect(lire(page), page).not.toMatch(/leaflet/i);
    const modules = readdirSync('assets/js').filter((f) => /leaflet/i.test(lire(`assets/js/${f}`)));
    expect(modules).toEqual(['carte-reelle.js']);
    const src = lire('assets/js/carte-reelle.js');
    expect(src).toContain('requestIdleCallback');
    const ordre = ['await geocoder(adresse, config)', 'await apresPremierRendu()', 'await chargerLeaflet(config.leaflet)'].map((m) => src.indexOf(m));
    expect(ordre.every((i) => i > 0)).toBe(true);
    expect(ordre).toEqual([...ordre].sort((a, b) => a - b));
  });
});

describe('poids des documents', () => {
  it('CLAUDE.md de moins de 9 000 caractères', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
  });
});
