// Simulation des trois hôtes de la carte réelle : aucune requête n'est jamais envoyée en réel.
// Toute requête vers un autre hôte que localhost est refusée et journalisée.
export const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
export const reponseGeocodage = (lon = 4.8357, lat = 45.764, score = 0.92) => JSON.stringify({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { label: ADRESSE, score, type: 'housenumber' } }],
});

// Complétion de l'IGN (format inféré) : results[] avec fulltext, x (longitude), y (latitude).
export const SUGGESTIONS = [
  ['12 Rue des Tilleuls 69003 Lyon', 4.8357, 45.764],
  ['12 Rue des Tilleuls 33000 Bordeaux', -0.5792, 44.8378],
  ['12 Rue des Tilleuls 67000 Strasbourg', 7.7521, 48.5734],
  ['12 Rue des Tilleuls 35000 Rennes', -1.6778, 48.1173],
  ['12 Rue des Tilleuls 59000 Lille', 3.0573, 50.6292],
  ['12 Rue des Tilleuls 13001 Marseille', 5.3698, 43.2965],
];
export const reponseCompletion = (liste = SUGGESTIONS) => JSON.stringify({ status: 'OK', results: liste.map(([fulltext, x, y]) => ({ country: 'StreetAddress', fulltext, x, y })) });
export const reponseRecherche = (label, type = 'housenumber', score = 0.92, lon = 4.8357, lat = 45.764) => JSON.stringify({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { label, score, type } }],
});

const LOCAL = (url) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

// options.geocodage : { status, corps, attente } ; `attente: true` ne répond jamais (délai dépassé).
// options.tuiles : { osm: 'ok' | 'abandon', ign: 'ok' | 'abandon', wms: 'ok' | 'abandon' }.
export async function simuler(page, options = {}) {
  const journal = { externes: [], geocodage: [], completion: [], osm: [], ign: [], wms: [] };
  const geocodage = options.geocodage ?? {};
  const tuiles = { osm: 'ok', ign: 'ok', wms: 'ok', ...options.tuiles };
  page.on('request', (r) => {
    if (LOCAL(r.url())) return;
    const entree = { url: r.url(), referer: r.headers().referer ?? null };
    journal.externes.push(entree);
    const hote = new URL(r.url()).hostname;
    if (hote === 'data.geopf.fr' && r.url().includes('/geocodage/')) {
      journal.geocodage.push(entree);
      if (r.url().includes('/geocodage/completion/')) journal.completion.push(entree);
    }
    else if (hote === 'data.geopf.fr' && r.url().includes('/wmts')) journal.ign.push(entree);
    else if (hote === 'tile.openstreetmap.org') journal.osm.push(entree);
    else if (hote === 'www.georisques.gouv.fr') journal.wms.push(entree);
  });
  await page.route((url) => !LOCAL(url.href), (route) => route.abort());
  await page.route('https://data.geopf.fr/geocodage/**', async (route) => {
    if (route.request().url().includes('/geocodage/completion/')) {
      const c = options.completion ?? {};
      if (c.attente) return;
      if (c.abandon) return route.abort();
      return route.fulfill({ status: c.status ?? 200, contentType: 'application/json', body: c.corps ?? reponseCompletion() });
    }
    if (geocodage.attente) return;
    await route.fulfill({ status: geocodage.status ?? 200, contentType: 'application/json', body: geocodage.corps ?? reponseGeocodage() });
  });
  const tuile = (cle) => (route) => (tuiles[cle] === 'abandon' ? route.abort() : route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await page.route('https://tile.openstreetmap.org/**', tuile('osm'));
  await page.route('https://data.geopf.fr/wmts**', tuile('ign'));
  await page.route('https://www.georisques.gouv.fr/**', tuile('wms'));
  return journal;
}

// Console : erreurs et avertissements, plus erreurs de page non gérées.
export function surveillerConsole(page) {
  const messages = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(`${m.type()} : ${m.text()}`); });
  page.on('pageerror', (e) => messages.push(`pageerror : ${e.message}`));
  return messages;
}

export async function ouvrirDiagnostic(page, largeur, session = { adresse: ADRESSE }) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // défilement doux de accueil.css : sinon les clics visent une cible qui bouge
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) sessionStorage.setItem(cle, valeur);
  }, session);
  await page.goto('/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}
