// Lot 10c-B : catégorie « Protection de la personne » dans la liste des aléas couverts de pro.html.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RAISONS, valider } from '../assets/js/pro-logique.js';
import { idsAleas } from '../assets/js/pro.js';

const lire = (f) => readFileSync(f, 'utf8');
const pro = JSON.parse(lire('data/pro.json'));
const accueil = JSON.parse(lire('data/accueil.json'));
const html = lire('pro.html');
const css = lire('css/pro.css');
const IDS = pro.aleas.map((a) => a.id);
const PARFAITE = { societe: 'Société Exemple', siret: '000 000 000 00000', prenom: 'Claire', nom: 'Exemple', email: 'claire@exemple.fr', telephone: '', aleas: ['inondations'], description: 'Des batardeaux modulables (exemple).', message: '', consentement: true };
const v = (aleas) => valider({ ...PARFAITE, aleas }, pro.limites, IDS);
const raisonAleas = (aleas) => v(aleas).erreurs.find((e) => e.champ === 'aleas')?.raison ?? null;
const parties = (liste) => liste.reduce((acc, x) => [...acc, ...acc.map((p) => [...p, x])], [[]]).filter((p) => p.length > 0);

describe('data/pro.json : liste des aléas', () => {
  it('cinq éléments, le cinquième protection-personne, identifiants uniques, quatre premiers égaux à ceux de l\'accueil', () => {
    expect(pro.aleas).toHaveLength(5);
    expect(pro.aleas[4].id).toBe('protection-personne');
    expect(pro.aleas[4].titre).toContain('Protection de la personne');
    expect(pro.aleas[4].titre).toBe('Protection de la personne (froid, chaleur, chutes)');
    expect(new Set(IDS).size).toBe(5);
    expect(pro.aleas.slice(0, 4)).toEqual(accueil.aleas.liste.map(({ id, titre }) => ({ id, titre })));
    expect(accueil.aleas.liste.some((a) => a.id === 'protection-personne')).toBe(false); // hors périmètre : pas ailleurs
  });
  it('les identifiants valides viennent des données (idsAleas), sans liste en dur', () => {
    expect(idsAleas({ pro })).toEqual(IDS);
    expect(lire('assets/js/pro-logique.js')).not.toContain('protection-personne');
    expect(lire('assets/js/pro.js')).not.toMatch(/'protection-personne'|"protection-personne"/);
  });
});

describe('valider : champ aleas', () => {
  it('protection-personne seule est acceptée ; une valeur inconnue est refusée ; aucune case est vide', () => {
    expect(raisonAleas(['protection-personne'])).toBeNull();
    expect(v(['protection-personne']).ok).toBe(true);
    expect(raisonAleas(['inconnue'])).toBe('invalide');
    expect(raisonAleas(['protection-personne', 'inconnue'])).toBe('invalide');
    expect(raisonAleas(['Protection-Personne'])).toBe('invalide');
    expect(raisonAleas([])).toBe('vide');
    expect(raisonAleas(undefined)).toBe('vide');
  });
  it('toutes les parties non vides des cinq valeurs sont acceptées ; idempotence ; aucune exception', () => {
    const toutes = parties(IDS);
    expect(toutes).toHaveLength(31);
    for (const p of toutes) {
      const r = v(p);
      expect(r.ok, p.join()).toBe(true);
      expect(valider({ ...PARFAITE, aleas: p }, pro.limites, IDS)).toEqual(r);
    }
    for (const x of [null, 3, 'x', {}, [null], [3, {}], [['protection-personne']]]) expect(() => v(x)).not.toThrow();
    expect(RAISONS.aleas).toEqual(['vide', 'invalide']);
  });
});

describe('textes adaptés', () => {
  it('légende du groupe, aide et message vide mentionnent la catégorie ; tous les textes non vides', () => {
    expect(pro.formulaire.champs.aleas.libelle).toBe('Aléas et catégories couverts');
    expect(pro.formulaire.champs.aleas.aide).toBe('Cochez au moins une case.');
    expect(pro.messages.aleas.vide).toBe('Choisissez au moins un aléa ou une catégorie.');
    expect(pro.messages.aleas.invalide).toContain('aléas sélectionnés');
    for (const t of [pro.formulaire.champs.aleas.libelle, pro.formulaire.champs.aleas.aide, ...Object.values(pro.messages.aleas), ...pro.aleas.map((a) => a.titre)]) expect(t.trim()).not.toBe('');
    for (const raison of RAISONS.aleas) expect(pro.messages.aleas[raison], raison).toBeTruthy();
  });
});

describe('pro.html et pro.css', () => {
  it('cases générées par gabarit : un seul modèle, aucun HTML en dur pour la nouvelle case, aucun name, un label par contrôle, aucun id dupliqué', () => {
    expect(html.match(/<template data-liste="aleas">/g)).toHaveLength(1);
    expect(html).not.toMatch(/protection-personne|Protection de la personne/);
    expect(html).not.toMatch(/<(input|textarea|select)\b[^>]*\sname=/);
    const gabarit = html.slice(html.indexOf('<template data-liste="aleas">'), html.indexOf('</template>', html.indexOf('<template data-liste="aleas">')));
    expect(gabarit).toMatch(/<label class="formulaire__case"><input type="checkbox"/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(html).toMatch(/<fieldset[^>]*id="aleas"[^>]*>\s*<legend/);
  });
  it('CSS : aucune valeur hexadécimale ; réserve de hauteur recalculée pour cinq cases (mesure de 360 à 1440 px)', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const reserves = [...css.matchAll(/html:not\(\[data-formulaire\]\) \.pro__carte--formulaire \{\s*min-block-size: ([\d.]+)rem;/g)].map((m) => Number(m[1]));
    expect(reserves).toEqual([142.5, 141.11, 139.71, 138.31, 137.86, 137.41, 135.81, 133.01, 103.76, 102.36]);
    expect(reserves).toEqual([...reserves].sort((a, b) => b - a)); // décroissante avec la largeur
    expect(css).toContain('cinq cases');
  });
  it('la confirmation ne reprend aucune saisie : aucun gabarit de texte saisi, aucune requête ni stockage dans pro.js', () => {
    const js = lire('assets/js/pro.js');
    expect(js).not.toMatch(/fetch\(|sendBeacon|sessionStorage|localStorage|indexedDB|document\.cookie/);
    const confirmation = html.slice(html.indexOf('data-role="confirmation"'));
    expect(confirmation).not.toMatch(/\{(societe|siret|prenom|nom|email|aleas)\}/);
  });
});
