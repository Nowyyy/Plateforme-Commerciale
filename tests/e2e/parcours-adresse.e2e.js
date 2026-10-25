import { test, expect } from '@playwright/test';
import { ADRESSE, SUGGESTIONS, reponseGaspar, reponseRga, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const HOTES = ['data.geopf.fr', 'www.georisques.gouv.fr', 'tile.openstreetmap.org'];
const TITRE = 'Aléas recensés à cette adresse';
const SANS_RESSOURCE = (m) => !m.includes('Failed to load resource');

function journaliser(page) {
  const attente = [];
  const journal = { urls: [] };
  page.on('request', (r) => attente.push(r.allHeaders().then((h) => ({ url: r.url(), referer: h.referer ?? null, corps: r.postData() ?? '' }))));
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) journal.urls.push(f.url()); });
  journal.lire = () => Promise.all(attente);
  return journal;
}

for (const largeur of [375, 1440]) {
  test(`parcours de l'adresse à ${largeur} px : saisie assistée, choix, diagnostic, carte, aléas recensés, calque, filtre « Inondations », fiche`, async ({ page }) => {
    const debut = Date.now();
    // simulation : inondation et argiles présentes, feux absents
    const externes = await simuler(page, { api: { gaspar: { corps: reponseGaspar(['Inondation', 'Séisme']) }, rga: { corps: reponseRga(2) } } });
    const console_ = surveillerConsole(page);
    const journal = journaliser(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('.recherche:not([hidden])');
    expect(externes.externes).toEqual([]); // aucune requête tierce au chargement
    if (largeur === 375) {
      await page.getByRole('button', { name: 'Menu' }).click(); // menu déplié puis replié : la navigation reste utilisable
      await expect(page.locator('#menu-navigation')).toBeVisible();
      await page.getByRole('button', { name: 'Menu' }).click();
    }
    await page.getByLabel(/Entrez votre adresse/).click();
    await page.keyboard.type('12 rue des Til');
    const options = page.locator('#adresse-liste [role="option"]');
    await expect(options).toHaveCount(5);
    await options.first().click();
    await expect(page.getByLabel(/Entrez votre adresse/)).toHaveValue(SUGGESTIONS[0][0]);
    await page.getByRole('button', { name: 'Évaluer mon exposition' }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    // la carte s'affiche seule, avec les aléas recensés à l'adresse
    await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
    const groupe = page.getByRole('group', { name: TITRE });
    await expect(groupe.getByRole('checkbox')).toHaveCount(2);
    await expect(page.locator('#aleas-annonce')).toHaveText('2 aléas recensés à cette adresse.');
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(3);
    await groupe.getByRole('checkbox', { name: 'Retrait-gonflement des argiles' }).uncheck();
    await expect(page.locator('#carte-reelle .leaflet-layer')).toHaveCount(2);
    await expect.poll(() => externes.osm.length).toBeGreaterThan(0);
    // retour à l'accueil, puis carte d'aléa « Inondations » : seul le calque d'inondation est coché
    await page.locator('.marque').first().click();
    await page.waitForURL((u) => u.pathname === '/index.html' || u.pathname === '/');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.locator('[data-role="aleas"] .cartes > li').first().getByRole('link', { name: /Voir les solutions Inondations/ }).click();
    await page.waitForURL('**/diagnostic.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('radio', { name: 'Inondations' })).toBeChecked();
    await expect(page.getByLabel('Adresse évaluée')).toHaveValue(SUGGESTIONS[0][0]);
    await expect(groupe.getByRole('checkbox', { checked: true })).toHaveCount(2); // les pastilles ne changent pas les calques
    await expect(groupe.getByRole('checkbox', { name: 'Zone inondable' })).toBeChecked();
    await page.locator('#liste-equipements > li').first().getByRole('link', { name: /Voir la fiche/ }).click();
    await page.waitForURL('**/produit.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batardeau modulable');
    // aucune donnée du parcours dans les URL ; l'adresse (ou son début) uniquement vers data.geopf.fr
    for (const adresse of journal.urls) {
      const url = new URL(adresse);
      expect(url.search, adresse).toBe('');
      expect(url.hash, adresse).toBe('');
      expect(decodeURIComponent(adresse), adresse).not.toMatch(/Tilleuls|Lyon|inondation|argile/i);
    }
    const toutes = await journal.lire();
    const avecAdresse = toutes.filter((r) => /Tilleuls|12%20rue|12 rue/i.test(`${decodeURIComponent(r.url)} ${r.corps}`));
    expect(avecAdresse.length).toBeGreaterThan(1);
    for (const r of avecAdresse) expect(new URL(r.url).hostname, r.url).toBe('data.geopf.fr');
    for (const r of toutes.filter((x) => !['localhost', '127.0.0.1'].includes(new URL(x.url).hostname))) expect(HOTES, r.url).toContain(new URL(r.url).hostname);
    expect(console_.filter(SANS_RESSOURCE)).toEqual([]);
    console.log(`${largeur} px : parcours de ${((Date.now() - debut) / 1000).toFixed(1)} s, ${journal.urls.length} pages, ${avecAdresse.length} requêtes portant l'adresse (data.geopf.fr)`);
    expect(ADRESSE).toContain('Tilleuls');
  });
}
