// Serveur statique minimal pour les tests (aucune dépendance).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export function demarrer(port = 4173, racine = process.cwd()) {
  const serveur = createServer(async (req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relatif = normalize(chemin).replace(/^(\.\.[/\\])+/, '');
    const fichier = join(racine, relatif.endsWith('/') ? `${relatif}index.html` : relatif);
    try {
      const contenu = await readFile(fichier);
      res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
      res.end(contenu);
    } catch {
      res.writeHead(404);
      res.end('introuvable');
    }
  });
  return new Promise((resolve) => serveur.listen(port, () => resolve(serveur)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 4173);
  await demarrer(port);
  console.log(`http://localhost:${port}/`);
}
