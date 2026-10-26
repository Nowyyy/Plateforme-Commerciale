// Détail Lighthouse d'une page Hi-Fi (état nominal, services simulés) : décalages de mise en page, éléments en cause, métriques.
// Usage : node tests/outils/lighthouse-detail.mjs connexion
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';
import { PAGES } from './etats-pages.mjs';

const etat = PAGES.find((p) => p.nom === process.argv[2]);
const port = 4181;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const page = await navigateur.newPage();
await page.evaluateOnNewDocument((valeurs) => { for (const [c, v] of Object.entries(valeurs)) sessionStorage.setItem(c, v); }, etat.session);
const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance'], disableStorageReset: true } } });
await flux.navigate(`http://localhost:${port}/${etat.fichier}`);
const { steps } = await flux.createFlowResult();
const a = steps[0].lhr.audits;
for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'speed-index']) console.log(id, a[id].displayValue);
for (const id of ['layout-shifts', 'layout-shift-elements', 'render-blocking-resources', 'largest-contentful-paint-element', 'network-dependency-tree-insight', 'lcp-breakdown-insight', 'cls-culprits-insight']) {
  if (a[id]) console.log(`## ${id}\n${JSON.stringify(a[id].details?.items ?? a[id].details ?? a[id].displayValue, null, 1).slice(0, 1800)}`);
}
await navigateur.close();
serveur.close();
