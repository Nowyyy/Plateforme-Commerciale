// Génère lots/index.html, lots/lots.css et apercus/index.html dans un dossier de sortie.
// Usage : node scripts/lots/generer.mjs <dossier-de-sortie> <donnees.json>
// donnees.json : { "entrees": [ { branche, apercu, bilan, fusionne } ] }
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparerLots, choisirVues } from './logique.mjs';
import { rendrePageLots, rendrePageRepli, rendreRedirection } from './rendu.mjs';
import { collecter } from './collecte.mjs';

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

const PAGE_ULTIME = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Lots</title></head><body><main><p>Liste des lots indisponible pour le moment.</p></main></body></html>';

// Ne lève jamais : en cas d'échec, écrit une page de repli et rend { ok: false, erreur }.
// collecter() fournit les entrées ; elle est injectable pour les tests.
export function genererTolerant({ sortie, collecteur = collecter, textes }) {
  try {
    const avertissements = generer({ sortie, entrees: collecteur(), textes });
    return { ok: true, avertissements };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    try {
      const t = textes ?? lireTextes();
      ecrire(sortie, 'lots/index.html', rendrePageRepli(t));
      ecrire(sortie, 'lots/lots.css', lireCss());
      ecrire(sortie, 'apercus/index.html', rendreRedirection(t));
    } catch {
      try {
        ecrire(sortie, 'lots/index.html', PAGE_ULTIME);
      } catch {
        // rien de plus à tenter : la publication continue quand même
      }
    }
    return { ok: false, avertissements: [], erreur: message };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sortie, source] = process.argv.slice(2);
  if (!sortie || !source) {
    console.error('Usage : node scripts/lots/generer.mjs <dossier-de-sortie> --git | <donnees.json>');
    process.exit(2);
  }
  const collecteur = source === '--git'
    ? collecter
    : () => JSON.parse(readFileSync(source, 'utf8')).entrees;
  const r = genererTolerant({ sortie, collecteur });
  for (const a of r.avertissements) console.warn(`::warning::${a}`);
  if (!r.ok) console.warn(`::warning::Page Lots : génération échouée, page de repli écrite (${r.erreur})`);
  // code de sortie 0 dans tous les cas : la publication des aperçus continue
}
