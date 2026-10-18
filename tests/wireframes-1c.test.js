import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, normalize } from 'node:path';

const ECRANS = {
  1: 'accueil', 2: 'diagnostic', 3: 'produit', 4: 'panier', 5: 'pro', 6: 'connexion', 7: 'compte',
  8: 'achats', 9: 'achat', 10: 'sav', 11: 'demandes', 12: 'informations', 13: 'sav-acces',
};
const CONNECTES = [7, 8, 9, 11, 12];
const lire = (nom) => readFileSync(`wireframes/${nom}.html`, 'utf8');
const attributs = (html, nom) => [...html.matchAll(new RegExp(`data-${nom}="([^"]+)"`, 'g'))].map((m) => m[1]);

function extraire(html, balise) {
  const debut = html.indexOf(`<${balise}`);
  const fin = html.indexOf(`</${balise}>`, debut);
  return html.slice(debut, fin);
}

function lien(html, texte) {
  const m = html.match(new RegExp(`<a [^>]*href="([^"]+)"[^>]*>${texte}</a>`));
  return m ? m[1] : null;
}

describe('wireframes lot 1c : socle des 14 pages', () => {
  const pages = ['index', ...Object.values(ECRANS)];

  it('les 14 pages ont lang="fr", noindex, un seul h1 et le bandeau démonstrateur', () => {
    expect(readdirSync('wireframes').filter((f) => f.endsWith('.html')).sort()).toEqual(pages.map((p) => `${p}.html`).sort());
    for (const nom of pages) {
      const html = lire(nom);
      expect(html, nom).toContain('<html lang="fr">');
      expect(html, nom).toContain('<meta name="robots" content="noindex">');
      expect(html.match(/<h1[\s>]/g), nom).toHaveLength(1);
      expect(html, nom).toContain('Démonstrateur : contenus fictifs, aucune vente');
      expect(html, nom).toContain('aria-label="Revue des wireframes"');
    }
  });

  it('aucun <script ni URL http(s):// dans wireframes/*.html et css/wireframe.css', () => {
    const fichiers = readdirSync('wireframes').filter((f) => f.endsWith('.html')).map((f) => `wireframes/${f}`).concat('css/wireframe.css');
    for (const f of fichiers) {
      const texte = readFileSync(f, 'utf8');
      expect(texte, f).not.toMatch(/<script/i);
      expect(texte, f).not.toMatch(/https?:\/\//i);
    }
  });

  it('tous les liens relatifs de wireframes/*.html pointent vers des fichiers existants', () => {
    for (const nom of pages) {
      const cibles = [...lire(nom).matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
      for (const cible of cibles) {
        if (cible.startsWith('data:') || cible.startsWith('#')) continue;
        expect(existsSync(normalize(join('wireframes', cible.split('#')[0]))), `${nom} -> ${cible}`).toBe(true);
      }
    }
  });

  it('l\'en-tête et le pied des 13 écrans portent la navigation commune', () => {
    for (const [ecran, nom] of Object.entries(ECRANS)) {
      const html = lire(nom);
      const entete = extraire(html, 'header');
      expect(entete, nom).toContain(`data-bloc="E${ecran}-1"`);
      expect(lien(entete, 'Vendre sur la plateforme'), nom).toBe('pro.html');
      expect(lien(entete, 'Mon compte'), nom).toBe(CONNECTES.includes(Number(ecran)) ? 'compte.html' : 'connexion.html');
      expect(lien(entete, 'Panier'), nom).toBe('panier.html');
      expect(entete, nom).toContain('<li>Aléas</li>');
      expect(entete, nom).toContain('<li>Comment ça marche</li>');
      const nav = entete.slice(entete.indexOf('<nav class="wf-nav-site"'));
      const ordre = ['Aléas', 'Comment ça marche', 'Vendre sur la plateforme', 'Mon compte', 'Panier'].map((t) => nav.indexOf(t));
      expect([...ordre].sort((a, b) => a - b), nom).toEqual(ordre);
      const pied = extraire(html, 'footer');
      expect(lien(pied, 'Service après-vente'), nom).toBe('sav-acces.html');
      expect(pied, nom).toContain('Mentions légales (page prévue au lot 10)');
      expect(pied, nom).toContain('<p>À propos du démonstrateur</p>');
      expect(pied, nom).toContain('Rappel : aucune vente');
    }
  });

  it('le menu mobile est repliable sans JavaScript (case + label « Menu »)', () => {
    for (const nom of Object.values(ECRANS)) {
      const entete = extraire(lire(nom), 'header');
      const id = entete.match(/<input type="checkbox" id="([^"]+)" class="wf-menu-case">/);
      expect(id, nom).not.toBeNull();
      expect(entete, nom).toContain(`<label for="${id[1]}" class="wf-bouton wf-menu-bouton">Menu</label>`);
    }
  });
});

describe('wireframes lot 1c : pro, connexion, SAV sans compte', () => {
  it('pro.html : E5-1 à E5-6, rôles dans l\'ordre, formulaire complet', () => {
    const html = lire('pro');
    expect(attributs(html, 'bloc')).toEqual(Array.from({ length: 6 }, (_, i) => `E5-${i + 1}`));
    expect(attributs(html, 'role')).toEqual(['en-tete', 'intro', 'etapes', 'formulaire', 'confirmation', 'pied']);
    const debut = html.indexOf('data-role="formulaire"');
    const form = html.slice(debut, html.indexOf('data-role="confirmation"'));
    const champs = [...form.matchAll(/<(?:input|textarea) [^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(champs.length).toBeGreaterThanOrEqual(5);
    for (const id of champs) expect(form, id).toMatch(new RegExp(`<label for="${id}">|<label><input [^>]*id="${id}"`));
    expect(form.match(/id="alea-[^"]+"/g)).toHaveLength(4);
    expect(form.match(/id="consentement-[^"]+"/g)).toHaveLength(1);
    expect(form.match(/\[Fichier exemple\]/g)).toHaveLength(2);
    expect(form).toContain('<legend>Aléas couverts</legend>');
    expect(form).toContain('Démonstrateur : saisissez des données fictives, rien n\'est envoyé ni enregistré');
    expect(form).toContain('type="button" class="wf-bouton">Envoyer ma candidature');
    expect(html).not.toMatch(/\saction=/);
    expect(html).toContain('PRO-000');
    expect(lien(html, 'Retour à l\'accueil')).toBe('accueil.html');
  });

  it('connexion.html et sav-acces.html : codes, ordre et liens', () => {
    const connexion = lire('connexion');
    expect(attributs(connexion, 'bloc')).toEqual(Array.from({ length: 5 }, (_, i) => `E6-${i + 1}`));
    expect(attributs(connexion, 'role')).toEqual(['en-tete', 'connexion', 'demo', 'sav-sans-compte', 'pied']);
    expect(lien(connexion, 'Se connecter')).toBe('compte.html');
    expect(lien(connexion, 'Accéder au compte de démonstration')).toBe('compte.html');
    expect(lien(connexion, 'Service après-vente sans compte')).toBe('sav-acces.html');
    expect(connexion).toContain('client.demo@exemple.test');
    expect(connexion).toContain('connexion simulée');
    expect(connexion).not.toMatch(/\saction=/);

    const acces = lire('sav-acces');
    expect(attributs(acces, 'bloc')).toEqual(['E13-1', 'E13-2', 'E13-3']);
    expect(attributs(acces, 'role')).toEqual(['en-tete', 'acces', 'pied']);
    expect(lien(acces, 'Continuer')).toBe('sav.html');
    expect(lien(acces, 'J\'ai un compte : me connecter')).toBe('connexion.html');
    expect(acces).not.toMatch(/\saction=/);
  });

  it('wireframes/index.html contient un lien vers chacun des 13 écrans', () => {
    const index = lire('index');
    for (const nom of Object.values(ECRANS)) expect(index, nom).toContain(`<a href="${nom}.html">`);
  });
});
