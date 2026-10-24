import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ORDRE = ['societe', 'siret', 'prenom', 'nom', 'email', 'aleas', 'description', 'consentement'];
const LIBELLES = ['Société', 'Numéro SIRET', 'Prénom', 'Nom', 'E-mail professionnel', 'Aléas couverts par vos produits', 'Description de vos produits', 'Consentement à être recontacté'];
const champ = (page, nom) => page.getByLabel(nom, { exact: true });
const envoyer = (page) => page.getByRole('button', { name: 'Envoyer ma candidature' });
const resume = (page) => page.locator('[data-resume]');
const erreur = (page, nom) => page.locator(`#erreur-${nom}`);

// Juste après un rechargement, le premier focus() peut être perdu (le document n'a pas encore le focus actif) : on refocalise
// jusqu'à ce que l'élément soit réellement focalisé, puis les assertions habituelles s'appliquent.
async function focaliser(locator) {
  await expect(async () => {
    await locator.focus();
    await expect(locator).toBeFocused({ timeout: 300 });
  }).toPass({ timeout: 5000 });
}

async function ouvrir(page, largeur = 1440) {
  const suivi = { requetes: [], messages: [] };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  page.on('request', (r) => suivi.requetes.push(r.url()));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  return suivi;
}

test('envoi à vide : récapitulatif focalisé, 8 erreurs, champs invalides reliés à leur message, liens dans l\'ordre du formulaire', async ({ page }) => {
  await ouvrir(page);
  await expect(resume(page)).toBeHidden();
  await envoyer(page).click();
  await expect(resume(page)).toBeVisible();
  await expect(resume(page)).toBeFocused();
  await expect(resume(page)).toHaveAttribute('role', 'alert');
  await expect(resume(page)).toContainText('Le formulaire contient 8 erreurs à corriger :');
  await expect(resume(page).getByRole('link')).toHaveText(LIBELLES);
  for (const nom of ORDRE) {
    const controle = nom === 'aleas' ? page.locator('#aleas input').first() : page.locator(`#${nom}`);
    await expect(controle, nom).toHaveAttribute('aria-invalid', 'true');
    await expect(controle, nom).toHaveAttribute('aria-describedby', new RegExp(`erreur-${nom}`));
    await expect(erreur(page, nom), nom).toBeVisible();
    await expect(erreur(page, nom), nom).not.toHaveText('');
  }
  for (const nom of ['telephone', 'message']) await expect(page.locator(`#${nom}`)).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(page).toHaveURL(/\/pro\.html$/);
});

test('un clic sur un lien du récapitulatif place le focus sur le champ, sans changer l\'adresse', async ({ page }) => {
  await ouvrir(page);
  await envoyer(page).click();
  const avant = page.url();
  await resume(page).getByRole('link', { name: 'E-mail professionnel' }).click();
  await expect(page.locator('#email')).toBeFocused();
  await resume(page).getByRole('link', { name: 'Aléas couverts par vos produits' }).click();
  await expect(page.locator('#aleas input').first()).toBeFocused();
  await resume(page).getByRole('link', { name: 'Société', exact: true }).click();
  await expect(page.locator('#societe')).toBeFocused();
  expect(page.url()).toBe(avant);
});

test('revalidation à la saisie après le premier envoi ; le récapitulatif se met à jour puis se masque', async ({ page }) => {
  await ouvrir(page);
  await champ(page, 'Société').fill('a');
  await expect(erreur(page, 'societe')).toBeHidden(); // aucune validation avant le premier envoi
  await champ(page, 'Société').fill('');
  await envoyer(page).click();
  await expect(resume(page)).toContainText('8 erreurs');
  await champ(page, 'Société').fill('Société Exemple');
  await expect(erreur(page, 'societe')).toBeHidden();
  await expect(page.locator('#societe')).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(resume(page)).toContainText('7 erreurs');
  await expect(resume(page).getByRole('link')).toHaveCount(7);
  await champ(page, 'Numéro SIRET').fill('000 000 000 00000');
  await champ(page, 'Prénom').fill('Claire');
  await champ(page, 'Nom').fill('Exemple');
  await champ(page, 'E-mail professionnel').fill('claire@exemple.fr');
  await page.getByLabel('Inondations et crues').check();
  await champ(page, 'Description de vos produits').fill('Des batardeaux modulables (exemple).');
  await expect(resume(page)).toContainText('1 erreur à corriger');
  await page.getByLabel("J'accepte d'être recontacté à propos de ma candidature.").check();
  await expect(resume(page)).toBeHidden();
});

test('chaque règle par l\'interface : SIRET, e-mail, téléphone, description, aléas', async ({ page }) => {
  await ouvrir(page);
  await envoyer(page).click();
  const essayer = async (libelle, valeur, nom, texte) => {
    await champ(page, libelle).fill(valeur);
    await envoyer(page).click();
    if (texte === null) await expect(erreur(page, nom), valeur).toBeHidden();
    else await expect(erreur(page, nom), valeur).toContainText(texte);
  };
  await essayer('Numéro SIRET', '1234567890123', 'siret', '14 chiffres');
  await essayer('Numéro SIRET', '1234567890123a', 'siret', '14 chiffres');
  await essayer('Numéro SIRET', '000 000 000 00000', 'siret', null);
  await essayer('E-mail professionnel', 'a@b', 'email', "n'est pas valide");
  await essayer('Téléphone (facultatif)', '12345678', 'telephone', "n'est pas valide");
  await essayer('Téléphone (facultatif)', '', 'telephone', null);
  await essayer('Description de vos produits', 'a'.repeat(19), 'description', 'trop courte');
  await page.locator('#description').evaluate((el) => { el.value = 'a'.repeat(1001); });
  await envoyer(page).click();
  await expect(erreur(page, 'description')).toContainText('trop longue');
  await expect(erreur(page, 'aleas')).toContainText('Cochez au moins un aléa');
  await page.getByLabel('Feux de forêt').check();
  await expect(erreur(page, 'aleas')).toBeHidden();
  // maxlength : le navigateur limite la saisie à 1 000 caractères
  await page.locator('#message').fill('b'.repeat(1000));
  expect(await page.locator('#message').inputValue()).toHaveLength(1000);
});

