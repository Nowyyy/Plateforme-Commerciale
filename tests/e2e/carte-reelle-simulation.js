import { deflateSync } from 'node:zlib';

// Simulation des trois hôtes de la carte réelle : aucune requête n'est jamais envoyée en réel.
// Toute requête vers un autre hôte que localhost est refusée et journalisée.
export const ADRESSE = '12 rue des Tilleuls, 69000 Lyon';
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
// Image de légende simulée : 200 × 90 px, un aplat (généré sans dépendance) ; PNG_VIDE : taille naturelle nulle (IHDR 0 × 0, refusée par le décodeur).
const crc = (buf) => { let c = ~0; for (const o of buf) { c ^= o; for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const morceau = (type, donnees) => { const t = Buffer.concat([Buffer.from(type), donnees]); const n = Buffer.alloc(4); n.writeUInt32BE(donnees.length); const k = Buffer.alloc(4); k.writeUInt32BE(crc(t)); return Buffer.concat([n, t, k]); };
const png = (l, h) => { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; const lignes = Buffer.alloc((l * 3 + 1) * h, 0x90); for (let y = 0; y < h; y += 1) lignes[y * (l * 3 + 1)] = 0; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr), morceau('IDAT', deflateSync(lignes)), morceau('IEND', Buffer.alloc(0))]); };
export const LEGENDE_PNG = png(200, 90);
export const PNG_VIDE = png(0, 0);
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

// API Géorisques (formats inférés : aucun échantillon réel) : gaspar/risques et rga.
export const reponseGaspar = (libelles = ['Inondation', 'Feu de forêt', 'Séisme']) => JSON.stringify({ results: 1, page: 1, total_pages: 1, data: [{ code_insee: '69123', libelle_commune: 'Lyon', risques_detail: libelles.map((libelle_risque_long, i) => ({ num_risque: String(10 + i), libelle_risque_long })) }] });
export const reponseRga = (niveau = 2) => JSON.stringify(niveau === 0 ? { exposition: 'Exposition nulle', codeExposition: '0' } : { exposition: `Exposition ${['', 'faible', 'moyenne', 'forte'][niveau]}`, codeExposition: String(niveau) });

const LOCAL = (url) => ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

// options.geocodage : { status, corps, attente } ; `attente: true` ne répond jamais (délai dépassé).
// options.tuiles : { osm: 'ok' | 'abandon', ign: 'ok' | 'abandon', wms: 'ok' | 'abandon' }.
// options.legende : { mode: 'ok' | 'abandon' | '404' | 'texte' | 'vide' | 'attente', retard (ms), parCouche: { <nom>: mode } } (images GetLegendGraphic, PNG de LEGENDE_PNG).
export async function simuler(page, options = {}) {
  const journal = { externes: [], geocodage: [], completion: [], osm: [], ign: [], wms: [], legende: [], api: [] };
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
    else if (hote === 'www.georisques.gouv.fr' && new URL(r.url()).pathname.startsWith('/api/')) journal.api.push(entree);
    else if (hote === 'www.georisques.gouv.fr' && r.url().includes('REQUEST=GetLegendGraphic')) journal.legende.push(entree);
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
  const api = options.api ?? {};
  const reponseApi = (cle, defaut) => (route) => {
    const o = api[cle] ?? {};
    if (o.attente) return;
    if (o.abandon) return route.abort();
    return route.fulfill({ status: o.status ?? 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: o.corps ?? defaut() });
  };
  await page.route('https://www.georisques.gouv.fr/services**', tuile('wms'));
  const legende = options.legende ?? {};
  await page.route((url) => url.hostname === 'www.georisques.gouv.fr' && url.searchParams.get('REQUEST') === 'GetLegendGraphic', async (route) => {
    const mode = legende.parCouche?.[new URL(route.request().url()).searchParams.get('LAYER')] ?? legende.mode ?? 'ok';
    if (mode === 'attente') return;
    if (legende.retard) await new Promise((resolve) => { setTimeout(resolve, legende.retard); });
    if (mode === 'abandon') return route.abort();
    if (mode === '404') return route.fulfill({ status: 404, contentType: 'text/plain', body: 'introuvable' });
    if (mode === 'texte') return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>pas une image</p>' });
    if (mode === 'vide') return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_VIDE });
    return route.fulfill({ status: 200, contentType: 'image/png', body: LEGENDE_PNG });
  });
  await page.route('https://www.georisques.gouv.fr/api/v1/gaspar/**', reponseApi('gaspar', () => reponseGaspar()));
  await page.route('https://www.georisques.gouv.fr/api/v1/rga**', reponseApi('rga', () => reponseRga()));
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
