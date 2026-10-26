import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { brancherFormulaire } from '../assets/js/formulaire.js';
import { texteConcerne, elementsFil } from '../assets/js/sav.js';
import { lireConventions } from './outils/conventions.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('sav.html');
const compte = JSON.parse(lire('data/compte.json'));
const site = JSON.parse(lire('data/site.json'));
const bloc = (source, ouvrante, fermante) => source.slice(source.indexOf(ouvrante), source.indexOf(fermante, source.indexOf(ouvrante)) + fermante.length);
const formulaire = bloc(html, '<form', '</form>');
const sansTemplates = (texte) => texte.replace(/<template[\s\S]*?<\/template>/g, '');

describe('lot 8d-B : markup de sav.html', () => {
  it('groupes produit et motif en fieldset + legend, 5 radios de motif issus des données, photos sans élément focalisable, aucun fichier', () => {
    expect(formulaire).toMatch(/<fieldset[^>]*id="ligne"[^>]*aria-describedby="erreur-ligne">\s*<legend/);
    expect(formulaire).toMatch(/<fieldset[^>]*id="motif"[^>]*aria-describedby="erreur-motif">\s*<legend/);
    expect(formulaire).toContain('<template data-liste="motifs">');
    expect(compte.motifs).toHaveLength(5);
    const photos = bloc(formulaire, '<section class="sav__section" data-bloc="E10-5"', '</section>');
    expect(photos).not.toMatch(/<(input|button|a|select|textarea)[\s>]|tabindex/);
    expect(compte.sav.demande.photos.emplacements).toHaveLength(3);
    expect(html).not.toContain('type="file"');
  });
  it('chaque contrôle a un label, un seul bouton d\'envoi (ambre), aucun name ni action, aucun id dupliqué (source et gabarits)', () => {
    expect(formulaire.match(/<button /g)).toHaveLength(1);
    expect(formulaire).toMatch(/<button type="submit" class="bouton bouton--action[^"]*"/);
    expect(html.match(/bouton--action/g)).toHaveLength(1);
    expect(formulaire).not.toMatch(/\sname=/);
    expect(formulaire.match(/^<form[^>]*>/)[0]).not.toContain('action=');
    expect(formulaire.match(/^<form[^>]*>/)[0]).toMatch(/\snovalidate\s/);
    for (const [, id] of sansTemplates(formulaire).matchAll(/<(?:input|textarea) [^>]*id="([^"]+)"/g)) expect(formulaire, id).toContain(`for="${id}"`);
    const radios = [...formulaire.matchAll(/<input type="radio"[^>]*>/g)];
    expect(radios).toHaveLength(2);
    for (const [, etiquette] of formulaire.matchAll(/<label class="(sav__choix|pastille-choix)">/g)) expect(['sav__choix', 'pastille-choix']).toContain(etiquette);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html.match(/<textarea[^>]*maxlength="1000"[^>]*rows="5"|<textarea[^>]*rows="5"[^>]*maxlength="1000"/g)).toHaveLength(1);
  });
  it('autocomplete attendus sur les coordonnées', () => {
    const attendu = { prenom: 'given-name', nom: 'family-name', email: 'email', telephone: 'tel', adresse: 'address-line1', 'code-postal': 'postal-code', ville: 'address-level2' };
    for (const [id, auto] of Object.entries(attendu)) expect(formulaire, id).toMatch(new RegExp(`id="${id}" autocomplete="${auto}"`));
  });
  it('confirmation : role="status" tabindex="-1", lien vers l\'accueil, lien vers les demandes propre à la variante compte, aucun champ', () => {
    const confirmation = bloc(html, '<section class="sav__section sav__confirmation"', '</section>');
    expect(confirmation).toMatch(/\shidden>/);
    expect(confirmation).toMatch(/role="status" tabindex="-1"/);
    expect(confirmation).toContain('data-lien="site.liens.accueil"');
    expect(confirmation).toMatch(/data-variante="compte" data-lien="site.liens.demandes"/);
    expect(confirmation).not.toMatch(/<(input|textarea|output|form)[\s>]/);
    expect(confirmation.match(/data-variante=/g)).toHaveLength(1);
    expect(html.match(/<form[ >]/g)).toHaveLength(1);
  });
  it('les deux gabarits de fil d\'Ariane : 4 éléments avec compte, 3 sans compte, seul le dernier sans lien', () => {
    const { compte: avec, sansCompte: sans } = compte.sav.demande.fil;
    expect(avec.map((e) => e.texte)).toEqual(['Mon compte', 'Mes achats', 'Commande n° {id}', 'Demande de SAV']);
    expect(sans.map((e) => e.texte)).toEqual(['Accueil', 'Service après-vente', 'Demande de SAV']);
    for (const fil of [avec, sans]) {
      expect(fil.slice(0, -1).every((e) => typeof site.liens[e.lien] === 'string')).toBe(true);
      expect(fil.at(-1).lien).toBeUndefined();
    }
    const elements = elementsFil(avec, site.liens, 'CMD-1037');
    expect(elements.map((e) => e.texte)).toEqual(['Mon compte', 'Mes achats', 'Commande n° CMD-1037', 'Demande de SAV']);
    expect(elements.map((e) => e.adresse)).toEqual(['compte.html', 'achats.html', 'achat.html', null]);
    expect(elementsFil(sans, site.liens, 'CMD-1037').map((e) => e.adresse)).toEqual(['index.html', 'sav-acces.html', null]);
  });
});