test('clavier : Entrée dans un champ valide, Tab suit l\'ordre du formulaire, le bouton répond à Entrée et à Espace', async ({ page }) => {
  await ouvrir(page);
  await page.locator('#societe').focus();
  await page.keyboard.press('Enter');
  await expect(resume(page)).toBeVisible();
  await expect(resume(page)).toBeFocused();

  await page.reload();
  await page.waitForSelector('html[data-formulaire="pret"]');
  await focaliser(page.locator('#societe'));
  const vus = [];
  for (let i = 0; i < 15; i++) {
    vus.push(await page.evaluate(() => {
      const el = globalThis.document.activeElement;
      return el.id || (el.closest('label')?.textContent ?? el.textContent).trim();
    }));
    await page.keyboard.press('Tab');
  }
  expect(vus).toEqual(['societe', 'siret', 'prenom', 'nom', 'email', 'telephone', 'Inondations et crues', 'Grêle et vents violents', 'Feux de forêt',
    'Canicule et chaleur extrême', 'description', 'message', 'consentement', 'Envoyer ma candidature', vus[14]]);

  for (const touche of ['Enter', 'Space']) {
    await page.reload();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await focaliser(envoyer(page));
    await expect(envoyer(page)).toBeFocused();
    await page.keyboard.press(touche);
    await expect(resume(page), touche).toBeVisible();
  }
});

test('aucun réseau, aucun stockage, aucun cookie, URL inchangée pendant les envois en erreur', async ({ page, context }) => {
  const suivi = await ouvrir(page);
  const etat = () => page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
  const avant = await etat();
  const cookies = await context.cookies();
  suivi.requetes.length = 0;
  for (let i = 0; i < 3; i++) await envoyer(page).click();
  await champ(page, 'Société').fill('Société Exemple');
  expect(suivi.requetes).toEqual([]);
  expect(await etat()).toBe(avant);
  expect(await context.cookies()).toEqual(cookies);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  expect(suivi.messages).toEqual([]);
});

test('mise en page : carte de 56 rem au plus, paires côte à côte à 1440 px, une colonne à 375 px', async ({ page }) => {
  await ouvrir(page, 1440);
  const boite = (sel) => page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  expect((await boite('.pro__carte--formulaire')).w).toBeLessThanOrEqual(896);
  const [societe, siret, prenom, nom, email, telephone] = await Promise.all(['#societe', '#siret', '#prenom', '#nom', '#email', '#telephone'].map(boite));
  expect(Math.abs(societe.y - siret.y)).toBeLessThan(2);
  expect(siret.x).toBeGreaterThan(societe.x + societe.w - 1);
  expect(Math.abs(prenom.y - nom.y)).toBeLessThan(2);
  expect(nom.x).toBeGreaterThan(prenom.x + prenom.w - 1);
  expect(Math.abs(email.y - telephone.y)).toBeLessThan(2);
  expect(telephone.x).toBeGreaterThan(email.x + email.w - 1);
  expect(email.y).toBeGreaterThan(prenom.y);
  console.log(`1440 px : carte ${Math.round((await boite('.pro__carte--formulaire')).w)} px, société x=${Math.round(societe.x)} SIRET x=${Math.round(siret.x)}`);
  await page.setViewportSize({ width: 375, height: 900 });
  const [s2, si2] = await Promise.all(['#societe', '#siret'].map(boite));
  expect(si2.y).toBeGreaterThan(s2.y);
  expect(Math.abs(si2.x - s2.x)).toBeLessThan(2);
});

for (const largeur of [375, 768, 1440]) {
  test(`aucun débordement à ${largeur} px avec des saisies longues et des messages d'erreur`, async ({ page }) => {
    await ouvrir(page, largeur);
    await champ(page, 'Société').fill('S'.repeat(100));
    await champ(page, 'Prénom').fill('P'.repeat(50));
    await champ(page, 'Nom').fill('N'.repeat(50));
    await champ(page, 'E-mail professionnel').fill(`${'e'.repeat(60)}@${'d'.repeat(60)}.${'d'.repeat(60)}.${'d'.repeat(60)}.fr`.slice(0, 254));
    await champ(page, 'Description de vos produits').fill('D'.repeat(1000));
    await envoyer(page).click();
    await expect(resume(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('bouton ambre : fond, texte marine, jamais aria-disabled, focus visible', async ({ page }) => {
  await ouvrir(page);
  const bouton = envoyer(page);
  await expect(bouton).toHaveCSS('background-color', 'rgb(217, 119, 6)');
  await expect(bouton).toHaveCSS('color', 'rgb(15, 29, 56)');
  await expect(bouton).not.toHaveAttribute('aria-disabled', /.*/);
  await expect(bouton).toBeEnabled();
  await page.locator('#consentement').focus();
  await page.keyboard.press('Tab');
  await expect(bouton).toBeFocused();
  await expect(bouton).toHaveCSS('outline-width', '3px');
  await expect(bouton).toHaveCSS('outline-style', 'solid');
});

for (const largeur of [375, 768, 1440]) {
  test(`axe sans violation à ${largeur} px avec le récapitulatif affiché`, async ({ page }) => {
    await ouvrir(page, largeur);
    await envoyer(page).click();
    await expect(resume(page)).toBeVisible();
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
