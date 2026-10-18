// Collecte : seule partie qui lit Git. Retourne les entrées attendues par preparerLots().
// L'exécuteur est injectable : exec(args) -> { code, stdout } (faux exécuteur dans les tests).
import { spawnSync } from 'node:child_process';

export function executerGit(args, cwd = process.cwd()) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd, maxBuffer: 16 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '' };
}

function lire(exec, ref, chemin) {
  const r = exec(['show', `${ref}:${chemin}`]);
  return r.code === 0 ? r.stdout : null;
}

// true / false, ou null si l'historique disponible ne permet pas de le dire.
function estFusionne(exec, branche) {
  const r = exec(['merge-base', '--is-ancestor', `origin/${branche}`, 'origin/main']);
  if (r.code === 0) return true;
  if (r.code !== 1) return null;
  const superficiel = exec(['rev-parse', '--is-shallow-repository']);
  if (superficiel.code !== 0 || superficiel.stdout.trim() !== 'false') return null;
  return false;
}

export function collecter(exec = executerGit) {
  const liste = exec(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin/lot-*']);
  if (liste.code !== 0) throw new Error('git for-each-ref a échoué : impossible d\'énumérer les branches lot-*');
  const branches = liste.stdout.split('\n').map((l) => l.trim().replace(/^origin\//, '')).filter(Boolean);
  return branches.map((branche) => ({
    branche,
    apercu: lire(exec, `origin/${branche}`, 'apercu.txt'),
    bilan: lire(exec, `origin/${branche}`, `Docs/lots/${branche}.md`),
    fusionne: estFusionne(exec, branche),
  }));
}
