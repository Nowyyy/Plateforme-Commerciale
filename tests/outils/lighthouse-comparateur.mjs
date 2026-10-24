// Lighthouse mobile sur le comparateur (aléa par défaut, trois produits) et le diagnostic (SEO exclu : pages noindex), puis relevé des autres pages Hi-Fi.
// Utilise puppeteer-core, déjà installé avec lighthouse (aucune dépendance ajoutée).
// Usage : node tests/outils/lighthouse-comparateur.mjs [releve]   (sans argument : pages du lot, seuils appliqués ; « releve » : autres pages, sans seuil)
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const COMPTE = { compte: '{"v":1,"connecte":true}', achat: 'CMD-1037' };
const TROIS = JSON.stringify({ v: 1, alea: 'inondations', produits: ['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage'] });
const LOT = [
  { nom: 'comparateur.html (aléa par défaut, 3 produits)', page: 'comparateur.html', session: { comparaison: TROIS } },
  { nom: 'diagnostic.html', session: {} },
];
const AUTRES = ['index', 'produit', 'panier', 'pro', 'connexion', 'compte', 'achats', 'achat', 'informations', 'sav-acces', 'sav', 'demandes']
  .map((nom) => ({ nom: `${nom}.html`, session: ['compte', 'achats', 'achat', 'informations', 'sav', 'demandes'].includes(nom) ? COMPTE : {} }));
const tous = process.argv[2] === 'releve' ? AUTRES : LOT;
const cas = process.env.FILTRE ? tous.filter((c) => c.nom.startsWith(process.env.FILTRE)) : tous; // FILTRE=diagnostic : une seule page (comparaison avec main)
const appliquerSeuils = process.argv[2] !== 'releve';

const port = 4175;
const serveur = await demarrer(port);
const navigateur = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
let echec = false;
for (const { nom, page: fichier, session } of cas) {
  const page = await navigateur.newPage();
  await page.evaluateOnNewDocument((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  const categories = ['performance', 'accessibility', 'best-practices'];
  const flux = await startFlow(page, { config: { extends: 'lighthouse:default', settings: { onlyCategories: categories, disableStorageReset: true } } });
  await flux.navigate(`http://localhost:${port}/${fichier ?? nom}`, { name: nom });
  const rapport = await flux.createFlowResult();
  for (const etape of rapport.steps) {
    const cls = etape.lhr.audits['cumulative-layout-shift']?.numericValue;
    const scores = Object.entries(etape.lhr.categories).map(([id, c]) => {
      const score = Math.round(c.score * 100);
      if (appliquerSeuils && score < seuils[id]) echec = true;
      return `${id} ${score}${appliquerSeuils ? (score >= seuils[id] ? ' ok' : ' KO') : ''}`;
    });
    console.log(`# ${etape.name} — CLS ${cls.toFixed(3)} — ${scores.join(', ')}`);
  }
  await page.close();
}
await navigateur.close();
serveur.close();
process.exit(echec ? 1 : 0);
