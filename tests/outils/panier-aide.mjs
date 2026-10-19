// Aide des tests du panier : commande type et ouverture de panier.html avec session, console et requêtes suivies.
export const COMMANDE = {
  v: 1, produit: 'batardeau-modulable', mode: 'diy', cotes: { largeur: 1200, hauteur: 400, tolerance: 0 }, prix: { materiel: 690, pose: null, total: 690 },
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
      sessionStorage.setItem('commande', brut);
      sessionStorage.setItem('__init', '1');
    }, typeof session === 'string' ? session : JSON.stringify(session));
  }
  await page.goto('/panier.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('#recap[aria-busy="false"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}
