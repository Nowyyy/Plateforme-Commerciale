// Lighthouse mobile sur panier.html avec trois lignes valides en session (détails fermés puis ouverts, case décochée puis cochée, par instantané).
// Utilise puppeteer-core, déjà installé comme dépendance de lighthouse (aucune dépendance ajoutée).
// Usage : node tests/outils/lighthouse-panier.mjs   (performance, accessibilité, bonnes pratiques ; SEO exclu : page noindex)
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const port = 4174;
const serveur = await demarrer(port);
const panier = JSON.stringify({
  v: 2,
  lignes: [
    { produit: 'batardeau-modulable', mode: process.argv[2] === 'pose' ? 'pose' : 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, quantite: 2 },
    { produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 900, hauteur: 350, tolerance: 10 }, quantite: 1 },
    { produit: 'clapet-anti-retour', mode: 'diy', cotes: null, quantite: 3 },
  ],
});
const navigateur = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'],
});
const page = await navigateur.newPage();
await page.evaluateOnNewDocument((brut) => { sessionStorage.setItem('panier', brut); }, panier);
const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
await flux.navigate(`http://localhost:${port}/panier.html`, { name: 'panier, 3 lignes, détails fermés' });
await flux.snapshot({ name: 'panier, détails fermés, case décochée (instantané)' });
await page.click('#recap-deplier');
await flux.snapshot({ name: 'panier, détails ouverts, case décochée' });
await page.click('#responsabilite-case');
await flux.snapshot({ name: 'panier, détails ouverts, case cochée' });
const rapport = await flux.createFlowResult();
let echec = false;
for (const etape of rapport.steps) {
  const scores = Object.entries(etape.lhr.categories).map(([id, c]) => [id, Math.round(c.score * 100)]);
  const cls = etape.lhr.audits['cumulative-layout-shift']?.numericValue;
  console.log(`# ${etape.name}${cls === undefined ? '' : ` — CLS ${cls.toFixed(3)}`}`);
  for (const [id, score] of scores) {
    if (id === 'performance' && etape.lhr.gatherMode !== 'navigation') continue; // un instantané ne mesure pas la performance
    const ok = score >= seuils[id];
    if (!ok) echec = true;
    console.log(`${ok ? 'ok ' : 'KO '} ${id}: ${score} (seuil ${seuils[id]})`);
  }
}
await navigateur.close();
serveur.close();
process.exit(echec ? 1 : 0);
