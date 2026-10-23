import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { formaterPrix } from '../../assets/js/diagnostic-logique.js';
import { totauxCommande, trierCommandes } from '../../assets/js/compte-logique.js';

const compte = JSON.parse(readFileSync('data/compte.json', 'utf8'));
const triees = trierCommandes(compte.commandes);
const SESSION = JSON.stringify({ v: 1, connecte: true });

async function ouvrir(page, adresse, { largeur = 1440, donnees = null } = {}) {
  const suivi = { messages: [], externes: [], requetes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => {
    suivi.requetes.push(r.url());
    if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((brut) => {
    if (sessionStorage.getItem('__init')) return;
    sessionStorage.setItem('compte', brut);
    sessionStorage.setItem('__init', '1');
  }, SESSION);
  if (donnees) await page.route('**/data/compte.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(donnees) }));
  await page.goto(`/${adresse}`);
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('html[data-compte="pret"], html[data-formulaire="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test('compte.html : bonjour, 3 commandes les plus récentes avec statut, résumé et total, 2 demandes en cours, liens vers les bonnes pages', async ({ page }) => {
  const suivi = await ouvrir(page, 'compte.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour, Camille' })).toBeVisible();
  await expect(page.getByText('Compte de démonstration — données fictives')).toBeVisible();
  const cartes = page.locator('[data-role="commandes"] .commande');
  await expect(cartes).toHaveCount(3);
  for (const [i, c] of triees.slice(0, 3).entries()) {
    const carte = cartes.nth(i);
    await expect(carte.locator('.commande__numero')).toHaveText(`Commande n° ${c.id} (exemple)`);
    await expect(carte.locator('.statut__texte')).toHaveText(compte.statuts.find((s) => s.id === c.statut).libelle);
    await expect(carte.locator('.commande__total')).toHaveText(`Total TTC : ${formaterPrix(totauxCommande(c.lignes).total)}`);
    await expect(carte.locator('.commande__lignes li')).toHaveCount(c.lignes.length);
  }
  await expect(page.locator('[data-role="commandes"]')).not.toContainText('CMD-1029');
  const demandes = page.locator('[data-role="sav-en-cours"] .demande');
  await expect(demandes).toHaveCount(2);
  await expect(demandes.nth(0)).toContainText('SAV-1001 (exemple)');
  await expect(demandes.nth(1)).toContainText('SAV-1002 (exemple)');
  await expect(page.getByRole('link', { name: 'Voir tous mes achats' })).toHaveAttribute('href', 'achats.html');
  await expect(page.getByRole('link', { name: 'Voir toutes mes demandes' })).toHaveAttribute('href', 'wireframes/demandes.html');
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
  await page.getByRole('link', { name: 'Voir toutes mes demandes' }).click();
  await page.waitForURL((u) => u.pathname === '/wireframes/demandes.html');
});

test('« Voir le détail » écrit achat dans la session et ouvre achat.html, sans paramètre dans l\'adresse', async ({ page }) => {
  await ouvrir(page, 'compte.html');
  await page.locator('.commande').nth(2).getByRole('button', { name: 'Voir le détail' }).click();
  await page.waitForURL((u) => u.pathname === '/achat.html');
  expect(await page.evaluate(() => sessionStorage.getItem('achat'))).toBe('CMD-1037');
  expect(new URL(page.url()).search).toBe('');
  expect(await page.evaluate(() => Object.keys(sessionStorage).sort())).toEqual(['__init', 'achat', 'compte']);
});

test('achats.html : 4 commandes par date décroissante ; chaque pastille filtre ; « Tous » rétablit ; flèches dans le groupe', async ({ page }) => {
  await ouvrir(page, 'achats.html');
  const numeros = page.locator('.commande__numero');
  await expect(numeros).toHaveText(triees.map((c) => `Commande n° ${c.id} (exemple)`));
  await expect(page.getByRole('group', { name: 'Statut' }).getByRole('radio')).toHaveCount(5);
  for (const statut of compte.statuts) {
    await page.getByRole('radio', { name: statut.libelle, exact: true }).check({ force: true });
    const attendues = triees.filter((c) => c.statut === statut.id);
    expect(attendues).toHaveLength(1);
    await expect(numeros).toHaveText([`Commande n° ${attendues[0].id} (exemple)`]);
    await expect(page.locator('.statut__texte')).toHaveText([statut.libelle]);
  }
  await page.getByRole('radio', { name: 'Tous', exact: true }).check({ force: true });
  await expect(numeros).toHaveCount(4);
  await expect(page.locator('.achats__vide')).toBeEmpty();
  await page.getByRole('radio', { name: 'Tous', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'En préparation' })).toBeChecked();
  await expect(numeros).toHaveText(['Commande n° CMD-1051 (exemple)']);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Expédié' })).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'En préparation' })).toBeChecked();
});

