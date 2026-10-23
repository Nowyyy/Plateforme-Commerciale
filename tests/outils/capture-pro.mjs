// Capture de pro.html entière : node tests/outils/capture-pro.mjs <largeur> <fichier> [erreurs]
import { chromium } from '@playwright/test';

const [largeur, fichier, mode] = process.argv.slice(2);
const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
const page = await navigateur.newPage({ viewport: { width: Number(largeur), height: 900 } });
await page.goto('http://localhost:4173/pro.html');
await page.waitForSelector('html[data-formulaire="pret"]');
if (mode === 'erreurs' || mode === 'corrige') {
  await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();
  if (mode === 'corrige') await page.getByLabel('Société').fill('Société Exemple');
}
await page.screenshot({ path: fichier, fullPage: true });
await navigateur.close();
