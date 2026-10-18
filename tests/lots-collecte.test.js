import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collecter } from '../scripts/lots/collecte.mjs';
import { genererTolerant } from '../scripts/lots/generer.mjs';
import { preparerLots, choisirVues } from '../scripts/lots/logique.mjs';

// Faux exécuteur de Git : fusionnes = branches ancêtres de main ; superficiel = dépôt à historique tronqué.
function faux({ branches, apercus, bilans = {}, fusionnes = [], superficiel = false }) {
  return (args) => {
    const [cmd, a1] = args;
    if (cmd === 'for-each-ref') return { code: 0, stdout: branches.map((b) => `origin/${b}`).join('\n') };
    if (cmd === 'show') {
      const [ref, chemin] = a1.split(':');
      const b = ref.replace('origin/', '');
      if (chemin === 'apercu.txt') return b in apercus ? { code: 0, stdout: apercus[b] } : { code: 128, stdout: '' };
      if (chemin === `Docs/lots/${b}.md`) return b in bilans ? { code: 0, stdout: bilans[b] } : { code: 128, stdout: '' };
    }
    if (cmd === 'merge-base') {
      const b = args[3] === 'origin/main' ? args[2].replace('origin/', '') : '';
      return { code: fusionnes.includes(b) ? 0 : 1, stdout: '' };
    }
    if (cmd === 'rev-parse') return { code: 0, stdout: superficiel ? 'true\n' : 'false\n' };
    return { code: 1, stdout: '' };
  };
}

describe('collecte avec un faux exécuteur', () => {
  it('branches mélangées : lot-0 sans apercu.txt et « autre » ignorés, fusion détectée', () => {
    const exec = faux({
      branches: ['lot-2', 'lot-1c', 'lot-0', 'autre'],
      apercus: { 'lot-2': 'accueil.html\n', 'lot-1c': 'wireframes/\n', autre: 'accueil.html' },
      bilans: { 'lot-2': '# Lot 2 — Accueil Hi-Fi\n' },
      fusionnes: ['lot-2', 'lot-1c'],
    });
    const { lots, avertissements } = preparerLots(collecter(exec));
    expect(lots.map((l) => l.id)).toEqual(['lot-1c', 'lot-2']);
    expect(lots.every((l) => l.fusionne)).toBe(true);
    expect(avertissements.some((a) => a.includes('autre'))).toBe(true);
    expect(avertissements.some((a) => a.includes('lot-0'))).toBe(false);
    const v = choisirVues(lots);
    expect(v.hifi.href).toBe('../accueil.html');
    expect(v.hifi.libelle).toBe('Lot 2 — Accueil Hi-Fi');
    expect(v.anciens).toEqual([]);
  });

  it('lot non fusionné sur un historique complet : en cours', () => {
    const exec = faux({ branches: ['lot-3'], apercus: { 'lot-3': 'accueil.html' }, fusionnes: [] });
    const { lots, avertissements } = preparerLots(collecter(exec));
    expect(lots[0].fusionne).toBe(false);
    expect(avertissements).toEqual([]);
  });

  it('historique insuffisant : lot « en cours » avec avertissement', () => {
    const exec = faux({ branches: ['lot-2'], apercus: { 'lot-2': 'accueil.html' }, fusionnes: [], superficiel: true });
    const { lots, avertissements } = preparerLots(collecter(exec));
    expect(lots[0].fusionne).toBe(false);
    expect(avertissements.join(' ')).toMatch(/lot-2 : fusion indéterminée/);
  });

  it('énumération impossible : exception (traitée par la génération tolérante)', () => {
    expect(() => collecter(() => ({ code: 128, stdout: '' }))).toThrow(/lot-\*/);
  });
});

describe('génération tolérante aux pannes', () => {
  it('échec volontaire : page de repli écrite, aucune exception', () => {
    const sortie = mkdtempSync(join(tmpdir(), 'lots-panne-'));
    const r = genererTolerant({ sortie, collecteur: () => { throw new Error('panne simulée'); } });
    expect(r.ok).toBe(false);
    expect(r.erreur).toBe('panne simulée');
    const html = readFileSync(join(sortie, 'lots/index.html'), 'utf8');
    expect(html).toContain('Liste des lots indisponible pour le moment.');
    expect(html).toContain('noindex');
    expect(existsSync(join(sortie, 'apercus/index.html'))).toBe(true);
  });

  it('en ligne de commande : code de sortie 0 et page de repli, hors dépôt Git', () => {
    const sortie = mkdtempSync(join(tmpdir(), 'lots-cli-'));
    const horsDepot = mkdtempSync(join(tmpdir(), 'hors-depot-'));
    const script = join(process.cwd(), 'scripts/lots/generer.mjs');
    const r = spawnSync('node', [script, sortie, '--git'], { cwd: horsDepot, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stderr).toContain('::warning::');
    expect(readFileSync(join(sortie, 'lots/index.html'), 'utf8')).toContain('Liste des lots indisponible');
  });
});
