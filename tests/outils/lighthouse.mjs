// Lance Lighthouse (mobile par défaut) sur des pages locales et vérifie les seuils.
// Usage : npm run lighthouse [-- chemin/page.html ...] (par défaut : la page d'attente « / »).
// Pages de wireframes/ : performance, accessibilité et bonnes pratiques seulement (pages noindex).
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const port = 4174;
const pages = process.argv.slice(2);
if (pages.length === 0) pages.push('');
mkdirSync('.lighthouseci', { recursive: true });

const serveur = await demarrer(port);
let echec = false;
for (const page of pages) {
  const sortie = `.lighthouseci/${page.replaceAll('/', '_') || 'accueil'}.json`;
  // pages noindex : la catégorie SEO est inapplicable
  const fichier = page === '' ? 'index.html' : page;
  const sansSeo = page.startsWith('wireframes/') || /name="robots" content="noindex"/.test(readFileSync(fichier, 'utf8'));
  const args = [
    'lighthouse', `http://localhost:${port}/${page}`,
    '--chrome-flags=--headless=new --no-sandbox',
    '--output=json', `--output-path=${sortie}`, '--quiet',
  ];
  if (sansSeo) args.push('--only-categories=performance,accessibility,best-practices');
  const code = await new Promise((resolve) => {
    const enfant = spawn('npx', args, {
      stdio: 'inherit',
      env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' },
    });
    enfant.on('close', (c) => resolve(c ?? 1));
  });
  if (code !== 0) {
    serveur.close();
    process.exit(code);
  }
  const { categories } = JSON.parse(readFileSync(sortie, 'utf8'));
  console.log(`# ${page || '/'}`);
  for (const [id, minimum] of Object.entries(seuils)) {
    if (sansSeo && id === 'seo') continue;
    const score = Math.round(categories[id].score * 100);
    const ok = score >= minimum;
    if (!ok) echec = true;
    console.log(`${ok ? 'ok ' : 'KO '} ${id}: ${score} (seuil ${minimum})`);
  }
}
serveur.close();
process.exit(echec ? 1 : 0);
