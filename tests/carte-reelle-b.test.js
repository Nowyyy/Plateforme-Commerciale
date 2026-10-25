import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { calquesActifs, chaineAttribution, couchesPourCalque, doitBasculer, libellesLegende, optionsWms } from '../assets/js/carte-reelle-logique.js';

const lire = (f) => readFileSync(f, 'utf8');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const site = JSON.parse(lire('data/site.json'));
const config = diagnostic.carteReelle;
const html = lire('diagnostic.html');
const CALQUES = ['inondation', 'argile', 'feu', 'chaleur'];
const COUCHES = {
  inondation: ['ALEA_SYNT_01_04FAI_FXX', 'PPRN_COMMUNE_RISQINOND_PRESCRIT'],
  argile: ['ALEARG'],
  feu: ['PPRN_COMMUNE_FEU_APPROUV'],
  chaleur: [],
};

describe('optionsWms et couchesPourCalque', () => {
  it('listes exactes pour les quatre calques, chaleur vide', () => {
    for (const calque of CALQUES) expect(couchesPourCalque(calque, config), calque).toEqual(COUCHES[calque]);
    expect(couchesPourCalque('inconnu', config)).toEqual([]);
    expect(couchesPourCalque('toString', config)).toEqual([]);
  });

  it('réglages WMS : service avec www, 1.3.0, image/png, transparent, opacité 0,7', () => {
    for (const calque of CALQUES) {
      expect(optionsWms(calque, config)).toEqual({ base: 'https://www.georisques.gouv.fr/services', couches: COUCHES[calque], version: '1.3.0', format: 'image/png', transparent: true, opacite: 0.7 });
    }
  });
});

describe('calquesActifs', () => {
  it('toutes les combinaisons de cases : seuls les calques cochés ayant une couche, dans l\'ordre de la configuration', () => {
    for (let masque = 0; masque < 16; masque += 1) {
      const cases = CALQUES.map((id, i) => ({ id, coche: (masque & (1 << i)) !== 0 }));
      const attendu = CALQUES.filter((id, i) => (masque & (1 << i)) !== 0 && id !== 'chaleur');
      expect(calquesActifs(cases, config), `masque ${masque}`).toEqual(attendu);
    }
  });

  it('entrées inattendues : jamais d\'exception, aucun calque', () => {
    for (const v of [undefined, null, 0, 'x', {}, [null], [{ id: 'argile' }], [{ id: 'argile', coche: 'oui' }], [{ id: 'inconnu', coche: true }]]) {
      expect(calquesActifs(v, config), JSON.stringify(v)).toEqual([]);
    }
    expect(calquesActifs([{ id: 'argile', coche: true }], null)).toEqual([]);
  });
});

describe('doitBasculer (tableau de cas)', () => {
  const cas = [
    [{ erreurs: 3, charges: 0, ecouleMs: 1000 }, false],
    [{ erreurs: 4, charges: 0, ecouleMs: 1000 }, true],
    [{ erreurs: 4, charges: 1, ecouleMs: 1000 }, false],
    [{ erreurs: 9, charges: 3, ecouleMs: 20000 }, false],
    [{ erreurs: 0, charges: 0, ecouleMs: 7000 }, false],
    [{ erreurs: 0, charges: 0, ecouleMs: 8000 }, true],
    [{ erreurs: 0, charges: 0, ecouleMs: 9000 }, true],
    [{ erreurs: -4, charges: -1, ecouleMs: -9000 }, false],
    [{ erreurs: Number.NaN, charges: 0, ecouleMs: Number.POSITIVE_INFINITY }, false],
    [{ erreurs: '5', charges: '0', ecouleMs: '9000' }, false],
    [null, false],
  ];
  it.each(cas)('%j → %s', (mesures, attendu) => {
    expect(doitBasculer(mesures, config.basculeFond)).toBe(attendu);
    if (mesures !== null && !Number.isNaN(mesures.erreurs)) expect(doitBasculer(mesures)).toBe(attendu);
  });
});