describe('lot 8d-B : CSS, textes et confidentialité de sav.js', () => {
  it('css/sav.css et css/composants.css sans valeur hexadécimale', () => {
    for (const f of ['css/sav.css', 'css/composants.css']) expect(lire(f), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('tous les textes référencés par sav.js et par sav.html existent dans compte.json', () => {
    const source = lire('assets/js/sav.js').replace(/\/\/.*$/gm, '');
    const chemins = new Set([...source.matchAll(/compte\.((?:[a-zA-Z]+\.)*[a-zA-Z]+)/g)].map((m) => m[1]).filter((c) => !c.startsWith('limites') && c !== 'commandes'));
    expect(chemins.size).toBeGreaterThan(5);
    const resoudre = (chemin) => chemin.split('.').reduce((o, k) => o?.[k], compte);
    for (const chemin of chemins) expect(resoudre(chemin), chemin).toBeDefined();
    for (const [, cle] of sansTemplates(html).matchAll(/ data-texte="compte\.([^"]+)"/g)) expect(typeof resoudre(cle), cle).toBe('string');
    for (const cle of ['etats.achatManquant.titre', 'etats.accesRequis.lienConnexion', 'confirmation.concerne']) expect(typeof resoudre(`sav.${cle}`)).toBe('string');
  });
  it('sav.js : ni réseau, ni cookie, ni stockage local, aucune écriture de session', () => {
    const src = lire('assets/js/sav.js').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie|sessionStorage|\.setItem|ecrireAchat|ecrireAccesSav|ouvrirSession/);
    expect(src).not.toMatch(/innerHTML|insertAdjacentHTML/);
  });
  it('texteConcerne : titre et id viennent des données de la commande, jamais d\'une saisie', () => {
    const commande = compte.commandes.find((c) => c.id === 'CMD-1037');
    expect(texteConcerne(compte.sav.confirmation.concerne, commande, 1)).toBe('Demande concernant : Grille pare-braises (commande CMD-1037)');
    expect(texteConcerne(compte.sav.confirmation.concerne, commande, 0)).toBe('Demande concernant : Batardeau modulable (commande CMD-1037)');
    expect(texteConcerne('{titre}|{id}', commande, 9)).toBe('|CMD-1037');
    expect(texteConcerne('{titre}|{id}', null, 0)).toBe('|');
    const gele = Object.freeze(structuredClone(commande));
    expect(() => texteConcerne(compte.sav.confirmation.concerne, gele, 0)).not.toThrow();
  });
});

describe('lot 8d-B : extension de formulaire.js pour les groupes de radios', () => {
  it('le lien du récapitulatif focalise champs[x].focus() quand il existe, sinon le premier contrôle', () => {
    const ecouteurs = {};
    const focalises = [];
    const radio = { focus: () => focalises.push('radio') };
    const fieldset = { focus: () => focalises.push('fieldset'), setAttribute() {}, removeAttribute() {} };
    const texte = { focus: () => focalises.push('texte'), setAttribute() {}, removeAttribute() {} };
    const liste = { addEventListener: (nom, f) => { ecouteurs[nom] = f; }, replaceChildren() {} };
    const resume = {
      hidden: true,
      querySelector: (s) => (s === '[data-resume-liste]' ? liste : s === 'template[data-resume-modele]' ? { content: { cloneNode: () => ({}) } } : { textContent: '' }),
    };
    const formulaireFactice = { hidden: true, reset() {}, querySelector: () => resume, addEventListener() {} };
    const erreur = () => ({ textContent: '', hidden: true });
    brancherFormulaire({
      formulaire: formulaireFactice,
      champs: {
        ligne: { ancre: 'ligne', zone: { contains: () => true }, erreur: erreur(), controles: () => [fieldset], focus: () => radio },
        description: { ancre: 'description', zone: { contains: () => true }, erreur: erreur(), controles: () => [texte] },
      },
      lire: () => ({}), valider: () => ({ ok: true, erreurs: [] }), texte: () => '', resume: { titre: () => '', liens: () => [] }, apres() {},
    });
    const clic = (champ) => ecouteurs.click({ target: { closest: () => ({ getAttribute: () => champ }) }, preventDefault() {} });
    clic('ligne');
    clic('description');
    expect(focalises).toEqual(['radio', 'texte']);
    expect(lireConventions()).toContain('champs[x].focus');
  });
});
