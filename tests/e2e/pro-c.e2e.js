import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const champ = (page, nom) => page.getByLabel(nom, { exact: true });
const envoyer = (page) => page.getByRole('button', { name: 'Envoyer ma candidature' });
const confirmation = (page) => page.locator('[data-role="confirmation"]');
const formulaire = (page) => page.locator('form.formulaire');
const SAISIES = { societe: 'Zorglub Exemple SARL', siret: '12345678901234', contact: 'Zébulon Dupondt', email: 'zebulon@zorglub-exemple.fr', telephone: '0612345678', description: 'Des clapets anti-retour (exemple).' };

async function ouvrir(page, largeur = 1440, avantChargement = null) {
  const suivi = { requetes: [], externes: [], messages: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => {
    suivi.requetes.push(r.url());
    if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (avantChargement) await avantChargement();
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

async function remplir(page, { telephone = true, message = '' } = {}) {
  await champ(page, 'Société').fill(SAISIES.societe);
  await champ(page, 'Numéro SIRET').fill(SAISIES.siret);
  await champ(page, 'Prénom et nom du contact').fill(SAISIES.contact);
  await champ(page, 'E-mail professionnel').fill(SAISIES.email);
  if (telephone) await champ(page, 'Téléphone (facultatif)').fill(SAISIES.telephone);
  await page.getByLabel('Inondations et crues').check();
  await page.getByLabel('Feux de forêt').check();
  await champ(page, 'Description de vos produits').fill(SAISIES.description);
  if (message) await champ(page, 'Message (facultatif)').fill(message);
  await page.getByLabel("J'accepte d'être recontacté à propos de ma candidature.").check();
}

const etatStockage = (page) => page.evaluate(async () => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie, (await indexedDB.databases()).map((b) => b.name)]));

test('envoi valide : confirmation focalisée, aucune saisie répétée, aucun réseau, aucun stockage, URL inchangée', async ({ page, context }) => {
  const suivi = await ouvrir(page);
  const avant = await etatStockage(page);
  const cookies = await context.cookies();
  suivi.requetes.length = 0;
  await envoyer(page).click(); // d'abord en erreur
  await expect(page.locator('[data-resume]')).toBeVisible();
  await remplir(page);
  await envoyer(page).click();
  await expect(formulaire(page)).toBeHidden();
  await expect(confirmation(page)).toBeVisible();
  await expect(confirmation(page).locator('[role="status"]')).toBeFocused();
  await expect(confirmation(page)).toContainText('Candidature reçue (exemple)');
  await expect(confirmation(page)).toContainText('PRO-000 (exemple)');
  await expect(confirmation(page)).toContainText('Réponse sous 5 jours ouvrés (exemple).');
  await expect(confirmation(page).locator('li')).toHaveText(['Étude de votre dossier', 'Prise de contact par un conseiller', 'Validation de votre catalogue']);
  await expect(confirmation(page)).toContainText("Aucune donnée n'a été envoyée ni enregistrée.");
  await expect(confirmation(page).getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', 'index.html');
  const dom = await page.evaluate(() => ({ html: document.documentElement.outerHTML, texte: document.body.innerText, valeurs: [...document.querySelectorAll('input, textarea')].map((e) => e.value + (e.checked ? 'coche' : '')) }));
  for (const valeur of Object.values(SAISIES)) {
    expect(dom.html, valeur).not.toContain(valeur);
    expect(dom.texte, valeur).not.toContain(valeur);
  }
  expect(dom.valeurs.filter((v) => v !== '' && v !== 'on')).toEqual([]);
  expect(await page.locator('form.formulaire input[type="checkbox"]:checked').count()).toBe(0);
  expect(suivi.requetes).toEqual([]);
  expect(await etatStockage(page)).toBe(avant);
  expect(await context.cookies()).toEqual(cookies);
  expect(new URL(page.url()).search + new URL(page.url()).hash).toBe('');
  expect(suivi.messages).toEqual([]);
});

test('« Déposer une autre candidature » : formulaire vide et visible, focus sur son titre, confirmation masquée', async ({ page }) => {
  await ouvrir(page);
  await remplir(page);
  await envoyer(page).click();
  await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'Déposer une autre candidature' }).click();
  await expect(confirmation(page)).toBeHidden();
  await expect(formulaire(page)).toBeVisible();
  await expect(page.locator('#titre-formulaire')).toBeFocused();
  for (const nom of ['Société', 'Numéro SIRET', 'Prénom et nom du contact', 'E-mail professionnel', 'Téléphone (facultatif)', 'Description de vos produits', 'Message (facultatif)']) {
    await expect(champ(page, nom), nom).toHaveValue('');
  }
  await expect(page.locator('form.formulaire input[type="checkbox"]:checked')).toHaveCount(0);
  await expect(page.locator('[data-resume]')).toBeHidden();
  await expect(page.locator('.formulaire__erreur:visible')).toHaveCount(0);
});

