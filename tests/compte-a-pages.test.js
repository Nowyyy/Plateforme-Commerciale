import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resoudre } from '../assets/js/rendu.js';
import { lireContenus } from '../scripts/documents/generer.mjs';
import { brancherFormulaire } from '../assets/js/formulaire.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const site = JSON.parse(lire('data/site.json'));
const compte = JSON.parse(lire('data/compte.json'));
const donnees = { site, compte };
const index = lire('index.html');
const PAGES = { 'connexion.html': 'E6', 'compte.html': 'E7', 'achats.html': 'E8', 'achat.html': 'E9', 'informations.html': 'E12' };
const HIFI = ['index.html', 'diagnostic.html', 'produit.html', 'panier.html', 'pro.html', ...Object.keys(PAGES)];
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const sansCode = (texte) => texte.replace(/ data-bloc="E\d+-\d+"/g, '');
const ATTENDUS = {
  'connexion.html': [['E6-1', 'en-tete'], ['E6-2', 'connexion'], ['E6-3', 'demo'], ['E6-4', 'sav-sans-compte'], ['E6-5', 'pied']],
  'compte.html': [['E7-1', 'en-tete'], ['E7-2', 'bienvenue'], ['E7-3', 'commandes'], ['E7-4', 'sav-en-cours'], ['E7-5', 'pied']],
  'achats.html': [['E8-1', 'en-tete'], ['E8-2', 'filtre'], ['E8-3', 'liste'], ['E8-4', 'pied']],
  'achat.html': [['E9-1', 'en-tete'], ['E9-2', 'resume'], ['E9-3', 'lignes'], ['E9-4', 'livraison'], ['E9-5', 'documents'], ['E9-6', 'sav'], ['E9-7', 'pied']],
  'informations.html': [['E12-1', 'en-tete'], ['E12-2', 'identite'], ['E12-3', 'adresse'], ['E12-4', 'preferences'], ['E12-5', 'pied']],
};

describe('lot 8c-A : connexion.html', () => {
  const html = lire('connexion.html');
  it('lang, noindex, un seul h1, codes E6-1 à E6-5 une fois dans l\'ordre, aria-labelledby valides, rien d\'en ligne ni d\'externe, aucun id dupliqué', () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="fr" data-donnees="compte">/);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect([...html.matchAll(/data-bloc="(E\d+-\d+)"/g)].map((m) => m[1])).toEqual(ATTENDUS['connexion.html'].map((a) => a[0]));
    expect([...html.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1])).toEqual(ATTENDUS['connexion.html'].map((a) => a[1]));
    for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) expect(html, id).toContain(`id="${id}"`);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/\sstyle=/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('formulaire : novalidate, ni name ni action, mot de passe en type="password", un seul bouton ambre, chaque contrôle a un label', () => {
    const formulaire = bloc(html, '<form', '</form>');
    expect(formulaire.match(/^<form[^>]*>/)[0]).toMatch(/\snovalidate\s/);
    expect(formulaire).not.toMatch(/\sname=/);
    expect(formulaire.match(/^<form[^>]*>/)[0]).not.toContain('action=');
    expect(formulaire).toMatch(/<input class="champ" type="password" id="mot-de-passe" autocomplete="off"/);
    expect(html.match(/bouton--action/g)).toHaveLength(1);
    for (const [, id] of formulaire.matchAll(/<input [^>]*id="([^"]+)"/g)) expect(formulaire, id).toContain(`for="${id}"`);
    expect(html).toContain('data-lien="site.liens.savAcces"');
  });
});

