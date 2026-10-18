// Génère lots/index.html, lots/lots.css et apercus/index.html dans un dossier de sortie.
// Usage : node scripts/lots/generer.mjs <dossier-de-sortie> <donnees.json>
// donnees.json : { "entrees": [ { branche, apercu, bilan, fusionne } ] }
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparerLots, choisirVues } from './logique.mjs';
import { rendrePageLots, rendreRedirection } from './rendu.mjs';

const ici = dirname(fileURLToPath(import.meta.url));
export const lireTextes = () => JSON.parse(readFileSync(join(ici, 'textes.json'), 'utf8'));
const lireCss = () => readFileSync(join(ici, 'lots.css'), 'utf8');

function ecrire(sortie, chemin, contenu) {
  const complet = join(sortie, chemin);
  mkdirSync(dirname(complet), { recursive: true });
  writeFileSync(complet, contenu);
}

// Écrit les trois fichiers ; retourne les avertissements de lecture des lots.
export function generer({ sortie, entrees, textes = lireTextes() }) {
  const { lots, avertissements } = preparerLots(entrees);
  ecrire(sortie, 'lots/index.html', rendrePageLots(choisirVues(lots), textes));
  ecrire(sortie, 'lots/lots.css', lireCss());
  ecrire(sortie, 'apercus/index.html', rendreRedirection(textes));
  return avertissements;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sortie, donnees] = process.argv.slice(2);
  if (!sortie || !donnees) {
    console.error('Usage : node scripts/lots/generer.mjs <dossier-de-sortie> <donnees.json>');
    process.exit(2);
  }
  const { entrees } = JSON.parse(readFileSync(donnees, 'utf8'));
  for (const a of generer({ sortie, entrees })) console.warn(`::warning::${a}`);
}
