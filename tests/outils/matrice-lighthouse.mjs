// Matrice Lighthouse mobile des 14 pages Hi-Fi : médianes de 3 passes (performance, accessibilité, bonnes pratiques), CLS,
// poids de transfert et nombre de requêtes, sessions et services tiers simulés (aucune requête réelle ; jamais un score réel).
// SEO exclu : pages noindex. Seuils : seuils-lighthouse.json (jamais modifiés).
// Usage : node tests/outils/matrice-lighthouse.mjs [--passes=3] [--json=fichier] [page ...]   (sortie : tableau Markdown)
// Utilise puppeteer-core, déjà installé avec lighthouse (aucune dépendance ajoutée).
import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';
import { PAGES, REPONSES_SIMULEES } from './etats-pages.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const options = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const filtre = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const passes = Number(options.passes ?? 3);
const ENTETE = { 'access-control-allow-origin': '*' };

const mediane = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

// Simulation des services tiers pour puppeteer : mêmes réponses que les tests Playwright.
function simuler(page) {
  return page.setRequestInterception(true).then(() => page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname === 'localhost' || u.protocol === 'data:') return r.continue();
    const json = (body) => r.respond({ status: 200, contentType: 'application/json', headers: ENTETE, body });
    if (u.hostname === 'data.geopf.fr' && u.pathname.startsWith('/geocodage/completion')) return json(REPONSES_SIMULEES.completion);
    if (u.hostname === 'data.geopf.fr' && u.pathname.startsWith('/geocodage/')) return json(REPONSES_SIMULEES.geocodage);
    if (u.hostname === 'www.georisques.gouv.fr' && u.pathname.startsWith('/api/v1/gaspar')) return json(REPONSES_SIMULEES.gaspar);
    if (u.hostname === 'www.georisques.gouv.fr' && u.pathname.startsWith('/api/v1/rga')) return json(REPONSES_SIMULEES.rga);
    if (['tile.openstreetmap.org', 'data.geopf.fr', 'www.georisques.gouv.fr'].includes(u.hostname)) return r.respond({ status: 200, contentType: 'image/png', headers: ENTETE, body: REPONSES_SIMULEES.png });
    return r.abort();
  }));
}

const port = 4178;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
const resultats = [];
for (const etat of PAGES.filter((p) => filtre.length === 0 || filtre.includes(p.nom))) {
  const m = { performance: [], accessibility: [], 'best-practices': [], cls: [], octets: [], requetes: [] };
  for (let i = 0; i < passes; i += 1) {
    const page = await navigateur.newPage();
    await page.evaluateOnNewDocument((valeurs) => {
      for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
    }, etat.session);
    await simuler(page);
    const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices'], disableStorageReset: true } } });
    await flux.navigate(`http://localhost:${port}/${etat.fichier}`, { name: etat.fichier });
    const { steps } = await flux.createFlowResult();
    const lhr = steps[0].lhr;
    for (const id of ['performance', 'accessibility', 'best-practices']) m[id].push(Math.round(lhr.categories[id].score * 100));
    m.cls.push(lhr.audits['cumulative-layout-shift'].numericValue);
    m.octets.push(lhr.audits['total-byte-weight'].numericValue);
    m.requetes.push(lhr.audits['network-requests'].details.items.length);
    await page.close();
  }
  resultats.push({
    page: etat.fichier,
    performance: mediane(m.performance), accessibilite: mediane(m.accessibility), bonnesPratiques: mediane(m['best-practices']),
    cls: Number(mediane(m.cls).toFixed(3)), transfertKo: Math.round(mediane(m.octets) / 1024), requetes: mediane(m.requetes),
    passes: m.performance,
  });
}
await navigateur.close();
serveur.close();

const marque = (score, seuil) => `${score}${score >= seuil ? '' : ' KO'}`;
console.log(`Matrice Lighthouse mobile, médiane de ${passes} passes, services tiers simulés (SEO exclu : pages noindex).`);
console.log('| Page | Performance | Accessibilité | Bonnes pratiques | CLS | Transfert (Ko) | Requêtes |');
console.log('|---|---|---|---|---|---|---|');
for (const r of resultats) {
  console.log(`| ${r.page} | ${marque(r.performance, seuils.performance)} | ${marque(r.accessibilite, seuils.accessibility)} | ${marque(r.bonnesPratiques, seuils['best-practices'])} | ${r.cls}${r.cls > 0.1 ? ' KO' : ''} | ${r.transfertKo} | ${r.requetes} |`);
}
if (options.json) writeFileSync(options.json, `${JSON.stringify(resultats, null, 2)}\n`);
process.exit(resultats.some((r) => r.performance < seuils.performance || r.accessibilite < seuils.accessibility || r.bonnesPratiques < seuils['best-practices'] || r.cls > 0.1) ? 1 : 0);
