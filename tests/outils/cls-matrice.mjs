// Matrice de CLS des 14 pages Hi-Fi, de 360 à 1440 px par pas de 20, JSON retardés de 400 ms, sessions et services simulés.
// Usage : node tests/outils/cls-matrice.mjs [--json=fichier] [--largeurs=360,600,...] [page ...]   (serveur local propre, port 4179)
// Sortie : tableau Markdown (CLS maximal par page et largeur du pire cas) ; seuil 0,1, objectif 0,08 (jamais modifiés).
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { demarrer } from './serveur.mjs';
import { LARGEURS_CLS, PAGES, attendreEtatNominal, preparerPage } from './etats-pages.mjs';

export async function mesurerClsPage(navigateur, etat, largeurs, base, delaiJson = 400) {
  let pire = { cls: 0, largeur: largeurs[0] };
  for (const largeur of largeurs) {
    const contexte = await navigateur.newContext({ baseURL: base, viewport: { width: largeur, height: 900 } });
    const page = await contexte.newPage();
    await preparerPage(page, etat, { delaiJson });
    await page.addInitScript(() => {
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => {
        for (const entree of liste.getEntries()) if (!entree.hadRecentInput) globalThis.__cls += entree.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/${etat.fichier}`);
    await attendreEtatNominal(page, etat);
    await page.waitForTimeout(700);
    const cls = await page.evaluate(() => globalThis.__cls);
    if (cls > pire.cls) pire = { cls, largeur };
    await contexte.close();
  }
  return { page: etat.fichier, cls: Number(pire.cls.toFixed(3)), largeur: pire.largeur };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
  const filtre = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const largeurs = options.largeurs ? options.largeurs.split(',').map(Number) : LARGEURS_CLS;
  const serveur = await demarrer(4179);
  const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
  const resultats = [];
  for (const etat of PAGES.filter((p) => filtre.length === 0 || filtre.includes(p.nom))) {
    resultats.push(await mesurerClsPage(navigateur, etat, largeurs, 'http://localhost:4179'));
  }
  await navigateur.close();
  serveur.close();
  console.log(`CLS maximal, ${largeurs.length} largeurs (${largeurs[0]} à ${largeurs.at(-1)} px), JSON retardés de 400 ms.`);
  console.log('| Page | CLS maximal | Largeur du pire cas |\n|---|---|---|');
  for (const r of resultats) console.log(`| ${r.page} | ${r.cls}${r.cls > 0.1 ? ' KO' : r.cls > 0.08 ? ' (> objectif)' : ''} | ${r.largeur} px |`);
  if (options.json) writeFileSync(options.json, `${JSON.stringify(resultats, null, 2)}\n`);
}
