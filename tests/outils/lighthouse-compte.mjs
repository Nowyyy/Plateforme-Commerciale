// Lighthouse mobile sur les cinq pages de l'espace client (session connectée et commande CMD-1037 en session),
// détails de lignes fermés puis ouverts pour achat.html. Utilise puppeteer-core, déjà installé avec lighthouse (aucune dépendance ajoutée).
// Usage : node tests/outils/lighthouse-compte.mjs   (performance, accessibilité, bonnes pratiques ; SEO exclu : pages noindex)
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const port = 4174;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const page = await navigateur.newPage();
await page.evaluateOnNewDocument(() => {
  sessionStorage.setItem('compte', '{"v":1,"connecte":true}');
  sessionStorage.setItem('achat', 'CMD-1037');
});
const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
for (const nom of ['connexion', 'compte', 'achats', 'achat', 'informations']) {
  await flux.navigate(`http://localhost:${port}/${nom}.html`, { name: `${nom}.html` });
  if (nom === 'achat') {
    await page.$$eval('.ligne__details', (details) => { for (const d of details) d.open = true; });
    await flux.snapshot({ name: 'achat.html, détails ouverts (instantané)' });
  }
}
const rapport = await flux.createFlowResult();
let echec = false;
for (const etape of rapport.steps) {
  const cls = etape.lhr.audits['cumulative-layout-shift']?.numericValue;
  console.log(`# ${etape.name}${cls === undefined ? '' : ` — CLS ${cls.toFixed(3)}`}`);
  for (const [id, c] of Object.entries(etape.lhr.categories)) {
    if (id === 'performance' && etape.lhr.gatherMode !== 'navigation') continue;
    const score = Math.round(c.score * 100);
    const ok = score >= seuils[id];
    if (!ok) echec = true;
    console.log(`${ok ? 'ok ' : 'KO '} ${id}: ${score} (seuil ${seuils[id]})`);
  }
}
await navigateur.close();
serveur.close();
process.exit(echec ? 1 : 0);
