// Audits Lighthouse non réussis (toutes catégories sauf SEO) d'une page Hi-Fi dans son état nominal, services simulés.
// Usage : node tests/outils/lighthouse-audits.mjs diagnostic
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';
import { PAGES, REPONSES_SIMULEES } from './etats-pages.mjs';

const etat = PAGES.find((p) => p.nom === process.argv[2]);
const port = 4186;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const page = await navigateur.newPage();
await page.evaluateOnNewDocument((valeurs) => { for (const [c, v] of Object.entries(valeurs)) sessionStorage.setItem(c, v); }, etat.session);
await page.setRequestInterception(true);
const ENTETE = { 'access-control-allow-origin': '*' };
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.hostname === 'localhost' || u.protocol === 'data:') return r.continue();
  const json = (body) => r.respond({ status: 200, contentType: 'application/json', headers: ENTETE, body });
  if (u.pathname.startsWith('/geocodage/completion')) return json(REPONSES_SIMULEES.completion);
  if (u.pathname.startsWith('/geocodage/')) return json(REPONSES_SIMULEES.geocodage);
  if (u.pathname.startsWith('/api/v1/gaspar')) return json(REPONSES_SIMULEES.gaspar);
  if (u.pathname.startsWith('/api/v1/rga')) return json(REPONSES_SIMULEES.rga);
  return r.respond({ status: 200, contentType: 'image/png', headers: ENTETE, body: REPONSES_SIMULEES.png });
});
const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
await flux.navigate(`http://localhost:${port}/${etat.fichier}`);
const { steps } = await flux.createFlowResult();
const lhr = steps[0].lhr;
for (const [id, c] of Object.entries(lhr.categories)) {
  console.log(`## ${id} ${Math.round(c.score * 100)}`);
  for (const ref of c.auditRefs) {
    const a = lhr.audits[ref.id];
    if (a.score !== null && a.score < 1 && ref.weight > 0) console.log(`- ${ref.id} (${a.score}) ${a.title} ${a.displayValue ?? ''} ${JSON.stringify(a.details?.items?.slice(0, 3) ?? '').slice(0, 400)}`);
  }
}
await navigateur.close();
serveur.close();
