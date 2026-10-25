// Couverture CSS (candidats de code mort) : règles jamais appliquées sur les 14 pages, 6 largeurs, état nominal. Candidats seulement : états, survol et erreurs ne sont pas parcourus.
// Usage : node tests/outils/couverture-css.mjs fichier.json   (serveur local sur le port 4173 requis)
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { PAGES, preparerPage, attendreEtatNominal } from './etats-pages.mjs';
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const plages = {}; // fichier css -> Set d'indices utilisés
const textes = {};
for (const etat of PAGES) for (const l of [320, 375, 768, 1024, 1200, 1440]) {
  const ctx = await nav.newContext({ baseURL: 'http://localhost:4173', viewport: { width: l, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await preparerPage(page, etat);
  await page.coverage.startCSSCoverage();
  await page.goto('/' + etat.fichier);
  await attendreEtatNominal(page, etat);
  const cov = await page.coverage.stopCSSCoverage();
  for (const c of cov) {
    const f = new URL(c.url).pathname;
    if (!f.startsWith('/css/')) continue;
    textes[f] = c.text; plages[f] ??= new Uint8Array(c.text.length);
    for (const r of c.ranges) plages[f].fill(1, r.start, r.end);
  }
  await ctx.close();
}
await nav.close();
const sortie = {};
for (const [f, t] of Object.entries(textes)) {
  // découpe en règles de premier niveau et imbriquées (approximation): ligne par ligne contenant "{"
  const morts = [];
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(t))) {
    const corps = m.index + m[1].length + 1;
    const utilise = plages[f].slice(corps, corps + m[2].length).some((v) => v === 1) || plages[f].slice(m.index, m.index + m[1].length).some((v) => v === 1);
    if (!utilise && !/^@/.test(m[1].trim())) morts.push(m[1].trim().replace(/\s+/g, ' ').slice(0, 140));
  }
  sortie[f] = morts;
}
writeFileSync(process.argv[2], JSON.stringify(sortie, null, 1));
for (const [f, m] of Object.entries(sortie)) console.log(f, m.length);
