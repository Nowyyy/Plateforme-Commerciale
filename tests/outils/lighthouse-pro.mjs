// Lighthouse mobile sur pro.html : formulaire vide (navigation), récapitulatif d'erreurs puis confirmation (instantanés).
// Utilise puppeteer-core, déjà installé comme dépendance de lighthouse (aucune dépendance ajoutée).
// Usage : node tests/outils/lighthouse-pro.mjs   (performance, accessibilité, bonnes pratiques ; SEO exclu : page noindex)
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const port = 4174;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'],
});
const page = await navigateur.newPage();
const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
await flux.navigate(`http://localhost:${port}/pro.html`, { name: 'pro, formulaire vide' });
await page.click('button[type="submit"]');
await flux.snapshot({ name: 'pro, récapitulatif d\'erreurs affiché (instantané)' });
await page.type('#societe', 'Société Exemple');
await page.type('#siret', '000 000 000 00000');
await page.type('#contact', 'Claire Exemple');
await page.type('#email', 'claire@exemple.fr');
await page.click('#aleas input');
await page.type('#description', 'Des batardeaux modulables (exemple).');
await page.click('#consentement');
await page.click('button[type="submit"]');
await page.waitForSelector('[data-role="confirmation"]:not([hidden])');
await flux.snapshot({ name: 'pro, confirmation affichée (instantané)' });
const rapport = await flux.createFlowResult();
let echec = false;
for (const etape of rapport.steps) {
  const cls = etape.lhr.audits['cumulative-layout-shift']?.numericValue;
  console.log(`# ${etape.name}${cls === undefined ? '' : ` — CLS ${cls.toFixed(3)}`}`);
  for (const [id, categorie] of Object.entries(etape.lhr.categories)) {
    if (id === 'performance' && etape.lhr.gatherMode !== 'navigation') continue; // un instantané ne mesure pas la performance
    const score = Math.round(categorie.score * 100);
    const ok = score >= seuils[id];
    if (!ok) echec = true;
    console.log(`${ok ? 'ok ' : 'KO '} ${id}: ${score} (seuil ${seuils[id]})`);
  }
}
await navigateur.close();
serveur.close();
process.exit(echec ? 1 : 0);
