import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validerInformations, modeCommande, RAISONSCOMPTE, CHAMPS_INFORMATIONS } from '../assets/js/compte-logique.js';
import { resoudre } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const compte = JSON.parse(lire('data/compte.json'));
const site = JSON.parse(lire('data/site.json'));
const { limites } = compte;
const base = { prenom: 'Camille', nom: 'Exemple', email: 'a@b.fr', telephone: '', adresse: '1 rue', complement: '', codePostal: '00000', ville: 'Ville' };
const raison = (champ, valeur) => validerInformations({ ...base, [champ]: valeur }, limites).erreurs.find((e) => e.champ === champ)?.raison ?? null;
const MODULES = ['compte.js', 'achats.js', 'informations.js', 'compte-vue.js'];

describe('lot 8c-B : validerInformations', () => {
  it('prénom et nom : bornes 1, 50 et 51, vide, caractère', () => {
    for (const champ of ['prenom', 'nom']) {
      expect(raison(champ, 'a')).toBeNull();
      expect(raison(champ, 'a'.repeat(50))).toBeNull();
      expect(raison(champ, 'a'.repeat(51))).toBe('longueur');
      expect(raison(champ, '   ')).toBe('vide');
      expect(raison(champ, 'a\u0007b')).toBe('caractere');
    }
  });
  it('code postal : 4, 5 et 6 chiffres, espaces tolérés, lettres refusées ; valeur normalisée à 5 chiffres', () => {
    expect(raison('codePostal', '1234')).toBe('format');
    expect(raison('codePostal', '12345')).toBeNull();
    expect(raison('codePostal', '123456')).toBe('format');
    expect(raison('codePostal', '75 001')).toBeNull();
    expect(raison('codePostal', ' 7 5 0 0 1 ')).toBeNull();
    expect(raison('codePostal', '7500a')).toBe('format');
    expect(raison('codePostal', '')).toBe('vide');
    expect(validerInformations({ ...base, codePostal: '75 001' }, limites).valeurs.codePostal).toBe('75001');
  });
  it('ville : 1, 2, 60 et 61 caractères ; adresse : 2 à 100 ; complément et téléphone facultatifs', () => {
    expect(raison('ville', 'V')).toBe('longueur');
    expect(raison('ville', 'Vi')).toBeNull();
    expect(raison('ville', 'v'.repeat(60))).toBeNull();
    expect(raison('ville', 'v'.repeat(61))).toBe('longueur');
    expect(raison('adresse', 'a')).toBe('longueur');
    expect(raison('adresse', 'a'.repeat(100))).toBeNull();
    expect(raison('adresse', 'a'.repeat(101))).toBe('longueur');
    expect(raison('complement', '')).toBeNull();
    expect(raison('complement', 'c'.repeat(100))).toBeNull();
    expect(raison('complement', 'c'.repeat(101))).toBe('longueur');
    expect(raison('telephone', '')).toBeNull();
    expect(raison('telephone', '01 00 00 00 00')).toBeNull();
    expect(raison('telephone', '12')).toBe('format');
    expect(raison('email', 'x')).toBe('format');
  });
  it('une seule raison par champ, dans l\'ordre du formulaire ; saisie vide : six champs obligatoires', () => {
    const r = validerInformations({}, limites);
    expect(r.erreurs.map((e) => e.champ)).toEqual(['prenom', 'nom', 'email', 'adresse', 'codePostal', 'ville']);
    const tout = validerInformations({ prenom: '', nom: 'a'.repeat(51), email: 'x', telephone: '1', adresse: '', complement: 'c'.repeat(101), codePostal: 'abc', ville: '' }, limites);
    expect(tout.erreurs.map((e) => e.champ)).toEqual(CHAMPS_INFORMATIONS);
    for (const { champ, raison: r2 } of tout.erreurs) expect(RAISONSCOMPTE[champ]).toContain(r2);
  });
  it('pureté et robustesse : arguments gelés, entrées inattendues, mode d\'une commande', () => {
    const fige = Object.freeze({ ...base });
    expect(validerInformations(fige, Object.freeze(structuredClone(limites))).ok).toBe(true);
    for (const x of [undefined, null, 3, 'x', [], { prenom: 5, codePostal: {} }]) expect(() => validerInformations(x, x)).not.toThrow();
    expect(modeCommande(compte.commandes.find((c) => c.id === 'CMD-1037'))).toBe('pose');
    expect(modeCommande(compte.commandes.find((c) => c.id === 'CMD-1051'))).toBe('diy');
    expect(modeCommande({ lignes: [{ mode: 'diy' }, { mode: 'pose' }] })).toBe('mixte');
    expect(modeCommande(null)).toBe('diy');
  });
});