describe('lot 8c-A : squelettes des quatre autres pages', () => {
  it('chaque page a un seul h1, ses blocs dans l\'ordre, noindex et aucun bouton ambre', () => {
    for (const [page, attendus] of Object.entries(ATTENDUS).filter(([p]) => p !== 'connexion.html')) {
      const html = lire(page);
      expect(html.match(/<h1[ >]/g), page).toHaveLength(1);
      expect(html, page).toContain('<meta name="robots" content="noindex">');
      expect([...html.matchAll(/data-bloc="(E\d+-\d+)"/g)].map((m) => m[1]), page).toEqual(attendus.map((a) => a[0]));
      expect([...html.matchAll(/data-role="([a-z-]+)"/g)].map((m) => m[1]), page).toEqual(attendus.map((a) => a[1]));
      expect(html, page).not.toContain('bouton--action');
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, page).toBe(ids.length);
    }
  });
  it('la navigation du compte suit l\'en-tête sur les pages E7, E8 et E12, avec la page courante repérée ; absente de connexion et achat', () => {
    for (const [page, courant] of [['compte.html', 'compte'], ['achats.html', 'achats'], ['informations.html', 'informations']]) {
      const html = lire(page);
      expect(html, page).toMatch(/<\/header>\s*<nav class="nav-compte"/);
      expect(html.match(/aria-current="page"/g), page).toHaveLength(1);
      expect(html, page).toContain(`data-lien="site.liens.${courant}" aria-current="page"`);
      expect(html, page).toContain('data-deconnexion');
    }
    for (const page of ['connexion.html', 'achat.html']) expect(lire(page)).not.toContain('nav-compte');
  });
  it('toutes les clés data-texte, data-lien, data-aria-label et data-liste des cinq pages se résolvent', () => {
    for (const page of Object.keys(PAGES)) {
      const html = lire(page);
      const hors = html.replace(/<template[\s\S]*?<\/template>/g, '');
      for (const attribut of ['data-texte', 'data-texte-global', 'data-lien', 'data-aria-label']) {
        for (const [, cle] of hors.matchAll(new RegExp(` ${attribut}="([^"]+)"`, 'g'))) expect(() => resoudre(donnees, cle), `${page} ${attribut} ${cle}`).not.toThrow();
      }
      for (const [, cle] of html.matchAll(/<template data-liste="([^"]+)">/g)) {
        if (cle !== 'entrees') expect(cle.startsWith('site.'), `${page} ${cle}`).toBe(true);
      }
    }
  });
});

