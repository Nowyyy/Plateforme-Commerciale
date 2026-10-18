import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// CLS de la fiche de 360 à 1440 px, JSON retardés de 400 ms : dix produits dans les deux modes (titre le plus long, réserves de achat et mode),
// puis le batardeau avec des cotes mémorisées (états à saisir et compatible).
const LARGEURS = [360, 375, 390, 414, 600, 768, 900, 1024, 1199, 1200, 1280, 1440];
const { produits } = JSON.parse(readFileSync('data/produit.json', 'utf8'));

async function verifier(page, session, etiquette) {
  await page.route('**/data/*.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
    window.__cls = 0;
    new PerformanceObserver((liste) => {
      for (const e of liste.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  }, session);
  if (process.env.SANS_CONFIGURATEUR) {
    // mesure des seuls blocs de la zone haute (page de la fiche sans E3-5), pour comparer les réserves avec le bilan du lot 5
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '.configurateur { display: none; }';
      document.head.append(style);
    }));
  }
  const mesures = [];
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    mesures.push([largeur, await page.evaluate(() => window.__cls)]);
  }
  const pire = mesures.reduce((a, b) => (b[1] > a[1] ? b : a));
  console.log(`CLS ${etiquette} : maximum ${pire[1].toFixed(3)} à ${pire[0]} px`);
  expect(pire[1], `${etiquette} à ${pire[0]} px`).toBeLessThanOrEqual(0.1);
}

for (const { id } of produits) {
  for (const mode of ['diy', 'pose']) {
    test(`CLS ${id}, mode ${mode} : au plus 0,1 de 360 à 1440 px (JSON retardés de 400 ms)`, async ({ page }) => {
      await verifier(page, { produit: id, mode }, `${id} ${mode}`);
    });
  }
}

test('CLS du batardeau avec des cotes mémorisées (état compatible) : au plus 0,1 de 360 à 1440 px', async ({ page }) => {
  const cotes = JSON.stringify({ produit: 'batardeau-modulable', largeur: '1200', hauteur: '400', tolerance: '10' });
  await verifier(page, { produit: 'batardeau-modulable', mode: 'pose', cotes }, 'batardeau compatible');
});
