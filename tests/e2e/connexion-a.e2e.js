import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SESSION = JSON.stringify({ v: 1, connecte: true });
const PAGES_PROTEGEES = ['compte.html', 'achats.html', 'achat.html', 'informations.html'];

function suivre(page) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  return suivi;
}

// session : null (vide), 'connecte' (compte préparé) ou 'indisponible' (stockage qui lève une exception)
async function ouvrir(page, adresse, { largeur = 1440, session = null } = {}) {
  const suivi = suivre(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (session === 'connecte') {
    await page.addInitScript((brut) => {
      if (sessionStorage.getItem('__init')) return;
      sessionStorage.setItem('compte', brut);
      sessionStorage.setItem('__init', '1');
    }, SESSION);
  } else if (session === 'indisponible') {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('refusé', 'SecurityError'); } });
    });
  }
  await page.goto(`/${adresse}`);
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

const resume = (page) => page.locator('[data-resume]');
const champEmail = (page) => page.getByLabel('E-mail', { exact: true });
const champMdp = (page) => page.getByLabel('Mot de passe', { exact: true });
const seConnecter = (page) => page.getByRole('button', { name: 'Se connecter' });

for (const largeur of [375, 768, 1440]) {
  test(`connexion.html à ${largeur} px : console propre, pas de débordement, axe, aucune requête externe`, async ({ page }) => {
    const suivi = await ouvrir(page, 'connexion.html', { largeur });
    await page.waitForSelector('html[data-formulaire="pret"]');
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion à mon compte' })).toBeVisible();
    await expect(page.getByText('Connexion simulée : tout e-mail valide ouvre le compte de démonstration.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Compte de démonstration' })).toBeVisible();
    await expect(page.getByText('client.demo@exemple.test')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Service après-vente sans compte' })).toHaveAttribute('href', 'wireframes/sav-acces.html');
    await expect(champMdp(page)).toHaveAttribute('type', 'password');
    await page.screenshot({ path: `test-results/connexion-a-vide-${largeur}.png`, fullPage: true });
    await seConnecter(page).click();
    await expect(resume(page)).toBeFocused();
    await page.screenshot({ path: `test-results/connexion-a-erreurs-${largeur}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => v.id)).toEqual([]);
  });
}

test('envoi à vide : récapitulatif focalisé, deux erreurs (e-mail, mot de passe), liens vers les champs ; e-mail invalide : message', async ({ page }) => {
  await ouvrir(page, 'connexion.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await expect(resume(page)).toBeHidden();
  await seConnecter(page).click();
  await expect(resume(page)).toBeFocused();
  await expect(resume(page)).toHaveAttribute('role', 'alert');
  await expect(resume(page)).toContainText('Le formulaire contient 2 erreurs à corriger :');
  await expect(resume(page).getByRole('link')).toHaveText(['E-mail', 'Mot de passe']);
  await expect(page.locator('#erreur-email')).toHaveText('Saisissez votre adresse e-mail.');
  await expect(page.locator('#erreur-mot-de-passe')).toHaveText('Saisissez votre mot de passe.');
  await resume(page).getByRole('link', { name: 'Mot de passe' }).click();
  await expect(champMdp(page)).toBeFocused();
  await resume(page).getByRole('link', { name: 'E-mail' }).click();
  await expect(champEmail(page)).toBeFocused();
  await champEmail(page).fill('pas-un-email');
  await expect(page.locator('#erreur-email')).toContainText("L'adresse e-mail n'est pas valide.");
  await champEmail(page).fill('camille@exemple.test');
  await expect(page.locator('#erreur-email')).toBeHidden();
  await expect(resume(page)).toContainText('1 erreur à corriger');
  await expect(page).toHaveURL(/\/connexion\.html$/);
});

test('« Se connecter » valide : champs vidés, sessionStorage.compte = { v: 1, connecte: true }, rien d\'autre conservé, rien dans l\'URL', async ({ page, context }) => {
  await ouvrir(page, 'connexion.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  // l'état est relevé au moment où la session s'ouvre (juste avant la navigation vers compte.html)
  const releves = [];
  await page.exposeFunction('relever', (etat) => { releves.push(etat); });
  await page.evaluate(() => {
    document.addEventListener('compte:modifie', () => {
      window.relever({
        email: document.getElementById('email').value,
        motDePasse: document.getElementById('mot-de-passe').value,
        cles: Object.keys(sessionStorage),
        compte: sessionStorage.getItem('compte'),
        local: localStorage.length,
        cookie: document.cookie,
        contenu: document.documentElement.outerHTML.includes('mot-de-passe-fictif') || document.documentElement.outerHTML.includes('camille@exemple.test'),
        url: location.href,
      });
    });
  });
  await champEmail(page).fill('camille@exemple.test');
  await champMdp(page).fill('mot-de-passe-fictif');
  await seConnecter(page).click();
  await expect.poll(() => releves.length).toBeGreaterThan(0);
  const etat = releves[0];
  expect([etat.email, etat.motDePasse]).toEqual(['', '']);
  expect(etat.cles).toEqual(['compte']);
  expect(JSON.parse(etat.compte)).toEqual({ v: 1, connecte: true });
  expect([etat.local, etat.cookie, etat.contenu]).toEqual([0, '', false]);
  expect(new URL(etat.url).search).toBe('');
  await page.waitForURL((u) => u.pathname === '/compte.html');
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual(['compte']);
});

test('« Se connecter » valide mène à compte.html, sans paramètre ni fragment', async ({ page }) => {
  await ouvrir(page, 'connexion.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await champEmail(page).fill('camille@exemple.test');
  await champMdp(page).fill('mot-de-passe-fictif');
  await seConnecter(page).click();
  await page.waitForURL((u) => u.pathname === '/compte.html');
  const url = new URL(page.url());
  expect([url.search, url.hash]).toEqual(['', '']);
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour, Camille' })).toBeVisible();
});

test('« Accéder au compte de démonstration » : même effet, arrivée sur compte.html, seule la clé compte est écrite', async ({ page }) => {
  await ouvrir(page, 'connexion.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.getByRole('button', { name: 'Accéder au compte de démonstration' }).click();
  await page.waitForURL((u) => u.pathname === '/compte.html');
  expect(new URL(page.url()).search).toBe('');
  const etat = await page.evaluate(() => ({ cles: Object.keys(sessionStorage), compte: sessionStorage.getItem('compte'), local: localStorage.length, cookie: document.cookie }));
  expect(etat.cles).toEqual(['compte']);
  expect(JSON.parse(etat.compte)).toEqual({ v: 1, connecte: true });
  expect([etat.local, etat.cookie]).toEqual([0, '']);
});

for (const [connecte, cible] of [[false, 'connexion.html'], [true, 'compte.html']]) {
  for (const page_ of ['index.html', 'produit.html', 'panier.html']) {
    test(`bascule « Mon compte » sur ${page_} ${connecte ? 'connecté' : 'non connecté'} : en-tête, menu et pied mènent à ${cible}`, async ({ page }) => {
      await ouvrir(page, page_, { session: connecte ? 'connecte' : null });
      const liens = page.locator('.entete a, .pied a').filter({ hasText: 'Mon compte' });
      expect(await liens.count()).toBe(2); // menu (en-tête) et pied
      for (const href of await liens.evaluateAll((els) => els.map((el) => el.getAttribute('href')))) expect(href).toBe(cible);
    });
  }
}

test('garde : session vide, chaque page protégée affiche « Connexion requise » avec le lien, en-tête et pied inchangés', async ({ page }) => {
  for (const adresse of PAGES_PROTEGEES) {
    const suivi = await ouvrir(page, adresse);
    await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' }), adresse).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Aller à la connexion' }), adresse).toHaveAttribute('href', 'connexion.html');
    await expect(page.locator('header.entete'), adresse).toBeVisible();
    await expect(page.locator('footer.pied'), adresse).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Mon compte' }), adresse).toBeHidden();
    expect(suivi.messages, adresse).toEqual([]);
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('request');
  }
});

test('stockage indisponible : message de connexion dédié, aucune erreur de console, page toujours en place', async ({ page }) => {
  const suivi = await ouvrir(page, 'connexion.html', { session: 'indisponible' });
  await page.waitForSelector('html[data-formulaire="pret"]');
  await expect(page.locator('[data-stockage]')).toBeHidden();
  await page.getByRole('button', { name: 'Accéder au compte de démonstration' }).click();
  await expect(page.locator('[data-stockage]')).toBeVisible();
  await expect(page.locator('[data-stockage]')).toContainText('La session du navigateur est indisponible');
  await expect(page).toHaveURL(/\/connexion\.html$/);
  await champEmail(page).fill('camille@exemple.test');
  await champMdp(page).fill('mot-de-passe-fictif');
  await seConnecter(page).click();
  await expect(page.locator('[data-stockage]')).toBeVisible();
  await expect(page).toHaveURL(/\/connexion\.html$/);
  expect(suivi.messages).toEqual([]);
  const garde = await ouvrir(page, 'compte.html', { session: 'indisponible' });
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' })).toBeVisible();
  expect(garde.messages).toEqual([]);
});

test('session déjà connectée : connexion.html affiche l\'état connecté ; « Se déconnecter » supprime compte et rétablit les liens', async ({ page }) => {
  await ouvrir(page, 'connexion.html', { session: 'connecte' });
  await page.waitForSelector('html[data-formulaire="pret"]');
  await expect(page.getByText('Vous êtes connecté (compte de démonstration)')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aller au tableau de bord' })).toHaveAttribute('href', 'compte.html');
  await expect(page.locator('form.formulaire')).toBeHidden();
  await expect(page.locator('[data-role="demo"]')).toBeHidden();
  const liens = page.locator('.entete a, .pied a').filter({ hasText: 'Mon compte' });
  for (const href of await liens.evaluateAll((els) => els.map((el) => el.getAttribute('href')))) expect(href).toBe('compte.html');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  expect(await page.evaluate(() => sessionStorage.getItem('compte'))).toBeNull();
  await expect(page.locator('form.formulaire')).toBeVisible();
  await expect(page.getByText('Vous êtes connecté (compte de démonstration)')).toBeHidden();
  for (const href of await liens.evaluateAll((els) => els.map((el) => el.getAttribute('href')))) expect(href).toBe('connexion.html');
});