test('message vide : un statut sans achat affiche « Aucun achat avec ce statut »', async ({ page }) => {
  const donnees = structuredClone(compte);
  donnees.commandes = donnees.commandes.filter((c) => c.statut !== 'livre');
  await ouvrir(page, 'achats.html', { donnees });
  await page.getByRole('radio', { name: 'Livré', exact: true }).check({ force: true });
  await expect(page.locator('.commande')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Aucun achat avec ce statut' })).toBeVisible();
});

test('navigation du compte : page courante repérée (aria-current et texte masqué) sur les trois pages', async ({ page }) => {
  for (const [adresse, courant] of [['compte.html', 'Tableau de bord'], ['achats.html', 'Mes achats'], ['informations.html', 'Mes informations']]) {
    await ouvrir(page, adresse);
    const nav = page.getByRole('navigation', { name: 'Mon compte' });
    await expect(nav.locator('[aria-current="page"]'), adresse).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]'), adresse).toContainText(courant);
    await expect(nav.locator('[aria-current="page"] .visuellement-cache'), adresse).toHaveText('(page actuelle)');
    await expect(nav.getByRole('link'), adresse).toHaveCount(4);
    await expect(nav.getByRole('button', { name: 'Se déconnecter' }), adresse).toBeVisible();
    page.removeAllListeners();
  }
});

test('informations.html : champs préremplis ; envoi à vide ; code postal à 4 chiffres ; envoi valide : message, valeurs d\'origine, rien conservé', async ({ page }) => {
  const suivi = await ouvrir(page, 'informations.html');
  const valeurs = { Prénom: 'Camille', Nom: 'Exemple', 'E-mail': 'client.demo@exemple.test', Adresse: "1 rue de l'Exemple", 'Code postal': '00000', Ville: 'Exempleville' };
  for (const [libelle, valeur] of Object.entries(valeurs)) await expect(page.getByLabel(libelle, { exact: true })).toHaveValue(valeur);
  await expect(page.getByLabel('Suivi de mes commandes par e-mail')).toBeChecked();
  await expect(page.getByLabel('Informations sur mes demandes de SAV par e-mail')).not.toBeChecked();
  const resume = page.locator('[data-resume]');
  for (const libelle of ['Prénom', 'Nom', 'E-mail', 'Adresse', 'Code postal', 'Ville']) await page.getByLabel(libelle, { exact: true }).fill('');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(resume).toBeFocused();
  await expect(resume).toContainText('Le formulaire contient 6 erreurs à corriger :');
  await expect(resume.getByRole('link')).toHaveText(['Prénom', 'Nom', 'E-mail', 'Adresse', 'Code postal', 'Ville']);
  await page.getByLabel('Prénom', { exact: true }).fill('Camille');
  await page.getByLabel('Nom', { exact: true }).fill('Exemple');
  await page.getByLabel('E-mail', { exact: true }).fill('client.demo@exemple.test');
  await page.getByLabel('Adresse', { exact: true }).fill("1 rue de l'Exemple");
  await page.getByLabel('Ville', { exact: true }).fill('Exempleville');
  await page.getByLabel('Code postal', { exact: true }).fill('1234');
  await expect(page.locator('#erreur-code-postal')).toHaveText('Le code postal compte exactement 5 chiffres.');
  await page.getByLabel('Code postal', { exact: true }).fill('75 001');
  await page.getByLabel('Téléphone (facultatif)').fill('06 00 00 00 00');
  await page.getByLabel('Informations sur mes demandes de SAV par e-mail').check();
  const avant = suivi.requetes.length;
  const url = page.url();
  const cles = await page.evaluate(() => Object.keys(sessionStorage).sort());
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  const statut = page.getByRole('status').filter({ hasText: 'Enregistrement simulé' });
  await expect(statut).toHaveText('Enregistrement simulé : rien n\'a été conservé (exemple).');
  await expect(statut).toBeFocused();
  await expect(resume).toBeHidden();
  for (const [libelle, valeur] of Object.entries(valeurs)) await expect(page.getByLabel(libelle, { exact: true })).toHaveValue(valeur);
  await expect(page.getByLabel('Téléphone (facultatif)')).toHaveValue('01 00 00 00 00');
  await expect(page.getByLabel('Informations sur mes demandes de SAV par e-mail')).not.toBeChecked();
  await expect(page.getByLabel('Suivi de mes commandes par e-mail')).toBeChecked();
  expect(suivi.requetes.length).toBe(avant);
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => Object.keys(sessionStorage).sort())).toEqual(cles);
  expect(await page.evaluate(() => [localStorage.length, document.cookie])).toEqual([0, '']);
  expect(suivi.messages).toEqual([]);
});

