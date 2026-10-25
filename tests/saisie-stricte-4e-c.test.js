import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import * as logique from '../assets/js/adresse-assistee-logique.js';
import { actionEntree, etatValidation, construireUrlRecherche } from '../assets/js/adresse-assistee-logique.js';
import { valider } from '../assets/js/adresse-validation.js';

const lire = (f) => readFileSync(f, 'utf8');
const sansCommentaires = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const diagnostic = JSON.parse(lire('data/diagnostic.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const LIBELLE = '12 Rue des Tilleuls 69003 Lyon';
const base = { texte: LIBELLE, selection: { libelle: LIBELLE }, adresseCourante: '', panne: false, valideLocal: true };

describe('etatValidation', () => {
  it('texte choisi et inchangé : valide', () => {
    expect(etatValidation(base)).toEqual({ valide: true, raison: null });
    expect(etatValidation({ ...base, selection: LIBELLE })).toEqual({ valide: true, raison: null });
  });
  it('modifié d\'un caractère (ajouté ou retiré) : invalide aussitôt', () => {
    expect(etatValidation({ ...base, texte: `${LIBELLE}x` })).toEqual({ valide: false, raison: 'modifiee' });
    expect(etatValidation({ ...base, texte: LIBELLE.slice(0, -1) })).toEqual({ valide: false, raison: 'modifiee' });
    expect(etatValidation({ ...base, texte: LIBELLE.toLowerCase() })).toEqual({ valide: false, raison: 'modifiee' });
  });
  it('identique à l\'adresse déjà affichée : inactif, même choisi', () => {
    expect(etatValidation({ ...base, adresseCourante: LIBELLE })).toEqual({ valide: false, raison: 'identique' });
    expect(etatValidation({ ...base, selection: null, adresseCourante: LIBELLE })).toEqual({ valide: false, raison: 'identique' });
  });
  it('jamais choisi : invalide, quelle que soit la validation locale', () => {
    expect(etatValidation({ ...base, selection: null })).toEqual({ valide: false, raison: 'non-choisie' });
    expect(etatValidation({ ...base, selection: null, valideLocal: true })).toMatchObject({ valide: false });
  });
  it('panne du service avec texte valide localement : valide ; avec texte invalide : invalide', () => {
    expect(etatValidation({ ...base, selection: null, panne: true, valideLocal: true })).toEqual({ valide: true, raison: 'panne' });
    expect(etatValidation({ ...base, selection: null, panne: true, valideLocal: false })).toEqual({ valide: false, raison: 'locale' });
  });
  it('texte vide : invalide ; la panne seule ne suffit pas sans texte', () => {
    expect(etatValidation({ ...base, texte: '', selection: null })).toEqual({ valide: false, raison: 'non-choisie' });
    expect(etatValidation({ ...base, texte: '', selection: null, panne: true })).toEqual({ valide: false, raison: 'non-choisie' });
  });
  it('la décision de panne ne s\'applique que si la panne est établie (les deux appels ont échoué)', () => {
    for (const panne of [false, undefined, null, 0, 'oui']) expect(etatValidation({ ...base, selection: null, panne, valideLocal: true }).valide, String(panne)).toBe(false);
    expect(etatValidation({ ...base, selection: null, panne: true, valideLocal: 'oui' }).valide).toBe(false);
  });
});

describe('actionEntree', () => {
  it('option surlignée : choisir, même si l\'adresse est valide', () => {
    expect(actionEntree({ activeIndex: 0, valide: false })).toBe('choisir');
    expect(actionEntree({ activeIndex: 3, valide: true })).toBe('choisir');
  });
  it('adresse valide sans option surlignée : valider', () => {
    expect(actionEntree({ activeIndex: -1, valide: true })).toBe('valider');
  });
  it('adresse invalide sans option : rien (jamais la première suggestion)', () => {
    expect(actionEntree({ activeIndex: -1, valide: false })).toBe('rien');
  });
  it('liste fermée ou entrée illisible : rien', () => {
    expect(actionEntree({ valide: false })).toBe('rien');
    for (const v of [undefined, null, 0, '', [], () => 1]) expect(actionEntree(v)).toBe('rien');
  });
});

describe('pureté et robustesse', () => {
  it('arguments gelés non modifiés, jamais d\'exception, résultats stables', () => {
    const entree = Object.freeze({ ...base, selection: Object.freeze({ libelle: LIBELLE }) });
    expect(etatValidation(entree)).toEqual(etatValidation(entree));
    for (const v of [undefined, null, 0, NaN, '', 'x', {}, [], () => 1, { texte: 5, selection: 5, adresseCourante: {}, panne: 1, valideLocal: [] }]) {
      expect(() => etatValidation(v), String(v)).not.toThrow();
      expect(etatValidation(v).valide).toBe(false);
      expect(() => actionEntree(v)).not.toThrow();
    }
    expect(sansCommentaires(lire('assets/js/adresse-assistee-logique.js'))).not.toMatch(/\b(document|window|fetch|Date|localStorage|sessionStorage|indexedDB|XMLHttpRequest|setTimeout)\b/);
  });
});

describe('plus aucune vérification par recherche libre', () => {
  it('decisionVerification n\'existe plus ; urlRecherche n\'est construite que pour les suggestions (limit=5)', () => {
    expect(logique.decisionVerification).toBeUndefined();
    for (const fichier of readdirSync('assets/js').filter((f) => f.startsWith('adresse') || f === 'diagnostic.js')) {
      expect(lire(`assets/js/${fichier}`), fichier).not.toMatch(/decisionVerification|verifier\(|limit=1/);
    }
    const assistant = sansCommentaires(lire('assets/js/adresse-assistee.js'));
    expect(assistant.match(/construireUrlRecherche\(/g)).toHaveLength(1);
    expect(assistant).toContain('construireUrlRecherche(nette, saisie.maxSuggestions, geocodage.base)');
    expect(construireUrlRecherche('12 rue', 5, diagnostic.carteReelle.geocodage.base)).toContain('&limit=5');
  });
});

describe('markup des deux pages', () => {
  for (const [page, bouton, idAide] of [['index.html', 'accueil.recherche.bouton', 'adresse-aide-validation'], ['diagnostic.html', 'diagnostic.textes.bouton', 'adresse-aide-validation']]) {
    it(`${page} : bouton aria-disabled initial, jamais disabled, relié à l'aide visible`, () => {
      const html = lire(page);
      const b = html.match(new RegExp(`<button type="submit"[^>]*data-texte="${bouton.replace(/\./g, '\\.')}"[^>]*>`))[0];
      expect(b).toContain('aria-disabled="true"');
      expect(b).toContain(`aria-describedby="${idAide}"`);
      expect(b).not.toMatch(/\sdisabled/);
      expect(b.match(/class="([^"]*)"/)[1]).not.toContain('bouton--action');
      expect(html).toMatch(new RegExp(`<p class="[^"]*" id="${idAide}" data-texte="[^"]*aideInactif">`));
      expect(html).not.toMatch(new RegExp(`id="${idAide}"[^>]*hidden`));
    });
  }
  it('accueil : la classe d\'action n\'est posée que par le script, à l\'état actif', () => {
    expect(lire('index.html')).toMatch(/data-classe-active="bouton--action" data-classe-inactive="bouton--secondaire"/);
    expect(sansCommentaires(lire('assets/js/adresse-assistee.js'))).toContain('bouton.classList.toggle(actif, valide)');
  });
});

describe('données', () => {
  it('textes d\'aide d\'inactivité, d\'absence de suggestion et de panne non vides ; plus de texte de vérification automatique', () => {
    for (const textes of [diagnostic.textes.assistee, accueil.recherche.assistee]) {
      expect(textes.aideInactif).toBe('Choisissez une adresse dans la liste pour continuer.');
      expect(textes.aucune).toBe('Aucune adresse ne correspond.');
      expect(textes.nonVerifiee).toBe("Vérification impossible pour le moment : l'adresse sera utilisée telle quelle.");
      for (const cle of ['reconnue', 'introuvable', 'municipalite', 'verification']) expect(textes[cle], cle).toBeUndefined();
    }
    expect(JSON.stringify([diagnostic.textes.assistee, accueil.recherche.assistee])).not.toMatch(/Vérification de l'adresse|Adresse reconnue|Adresse introuvable/);
  });
});

describe('CSS de l\'état inactif', () => {
  it('contour marine, fond neutre, texte atténué, jamais d\'ambre ni de couleur en dur', () => {
    const css = lire('css/accueil.css');
    const debut = css.indexOf('.recherche .bouton[aria-disabled="true"],');
    const regle = css.slice(debut, css.indexOf('}', debut));
    expect(regle).toContain('border-color: var(--color-navy)');
    expect(regle).toContain('background: var(--color-card)');
    expect(regle).not.toMatch(/amber|#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i);
  });
});

describe('module de saisie : stockage et session', () => {
  it('adresse-assistee.js n\'écrit rien en stockage ; seule la clé adresse est écrite par les pages de saisie', () => {
    expect(sansCommentaires(lire('assets/js/adresse-assistee.js'))).not.toMatch(/sessionStorage|localStorage|indexedDB|document\.cookie|setItem/);
    expect(lire('assets/js/adresse.js').match(/setItem\(([A-Z_]+)/g)).toEqual(['setItem(CLE_STOCKAGE']);
    expect(sansCommentaires(lire('assets/js/diagnostic.js')).match(/ecrireSession\(([A-Z_]+)/g).sort()).toEqual(['ecrireSession(CLE_COMPARAISON', 'ecrireSession(CLE_STOCKAGE']);
    expect(lire('assets/js/adresse-validation.js')).toContain("CLE_STOCKAGE = 'adresse'");
  });
  it('valider (lot 2) conserve ses résultats', () => {
    expect(valider('12 rue des Tilleuls, 69000 Lyon')).toEqual({ valide: true, adresse: '12 rue des Tilleuls, 69000 Lyon', raison: null });
    expect(valider('Rue')).toMatchObject({ raison: 'courte' });
    expect(valider('123456789')).toMatchObject({ raison: 'sans-lettre' });
  });
});

describe('utilitaire de test partagé et poids des documents', () => {
  it('tests/outils/choisir-adresse.js existe et est utilisé par tous les parcours qui saisissent une adresse', () => {
    expect(lire('tests/outils/choisir-adresse.js')).toContain('export async function choisirAdresse');
    const fichiers = readdirSync('tests/e2e').filter((f) => f.endsWith('.e2e.js'));
    const saisissant = fichiers.filter((f) => /Entrez votre adresse|#adresse-evaluee|Adresse évaluée/.test(lire(`tests/e2e/${f}`)) && /fill\(|keyboard\.type/.test(lire(`tests/e2e/${f}`)) && !lire(`tests/e2e/${f}`).includes('/wireframes/'));
    expect(saisissant.length).toBeGreaterThan(8);
    for (const f of saisissant) {
      const source = lire(`tests/e2e/${f}`);
      const brut = [...source.matchAll(/(?:getByLabel\(\/Entrez votre adresse\/\)|getByLabel\('Adresse évaluée'\)|locator\('#adresse(?:-evaluee)?'\)|champ(?:Diag)?)\.fill\(([^)]*)\)/g)].map((m) => m[1]);
      // un remplissage direct n'est admis que pour tester la saisie elle-même (fichiers dédiés) ou vider le champ
      if (!['adresse-assistee-b.e2e.js', 'adresse-stricte-c.e2e.js', 'recherche.e2e.js', 'diagnostic.e2e.js', 'parcours-adresse.e2e.js', 'parcours-adresse-stricte.e2e.js', 'diagnostic-c.e2e.js'].includes(f)) {
        expect(source, f).toContain('choisirAdresse');
        expect(brut.filter((v) => v !== "''"), f).toEqual([]);
      }
    }
  });
  it('CLAUDE.md de moins de 9 000 caractères et conventions.md de 200 lignes au plus', () => {
    expect([...lire('CLAUDE.md')].length).toBeLessThan(9000);
    expect(lire('Docs/ref/conventions.md').split('\n').length).toBeLessThanOrEqual(190);
  });
});
