// Empreinte de mise en page : rectangles (x, y, largeur, hauteur, arrondis au pixel, repère de la page entière) de tous les
// éléments [data-role] et des repères header, main, footer, par page et par largeur, dans l'état nominal (services simulés).
// Usage : node tests/outils/empreinte.mjs [page ...]   (écrit tests/empreintes/<page>.json ; `npm run empreinte:maj`)
// Démarre son propre serveur statique (port 4177) ; aucune dépendance ajoutée.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { demarrer } from './serveur.mjs';
import { LARGEURS_EMPREINTE, PAGES, attendreEtatNominal, preparerPage } from './etats-pages.mjs';

export const DOSSIER_EMPREINTES = 'tests/empreintes';
export const REPERES = ['header', 'main', 'footer'];

// Calculé dans la page : clé « repère:header », « role:<data-role> » (suffixe #n pour les rôles répétés), valeur [x, y, l, h].
export function mesurerDansLaPage(reperes) {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left + globalThis.scrollX), Math.round(r.top + globalThis.scrollY), Math.round(r.width), Math.round(r.height)];
  };
  const resultat = {};
  const compte = {};
  const ajouter = (cle, el) => {
    compte[cle] = (compte[cle] ?? 0) + 1;
    resultat[compte[cle] === 1 ? cle : `${cle}#${compte[cle]}`] = rect(el);
  };
  for (const repere of reperes) for (const el of globalThis.document.querySelectorAll(repere)) ajouter(`repere:${repere}`, el);
  for (const el of globalThis.document.querySelectorAll('[data-role]')) ajouter(`role:${el.getAttribute('data-role')}`, el);
  return resultat;
}

export async function mesurerEmpreinte(page, etat, largeur) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto(`/${etat.fichier}`);
  await attendreEtatNominal(page, etat);
  return page.evaluate(mesurerDansLaPage, REPERES);
}

export async function empreinteDePage(navigateur, etat, base = 'http://localhost:4173') {
  const empreinte = { page: etat.fichier, largeurs: {} };
  for (const largeur of LARGEURS_EMPREINTE) {
    const contexte = await navigateur.newContext({ baseURL: base, reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    await preparerPage(page, etat);
    empreinte.largeurs[largeur] = await mesurerEmpreinte(page, etat, largeur);
    await contexte.close();
  }
  return empreinte;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filtre = process.argv.slice(2);
  const serveur = await demarrer(4177);
  const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
  mkdirSync(DOSSIER_EMPREINTES, { recursive: true });
  for (const etat of PAGES.filter((p) => filtre.length === 0 || filtre.includes(p.nom))) {
    const empreinte = await empreinteDePage(navigateur, etat, 'http://localhost:4177');
    writeFileSync(`${DOSSIER_EMPREINTES}/${etat.nom}.json`, `${JSON.stringify(empreinte)}\n`);
    console.log(`${etat.nom} : ${Object.keys(empreinte.largeurs[375]).length} éléments`);
  }
  await navigateur.close();
  serveur.close();
}
