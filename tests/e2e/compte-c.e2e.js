import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';
import { formaterMm } from '../../assets/js/cotes-logique.js';
import { totauxCommande, formaterDate, documentsCommande } from '../../assets/js/compte-logique.js';

const compte = JSON.parse(readFileSync('data/compte.json', 'utf8'));
const SESSION = JSON.stringify({ v: 1, connecte: true });
const libelleStatut = (id) => compte.statuts.find((s) => s.id === id).libelle;

async function ouvrir(page, { achat = 'CMD-1037', largeur = 1440, connecte = true, donnees = null } = {}) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript(([brut, id, ok]) => {
    if (sessionStorage.getItem('__init')) return;
    if (ok) sessionStorage.setItem('compte', brut);
    if (id) sessionStorage.setItem('achat', id);
    sessionStorage.setItem('__init', '1');
  }, [SESSION, achat, connecte]);
  if (donnees) await page.route('**/data/compte.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(donnees) }));
  await page.goto('/achat.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('html[data-compte]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const c of compte.commandes) {
  test(`achat.html ${c.id} : titre, date, statut, total, lignes ; détails fermés au chargement`, async ({ page }) => {
    const suivi = await ouvrir(page, { achat: c.id });
    const totaux = totauxCommande(c.lignes);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Commande n° ${c.id} (exemple)`);
    const resume = page.locator('.achat__resume');
    await expect(resume).toContainText(formaterDate(c.date));
    await expect(resume).toContainText(libelleStatut(c.statut));
    await expect(resume.locator('dt', { hasText: 'Total TTC' }).locator('+ dd')).toHaveText(formaterPrix(totaux.total));
    await expect(page.locator('[data-role="lignes"] .ligne')).toHaveCount(c.lignes.length);
    for (const detail of await page.locator('.ligne__details').all()) await expect(detail).not.toHaveAttribute('open', /.*/);
    await expect(page.locator('.fil__courant')).toHaveText(`Commande n° ${c.id} (exemple)`);
    await expect(page.getByRole('navigation', { name: "Fil d'Ariane" }).getByRole('link')).toHaveText(['Mon compte', 'Mes achats']);
    expect(suivi.messages).toEqual([]);
  });
}

test('lignes : pas de « Tout déplier » ; chaque détail s\'ouvre au clavier (Entrée, Espace) et montre cotes formatées, délais et aperçu avec A et B', async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByRole('button', { name: /Tout déplier|Tout replier/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Retirer/ })).toHaveCount(0);
  const ligne = page.locator('[data-role="lignes"] .ligne').first();
  const resume = ligne.locator('summary');
  for (const touche of ['Enter', 'Space']) {
    await resume.focus();
    await page.keyboard.press(touche);
    await expect(ligne.locator('details')).toHaveAttribute('open', '');
    await expect(ligne.locator('.ligne__liste-cotes')).toContainText(`${formaterMm(1200)} mm`);
    await expect(ligne.locator('.ligne__liste-cotes')).toContainText(`${formaterMm(400)} mm`);
    await expect(ligne.locator('.ligne__liste-cotes')).toContainText('Tolérance de mesure (C)');
    await expect(ligne.locator('.ligne__liste-delais')).toContainText('2 à 3 semaines');
    await expect(ligne.locator('.ligne__liste-delais')).toContainText('sous 2 semaines après livraison');
    const svg = ligne.locator('svg.apercu__svg');
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg).toHaveAttribute('aria-label', /largeur 1.200 mm, hauteur 400 mm/);
    await expect(svg.locator('.schema__lettre')).toHaveText(['A', 'B']);
    await expect(svg.locator('.schema__valeur--a')).toHaveText(`${formaterMm(1200)} mm`);
    await expect(svg.locator('.schema__valeur--b')).toHaveText(`${formaterMm(400)} mm`);
    await page.keyboard.press(touche);
    await expect(ligne.locator('details')).not.toHaveAttribute('open', /.*/);
  }
  const seconde = page.locator('[data-role="lignes"] .ligne').nth(1);
  await seconde.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(seconde.locator('.ligne__liste-delais')).toBeVisible();
  await expect(seconde.locator('.ligne__apercu')).toHaveCount(0);
});

test('livraison : l\'artisan et la date d\'intervention pour la pose, pas pour le DIY', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1037' });
  const livraison = page.locator('[data-role="livraison"]');
  await expect(livraison).toContainText('Artisan Exemple (fictif)');
  await expect(livraison).toContainText('5 novembre 2026');
  await expect(livraison).toContainText('2 à 3 semaines');
  page.removeAllListeners();
  await page.unrouteAll();
  const autre = await page.context().newPage();
  await ouvrir(autre, { achat: 'CMD-1044' });
  const diy = autre.locator('[data-role="livraison"]');
  await expect(diy).toContainText('2 à 3 semaines');
  await expect(diy).not.toContainText('Artisan');
  await expect(diy).not.toContainText("Date d'intervention");
});

for (const c of compte.commandes) {
  test(`documents ${c.id} : liens attendus, libellé « (PDF, exemple) »`, async ({ page }) => {
    await ouvrir(page, { achat: c.id });
    const attendus = documentsCommande(c, compte.documents);
    const liens = page.locator('[data-role="documents"] a');
    await expect(liens).toHaveCount(attendus.length);
    await expect(liens).toHaveText(attendus.map((d) => `${d.titre} (PDF, exemple)`));
    for (const [i, d] of attendus.entries()) {
      await expect(liens.nth(i)).toHaveAttribute('href', d.fichier);
      await expect(liens.nth(i)).toHaveAttribute('download', '');
      await expect(liens.nth(i)).toHaveAttribute('type', 'application/pdf');
    }
  });
}

test('documents : un clic télécharge le fichier, qui commence par %PDF- et fait moins de 50 Ko', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1037' });
  for (const d of documentsCommande(compte.commandes.find((c) => c.id === 'CMD-1037'), compte.documents)) {
    const [telechargement] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: `${d.titre} (PDF, exemple)` }).click(),
    ]);
    expect(telechargement.suggestedFilename()).toBe(d.fichier.split('/').pop());
    const chemin = await telechargement.path();
    const octets = readFileSync(chemin);
    expect(octets.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(octets.length).toBeLessThan(50 * 1024);
  }
});

test('états : achat absent ou inconnu → « Aucun achat sélectionné » avec lien vers achats.html ; non connecté → « Connexion requise »', async ({ page }) => {
  for (const achat of [null, 'CMD-9999']) {
    await ouvrir(page, { achat });
    await expect(page.getByRole('heading', { level: 1, name: 'Aucun achat sélectionné' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Voir mes achats' })).toHaveAttribute('href', 'achats.html');
    await expect(page.locator('header.entete')).toBeVisible();
    await page.context().clearCookies();
    await page.unrouteAll();
    page.removeAllListeners();
    page = await page.context().newPage();
  }
  await ouvrir(page, { connecte: false });
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Aller à la connexion' })).toHaveAttribute('href', 'connexion.html');
});

test('mesures à 1440 px : colonnes 3 / 2 aux hauts alignés ; une colonne à 375 px', async ({ page }) => {
  await ouvrir(page);
  const [resume, livraison, lignes, documents, sav] = await Promise.all(['resume', 'livraison', 'lignes', 'documents', 'sav'].map((r) => page.locator(`[data-role="${r}"]`).boundingBox()));
  expect(resume.width / livraison.width).toBeGreaterThanOrEqual(1.3);
  expect(resume.width / livraison.width).toBeLessThanOrEqual(1.7);
  expect(Math.abs(resume.y - livraison.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(lignes.x - resume.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(documents.x - livraison.x)).toBeLessThanOrEqual(1);
  expect(lignes.y).toBeGreaterThan(resume.y);
  expect(documents.y).toBeGreaterThan(livraison.y);
  expect(sav.y).toBeGreaterThan(documents.y);
  await page.setViewportSize({ width: 375, height: 900 });
  // la mise en page suit le redimensionnement de façon asynchrone (polices, grille) : attendre la mesure, sans l'assouplir
  await page.evaluate(() => globalThis.document.fonts.ready);
  await expect.poll(async () => {
    const boites = await Promise.all(['resume', 'lignes', 'livraison', 'documents', 'sav'].map((r) => page.locator(`[data-role="${r}"]`).boundingBox()));
    const colonneUnique = new Set(boites.map((b) => Math.round(b.x))).size === 1;
    return colonneUnique && boites.every((b, i) => i === 0 || b.y > boites[i - 1].y);
  }, { message: 'à 375 px, une colonne dans l\'ordre du document' }).toBe(true);
});

test('robustesse : 10 lignes et un titre de 120 caractères, aucun débordement à 375, 768 et 1440 px (détails ouverts)', async ({ page }) => {
  const donnees = structuredClone(compte);
  const commande = donnees.commandes.find((c) => c.id === 'CMD-1037');
  const modele = commande.lignes[0];
  commande.lignes = Array.from({ length: 10 }, () => ({ ...modele, titre: 'T'.repeat(120), quantite: 10, prixUnitaire: { materiel: 1234567, pose: 280 } }));
  for (const largeur of [375, 768, 1440]) {
    await ouvrir(page, { largeur, donnees });
    await expect(page.locator('[data-role="lignes"] .ligne')).toHaveCount(10);
    await page.$$eval('.ligne__details', (details) => { for (const d of details) d.open = true; });
    expect(await sansDebordement(page), `${largeur}`).toBe(true);
    await page.unrouteAll();
    page.removeAllListeners();
  }
});

for (const largeur of [375, 768, 1440]) {
  test(`pages du lot à ${largeur} px (connecté, déconnecté, vide, détail ouvert) : console propre, axe, aucune requête externe`, async ({ page }) => {
    const etats = [
      { nom: 'detail-ferme', options: {} },
      { nom: 'detail-ouvert', options: {}, ouvrir: true },
      { nom: 'deconnecte', options: { connecte: false } },
      { nom: 'vide', options: { achat: null } },
    ];
    for (const etat of etats) {
      const suivi = await ouvrir(page, { largeur, ...etat.options });
      if (etat.ouvrir) await page.$$eval('.ligne__details', (details) => { for (const d of details) d.open = true; });
      expect(suivi.messages, etat.nom).toEqual([]);
      expect(suivi.externes, etat.nom).toEqual([]);
      expect(await sansDebordement(page), etat.nom).toBe(true);
      await page.screenshot({ path: `test-results/compte-c-achat-${etat.nom}-${largeur}.png`, fullPage: true });
      expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id), etat.nom).toEqual([]);
      await page.unrouteAll();
      page.removeAllListeners();
      page = await page.context().newPage();
    }
  });
}

test('JavaScript désactivé : seul le message noscript est visible sur les cinq pages', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  for (const adresse of ['connexion.html', 'compte.html', 'achats.html', 'achat.html', 'informations.html']) {
    await page.goto(`http://localhost:4173/${adresse}`);
    expect((await page.evaluate(() => document.body.innerText)).trim(), adresse).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
