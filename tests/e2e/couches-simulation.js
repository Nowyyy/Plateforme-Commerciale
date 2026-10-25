// Simulation des services tiers de la page « catalogue des couches » : aucune requête réelle ne part, tout est intercepté.
import { construireCatalogue } from '../couches-fixture.js';
import { PNG } from './faisabilite-simulation.js';

export const CAPABILITIES = construireCatalogue();
const CORS = { 'access-control-allow-origin': '*' };

export const API_GASPAR = JSON.stringify({
  data: [
    { code_national_risque: '13', libelle_risque_long: 'Inondation', commune: { nom: 'PARIS', insee: '75056' } },
    { code_national_risque: '14', libelle_risque_long: 'Mouvement de terrain' },
    { code_national_risque: '15' }, { code_national_risque: '16' }, { code_national_risque: '17' },
  ],
  results: 5,
});

// comportement(requete) → undefined (succès) | 'abort' | { status }
export async function simuler(page, comportement = () => undefined) {
  const journal = [];
  await page.route((url) => !['localhost', '127.0.0.1'].includes(url.hostname), async (route) => {
    const url = new URL(route.request().url());
    const entree = { hote: url.hostname, chemin: url.pathname, parametres: Object.fromEntries(url.searchParams), url: url.toString() };
    journal.push(entree);
    const choix = await comportement(entree);
    if (choix === 'abort') return route.abort('failed');
    if (choix && choix.status) return route.fulfill({ status: choix.status, headers: CORS, contentType: 'text/plain', body: 'Not Found' });
    if (url.hostname === 'tile.openstreetmap.org' || entree.parametres.REQUEST === 'GetMap') {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    }
    if (entree.parametres.REQUEST === 'GetCapabilities') return route.fulfill({ status: 200, headers: CORS, contentType: 'text/xml', body: CAPABILITIES });
    if (url.pathname === '/api/v1/gaspar/risques') return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: API_GASPAR });
    return route.fulfill({ status: 404, headers: CORS, contentType: 'text/plain', body: 'Not Found' });
  });
  return { journal };
}
