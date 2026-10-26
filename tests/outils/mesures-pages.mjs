// Poids de transfert, nombre de requêtes, messages de console et requêtes externes de chaque page Hi-Fi dans son état nominal,
// à une largeur donnée (services tiers simulés). Fonction partagée avec les tests Playwright.
// Usage : node tests/outils/mesures-pages.mjs [largeur] [page ...]   (serveur local propre, port 4180)
import { chromium } from '@playwright/test';
import { demarrer } from './serveur.mjs';
import { PAGES, attendreEtatNominal, preparerPage } from './etats-pages.mjs';

export async function mesurerPage(navigateur, etat, largeur, base) {
  const contexte = await navigateur.newContext({ baseURL: base, viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  const messages = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(`${m.type()} : ${m.text()}`); });
  page.on('pageerror', (e) => messages.push(`pageerror : ${e.message}`));
  const requetes = [];
  page.on('requestfinished', (r) => requetes.push(r));
  const journal = await preparerPage(page, etat);
  await page.goto(`/${etat.fichier}`);
  await attendreEtatNominal(page, etat);
  let octets = 0;
  for (const r of requetes) octets += (await r.sizes()).responseBodySize + (await r.sizes()).responseHeadersSize;
  await contexte.close();
  return { page: etat.fichier, requetes: requetes.length, octets, messages, externes: journal.externes.map((e) => new URL(e.url).hostname) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const largeur = Number(process.argv[2] ?? 375);
  const filtre = process.argv.slice(3);
  const serveur = await demarrer(4180);
  const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
  console.log(`Poids et requêtes à ${largeur} px (services tiers simulés).\n| Page | Requêtes | Poids (Ko) | Messages de console | Hôtes externes |\n|---|---|---|---|---|`);
  for (const etat of PAGES.filter((p) => filtre.length === 0 || filtre.includes(p.nom))) {
    const m = await mesurerPage(navigateur, etat, largeur, 'http://localhost:4180');
    console.log(`| ${m.page} | ${m.requetes} | ${Math.round(m.octets / 1024)} | ${m.messages.length} | ${[...new Set(m.externes)].join(', ') || '—'} |`);
  }
  await navigateur.close();
  serveur.close();
}
