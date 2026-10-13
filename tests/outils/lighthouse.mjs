// Lance Lighthouse (mobile par défaut) sur la page locale et vérifie les seuils.
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { demarrer } from './serveur.mjs';

const seuils = JSON.parse(readFileSync(new URL('./seuils-lighthouse.json', import.meta.url), 'utf8'));
const port = 4174;
const sortie = '.lighthouseci/rapport.json';
mkdirSync('.lighthouseci', { recursive: true });

const serveur = await demarrer(port);
const code = await new Promise((resolve) => {
  const enfant = spawn(
    'npx',
    [
      'lighthouse', `http://localhost:${port}/`,
      '--chrome-flags=--headless=new --no-sandbox',
      '--output=json', `--output-path=${sortie}`, '--quiet',
    ],
    { stdio: 'inherit', env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' } },
  );
  enfant.on('close', (c) => resolve(c ?? 1));
});
serveur.close();
if (code !== 0) process.exit(code);

const { categories } = JSON.parse(readFileSync(sortie, 'utf8'));
let echec = false;
for (const [id, minimum] of Object.entries(seuils)) {
  const score = Math.round(categories[id].score * 100);
  const ok = score >= minimum;
  if (!ok) echec = true;
  console.log(`${ok ? 'ok ' : 'KO '} ${id}: ${score} (seuil ${minimum})`);
}
process.exit(echec ? 1 : 0);
