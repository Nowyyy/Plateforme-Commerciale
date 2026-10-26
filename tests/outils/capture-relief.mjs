// Captures du relief (zone du groupe visible) d'une page à une largeur, pour comparer deux versions du site.
// Usage : node tests/outils/capture-relief.mjs <racine> <page> <largeur> <fichier.png>
import { chromium } from '@playwright/test';
import { demarrer } from './serveur.mjs';
import { PAGES, attendreEtatNominal, preparerPage } from './etats-pages.mjs';
import { mesurerReliefDansLaPage } from './relief.mjs';

const [racine, nom, largeur, fichier] = process.argv.slice(2);
const etat = PAGES.find((p) => p.nom === nom);
const serveur = await demarrer(4187, racine);
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
const contexte = await navigateur.newContext({ baseURL: 'http://localhost:4187', viewport: { width: Number(largeur), height: 900 }, reducedMotion: 'reduce' });
const page = await contexte.newPage();
await preparerPage(page, etat);
await page.goto(`/${etat.fichier}`);
await attendreEtatNominal(page, etat);
const m = await page.evaluate(mesurerReliefDansLaPage);
const g = m.groupes.map((x) => x.rect).sort((a, b) => a[1] - b[1]);
const haut = Math.max(0, g[0][1] - 120);
const bas = g.at(-1)[1] + g.at(-1)[3] + 120;
await page.screenshot({ path: fichier, fullPage: true, clip: { x: 0, y: haut, width: Number(largeur), height: Math.min(bas - haut, 1400) } });
console.log(fichier, JSON.stringify(m.groupes), `${m.textes.length} chevauchement(s)`);
await navigateur.close();
serveur.close();
