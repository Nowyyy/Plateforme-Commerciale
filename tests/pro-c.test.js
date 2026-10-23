import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resoudre } from '../assets/js/rendu.js';

const lire = (chemin) => readFileSync(chemin, 'utf8');
const pro = JSON.parse(lire('data/pro.json'));
const site = JSON.parse(lire('data/site.json'));
const html = lire('pro.html');
const confirmation = html.slice(html.indexOf('<section class="conteneur pro__bloc" data-bloc="E5-5"'), html.indexOf('</section>', html.indexOf('data-bloc="E5-5"')));

const feuilles = (valeur, chemin = 'pro') => {
  if (typeof valeur === 'string') return [[chemin, valeur]];
  if (Array.isArray(valeur)) return valeur.flatMap((x, i) => feuilles(x, `${chemin}[${i}]`));
  if (valeur !== null && typeof valeur === 'object') return Object.entries(valeur).flatMap(([cle, x]) => feuilles(x, `${chemin}.${cle}`));
  return [];
};

describe('lot 8b-C : données et confirmation', () => {
  it('tous les textes de data/pro.json sont non vides, confirmation comprise ; les textes d\'exemple contiennent « exemple »', () => {
    const textes = feuilles(pro);
    expect(textes.length).toBeGreaterThan(50);
    for (const [cle, texte] of textes) expect(texte.trim().length, cle).toBeGreaterThan(0);
    const c = pro.confirmation;
    expect(Object.keys(c).sort()).toEqual(['aucune', 'autre', 'delai', 'numero', 'prochaines', 'retour', 'titre']);
    expect(c.prochaines).toHaveLength(3);
    expect(c.titre).toBe('Candidature reçue (exemple)');
    expect(c.numero).toBe('Numéro : PRO-000 (exemple)');
    expect(c.delai).toBe('Réponse sous 5 jours ouvrés (exemple).');
    expect(c.aucune).toBe("Aucune donnée n'a été envoyée ni enregistrée.");
    expect(c.autre).toBe('Déposer une autre candidature');
    for (const texte of [c.titre, c.numero, c.delai, ...pro.formulaire.champs.certifications.emplacements]) expect(texte).toContain('exemple');
  });

  it('la section confirmation est un role=status focalisable, avec le lien d\'accueil et le bouton « Déposer une autre candidature », sans champ', () => {
    expect(confirmation).toMatch(/role="status" tabindex="-1"/);
    expect(confirmation).toContain('data-lien="site.liens.accueil"');
    expect(resoudre({ site }, 'site.liens.accueil')).toBe('index.html');
    expect(confirmation).toMatch(/<button type="button"[^>]*data-texte="pro\.confirmation\.autre"/);
    expect(confirmation).not.toMatch(/<(output|input|textarea|form)\b/);
    expect(confirmation).toMatch(/\bhidden>/);
    expect(confirmation).toContain('<template data-liste="confirmation.prochaines">');
  });

  it('css/pro.css sans valeur hexadécimale ; la confirmation n\'affiche aucune clé de saisie', () => {
    expect(lire('css/pro.css')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const cle of ['societe', 'siret', 'prenom', 'nom', 'email', 'telephone', 'description', 'message']) {
      expect(confirmation, cle).not.toContain(`pro.formulaire.champs.${cle}`);
    }
  });
});