test('mesures à 1440 px : commandes et demandes en rapport 2 / 1 aux hauts alignés ; carte d\'informations de 896 px au plus, paires côte à côte ; une colonne à 375 px', async ({ page }) => {
  await ouvrir(page, 'compte.html');
  const [a, b] = await Promise.all(['commandes', 'sav-en-cours'].map((r) => page.locator(`[data-role="${r}"]`).boundingBox()));
  expect(a.width / b.width).toBeGreaterThanOrEqual(1.8);
  expect(a.width / b.width).toBeLessThanOrEqual(2.2);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(2);
  expect(a.x).toBeLessThan(b.x);
  await ouvrir(page, 'informations.html');
  const carte = await page.locator('.compte__carte-info').boundingBox();
  expect(carte.width).toBeLessThanOrEqual(896);
  const [p, n, adresse, cp, ville] = await Promise.all(['prenom', 'nom', 'adresse', 'code-postal', 'ville'].map((id) => page.locator(`#${id}`).boundingBox()));
  expect(Math.abs(p.y - n.y)).toBeLessThanOrEqual(2);
  expect(p.x).toBeLessThan(n.x);
  expect(Math.abs(cp.y - ville.y)).toBeLessThanOrEqual(2);
  expect(adresse.width).toBeGreaterThan(p.width * 1.5);
  await page.setViewportSize({ width: 375, height: 900 });
  const [p2, n2] = await Promise.all(['prenom', 'nom'].map((id) => page.locator(`#${id}`).boundingBox()));
  expect(Math.abs(p2.x - n2.x)).toBeLessThanOrEqual(1);
  expect(p2.y).toBeLessThan(n2.y);
  await page.goto('/compte.html');
  await page.waitForSelector('html[data-compte="pret"]');
  const [c1, c2] = await Promise.all(['commandes', 'sav-en-cours'].map((r) => page.locator(`[data-role="${r}"]`).boundingBox()));
  expect(Math.abs(c1.x - c2.x)).toBeLessThanOrEqual(1);
  expect(c1.y).toBeLessThan(c2.y);
});

test('robustesse : titre de 120 caractères, total à 7 chiffres et 10 lignes, aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  const donnees = structuredClone(compte);
  const modele = donnees.commandes[0].lignes[0];
  donnees.commandes[0].lignes = Array.from({ length: 10 }, () => ({ ...modele, titre: 'T'.repeat(120), quantite: 10, prixUnitaire: { materiel: 1234567, pose: 0 } }));
  for (const largeur of [375, 768, 1440]) {
    for (const adresse of ['compte.html', 'achats.html']) {
      await ouvrir(page, adresse, { largeur, donnees });
      expect(await sansDebordement(page), `${adresse} ${largeur}`).toBe(true);
      await expect(page.locator('.commande').first().locator('.commande__lignes li')).toHaveCount(10);
      await page.unrouteAll();
      page.removeAllListeners();
    }
  }
});

