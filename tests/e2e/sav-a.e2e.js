import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SESSION = JSON.stringify({ v: 1, connecte: true });

function suivre(page) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  return suivi;
}

// session : { compte: bool, achat, acces } préparée une seule fois ; 'indisponible' : sessionStorage qui lève une exception
async function ouvrir(page, adresse, { largeur = 1440, session = {}, indisponible = false } = {}) {
  const suivi = suivre(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (indisponible) {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('refusé', 'SecurityError'); } });
    });
  } else {
    await page.addInitScript(({ compte, achat, acces, SESSION: brut }) => {
      if (sessionStorage.getItem('__init')) return;
      if (compte) sessionStorage.setItem('compte', brut);
      if (achat) sessionStorage.setItem('achat', achat);
      if (acces) sessionStorage.setItem('acces-sav', acces);
      sessionStorage.setItem('__init', '1');
    }, { ...session, SESSION });
  }
  await page.goto(`/${adresse}`);
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

const resume = (page) => page.locator('[data-resume]');
const numero = (page) => page.getByLabel('Numéro de commande', { exact: true });
const email = (page) => page.getByLabel('E-mail de la commande', { exact: true });
const continuer = (page) => page.getByRole('button', { name: 'Continuer' });
const cles = (page) => page.evaluate(() => Object.keys(sessionStorage).filter((c) => c !== '__init').sort());

