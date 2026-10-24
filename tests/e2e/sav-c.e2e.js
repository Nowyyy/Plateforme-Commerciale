import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const compte = JSON.parse(readFileSync('data/compte.json', 'utf8'));
const SESSION = JSON.stringify({ v: 1, connecte: true });
const LARGEURS = [375, 768, 1440];

async function ouvrir(page, adresse, preset = {}, { largeur = 1440, donnees = null } = {}) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript(([p, brut]) => {
    if (sessionStorage.getItem('__init')) return;
    if (p.achat || p.connecte) sessionStorage.setItem('compte', brut);
    if (p.achat) sessionStorage.setItem('achat', p.achat);
    if (p.acces) sessionStorage.setItem('acces-sav', p.acces);
    sessionStorage.setItem('__init', '1');
  }, [preset, SESSION]);
  if (donnees) await page.route('**/data/compte.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(donnees) }));
  await page.goto(`/${adresse}`);
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

const cartes = (page) => page.locator('.sav__demande');
const pastille = (page, nom) => page.getByRole('radio', { name: nom, exact: true });
const SAV = ['SAV-1001 (exemple)', 'SAV-1002 (exemple)', 'SAV-1003 (exemple)', 'SAV-1004 (exemple)'];

test('demandes.html connecté : 4 demandes par date décroissante, avec numéro, produit, date, motif et statut', async ({ page }) => {
  const suivi = await ouvrir(page, 'demandes.html', { connecte: true });
  await expect(page.getByRole('heading', { level: 1, name: 'Mes demandes de service après-vente' })).toBeVisible();
  await expect(cartes(page)).toHaveCount(4);
  await expect(cartes(page).locator('h3')).toHaveText(SAV);
  const premiere = cartes(page).first();
  await expect(premiere).toContainText('Produit : Volet extrudé renforcé');
  await expect(premiere).toContainText('Déposée le 20 octobre 2026');
  await expect(premiere).toContainText('Motif : Défaut à la livraison');
  await expect(premiere.locator('.statut')).toContainText('Reçue');
  await expect(cartes(page).nth(2)).toContainText('Motif : Problème de pose');
  await expect(cartes(page).nth(2).locator('.statut')).toContainText('Intervention planifiée');
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
});

test('filtre : chaque pastille filtre (une demande par statut), « Toutes » rétablit, flèches dans le groupe, message vide', async ({ page }) => {
  await ouvrir(page, 'demandes.html', { connecte: true });
  const attendu = { Reçue: 'SAV-1001', 'En analyse': 'SAV-1002', 'Intervention planifiée': 'SAV-1003', Clôturée: 'SAV-1004' };
  for (const [nom, id] of Object.entries(attendu)) {
    await pastille(page, nom).check({ force: true });
    await expect(cartes(page)).toHaveCount(1);
    await expect(cartes(page)).toContainText(id);
  }
  await pastille(page, 'Toutes').check({ force: true });
  await expect(cartes(page)).toHaveCount(4);
  await expect(page.locator('.achats__vide')).toHaveText('');
  await expect(async () => {
    await pastille(page, 'Toutes').focus();
    await expect(pastille(page, 'Toutes')).toBeFocused({ timeout: 300 });
  }).toPass({ timeout: 5000 });
  await page.keyboard.press('ArrowRight');
  await expect(pastille(page, 'Reçue')).toBeChecked();
  await expect(cartes(page)).toHaveCount(1);
  const donnees = structuredClone(compte);
  donnees.demandes = donnees.demandes.filter((d) => d.statut !== 'en-analyse');
  const autre = await page.context().newPage();
  await ouvrir(autre, 'demandes.html', { connecte: true }, { donnees });
  await pastille(autre, 'En analyse').check({ force: true });
  await expect(cartes(autre)).toHaveCount(0);
  await expect(autre.locator('.achats__vide')).toHaveText('Aucune demande avec ce statut');
});

test('indicateur d\'étapes : texte masqué et icône désignent l\'étape actuelle et les étapes terminées ; ni lien ni bouton dans les lignes', async ({ page }) => {
  await ouvrir(page, 'demandes.html', { connecte: true });
  const attendu = {
    'SAV-1001 (exemple)': ['étape actuelle', 'à venir', 'à venir', 'à venir'],
    'SAV-1002 (exemple)': ['terminée', 'étape actuelle', 'à venir', 'à venir'],
    'SAV-1003 (exemple)': ['terminée', 'terminée', 'étape actuelle', 'à venir'],
    'SAV-1004 (exemple)': ['terminée', 'terminée', 'terminée', 'étape actuelle'],
  };
  for (const [id, textes] of Object.entries(attendu)) {
    const carte = cartes(page).filter({ hasText: id });
    const etapes = carte.locator('.sav__etape');
    await expect(etapes).toHaveCount(4);
    await expect(etapes.locator('.sav__etape-etat')).toHaveText(textes);
    await expect(etapes.locator('.sav__etape-titre')).toHaveText(['Reçue', 'En analyse', 'Intervention planifiée', 'Clôturée']);
    await expect(etapes.locator('.sav__pastille')).toHaveCount(4);
    await expect(carte.locator('.sav__etape[data-etat="actuelle"]')).toHaveCount(1);
    await expect(carte.locator('.sav__etape[data-etat="terminee"]')).toHaveCount(textes.filter((t) => t === 'terminée').length);
    await expect(carte.locator('.sav__etape-etat').first()).toHaveCSS('position', 'absolute');
    await expect(carte.locator('.sav__etapes')).toHaveAttribute('aria-label', 'Avancement de la demande');
  }
  const terminee = cartes(page).nth(3).locator('.sav__etape[data-etat="terminee"] .sav__pastille').first();
  await expect(terminee).toHaveCSS('background-color', 'rgb(15, 29, 56)');
  expect(await terminee.evaluate((el) => getComputedStyle(el, '::before').content)).toContain('✓');
  await expect(page.locator('.sav__demande a, .sav__demande button')).toHaveCount(0);
});

test('navigation du compte : « Mes demandes » repéré ; « Voir toutes mes demandes » du tableau de bord mène à demandes.html', async ({ page }) => {
  await ouvrir(page, 'demandes.html', { connecte: true });
  const courant = page.getByRole('navigation', { name: 'Mon compte' }).locator('[aria-current="page"]');
  await expect(courant).toContainText('Mes demandes');
  await expect(courant.locator('.visuellement-cache')).toHaveText('(page actuelle)');
  const tableau = await page.context().newPage();
  await ouvrir(tableau, 'compte.html', { connecte: true });
  await tableau.getByRole('link', { name: 'Voir toutes mes demandes' }).click();
  await tableau.waitForURL((u) => u.pathname === '/demandes.html');
  await expect(tableau.getByRole('heading', { level: 1, name: 'Mes demandes de service après-vente' })).toBeVisible();
});

test('non connecté : « Connexion requise » avec lien vers la connexion', async ({ page }) => {
  const suivi = await ouvrir(page, 'demandes.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aller à la connexion' })).toHaveAttribute('href', 'connexion.html');
  await expect(cartes(page)).toHaveCount(0);
  expect(suivi.messages).toEqual([]);
});