test('sans téléphone ni message : accepté ; avec un téléphone invalide : refusé', async ({ page }) => {
  await ouvrir(page);
  await remplir(page, { telephone: false });
  await envoyer(page).click();
  await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole('button', { name: 'Déposer une autre candidature' }).click();
  await remplir(page);
  await champ(page, 'Téléphone (facultatif)').fill('1234');
  await envoyer(page).click();
  await expect(confirmation(page)).toBeHidden();
  await expect(page.locator('[data-resume]')).toContainText('1 erreur à corriger');
  await expect(page.locator('#erreur-telephone')).toBeVisible();
});

for (const largeur of [375, 768, 1440]) {
  for (const etat of ['vide', 'erreurs', 'confirmation']) {
    test(`page entière à ${largeur} px, état ${etat} : console propre, axe, aucune requête externe, aucun débordement`, async ({ page }) => {
      const suivi = await ouvrir(page, largeur);
      if (etat === 'erreurs') await envoyer(page).click();
      if (etat === 'confirmation') {
        await remplir(page);
        await envoyer(page).click();
        await expect(confirmation(page)).toBeVisible();
      }
      expect(suivi.messages).toEqual([]);
      expect(suivi.externes).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `test-results/pro-c-${largeur}-${etat}.png`, fullPage: true });
      const resultats = await new AxeBuilder({ page }).analyze();
      expect(resultats.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}

test('JavaScript désactivé : seul le message noscript est visible, le formulaire reste masqué', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('http://localhost:4173/pro.html');
  await expect(page.locator('.noscript')).toHaveText('Ce démonstrateur nécessite JavaScript');
  await expect(page.locator('.noscript')).toBeVisible();
  await expect(formulaire(page)).toBeHidden();
  await expect(confirmation(page)).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeHidden();
  expect(await page.locator('main').evaluate((el) => el.innerText.trim())).toBe('');
  await contexte.close();
});

test('data/pro.json en erreur : message de chargement accessible, formulaire masqué, aucune erreur non gérée', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.route('**/data/pro.json', (route) => route.fulfill({ status: 500, body: 'erreur' }));
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-rendu="erreur"]');
  await expect(page.getByRole('alert')).toContainText("Le contenu de la page n'a pas pu être chargé");
  await expect(formulaire(page)).toBeHidden();
  await expect(confirmation(page)).toBeHidden();
  expect(erreurs).toEqual([]);
});

test('vie privée : plusieurs envois en erreur puis un envoi valide, aucune écriture de stockage, de cookie ni d\'IndexedDB', async ({ page }) => {
  await ouvrir(page, 1440, () => page.addInitScript(() => {
    globalThis.__ecritures = [];
    const noter = (nom) => globalThis.__ecritures.push(nom);
    for (const m of ['setItem', 'removeItem', 'clear']) {
      const origine = Storage.prototype[m];
      Storage.prototype[m] = function ecrire(...a) { noter(`Storage.${m}`); return origine.apply(this, a); };
    }
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(Document.prototype, 'cookie', { configurable: true, get() { return cookie.get.call(this); }, set(v) { noter('cookie'); cookie.set.call(this, v); } });
    const ouvrirBase = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function base(...a) { noter('indexedDB.open'); return ouvrirBase.apply(this, a); };
  }));
  for (let i = 0; i < 3; i++) await envoyer(page).click();
  await champ(page, 'Société').fill('x');
  await remplir(page);
  await envoyer(page).click();
  await expect(confirmation(page)).toBeVisible();
  expect(await page.evaluate(() => globalThis.__ecritures)).toEqual([]);
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);
});