for (const largeur of [375, 768, 1440]) {
  test(`sav-acces.html à ${largeur} px : console propre, pas de débordement, axe, aucune requête externe`, async ({ page }) => {
    const suivi = await ouvrir(page, 'sav-acces.html', { largeur });
    await page.waitForSelector('html[data-formulaire="pret"]');
    await expect(page.getByRole('heading', { level: 1, name: 'Service après-vente sans compte' })).toBeVisible();
    await expect(page.getByText("Démonstrateur : tout numéro et tout e-mail bien formés ouvrent une commande d'exemple. Rien n'est conservé.")).toBeVisible();
    await expect(page.getByText('Exemple : CMD-1037')).toBeVisible();
    await expect(page.getByText('Exemple : client.demo@exemple.test')).toBeVisible();
    await continuer(page).click(); // récapitulatif affiché : axe le contrôle aussi
    await expect(resume(page)).toBeVisible();
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test('sav-acces.html : envoi à vide (récapitulatif focalisé, 2 erreurs, liens), numéro invalide, e-mail invalide', async ({ page }) => {
  await ouvrir(page, 'sav-acces.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await expect(resume(page)).toBeHidden();
  await continuer(page).click();
  await expect(resume(page)).toBeVisible();
  await expect(resume(page)).toBeFocused();
  await expect(resume(page)).toHaveAttribute('role', 'alert');
  await expect(resume(page)).toContainText('Le formulaire contient 2 erreurs à corriger :');
  await expect(resume(page).getByRole('link')).toHaveText(['Numéro de commande', 'E-mail']);
  await expect(page.locator('#erreur-numero')).toHaveText('Saisissez votre numéro de commande.');
  await expect(page.locator('#erreur-email')).toHaveText("Saisissez l'adresse e-mail.");
  await resume(page).getByRole('link', { name: 'E-mail' }).click();
  await expect(email(page)).toBeFocused();
  await resume(page).getByRole('link', { name: 'Numéro de commande' }).click();
  await expect(numero(page)).toBeFocused();
  expect(new URL(page.url()).hash).toBe('');

  await numero(page).fill('12');
  await email(page).fill('pas-un-email');
  await expect(page.locator('#erreur-numero')).toContainText('Le numéro de commande doit compter de 3 à 8 chiffres');
  await expect(page.locator('#erreur-email')).toContainText("L'adresse e-mail n'est pas valide");
  await expect(numero(page)).toHaveAttribute('aria-invalid', 'true');
  await numero(page).fill('CMD-1037');
  await expect(page.locator('#erreur-numero')).toBeHidden();
  await expect(resume(page)).toContainText('Le formulaire contient 1 erreur à corriger :');
  await email(page).fill('client.demo@exemple.test');
  await expect(resume(page)).toBeHidden();
});

test('sav-acces.html : envoi valide, champs vidés avant la navigation, acces-sav = CMD-1037, aucune autre clé, aucun cookie, URL sans paramètre', async ({ page, context }) => {
  const suivi = await ouvrir(page, 'sav-acces.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  // L'événement « navigate » part avant la navigation : on relève alors les champs de la page de départ, qui doivent déjà être vides.
  let avantNavigation = null;
  page.on('console', (m) => { if (m.text().startsWith('AVANT:')) avantNavigation = JSON.parse(m.text().slice(6)); });
  await page.evaluate(() => {
    window.navigation.addEventListener('navigate', () => {
      console.log(`AVANT:${JSON.stringify([document.getElementById('numero').value, document.getElementById('email').value])}`);
    });
  });
  await numero(page).fill('CMD-1037');
  await email(page).fill('client.demo@exemple.test');
  await continuer(page).click();
  await page.waitForURL((u) => u.pathname === '/sav.html');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  expect(avantNavigation).toEqual(['', '']);
  expect(await cles(page)).toEqual(['acces-sav']);
  expect(await page.evaluate(() => sessionStorage.getItem('acces-sav'))).toBe('CMD-1037');
  expect(await page.evaluate(() => [localStorage.length, document.cookie])).toEqual([0, '']);
  expect(await context.cookies()).toEqual([]);
  expect(JSON.stringify(await page.evaluate(() => ({ ...sessionStorage })))).not.toContain('exemple.test');
  expect(suivi.messages).toEqual([]);
  expect(suivi.externes).toEqual([]);
});

test('sav-acces.html : numéro bien formé mais inconnu (9999) : acces-sav = commande par défaut', async ({ page }) => {
  await ouvrir(page, 'sav-acces.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await numero(page).fill('9999');
  await email(page).fill('autre@exemple.test');
  await continuer(page).click();
  await page.waitForURL((u) => u.pathname === '/sav.html');
  expect(await page.evaluate(() => sessionStorage.getItem('acces-sav'))).toBe('CMD-1051');
  expect(await cles(page)).toEqual(['acces-sav']);
});

test('sav-acces.html : stockage indisponible, message dédié, aucune navigation, console propre', async ({ page }) => {
  const suivi = await ouvrir(page, 'sav-acces.html', { indisponible: true });
  await page.waitForSelector('html[data-formulaire="pret"]');
  await numero(page).fill('CMD-1037');
  await email(page).fill('client.demo@exemple.test');
  await continuer(page).click();
  const message = page.locator('[data-stockage]');
  await expect(message).toBeVisible();
  await expect(message).toBeFocused();
  await expect(message).toContainText("La session du navigateur est indisponible : l'accès au service après-vente ne peut pas s'ouvrir.");
  expect(new URL(page.url()).pathname).toBe('/sav-acces.html');
  expect(suivi.messages).toEqual([]);
});

test('sav-acces.html : visiteur connecté, phrase et lien vers achats.html ; visiteur non connecté : rien', async ({ page }) => {
  await ouvrir(page, 'sav-acces.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await expect(page.locator('[data-connecte]')).toBeHidden();
  const connecte = await page.context().newPage();
  await ouvrir(connecte, 'sav-acces.html', { session: { compte: true } });
  await connecte.waitForSelector('html[data-formulaire="pret"]');
  const zone = connecte.locator('[data-connecte]');
  await expect(zone).toBeVisible();
  await expect(zone).toContainText('Vous êtes connecté : vos commandes se trouvent dans votre compte.');
  await expect(zone.getByRole('link', { name: 'Voir mes achats' })).toHaveAttribute('href', 'achats.html');
  await expect(connecte.getByRole('link', { name: "J'ai un compte : me connecter" })).toHaveAttribute('href', 'connexion.html');
});

for (const largeur of [375, 1440]) {
  test(`liens vers le SAV à ${largeur} px : pied de l'accueil, connexion, retour à la connexion`, async ({ page }) => {
    await ouvrir(page, 'index.html', { largeur });
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.locator('footer').getByRole('link', { name: 'Service après-vente', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/sav-acces.html');
    await expect(page.getByRole('heading', { level: 1, name: 'Service après-vente sans compte' })).toBeVisible();
    await page.getByRole('link', { name: "J'ai un compte : me connecter" }).click();
    await page.waitForURL((u) => u.pathname === '/connexion.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    await page.getByRole('link', { name: 'Service après-vente sans compte' }).click();
    await page.waitForURL((u) => u.pathname === '/sav-acces.html');
  });
}

test('sav.html sans contexte : « Accès au SAV requis », liens vers sav-acces.html et connexion.html ; acces-sav invalide : même état', async ({ page }) => {
  const suivi = await ouvrir(page, 'sav.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Demande de service après-vente' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Accès au SAV requis' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Accéder au service après-vente' })).toHaveAttribute('href', 'sav-acces.html');
  await expect(page.getByRole('link', { name: 'Me connecter' })).toHaveAttribute('href', 'connexion.html');
  await expect(page.locator('form')).toBeHidden();
  expect(suivi.messages).toEqual([]);
  const invalide = await page.context().newPage();
  await ouvrir(invalide, 'sav.html', { session: { acces: 'CMD-12' } });
  await expect(invalide.getByRole('heading', { level: 2, name: 'Accès au SAV requis' })).toBeVisible();
});

test('sav.html connecté sans achat : « Aucun achat sélectionné » avec lien vers achats.html', async ({ page }) => {
  const suivi = await ouvrir(page, 'sav.html', { session: { compte: true } });
  await expect(page.getByRole('heading', { level: 2, name: 'Aucun achat sélectionné' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir mes achats' })).toHaveAttribute('href', 'achats.html');
  expect(suivi.messages).toEqual([]);
});

test('demandes.html non connecté : « Connexion requise » ; connecté : navigation du compte avec « Mes demandes » repéré', async ({ page }) => {
  const suivi = await ouvrir(page, 'demandes.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Connexion requise' })).toBeVisible();
  const connecte = await page.context().newPage();
  const suivi2 = await ouvrir(connecte, 'demandes.html', { session: { compte: true } });
  await expect(connecte.getByRole('heading', { level: 1, name: 'Mes demandes de service après-vente' })).toBeVisible();
  await expect(connecte.getByRole('navigation', { name: 'Mon compte' }).locator('[aria-current="page"]')).toContainText('Mes demandes');
  expect(suivi.messages).toEqual([]);
  expect(suivi2.messages).toEqual([]);
});

test('JavaScript désactivé : sur les trois pages seul le message noscript est visible', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  for (const adresse of ['sav-acces.html', 'sav.html', 'demandes.html']) {
    await page.goto(`http://localhost:4173/${adresse}`);
    expect((await page.evaluate(() => document.body.innerText)).trim(), adresse).toBe('Ce démonstrateur nécessite JavaScript');
  }
  await contexte.close();
});
