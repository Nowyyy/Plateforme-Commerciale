// Lecture de la documentation des conventions : l'index Docs/ref/conventions.md et les fichiers de Docs/ref/conventions/.
import { readFileSync, readdirSync } from 'node:fs';

export const DOSSIER_CONVENTIONS = 'Docs/ref/conventions';
export const fichiersConventions = () => readdirSync(DOSSIER_CONVENTIONS).filter((f) => f.endsWith('.md')).sort();
export const lireConventions = () => [readFileSync('Docs/ref/conventions.md', 'utf8'),
  ...fichiersConventions().map((f) => readFileSync(`${DOSSIER_CONVENTIONS}/${f}`, 'utf8'))].join('\n');
