// Aide des tests du panier : sessions types (clé « panier », v 2) et ouverture de panier.html avec session, console et requêtes suivies.
export const LIGNE = { produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, quantite: 1 };
export const UNE_LIGNE = { v: 2, lignes: [LIGNE] };
export const panierAvec = (surcharge = {}) => ({ v: 2, lignes: [{ ...LIGNE, ...surcharge }] });

// Trois lignes : batardeau en pose x 2, batardeau en DIY d'autres cotes x 1, clapet anti-retour x 3 (6 articles).
export const TROIS_LIGNES = {
  v: 2,
  lignes: [
    { produit: 'batardeau-modulable', mode: 'pose', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, quantite: 2 },
    { produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 900, hauteur: 350, tolerance: 10 }, quantite: 1 },
    { produit: 'clapet-anti-retour', mode: 'diy', cotes: null, quantite: 3 },
  ],
};

// Écoute console et requêtes, pose la session avant le chargement (une seule fois par onglet), ouvre panier.html.
export async function ouvrirPanier(page, largeur, session = null) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (session !== null) {
    await page.addInitScript((brut) => {
      if (sessionStorage.getItem('__init')) return;
      sessionStorage.setItem('panier', brut);
      sessionStorage.setItem('__init', '1');
    }, typeof session === 'string' ? session : JSON.stringify(session));
  }
  await page.goto('/panier.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}
