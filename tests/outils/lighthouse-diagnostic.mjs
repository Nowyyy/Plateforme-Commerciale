// Lighthouse mobile sur le diagnostic avec une adresse de session et des services tiers simulés (aucune requête réelle), SEO exclu (page noindex).
// Sert à comparer deux versions du site : médianes de performance, accessibilité, bonnes pratiques, CLS et poids de transfert.
// Usage : node tests/outils/lighthouse-diagnostic.mjs [racine] [passes] [page]   (racine : dossier du site, défaut « . » ; page : diagnostic.html ou index.html)
// Utilise puppeteer-core, déjà installé avec lighthouse (aucune dépendance ajoutée).
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';

const racine = process.argv[2] ?? '.';
const passes = Number(process.argv[3] ?? 5);
const fichier = process.argv[4] ?? 'diagnostic.html';
const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const JSON_TETE = { 'access-control-allow-origin': '*' };
const geocode = JSON.stringify({ features: [{ geometry: { coordinates: [4.8357, 45.764] }, properties: { label: ADRESSE, score: 0.92, type: 'housenumber' } }] });
const completion = JSON.stringify({ results: [{ fulltext: ADRESSE, x: 4.8357, y: 45.764 }] });
const gaspar = JSON.stringify({ data: [{ risques_detail: [{ libelle_risque_long: 'Inondation' }] }] });
const rga = JSON.stringify({ exposition: 'Exposition moyenne', codeExposition: '2' });

const port = 4176;
const serveur = await demarrer(port, racine === '.' ? process.cwd() : racine);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const mesures = { performance: [], accessibility: [], 'best-practices': [], cls: [], octets: [] };

for (let i = 0; i < passes; i += 1) {
  const page = await navigateur.newPage();
  await page.evaluateOnNewDocument((a) => sessionStorage.setItem('adresse', a), ADRESSE);
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname === 'localhost') return r.continue();
    if (u.hostname === 'data.geopf.fr' && u.pathname.startsWith('/geocodage/completion')) return r.respond({ status: 200, contentType: 'application/json', headers: JSON_TETE, body: completion });
    if (u.hostname === 'data.geopf.fr' && u.pathname.startsWith('/geocodage/')) return r.respond({ status: 200, contentType: 'application/json', headers: JSON_TETE, body: geocode });
    if (u.hostname === 'www.georisques.gouv.fr' && u.pathname.startsWith('/api/v1/gaspar')) return r.respond({ status: 200, contentType: 'application/json', headers: JSON_TETE, body: gaspar });
    if (u.hostname === 'www.georisques.gouv.fr' && u.pathname.startsWith('/api/v1/rga')) return r.respond({ status: 200, contentType: 'application/json', headers: JSON_TETE, body: rga });
    if (['tile.openstreetmap.org', 'data.geopf.fr', 'www.georisques.gouv.fr'].includes(u.hostname)) return r.respond({ status: 200, contentType: 'image/png', headers: JSON_TETE, body: PNG });
    return r.abort();
  });
  const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
  await flux.navigate(`http://localhost:${port}/${fichier}`, { name: fichier });
  const { steps } = await flux.createFlowResult();
  const lhr = steps[0].lhr;
  for (const id of ['performance', 'accessibility', 'best-practices']) mesures[id].push(Math.round(lhr.categories[id].score * 100));
  mesures.cls.push(lhr.audits['cumulative-layout-shift'].numericValue);
  mesures.octets.push(lhr.audits['total-byte-weight'].numericValue);
  await page.close();
}
await navigateur.close();
serveur.close();
console.log(`# ${fichier} (${racine}, ${passes} passes) : performance ${mesures.performance.join('/')} (médiane ${mediane(mesures.performance)}), accessibilité ${mediane(mesures.accessibility)}, bonnes pratiques ${mediane(mesures['best-practices'])}, CLS ${mediane(mesures.cls).toFixed(3)}, transfert ${(mediane(mesures.octets) / 1024).toFixed(0)} Ko`);