for (const largeur of [375, 768, 1440]) {
  test(`axe, console propre et aucun débordement à ${largeur} px sur compte, achats et informations`, async ({ page }) => {
    for (const adresse of ['compte.html', 'achats.html', 'informations.html']) {
      const suivi = await ouvrir(page, adresse, { largeur });
      expect(suivi.messages, adresse).toEqual([]);
      expect(suivi.externes, adresse).toEqual([]);
      expect(await sansDebordement(page), adresse).toBe(true);
      await page.screenshot({ path: `test-results/compte-b-${adresse.replace('.html', '')}-${largeur}.png`, fullPage: true });
      const resultats = await new AxeBuilder({ page }).analyze();
      expect(resultats.violations.map((v) => v.id), adresse).toEqual([]);
      page.removeAllListeners();
    }
  });
}

test('filtre « Livré » puis « Tous » et formulaire en erreur : captures et axe', async ({ page }) => {
  await ouvrir(page, 'achats.html', { largeur: 375 });
  await page.getByRole('radio', { name: 'Livré', exact: true }).check({ force: true });
  await page.screenshot({ path: 'test-results/compte-b-achats-livre-375.png', fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.getByRole('radio', { name: 'Tous', exact: true }).check({ force: true });
  await page.screenshot({ path: 'test-results/compte-b-achats-tous-375.png', fullPage: true });
  page.removeAllListeners();
  await ouvrir(page, 'informations.html', { largeur: 375 });
  await page.getByLabel('Prénom', { exact: true }).fill('');
  await page.getByLabel('Code postal', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.screenshot({ path: 'test-results/compte-b-informations-erreurs-375.png', fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
});

// Tab, puis attente du changement d'élément actif ; la parcours part du premier lien de la navigation du compte
async function parcourir(page, nombre) {
  const nom = () => page.evaluate(() => {
    const el = globalThis.document.activeElement;
    return el.closest('label')?.textContent.trim() ?? el.getAttribute('aria-label') ?? (el.id || el.textContent.trim());
  });
  await page.locator('.nav-compte__lien').first().focus();
  const vus = [];
  for (let i = 0; i < nombre; i++) {
    vus.push(await nom());
    const avant = await page.evaluateHandle(() => globalThis.document.activeElement);
    await page.keyboard.press('Tab');
    await page.waitForFunction((el) => globalThis.document.activeElement !== el, avant);
  }
  return vus;
}

test('clavier : Tab parcourt la navigation du compte puis les boutons « Voir le détail » du tableau de bord', async ({ page }) => {
  await ouvrir(page, 'compte.html');
  expect(await parcourir(page, 9)).toEqual(['Tableau de bord (page actuelle)', 'Mes achats', 'Mes demandes', 'Mes informations', 'Se déconnecter',
    'Voir le détail de la commande CMD-1051', 'Voir le détail de la commande CMD-1044', 'Voir le détail de la commande CMD-1037', 'Voir tous mes achats']);
});

test('clavier : Tab parcourt la navigation du compte, les pastilles (un seul arrêt) puis les boutons « Voir le détail » des achats', async ({ page }) => {
  await ouvrir(page, 'achats.html');
  expect((await parcourir(page, 8)).slice(4)).toEqual(['Se déconnecter', 'Tous', 'Voir le détail de la commande CMD-1051', 'Voir le détail de la commande CMD-1044']);
});

test('clavier : Tab parcourt la navigation du compte puis les champs du formulaire d\'informations dans l\'ordre', async ({ page }) => {
  await ouvrir(page, 'informations.html');
  expect((await parcourir(page, 15)).slice(5)).toEqual(['prenom', 'nom', 'email', 'telephone', 'adresse', 'complement', 'code-postal', 'ville', 'Suivi de mes commandes par e-mail', 'Informations sur mes demandes de SAV par e-mail']);
});