describe('lot 8c-B : balisage', () => {
  it('informations.html : un seul <form> englobant les trois blocs, aucun name, un seul bouton ambre, un label par contrôle, aucun id dupliqué', () => {
    const html = lire('informations.html');
    expect(html.match(/<form[ >]/g)).toHaveLength(1);
    const formulaire = html.slice(html.indexOf('<form'), html.indexOf('</form>'));
    for (const role of ['identite', 'adresse', 'preferences']) expect(formulaire).toContain(`data-role="${role}"`);
    expect(formulaire.match(/^<form[^>]*>/)[0]).toMatch(/\snovalidate\s/);
    expect(formulaire.match(/^<form[^>]*>/)[0]).not.toContain('action=');
    expect(formulaire).not.toMatch(/\sname=/);
    expect(html.match(/bouton--action/g)).toHaveLength(1);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    for (const [, id] of formulaire.matchAll(/<input [^>]*id="([^"]+)"/g)) expect(formulaire, id).toContain(`for="${id}"`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('data-enregistre');
  });
  it('compte.html et achats.html : navigation du compte, gabarits de cartes sans id, fieldset du filtre (5 pastilles par les données), aucun id dupliqué', () => {
    for (const page of ['compte.html', 'achats.html']) {
      const html = lire(page);
      expect(html, page).toMatch(/<nav class="nav-compte"/);
      const gabarits = [...html.matchAll(/<template data-gabarit="[^"]+">([\s\S]*?)<\/template>/g)].map((m) => m[1]);
      expect(gabarits.length, page).toBeGreaterThan(0);
      for (const g of gabarits) expect(g, page).not.toMatch(/\sid=/);
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size, page).toBe(ids.length);
    }
    const achats = lire('achats.html');
    expect(achats).toMatch(/<fieldset class="achats__filtre">\s*<legend/);
    expect(achats.match(/type="radio"/g)).toHaveLength(1); // gabarit : une pastille par élément de pages.achats.filtres
    expect(compte.pages.achats.filtres.map((f) => f.id)).toEqual(['tous', ...compte.statuts.map((s) => s.id)]);
    expect(compte.pages.achats.filtres).toHaveLength(5);
    expect(lire('compte.html')).toContain('data-gabarit="carte-commande"');
    expect(lire('compte.html')).toContain('data-gabarit="carte-demande"');
    expect(site.liens.demandes).toBe('demandes.html');
  });
  it('css/compte.css : aucune valeur hexadécimale ni couleur nommée en dur', () => {
    const css = lire('css/compte.css');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|hsl)a?\(/);
  });
});

describe('lot 8c-B : modules', () => {
  it('tous les textes référencés par compte.js, achats.js, informations.js et compte-vue.js existent dans data/compte.json', () => {
    for (const module of MODULES) {
      const src = lire(`assets/js/${module}`).replace(/\/\/.*$/gm, '');
      for (const [, cle] of src.matchAll(/\b(?:compte|donnees\.compte)\.((?:[a-zA-Z]+\.)*[a-zA-Z]+)\b/g)) {
        const chemin = cle.split('.');
        const trouve = chemin.reduce((o, k) => (o !== null && typeof o === 'object' ? o[k] : undefined), compte);
        if (['client', 'commandes', 'demandes', 'statuts', 'statutsDemande', 'limites'].includes(chemin[0])) continue;
        if (typeof trouve === 'undefined' && chemin[0] === 'modes') continue;
        expect(trouve, `${module} compte.${cle}`).toBeDefined();
      }
    }
    for (const cle of ['commande.numero', 'commande.date', 'commande.statut', 'commande.total', 'commande.mode', 'commande.detail', 'commande.detailAria',
      'commande.modes.diy', 'commande.modes.pose', 'commande.modes.mixte', 'demande.numero', 'demande.produit', 'demande.statut',
      'pages.informations.confirmation', 'gardes.aucunAchatStatut.titre', 'formulaire.resume.pluriel']) {
      expect(() => resoudre({ compte }, `compte.${cle}`), cle).not.toThrow();
    }
  });
  it('aucun de ces modules n\'appelle fetch, XMLHttpRequest, sendBeacon, localStorage, indexedDB ni document.cookie ; aucun stockage hors compte et achat', () => {
    for (const module of [...MODULES, 'compte-session.js', 'connexion.js']) {
      const src = lire(`assets/js/${module}`).replace(/\/\/.*$/gm, '');
      expect(src, module).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie/);
    }
  });
  it('l\'écriture de achat est isolée : compte-session.js seul touche sessionStorage, compte-vue.js appelle ecrireAchat', () => {
    for (const module of [...MODULES, 'connexion.js']) expect(lire(`assets/js/${module}`).replace(/\/\/.*$/gm, ''), module).not.toMatch(/sessionStorage|setItem|removeItem/);
    expect(lire('assets/js/compte-vue.js')).toMatch(/ecrireAchat\(bouton\.getAttribute\('data-id'\)\)/);
    expect(lire('assets/js/compte-session.js')).toMatch(/export function ecrireAchat/);
  });
});