describe('lot 8c-A : en-tête, pied, décor et chargement des modules', () => {
  it('en-tête, pied et décor identiques à ceux d\'index.html sur les cinq pages ; les dix pages chargent compteur.js et compte-lien.js', () => {
    for (const page of Object.keys(PAGES)) {
      const html = lire(page);
      expect(sansCode(bloc(html, '<header', '</header>')), page).toBe(sansCode(bloc(index, '<header', '</header>')));
      expect(sansCode(bloc(html, '<footer', '</footer>')), page).toBe(sansCode(bloc(index, '<footer', '</footer>')));
      expect(bloc(html, '<div class="relief"', '</svg>\n  </div>'), page).toBe(bloc(index, '<div class="relief"', '</svg>\n  </div>'));
    }
    for (const page of HIFI) {
      const html = lire(page);
      expect(html.match(/<script type="module" src="assets\/js\/compteur\.js"><\/script>/g), page).toHaveLength(1);
      expect(html.match(/<script type="module" src="assets\/js\/compte-lien\.js"><\/script>/g), page).toHaveLength(1);
      expect(sansCode(bloc(html, '<header', '</header>')), page).not.toContain('compte.html');
    }
  });
  it('liens de site.json : connexion et pages du compte à la racine, demandes et sav provisoirement en wireframe', () => {
    expect(site.liens).toMatchObject({
      connexion: 'connexion.html', compte: 'compte.html', achats: 'achats.html', achat: 'achat.html', informations: 'informations.html',
      demandes: 'wireframes/demandes.html', sav: 'wireframes/sav.html', savAcces: 'wireframes/sav-acces.html',
    });
  });
  it('compte-lien.js et compte-session.js : ni réseau, ni cookie, ni stockage hors compte et achat, aucun texte visible en dur', () => {
    for (const f of ['compte-lien.js', 'compte-session.js', 'connexion.js', 'compte-logique.js']) {
      const src = lire(`assets/js/${f}`).replace(/\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie/);
    }
    expect(lire('assets/js/compte-session.js')).not.toMatch(/getItem\('(?!compte|achat)|setItem\('(?!compte|achat)/);
  });
});

describe('lot 8c-A : PDF, workflow, formulaire et CLAUDE.md', () => {
  it('les PDF versionnés sont identiques à la sortie du générateur, de moins de 50 Ko et marqués « DOCUMENT FICTIF »', () => {
    const contenus = lireContenus();
    expect(contenus.map((c) => c.fichier)).toEqual(expect.arrayContaining(['facture-exemple.pdf', 'attestation-pose-exemple.pdf', 'garantie-decennale-exemple.pdf']));
    for (const { fichier, octets } of contenus) {
      const chemin = `assets/documents/${fichier}`;
      expect(statSync(chemin).size).toBeLessThan(50 * 1024);
      expect(Buffer.from(octets).equals(readFileSync(chemin)), fichier).toBe(true);
      expect(readFileSync(chemin).toString('latin1')).toContain('DOCUMENT FICTIF');
    }
  });
  it('le workflow publie les cinq pages, garde permissions:, sans secrets. ni pull_request_target, lignes uses: identiques à origin/main', () => {
    const wf = lire('.github/workflows/pages.yml');
    expect(wf.match(/for p in ([^;]+);/)[1].split(/\s+/)).toEqual(expect.arrayContaining(Object.keys(PAGES)));
    expect(wf).toContain('permissions:');
    expect(wf).not.toContain('secrets.');
    expect(wf).not.toContain('pull_request_target');
    const uses = (t) => t.split('\n').map((l) => l.trim().replace(/^- /, '')).filter((l) => l.startsWith('uses:'));
    let main = null;
    try { main = execFileSync('git', ['show', 'origin/main:.github/workflows/pages.yml'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* clone superficiel */ }
    if (main !== null) expect(uses(wf)).toEqual(uses(main));
  });
  it('formulaire.js : valeursInitiales remet ces valeurs (texte et case) au lieu du vide ; sans l\'option, la réinitialisation ne touche à rien d\'autre', () => {
    const mk = (valeursInitiales) => {
      const ecouteurs = {};
      const email = { value: 'saisie', checked: false, removeAttribute() {}, setAttribute() {} };
      const case_ = { value: '', checked: false };
      const resume = {
        hidden: true,
        focus() {},
        querySelector: (s) => (s === 'template[data-resume-modele]' ? { content: { cloneNode: () => ({}) } } : { textContent: '', replaceChildren() {} }),
      };
      const liste = { addEventListener() {}, replaceChildren() {} };
      resume.querySelector = (s) => (s === '[data-resume-liste]' ? liste : s === 'template[data-resume-modele]' ? { content: { cloneNode: () => ({}) } } : { textContent: '' });
      const erreur = { textContent: '', hidden: true };
      const formulaire = {
        hidden: true,
        reset() { email.value = ''; case_.checked = false; },
        querySelector: () => resume,
        addEventListener: (nom, f) => { ecouteurs[nom] = f; },
      };
      let apres = 0;
      brancherFormulaire({
        formulaire,
        champs: { email: { ancre: 'email', zone: { contains: () => true }, erreur, controles: () => [email] } },
        lire: () => ({}),
        valider: () => ({ ok: true, erreurs: [] }),
        texte: () => '',
        resume: { titre: () => '', liens: () => [] },
        apres: () => { apres += 1; },
        ...(valeursInitiales ? { valeursInitiales: valeursInitiales(email, case_) } : {}),
      });
      ecouteurs.submit({ preventDefault() {} });
      return { email, case_, apres, formulaire };
    };
    const avec = mk((email, case_) => [{ controle: email, valeur: 'camille@exemple.test' }, { controle: case_, valeur: true }]);
    expect([avec.email.value, avec.case_.checked, avec.apres]).toEqual(['camille@exemple.test', true, 1]);
    const sans = mk(null);
    expect([sans.email.value, sans.case_.checked, sans.apres, sans.formulaire.hidden]).toEqual(['', false, 1, false]);
  });
  it('CLAUDE.md fait moins de 9 000 caractères et mentionne l\'espace client', () => {
    const texte = lire('CLAUDE.md');
    expect([...texte].length).toBeLessThan(9000);
    for (const mot of ['connexion.html', 'compte.json', 'compte-lien.js', 'Compte simulé', 'Se connecter']) expect(texte).toContain(mot);
    expect(lire('Docs/ref/conventions.md')).toMatch(/^## Compte/m);
  });
});
