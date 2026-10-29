// Lot 10c-A : légende officielle de la carte réelle (GetLegendGraphic), logique pure, données, gabarit, CSS, code.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { entreesLegende, etatLegende, hoteAutorise, urlLegendeWms } from '../assets/js/carte-reelle-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const config = diagnostic.carteReelle;
const html = lire('diagnostic.html');
const CALQUES = ['inondation', 'argile', 'feu', 'chaleur'];
const gele = (v) => {
  if (v && typeof v === 'object') { Object.values(v).forEach(gele); Object.freeze(v); }
  return v;
};

describe('urlLegendeWms', () => {
  const url = new URL(urlLegendeWms('ALEARG', config));
  it('https, hôte avec www, chemin /services', () => {
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('www.georisques.gouv.fr');
    expect(url.pathname).toBe('/services');
    expect(hoteAutorise(url.href)).toBe(true);
  });
  it('paramètres attendus, dans l\'ordre du service', () => {
    expect(Object.fromEntries(url.searchParams)).toEqual({ language: 'fre', SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetLegendGraphic', SLD_VERSION: '1.1.0', FORMAT: 'image/png', LAYER: 'ALEARG' });
    expect(url.search).toBe('?language=fre&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&SLD_VERSION=1.1.0&FORMAT=image%2Fpng&LAYER=ALEARG');
  });
  it('nom de couche encodé ; aucune URL vers l\'hôte sans www', () => {
    const encodee = urlLegendeWms('A&C=D#E/é', config);
    expect(new URL(encodee).searchParams.get('LAYER')).toBe('A&C=D#E/é');
    expect(encodee).not.toMatch(/&C=D#|#E/);
    expect(encodee).toContain('LAYER=A%26C%3DD%23E%2F%C3%A9');
    expect(urlLegendeWms('ALEARG', { ...config, wms: { ...config.wms, base: 'https://georisques.gouv.fr/services' } })).toBe('');
    expect(urlLegendeWms('ALEARG', { ...config, wms: { ...config.wms, base: 'http://www.georisques.gouv.fr/services' } })).toBe('');
  });
  it('noms et configurations inattendus : chaîne vide, sans exception', () => {
    for (const nom of ['', ' ', ' ALEARG', 'A LEARG', 'ALE\nARG', 'ALE\u0000ARG', 'ALE\u007fARG', null, undefined, 42, {}, [], ['ALEARG']]) expect(urlLegendeWms(nom, config), String(nom)).toBe('');
    for (const c of [null, undefined, 3, 'x', [], {}, { wms: null }, { wms: { base: 4 } }]) expect(() => urlLegendeWms('ALEARG', c)).not.toThrow();
    expect(urlLegendeWms('ALEARG', {})).toBe('');
  });
  it('une URL par couche de la configuration, seul le nom varie', () => {
    const noms = CALQUES.flatMap((c) => config.calques[c].map((l) => l.nom));
    const urls = noms.map((n) => urlLegendeWms(n, config));
    expect(new Set(urls).size).toBe(noms.length);
    expect(new Set(urls.map((u) => u.replace(/LAYER=[^&]*/, ''))).size).toBe(1);
  });
});

describe('entreesLegende', () => {
  const sous = (liste) => liste.flatMap((_, i) => liste.slice(i + 1).map((__, j) => [liste[i], liste[i + 1 + j]]));
  it('toutes les combinaisons de cases : ordre de la configuration, chaleur jamais présente', () => {
    const proposes = CALQUES;
    for (let masque = 0; masque < 16; masque += 1) {
      const coches = CALQUES.filter((_, i) => masque & (1 << i));
      const entrees = entreesLegende({ coches, proposes, config });
      const attendu = ['inondation', 'argile', 'feu'].filter((c) => coches.includes(c)).flatMap((c) => config.calques[c].map((l) => ({ calque: c, couche: l.nom, libelle: l.libelle })));
      expect(entrees, coches.join()).toEqual(attendu);
      expect(entrees.some((e) => e.calque === 'chaleur')).toBe(false);
    }
    expect(sous(CALQUES).length).toBe(6);
  });
  it('un calque coché mais non proposé est absent, un proposé non coché aussi', () => {
    expect(entreesLegende({ coches: ['argile', 'feu'], proposes: ['argile'], config }).map((e) => e.calque)).toEqual(['argile']);
    expect(entreesLegende({ coches: [], proposes: CALQUES, config })).toEqual([]);
  });
  it('pureté : arguments gelés non modifiés ; types inattendus sans exception', () => {
    const entree = gele({ coches: ['inondation', 'feu'], proposes: ['inondation', 'feu'], config: structuredClone(config) });
    const avant = JSON.stringify(entree);
    entreesLegende(entree);
    urlLegendeWms('ALEARG', entree.config);
    expect(JSON.stringify(entree)).toBe(avant);
    for (const v of [undefined, null, 3, 'x', [], {}, { coches: 'x', proposes: 3, config: null }, { coches: [null, {}], proposes: [[]], config: { calques: 4 } }]) {
      expect(() => entreesLegende(v)).not.toThrow();
      expect(Array.isArray(entreesLegende(v))).toBe(true);
    }
  });
});

describe('etatLegende', () => {
  it('chargement, succès, échec, taille nulle', () => {
    expect(etatLegende({ type: 'demande' })).toBe('chargement');
    expect(etatLegende({ type: 'load', largeur: 200, hauteur: 90 })).toBe('ok');
    expect(etatLegende({ type: 'error' })).toBe('echec');
    expect(etatLegende({ type: 'delai' })).toBe('echec');
    for (const [largeur, hauteur] of [[0, 0], [0, 10], [10, 0], [-1, 5], [NaN, 5], [undefined, 5]]) expect(etatLegende({ type: 'load', largeur, hauteur }), `${largeur}×${hauteur}`).toBe('echec');
  });
  it('types inattendus : jamais d\'exception, chargement par défaut', () => {
    for (const v of [undefined, null, 4, 'load', [], {}, { type: 7 }, gele({ type: 'load' })]) expect(() => etatLegende(v)).not.toThrow();
    expect(etatLegende('load')).toBe('chargement');
  });
});

describe('données carteReelle.legende', () => {
  const { legende } = config;
  it('clés complètes, textes non vides, réserve et délai entiers positifs', () => {
    expect(Number.isInteger(legende.hauteurReservee) && legende.hauteurReservee > 0).toBe(true);
    expect(legende.hauteurReservee).toBe(5); // retouche client : la réserve suit la plus haute image réelle (argiles rognées, environ 4 rem), non le plafond de 8 rem
    expect(Number.isInteger(legende.delai) && legende.delai > 0).toBe(true);
    expect(legende.delai).toBe(10000);
    for (const cle of ['alt', 'chargement', 'indisponible']) expect(legende.textes[cle].trim(), cle).not.toBe('');
    expect(legende.textes.alt).toBe('Légende officielle Géorisques : {libelle}');
    expect(legende.textes.chargement).toBe('Chargement de la légende…');
    expect(legende.textes.indisponible).toBe('Légende officielle indisponible pour cette couche.');
    expect(legende.serieRepetee).toEqual(['ALEARG']); // l'image officielle des argiles répète sa série
    const noms = ['inondation', 'argile', 'feu'].flatMap((c) => config.calques[c].map((l) => l.nom));
    for (const nom of legende.serieRepetee) expect(noms).toContain(nom);
    expect(diagnostic.textes.carte.legendeAdresse).toBeUndefined(); // entrée « Votre adresse » retirée
    expect(legende.textes.note).toBeUndefined(); // retouche client : note et phrase sous la légende retirées
  });
  it('plus aucune clé de couleur ni de motif d\'ancienne pastille', () => {
    const brut = lire('data/diagnostic.json');
    expect(brut).not.toMatch(/"(teinte|motif|couleur|fond|calque-[a-z]+)"\s*:/);
    expect(JSON.stringify(legende)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('diagnostic.html : gabarit de légende', () => {
  const gabarit = html.slice(html.indexOf('>', html.indexOf('<template id="modele-legende-reelle"')), html.indexOf('</template>', html.indexOf('modele-legende-reelle')));
  it('un seul gabarit : libellé, nom technique masqué, image avec alt, texte d\'échec ; aucun id ; aucune pastille', () => {
    expect(gabarit).toMatch(/<img class="legende__img" alt=""/);
    expect(gabarit).toContain('legende__libelle');
    expect(gabarit).toContain('legende__echec');
    expect(gabarit).not.toMatch(/\sid=/);
    expect(gabarit).not.toMatch(/<svg|legende__motif|legende__fond/);
    expect(html).not.toMatch(/legende__repere|Votre adresse/);
    expect(gabarit).not.toMatch(/\ssrc=/); // jamais de requête avant l'affichage de la légende
  });
  it('région role="status", note issue des données, aucun id dupliqué', () => {
    expect(html).toMatch(/<p class="visuellement-cache" id="legende-etat" role="status"><\/p>/);
    expect(html).not.toMatch(/legende\.textes\.note|textes\.legende\.phrase/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
  it('la légende rendue vient de la configuration : une entrée par couche', () => {
    const js = lire('assets/js/carte-reelle.js');
    expect(js).toMatch(/for \(const entree of libellesLegende\(config\)\)/);
    expect(js).toContain("legendeConfig.textes.alt.replace('{libelle}', entree.libelle)");
    expect(js).toContain('config.vue.opacite');
  });
});

describe('CSS de la légende', () => {
  const css = lire('css/diagnostic.css');
  const tokens = lire('css/tokens.css');
  it('plus de règle ni de jeton orphelin des anciennes pastilles', () => {
    expect(css).not.toMatch(/legende__motif|legende__fond|legende__repere|--teinte/);
    expect(tokens).not.toMatch(/--calque-/);
    for (const f of readdirSync('css')) expect(lire(`css/${f}`), f).not.toMatch(/--calque-|--teinte|legende__motif|legende__fond/);
  });
  it('grille de légende : colonnes égales, entrées alignées en haut, réserve levée une fois l\'image reçue', () => {
    expect(css.match(/\.legende \{[^}]*\}/)[0]).toMatch(/display: grid/);
    expect(css).toMatch(/\.legende__item--prete \.legende__image \{\s*min-block-size: 0;/);
    expect(lire('assets/js/carte-reelle.js')).toContain("classList.add('legende__item--prete')");
  });
  it('image : max-height 8 rem, taille naturelle ; entrée : réserve de hauteur ; aucune valeur hexadécimale', () => {
    const img = css.match(/\.legende__img \{[^}]*\}/)[0];
    expect(img).toMatch(/max-block-size: 8rem/);
    expect(img).toMatch(/inline-size: auto/);
    expect(img).toMatch(/block-size: auto/);
    expect(img).toMatch(/max-inline-size: 100%/);
    expect(css.match(/\.legende__image \{[^}]*\}/)[0]).toMatch(/min-block-size: var\(--legende-reserve, 8rem\)/);
    expect(css).toMatch(/\.legende__img\[hidden\],\s*\.legende__echec\[hidden\] \{\s*display: none;/); // `hidden` doit l'emporter sur display
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(lire('css/carte-reelle.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('carte-reelle.js : légende', () => {
  const js = lire('assets/js/carte-reelle.js');
  it('aucun nouvel appel fetch (les légendes sont des images), aucun stockage', () => {
    const fetchs = js.match(/\bfetch\(/g) ?? [];
    expect(fetchs.length).toBe(2); // nombre de `main` (lectures de l'API) : aucun pour les légendes
    const bloc = js.slice(js.indexOf('// Légende officielle'), js.indexOf('// garderLectures'));
    expect(bloc).not.toMatch(/fetch\(|sessionStorage|localStorage|indexedDB|document\.cookie/);
    expect(js).not.toMatch(/localStorage/);
  });
  it('l\'image n\'est demandée que pour une entrée affichée, carte affichée', () => {
    expect(js).toMatch(/const affichees = etatCarte\.carte \? entreesLegende\(/);
    expect(js).toMatch(/for \(const e of affichees\) demanderLegende/);
  });
});

describe('documentation et garde-fous', () => {
  it('CLAUDE.md sous 7 500 caractères ; fichiers de conventions de 150 lignes au plus', () => {
    expect(lire('CLAUDE.md').length).toBeLessThanOrEqual(7500);
    for (const f of readdirSync('Docs/ref/conventions')) expect(lire(`Docs/ref/conventions/${f}`).split('\n').length, f).toBeLessThanOrEqual(150);
  });
});
