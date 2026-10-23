import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('pro.html');
const pro = JSON.parse(lire('data/pro.json'));
const formulaire = html.slice(html.indexOf('<form class="formulaire"'), html.indexOf('</form>') + 7);
const balises = (source, nom) => [...source.matchAll(new RegExp(`<${nom}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const controles = [...balises(formulaire, 'input'), ...balises(formulaire, 'textarea')];

describe('lot 8b-B : balisage du formulaire', () => {
  it('novalidate, ni action ni method, hidden, aucun name, aucun fichier, un label par contrôle, fieldset et legend, un seul bouton submit', () => {
    const ouvrante = formulaire.match(/^<form[^>]*>/)[0];
    expect(ouvrante).toContain(' novalidate');
    expect(ouvrante).toMatch(/\shidden[\s>]/);
    expect(ouvrante).not.toMatch(/\s(action|method)=/);
    expect(formulaire).not.toMatch(/\sname=/);
    expect(formulaire).not.toContain('type="file"');
    expect(controles.length).toBeGreaterThanOrEqual(9);
    for (const controle of controles) {
      const id = controle.match(/\sid="([^"]+)"/)?.[1];
      if (id) {
        expect(formulaire, id).toContain(`for="${id}"`);
      } else {
        expect(formulaire, controle).toMatch(new RegExp(`<label [^>]*>${controle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      }
    }
    expect(formulaire).toMatch(/<fieldset[^>]*id="aleas"[^>]*>\s*<legend/);
    expect(balises(formulaire, 'button')).toHaveLength(1);
    expect(formulaire.match(/type="submit"/g)).toHaveLength(1);
    expect(formulaire).not.toContain('type="button"');
  });

  it('autocomplete, inputmode et type attendus', () => {
    const de = (id) => controles.find((c) => c.includes(`id="${id}"`));
    expect(de('societe')).toContain('autocomplete="organization"');
    expect(de('siret')).toContain('inputmode="numeric"');
    expect(de('siret')).toContain('autocomplete="off"');
    expect(de('prenom')).toContain('autocomplete="given-name"');
    expect(de('nom')).toContain('autocomplete="family-name"');
    expect(de('email')).toContain('type="email"');
    expect(de('email')).toContain('autocomplete="email"');
    expect(de('telephone')).toContain('type="tel"');
    expect(de('telephone')).toContain('autocomplete="tel"');
    expect(de('description')).toContain('rows="5"');
    expect(de('description')).toContain('maxlength="1000"');
    expect(de('message')).toContain('rows="3"');
    expect(de('message')).toContain('maxlength="1000"');
  });

  it('chaque champ a une aide et une erreur d\'id unique reliées par aria-describedby ; aucun id dupliqué ni dans les gabarits', () => {
    for (const champ of ['societe', 'siret', 'prenom', 'nom', 'email', 'telephone', 'aleas', 'description', 'message']) {
      expect(html, champ).toContain(`id="aide-${champ}"`);
      expect(html, champ).toContain(`id="erreur-${champ}"`);
    }
    expect(html).toContain('id="erreur-consentement"');
    for (const [, valeur] of formulaire.matchAll(/aria-describedby="([^"]+)"/g)) {
      for (const id of valeur.split(' ')) expect(html, id).toContain(`id="${id}"`);
    }
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, contenu] of html.matchAll(/<template[^>]*>([\s\S]*?)<\/template>/g)) expect(contenu).not.toMatch(/\sid=/);
    expect(pro.formulaire.champs.certifications.emplacements.every((t) => t.includes('exemple'))).toBe(true);
  });
});

describe('lot 8b-B : styles et modules', () => {
  it('css/pro.css et css/composants.css sans valeur hexadécimale de couleur', () => {
    for (const fichier of ['css/pro.css', 'css/composants.css']) expect(lire(fichier), fichier).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('formulaire.js et pro.js : ni réseau, ni stockage, ni cookie, ni texte visible en dur', () => {
    for (const fichier of ['assets/js/formulaire.js', 'assets/js/pro.js']) {
      const source = lire(fichier);
      for (const interdit of ['fetch', 'XMLHttpRequest', 'sendBeacon', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'innerHTML']) {
        expect(source.replace(/\/\/.*$/gm, ''), `${fichier} ${interdit}`).not.toContain(interdit);
      }
      const code = source.replace(/\/\/.*$/gm, '');
      for (const [, texte] of code.matchAll(/(['"`])((?:(?!\1)[^\\\n])*[À-ÿ](?:(?!\1)[^\\\n])*)\1/g)) {
        expect(texte.split(/\s+/).length, `${fichier} : « ${texte} »`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('les clés de data/pro.json référencées par pro.js existent', () => {
    const source = lire('assets/js/pro.js').replace(/\/\/.*$/gm, '');
    const cles = [...source.matchAll(/\bpro\.((?:[a-zA-Z]+\.?)+)/g)].map((m) => m[1].replace(/\.$/, ''));
    expect(cles.length).toBeGreaterThan(4);
    for (const cle of cles) {
      const valeur = cle.split('.').reduce((o, k) => o?.[k], pro);
      expect(valeur, cle).toBeDefined();
    }
  });
});
