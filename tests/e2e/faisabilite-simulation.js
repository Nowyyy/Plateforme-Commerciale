// Simulation des services tiers du test de faisabilité : aucune requête réelle ne part, tout est intercepté.
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

export const GEOCODAGE = JSON.stringify({
  features: [{ geometry: { coordinates: [2.35222, 48.85661] }, properties: { label: "4 Place de l'Hôtel de Ville 75004 Paris", score: 0.98 } }],
});

export const CAPABILITIES = `<?xml version="1.0"?><WMS_Capabilities version="1.3.0"><Service><Name>WMS</Name></Service><Capability>
<Layer><Name>RACINE</Name>
<Layer><Name>PPRN_COMMUNE_RISQINOND</Name></Layer>
<Layer><Name>ALEA_RETRAIT_GONFLEMENT_ARGILES</Name></Layer>
<Layer><Name>FEUX_DE_FORET</Name></Layer>
</Layer></Capability></WMS_Capabilities>`;

const CORS = { 'access-control-allow-origin': '*' };

// options : { comportement(requete) → undefined (succès) | 'abort' | { status } | 'attendre' | Promise (réponse retardée) }
export async function simuler(page, comportement = () => undefined) {
  const journal = [];
  const etat = { enCours: 0, maxSimultanees: 0 };
  await page.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), async (route) => {
    const url = new URL(route.request().url());
    const entree = { hote: url.hostname, chemin: url.pathname, parametres: Object.fromEntries(url.searchParams), url: url.toString() };
    journal.push(entree);
    etat.enCours += 1;
    etat.maxSimultanees = Math.max(etat.maxSimultanees, etat.enCours);
    try {
      const choix = await comportement(entree);
      if (choix === 'abort') return await route.abort('failed');
      if (choix === 'attendre') return await new Promise(() => {});
      if (choix && choix.status) return await route.fulfill({ status: choix.status, headers: CORS, contentType: 'text/plain', body: 'introuvable' });
      const image = url.hostname === 'tile.openstreetmap.org' || url.pathname === '/wmts' || entree.parametres.REQUEST === 'GetMap';
      if (image) return await route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
      if (url.pathname === '/geocodage/search') return await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: GEOCODAGE });
      if (entree.parametres.REQUEST === 'GetCapabilities') return await route.fulfill({ status: 200, headers: CORS, contentType: 'text/xml', body: CAPABILITIES });
      return await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '[]' });
    } finally {
      etat.enCours -= 1;
    }
  });
  return { journal, etat };
}
