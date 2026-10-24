import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { etapesDemande } from '../assets/js/sav-logique.js';
import { construireEtapes } from '../assets/js/demandes.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const html = lire('demandes.html');
const compte = JSON.parse(lire('data/compte.json'));
const site = JSON.parse(lire('data/site.json'));

describe('lot 8d-C : markup de demandes.html', () => {
  it('navigation du compte, fieldset de 5 radios (gabarit + données), gabarit de ligne avec liste d\'étapes, aucun lien dans la ligne, aucun id dupliqué', () => {
    expect(html).toMatch(/<nav class="nav-compte" data-aria-label="compte\.navigationCompte\.aria">/);
    expect(compte.navigationCompte.aria).toBe('Mon compte');
    expect(html).toMatch(/<fieldset class="achats__filtre">\s*<legend/);
    expect(html.match(/type="radio"/g)).toHaveLength(1);
    expect(compte.sav.suivi.filtres).toHaveLength(5);
    const gabarit = html.slice(html.indexOf('<template data-gabarit="carte-demande-sav">'), html.indexOf('</template>', html.indexOf('data-gabarit="carte-demande-sav"')));
    expect(gabarit).toMatch(/<ol class="sav__etapes"><\/ol>/);
    expect(gabarit).not.toMatch(/<a[\s>]|<button|href=|tabindex/);
    expect(html).toMatch(/<template data-gabarit="etape-sav">/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).not.toMatch(/bouton--action/);
  });
  it('indicateur d\'étapes : chaque état a une icône (pastille masquée aux lecteurs) et un texte masqué', () => {
    const gabarit = html.slice(html.indexOf('<template data-gabarit="etape-sav">'), html.indexOf('</template>', html.indexOf('data-gabarit="etape-sav"')));
    expect(gabarit).toContain('<span class="sav__pastille" aria-hidden="true"></span>');
    expect(gabarit).toContain('class="visuellement-cache sav__etape-etat"');
    const modele = { content: { firstElementChild: { cloneNode: () => {
      const enfants = { '.sav__etape-titre': { textContent: '' }, '.sav__etape-etat': { textContent: '' } };
      return { attributs: {}, setAttribute(k, v) { this.attributs[k] = v; }, querySelector: (s) => enfants[s], enfants };
    } } } };
    const textes = compte.sav.suivi.etapes;
    const rendu = construireEtapes(modele, etapesDemande('en-analyse', compte.statutsDemande), textes);
    expect(rendu.map((li) => li.attributs['data-etat'])).toEqual(['terminee', 'actuelle', 'a-venir', 'a-venir']);
    expect(rendu.map((li) => li.enfants['.sav__etape-etat'].textContent)).toEqual(['terminée', 'étape actuelle', 'à venir', 'à venir']);
    expect(rendu.map((li) => li.enfants['.sav__etape-titre'].textContent)).toEqual(['Reçue', 'En analyse', 'Intervention planifiée', 'Clôturée']);
    const css = lire('css/sav.css');
    for (const etat of ['terminee', 'actuelle', 'a-venir']) expect(css, etat).toContain(`.sav__etape[data-etat="${etat}"]`);
  });
});

describe('lot 8d-C : confidentialité, CSS et cohérence', () => {
  it('demandes.js et sav-acces.js : ni réseau, ni cookie, ni stockage hors compte, achat et acces-sav', () => {
    for (const m of ['demandes.js', 'sav-acces.js']) {
      const src = lire(`assets/js/${m}`).replace(/\/\/.*$/gm, '');
      expect(src, m).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie|sessionStorage|innerHTML/);
      expect(src, m).not.toMatch(/(?:getItem|setItem|removeItem)\('(?!compte'|achat'|acces-sav')/);
    }
    expect(lire('assets/js/demandes.js')).not.toMatch(/ecrire|setItem/);
  });
  it('css/sav.css sans valeur hexadécimale', () => {
    expect(lire('css/sav.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('pour les quatre demandes : une seule étape actuelle et autant d\'étapes terminées que l\'index du statut', () => {
    expect(compte.demandes).toHaveLength(4);
    for (const demande of compte.demandes) {
      const etapes = etapesDemande(demande.statut, compte.statutsDemande);
      const index = compte.statutsDemande.findIndex((s) => s.id === demande.statut);
      expect(etapes.filter((e) => e.etat === 'actuelle'), demande.id).toHaveLength(1);
      expect(etapes.filter((e) => e.etat === 'terminee'), demande.id).toHaveLength(index);
      expect(etapes.findIndex((e) => e.etat === 'actuelle'), demande.id).toBe(index);
    }
  });
  it('tous les liens.* pointent vers des fichiers existants ; plus aucun lien du site vers les wireframes SAV', () => {
    for (const [cle, lien] of Object.entries(site.liens)) {
      if (!lien.startsWith('#')) expect(existsSync(lien), cle).toBe(true);
    }
    const sources = [
      ...readdirSync('.').filter((f) => f.endsWith('.html')),
      ...readdirSync('data').map((f) => `data/${f}`),
      ...readdirSync('assets/js').map((f) => `assets/js/${f}`),
    ];
    for (const fichier of sources) {
      expect(lire(fichier), fichier).not.toMatch(/wireframes\/(sav-acces|sav|demandes)\.html/);
    }
    expect(site.pied.colonnes[1].entrees[0].lien).toBe('savAcces');
    expect(site.liens.savAcces).toBe('sav-acces.html');
  });
});