describe('chaineAttribution', () => {
  const fournies = ['osm', 'ign', 'georisques'].map((cle) => config.attributions[cle]);

  it('trois attributions : textes des données, liens de liensExternes, nouvel onglet', () => {
    const chaine = chaineAttribution(fournies, site.liensExternes);
    expect(chaine.split(' | ')).toHaveLength(3);
    for (const [cle, texte] of [['osm', '© OpenStreetMap'], ['ign', '© IGN/Géoplateforme'], ['georisques', 'Données : Géorisques']]) {
      expect(chaine).toContain(`<a href="${site.liensExternes[cle]}" target="_blank" rel="noopener noreferrer">${texte}</a>`);
    }
  });

  it('lien non https ou domaine inconnu écarté, texte conservé et échappé', () => {
    const chaine = chaineAttribution([{ texte: 'A', lien: 'a' }, { texte: 'B', lien: 'b' }, { texte: 'C', lien: 'c' }], { a: 'http://www.openstreetmap.org/', b: 'https://evil.example/', c: 'javascript:alert(1)' });
    expect(chaine).toBe('A | B | C');
    expect(chaine).not.toContain('<a');
  });

  it('aucune injection : une entrée contenant <script> ne produit aucune balise', () => {
    const chaine = chaineAttribution([{ texte: '<script>alert(1)</script>', lien: 'osm' }, { texte: '"><img src=x onerror=1>', lien: 'osm' }], { osm: `${site.liensExternes.osm}"><script>1</script>` });
    expect(chaine).not.toContain('<script');
    expect(chaine).not.toContain('<img');
    const sansLiens = chaine.replace(/<a href="[^"<>]*" target="_blank" rel="noopener noreferrer">/g, '').replaceAll('</a>', '');
    expect(sansLiens).not.toMatch(/[<>"]/);
  });
});

describe('libellesLegende', () => {
  const legende = libellesLegende(config);

  it('un libellé et un nom technique par couche', () => {
    const avecCouche = legende;
    expect(avecCouche.map((e) => e.nom)).toEqual(CALQUES.flatMap((id) => COUCHES[id]));
    for (const entree of avecCouche) {
      expect(entree.libelle).toMatch(/\(Géorisques\)$/);
      expect(entree.technique).toBe(`Couche : ${entree.nom}`);
    }
  });

  it('chaleur : aucune entrée de légende (la note du panneau la remplace)', () => {
    expect(legende.filter((e) => e.calque === 'chaleur')).toEqual([]);
  });

  it('toutes les couches de la configuration figurent dans la légende, aucune autre', () => {
    const configurees = Object.values(config.calques).flat().map((c) => c.nom).sort();
    expect(legende.map((e) => e.nom).sort()).toEqual(configurees);
    expect(JSON.stringify(legende)).not.toMatch(/GEORISQUES_SERVICES|COMMUNE_FXX/);
  });
});

describe('diagnostic.html (partie B)', () => {
  it('conteneur de carte : région nommée et décrite', () => {
    expect(html).toMatch(/id="carte-reelle"[^>]*role="region"[^>]*data-aria-label="diagnostic\.carteReelle\.textes\.regionNom"[^>]*aria-describedby="carte-reelle-clavier"/);
    expect(html).toMatch(/id="carte-reelle-clavier"[^>]*data-texte="diagnostic\.carteReelle\.textes\.aideClavier"/);
    expect(config.textes.aideClavier).toBe('Flèches : déplacer la carte. Plus et moins : zoomer.');
  });

  it('aucun choix de fond dans le HTML, cases de calques conservées, aucun id dupliqué', () => {
    expect(html).not.toMatch(/carte-reelle__fonds|liste-fonds|modele-fond|fond-carte/);
    expect(html).toMatch(/<fieldset class="calques">\s*<legend data-texte="diagnostic\.carteReelle\.textes\.aleas\.titre">/);
    expect(html).toContain('<template id="modele-calque">');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('légende présente ; plus de mention du score illustratif ni de note de chaleur', () => {
    expect(html).toMatch(/id="legende-reelle"/);
    expect(html).not.toMatch(/mention-reelle|note-chaleur|scoreIllustratif|chaleurNote/);
  });
});

describe('css/carte-reelle.css (partie B)', () => {
  const css = lire('css/carte-reelle.css');
  const regle = (source, selecteur) => {
    const debut = source.indexOf(`\n${selecteur} {`);
    expect(debut, selecteur).toBeGreaterThanOrEqual(0);
    return source.slice(debut, source.indexOf('}', debut));
  };

  it('aucune valeur hexadécimale, classe du repère en jetons', () => {
    expect(css).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
    expect(regle(css, '.carte-reelle__repere')).toMatch(/fill: var\(--color-navy\)/);
  });

  it('cadre de la carte : hauteur fixée (clamp sous 1200 px, 30 rem au-delà), conteneur rempli par la carte', () => {
    expect(regle(css, '.carte-cadre')).toContain('block-size: clamp(22rem, 65vh, 34rem)');
    expect(css).toMatch(/@media \(min-width: 1200px\) \{[\s\S]*\.carte-cadre \{\s*block-size: 30rem;/);
    expect(regle(css, '.carte-reelle')).toContain('inset: 0');
  });
});

describe('hôte Géorisques', () => {
  const parcourir = (dossier) => readdirSync(dossier).flatMap((nom) => {
    if (['node_modules', '.git', 'Docs', 'tests', 'test-results', '.lighthouseci', 'vendor'].includes(nom)) return [];
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? parcourir(chemin) : [chemin];
  });

  it('l\'URL de base WMS contient www.georisques.gouv.fr ; jamais l\'hôte sans www hors assets/vendor, Docs et tests', () => {
    expect(config.wms.base).toContain('https://www.georisques.gouv.fr/');
    const fautifs = parcourir('.').filter((f) => /\.(js|mjs|json|html|css|md|txt|yml)$/.test(f) && !f.endsWith('package-lock.json')).filter((f) => /\/\/georisques\.gouv\.fr/.test(lire(f)));
    expect(fautifs).toEqual([]);
  });
});

describe('pureté et robustesse des nouvelles fonctions', () => {
  it('arguments gelés non modifiés, types inattendus sans exception', () => {
    const profond = (o) => { Object.freeze(o); for (const v of Object.values(o)) if (v && typeof v === 'object') profond(v); return o; };
    const copie = JSON.stringify(config);
    const figee = profond(structuredClone(config));
    const cases = Object.freeze([Object.freeze({ id: 'inondation', coche: true })]);
    expect(() => { optionsWms('inondation', figee); calquesActifs(cases, figee); libellesLegende(figee, profond({ chaleur: 'x' })); couchesPourCalque('feu', figee); }).not.toThrow();
    expect(JSON.stringify(figee)).toBe(copie);
    for (const v of [undefined, null, 0, NaN, '', {}, [], () => 1, { calques: null }, { calques: { a: 'x' } }, { calques: { a: [null, 3, {}] } }]) {
      expect(() => { optionsWms(v, v); couchesPourCalque(v, v); calquesActifs(v, v); libellesLegende(v, v); }, JSON.stringify(v)).not.toThrow();
    }
  });
});