test('mesures : colonne de 1 024 px au plus à 1440 px, une colonne de cartes à 375 px', async ({ page }) => {
  await ouvrir(page, 'demandes.html', { connecte: true });
  const largeurListe = await page.locator('.sav__demandes').evaluate((el) => el.getBoundingClientRect().width);
  expect(largeurListe).toBeLessThanOrEqual(1024);
  const ligne = await cartes(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(ligne.every((r) => Math.abs(r.left - ligne[0].left) < 1)).toBe(true);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect.poll(async () => (await cartes(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))).every((w) => w < 375)).toBe(true);
  const petit = await cartes(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(petit.every((r, i) => Math.abs(r.left - petit[0].left) < 1 && (i === 0 || r.top > petit[i - 1].top))).toBe(true);
  const infos = await cartes(page).first().evaluate((el) => [el.querySelector('.sav__infos').getBoundingClientRect(), el.querySelector('.sav__etapes').getBoundingClientRect()]);
  expect(infos[1].top).toBeGreaterThan(infos[0].bottom - 1);
});

for (const largeur of LARGEURS) {
  test(`aucun débordement à ${largeur} px : titre de 120 caractères et 10 demandes`, async ({ page }) => {
    const donnees = structuredClone(compte);
    donnees.demandes = Array.from({ length: 10 }, (_, i) => ({ ...compte.demandes[i % 4], id: `SAV-${2000 + i} (exemple)`, titre: i === 0 ? 'T'.repeat(120) : `${'Titre long '.repeat(10)}${i}` }));
    await ouvrir(page, 'demandes.html', { connecte: true }, { largeur, donnees });
    await expect(cartes(page)).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

// Pages du lot dans leurs états : console propre, axe, aucune requête externe
const ETATS = [
  { nom: 'demandes connecté', page: 'demandes.html', preset: { connecte: true }, titre: 'Mes demandes de service après-vente' },
  { nom: 'demandes déconnecté', page: 'demandes.html', preset: {}, titre: 'Connexion requise' },
  { nom: 'sav avec compte', page: 'sav.html', preset: { achat: 'CMD-1037' }, titre: 'Demande de service après-vente' },
  { nom: 'sav sans compte', page: 'sav.html', preset: { acces: 'CMD-1044' }, titre: 'Demande de service après-vente' },
  { nom: 'sav achat manquant', page: 'sav.html', preset: { connecte: true }, titre: 'Demande de service après-vente' },
  { nom: 'sav accès requis', page: 'sav.html', preset: {}, titre: 'Demande de service après-vente' },
  { nom: 'sav-acces', page: 'sav-acces.html', preset: {}, titre: 'Service après-vente sans compte' },
];
for (const largeur of LARGEURS) {
  for (const etat of ETATS) {
    test(`${etat.nom} à ${largeur} px : console propre, axe sans violation, aucune requête externe`, async ({ page }) => {
      const suivi = await ouvrir(page, etat.page, etat.preset, { largeur });
      await expect(page.getByRole('heading', { level: 1, name: etat.titre })).toBeVisible();
      if (etat.page !== 'demandes.html') await page.waitForSelector('html[data-formulaire="pret"]');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      expect(suivi.messages).toEqual([]);
      expect(suivi.externes).toEqual([]);
    });
  }
  test(`demandes vide et confirmation du SAV à ${largeur} px : axe sans violation`, async ({ page }) => {
    const donnees = structuredClone(compte);
    donnees.demandes = donnees.demandes.filter((d) => d.statut !== 'recue');
    await ouvrir(page, 'demandes.html', { connecte: true }, { largeur, donnees });
    await pastille(page, 'Reçue').check({ force: true });
    await expect(page.locator('.achats__vide')).toHaveText('Aucune demande avec ce statut');
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
    const autre = await page.context().newPage();
    const suivi = await ouvrir(autre, 'sav.html', { achat: 'CMD-1044' }, { largeur });
    await autre.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
    await autre.getByRole('radio', { name: 'Autre' }).check({ force: true });
    await autre.getByLabel('Description', { exact: true }).fill('Une description suffisamment longue pour être valide.');
    await autre.getByRole('button', { name: 'Envoyer ma demande' }).click();
    await expect(autre.locator('[data-confirmation]')).toBeFocused();
    expect((await new AxeBuilder({ page: autre }).analyze()).violations.map((v) => v.id)).toEqual([]);
    expect(suivi.messages).toEqual([]);
  });
}

test('JavaScript désactivé : seul le message noscript est visible sur les trois pages', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  for (const adresse of ['sav-acces.html', 'sav.html', 'demandes.html']) {
    await page.goto(`http://localhost:4173/${adresse}`);
    expect((await page.evaluate(() => document.body.innerText)).trim(), adresse).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
