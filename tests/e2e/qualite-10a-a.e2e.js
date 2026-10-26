// Lot 10a-A : matrice de CLS (script exécutable, résultats consignés dans test-results/cls-matrice.json), console propre et aucune
// requête externe hors règle de confidentialité, sur les 14 pages Hi-Fi à 375, 768 et 1440 px dans leur état nominal.
import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { mesurerClsPage } from '../outils/cls-matrice.mjs';
import { mesurerPage } from '../outils/mesures-pages.mjs';
import { LARGEURS_CLS, PAGES } from '../outils/etats-pages.mjs';

const BASE = 'http://localhost:4173';
// Requêtes tierces autorisées : seulement celles de la carte réelle et de la saisie d'adresse (Docs/ref/conventions/diagnostic.md).
const HOTES_AUTORISES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const LARGEURS_ECHANTILLON = [360, 600, 1024, 1440]; // la matrice complète (55 largeurs) : node tests/outils/cls-matrice.mjs

test('la matrice de CLS couvre 55 largeurs de 360 à 1440 px par pas de 20', () => {
  expect(LARGEURS_CLS).toHaveLength(55);
  expect(LARGEURS_CLS[0]).toBe(360);
  expect(LARGEURS_CLS.at(-1)).toBe(1440);
  expect(LARGEURS_CLS.every((l, i) => i === 0 || l - LARGEURS_CLS[i - 1] === 20)).toBe(true);
});

for (const etat of PAGES) {
  test(`${etat.fichier} : CLS mesuré (JSON retardés de 400 ms, ${LARGEURS_ECHANTILLON.join('/')} px), résultat consigné`, async ({ browser }) => {
    test.setTimeout(120000);
    const resultat = await mesurerClsPage(browser, etat, LARGEURS_ECHANTILLON, BASE);
    mkdirSync('test-results/cls-matrice', { recursive: true });
    writeFileSync(`test-results/cls-matrice/${etat.nom}.json`, `${JSON.stringify(resultat)}\n`);
    expect(resultat.cls).toBeGreaterThanOrEqual(0);
    expect(resultat.cls).toBeLessThan(1);
    console.log(`${etat.fichier} : CLS maximal ${resultat.cls} à ${resultat.largeur} px`);
  });

  test(`${etat.fichier} : console propre et aucune requête externe hors carte et saisie d'adresse (375, 768 et 1440 px)`, async ({ browser }) => {
    for (const largeur of [375, 768, 1440]) {
      const m = await mesurerPage(browser, etat, largeur, BASE);
      expect(m.messages, `${etat.fichier} à ${largeur} px`).toEqual([]);
      for (const hote of m.externes) expect(HOTES_AUTORISES, `${etat.fichier} à ${largeur} px : ${hote}`).toContain(hote);
      if (etat.nom !== 'diagnostic') expect(m.externes, `${etat.fichier} à ${largeur} px`).toEqual([]);
    }
  });
}
