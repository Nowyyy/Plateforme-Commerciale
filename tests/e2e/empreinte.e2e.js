// Empreinte de mise en page : l'état courant des 14 pages Hi-Fi (375, 768 et 1440 px) égale tests/empreintes/*.json, à 1 px près.
// Régénération : `npm run empreinte:maj` (seulement pour un écart voulu, justifié dans le bilan).
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { mesurerEmpreinte } from '../outils/empreinte.mjs';
import { LARGEURS_EMPREINTE, PAGES, preparerPage } from '../outils/etats-pages.mjs';

const TOLERANCE = 1;

for (const etat of PAGES) {
  test(`empreinte de ${etat.fichier} : 375, 768 et 1440 px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparerPage(page, etat);
    const attendue = JSON.parse(readFileSync(`tests/empreintes/${etat.nom}.json`, 'utf8'));
    for (const largeur of LARGEURS_EMPREINTE) {
      // une première mesure sert de chargement ; la mise en page doit être stable avant la comparaison
      await expect.poll(async () => {
        const mesuree = await mesurerEmpreinte(page, etat, largeur);
        const ecarts = [];
        const cles = new Set([...Object.keys(mesuree), ...Object.keys(attendue.largeurs[largeur])]);
        for (const cle of cles) {
          const a = attendue.largeurs[largeur][cle];
          const m = mesuree[cle];
          if (!a || !m || a.some((v, i) => Math.abs(v - m[i]) > TOLERANCE)) ecarts.push(`${cle} : attendu ${JSON.stringify(a)}, mesuré ${JSON.stringify(m)}`);
        }
        return ecarts;
      }, { message: `${etat.fichier} à ${largeur} px`, timeout: 15000, intervals: [500] }).toEqual([]);
    }
  });
}
