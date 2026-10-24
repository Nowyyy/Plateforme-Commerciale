import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const compte = JSON.parse(readFileSync('data/compte.json', 'utf8'));
const SESSION = JSON.stringify({ v: 1, connecte: true });
const LARGEURS = [375, 768, 1440];

// preset : { achat } (variante compte), { acces } (sans compte), { connecte } (connecté sans achat) ou {} (aucune session)
async function ouvrir(page, preset = {}, { largeur = 1440, donnees = null } = {}) {
  const suivi = { messages: [], externes: [], requetes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => {
    suivi.requetes.push(r.url());
    if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url());
  });
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
  await page.goto('/sav.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

// Le premier focus() peut être perdu juste après un chargement : on refocalise jusqu'à obtenir le focus.
async function focaliser(locator) {
  await expect(async () => {
    await locator.focus();
    await expect(locator).toBeFocused({ timeout: 300 });
  }).toPass({ timeout: 5000 });
}

const resume = (page) => page.locator('[data-resume]');
const envoyer = (page) => page.getByRole('button', { name: 'Envoyer ma demande' });
const champ = (page, nom) => page.getByLabel(nom, { exact: true });
const LIBELLES_VIDE = ['Produit concerné', 'Motif', 'Description', 'Prénom', 'Nom', 'E-mail', "Adresse d'intervention", 'Code postal', 'Ville', 'Consentement'];

async function remplirSansCompte(page) {
  await page.getByRole('radio', { name: /Batardeau modulable/ }).check();
  await page.getByRole('radio', { name: 'Problème de pose' }).check();
  await champ(page, 'Description').fill('ZZ-description secrète : le batardeau fuit depuis la pose.');
  await champ(page, 'Prénom').fill('ZZPrénom');
  await champ(page, 'Nom').fill('ZZNom');
  await champ(page, 'E-mail').fill('zz.secret@exemple.test');
  await champ(page, "Adresse d'intervention").fill('9 rue ZZ-Secrète');
  await champ(page, 'Code postal').fill('75001');
  await champ(page, 'Ville').fill('ZZVille');
  await page.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
}

test('variante compte (commande à plusieurs lignes) : fil à quatre éléments, commande et date, radios sans présélection, coordonnées préremplies', async ({ page }) => {
  const suivi = await ouvrir(page, { achat: 'CMD-1037' });
  const fil = page.getByRole('navigation', { name: "Fil d'Ariane" });
  await expect(fil.getByRole('listitem')).toHaveText(['Mon compte', 'Mes achats', 'Commande n° CMD-1037', 'Demande de SAV']);
  await expect(fil.getByRole('link')).toHaveCount(3);
  await expect(fil.locator('[aria-current="page"]')).toHaveText('Demande de SAV');
  await expect(page.getByRole('heading', { level: 1, name: 'Demande de service après-vente' })).toBeVisible();
  await expect(page.getByText('Commande n° CMD-1037 (exemple)')).toBeVisible();
  await expect(page.getByText("Date d'achat : 2 septembre 2026")).toBeVisible();
  const radios = page.locator('#ligne input[type="radio"]');
  await expect(radios).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) await expect(radios.nth(i)).not.toBeChecked();
  const carte = page.locator('#ligne label').first();
  await expect(carte).toContainText('Batardeau modulable');
  await expect(carte).toContainText('Réf. BAT-120');
  await expect(carte).toContainText('Mode : Pose par un artisan');
  await expect(carte).toContainText('Sur mesure : 1 200 × 400 mm');
  await expect(carte).toContainText('Quantité : 1');
  await expect(page.locator('#ligne label').nth(1)).toContainText('Prêt à poser, sans mesure');
  await expect(champ(page, 'Prénom')).toHaveValue('Camille');
  await expect(champ(page, 'E-mail')).toHaveValue('client.demo@exemple.test');
  await expect(champ(page, "Adresse d'intervention")).toHaveValue("1 rue de l'Exemple");
  await expect(champ(page, 'Code postal')).toHaveValue('00000');
  await expect(page.locator('[data-etat]')).toBeHidden();
  await expect(page.locator('#motif input[type="radio"]')).toHaveCount(5);
  await expect(page.locator('[data-role="photos"] li')).toHaveText(['[Fichier exemple] Photo 1 (exemple)', '[Fichier exemple] Photo 2 (exemple)', '[Fichier exemple] Photo 3 (exemple)']);
  expect(await page.locator('input[type="file"]').count()).toBe(0);
  expect(suivi.messages).toEqual([]);
});

test('variante compte avec une commande à une ligne : la ligne est présélectionnée, et le reste après une réinitialisation', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1044' });
  const radios = page.locator('#ligne input[type="radio"]');
  await expect(radios).toHaveCount(1);
  await expect(radios.first()).toBeChecked();
  await expect(page.locator('#ligne label')).toContainText('Batardeau modulable');
});

test('variante sans compte : fil à trois éléments, coordonnées vides, produit de la commande d\'accès', async ({ page }) => {
  const suivi = await ouvrir(page, { acces: 'CMD-1037' });
  const fil = page.getByRole('navigation', { name: "Fil d'Ariane" });
  await expect(fil.getByRole('listitem')).toHaveText(['Accueil', 'Service après-vente', 'Demande de SAV']);
  await expect(fil.getByRole('link').nth(1)).toHaveAttribute('href', 'sav-acces.html');
  await expect(fil.locator('[aria-current="page"]')).toHaveText('Demande de SAV');
  for (const nom of ['Prénom', 'Nom', 'E-mail', 'Téléphone (facultatif)', "Adresse d'intervention", 'Code postal', 'Ville']) await expect(champ(page, nom)).toHaveValue('');
  await expect(page.locator('#ligne input[type="radio"]')).toHaveCount(2);
  expect(suivi.messages).toEqual([]);
});

test('états sans contexte : « Aucun achat sélectionné » (connecté), « Accès au SAV requis » (rien ou acces-sav invalide)', async ({ page }) => {
  await ouvrir(page, { connecte: true });
  await expect(page.getByRole('heading', { level: 2, name: 'Aucun achat sélectionné' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir mes achats' })).toHaveAttribute('href', 'achats.html');
  await expect(page.locator('form')).toBeHidden();
  const autre = await page.context().newPage();
  const suivi = await ouvrir(autre, {});
  await expect(autre.getByRole('heading', { level: 2, name: 'Accès au SAV requis' })).toBeVisible();
  await expect(autre.getByRole('link', { name: 'Accéder au service après-vente' })).toHaveAttribute('href', 'sav-acces.html');
  expect(suivi.messages).toEqual([]);
  const invalide = await page.context().newPage();
  await ouvrir(invalide, { acces: 'CMD-9' });
  await expect(invalide.getByRole('heading', { level: 2, name: 'Accès au SAV requis' })).toBeVisible();
});

test('envoi à vide (sans compte) : 10 erreurs dans l\'ordre, groupes de radios en erreur sur leur fieldset, un lien place le focus sur le premier radio', async ({ page }) => {
  await ouvrir(page, { acces: 'CMD-1037' });
  await envoyer(page).click();
  await expect(resume(page)).toBeFocused();
  await expect(resume(page)).toContainText('Le formulaire contient 10 erreurs à corriger :');
  await expect(resume(page).getByRole('link')).toHaveText(LIBELLES_VIDE);
  for (const id of ['ligne', 'motif']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`#${id}`)).toHaveAttribute('aria-describedby', `erreur-${id}`);
    await expect(page.locator(`#erreur-${id}`)).toBeVisible();
  }
  await expect(page.locator('#erreur-ligne')).toHaveText('Choisissez le produit concerné.');
  await expect(page.locator('#erreur-consentement')).toBeVisible();
  await resume(page).getByRole('link', { name: 'Produit concerné' }).click();
  await expect(page.locator('#ligne input').first()).toBeFocused();
  await resume(page).getByRole('link', { name: 'Motif' }).click();
  await expect(page.locator('#motif input').first()).toBeFocused();
  await resume(page).getByRole('link', { name: 'Description' }).click();
  await expect(champ(page, 'Description')).toBeFocused();
});

test('variante compte : seuls ligne, motif, description et consentement en erreur ; corrections une à une jusqu\'à la disparition du récapitulatif', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1037' });
  await envoyer(page).click();
  await expect(resume(page)).toContainText('Le formulaire contient 4 erreurs à corriger :');
  await expect(resume(page).getByRole('link')).toHaveText(['Produit concerné', 'Motif', 'Description', 'Consentement']);
  await page.getByRole('radio', { name: /Grille pare-braises/ }).check();
  await expect(resume(page)).toContainText('3 erreurs');
  await expect(page.locator('#ligne')).not.toHaveAttribute('aria-invalid', /.*/);
  await page.getByRole('radio', { name: 'Autre' }).check();
  await expect(resume(page)).toContainText('2 erreurs');
  await champ(page, 'Description').fill('trop court');
  await expect(page.locator('#erreur-description')).toContainText('trop courte');
  await champ(page, 'Description').fill('Une description suffisamment longue pour passer.');
  await expect(resume(page)).toContainText('1 erreur à corriger');
  await page.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
  await expect(resume(page)).toBeHidden();
});

test('envoi valide (sans compte) : confirmation focalisée, sans écho de la saisie, champs réinitialisés, pas de lien vers les demandes', async ({ page }) => {
  const suivi = await ouvrir(page, { acces: 'CMD-1037' });
  await remplirSansCompte(page);
  await envoyer(page).click();
  const region = page.locator('[data-confirmation]');
  await expect(region).toBeVisible();
  await expect(region).toBeFocused();
  await expect(region).toHaveAttribute('role', 'status');
  await expect(page.locator('form')).toBeHidden();
  await expect(region.getByRole('heading', { level: 2, name: 'Demande reçue (exemple)' })).toBeVisible();
  await expect(region).toContainText('Numéro : SAV-000 (exemple)');
  await expect(region).toContainText('Réponse sous 2 jours ouvrés (exemple).');
  await expect(region).toContainText('Demande concernant : Batardeau modulable (commande CMD-1037)');
  await expect(region.getByRole('listitem')).toHaveText(['Analyse de votre demande', 'Prise de contact par un conseiller', 'Intervention sur place']);
  await expect(region).toContainText("Aucune donnée n'a été envoyée ni enregistrée.");
  const corps = await page.evaluate(() => document.body.innerHTML);
  for (const saisie of ['ZZ', 'zz.secret', '75001']) expect(corps, saisie).not.toContain(saisie);
  const valeurs = await page.evaluate(() => [...document.querySelectorAll('input, textarea')].map((e) => (e.type === 'radio' || e.type === 'checkbox' ? e.checked : e.value)));
  expect(valeurs.every((v) => v === '' || v === false)).toBe(true);
  await expect(page.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', 'index.html');
  await expect(page.getByRole('link', { name: 'Retour à mes demandes' })).toBeHidden();
  expect(suivi.messages).toEqual([]);
});

test('envoi valide (compte) : « Retour à mes demandes » visible, ligne concernée conforme au choix', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1037' });
  await page.getByRole('radio', { name: /Grille pare-braises/ }).check();
  await page.getByRole('radio', { name: 'Défaut de fonctionnement' }).check();
  await champ(page, 'Description').fill('La grille ne se ferme plus correctement.');
  await page.getByLabel("J'accepte d'être recontacté à propos de cette demande.").check();
  await envoyer(page).click();
  await expect(page.locator('[data-confirmation]')).toContainText('Demande concernant : Grille pare-braises (commande CMD-1037)');
  await expect(page.getByRole('link', { name: 'Retour à mes demandes' })).toHaveAttribute('href', 'demandes.html');
  await expect(page.getByRole('link', { name: "Retour à l'accueil" })).toBeVisible();
});

test('vie privée : aucune requête, aucun stockage nouveau, aucun cookie ni IndexedDB, URL inchangée pendant les erreurs et l\'envoi valide', async ({ page, context }) => {
  const suivi = await ouvrir(page, { acces: 'CMD-1037' });
  const etat = () => page.evaluate(async () => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie, (await indexedDB.databases()).length]));
  const avant = await etat();
  const url = page.url();
  suivi.requetes.length = 0;
  await envoyer(page).click();
  await champ(page, 'Prénom').fill('ZZPrénom');
  expect(await etat()).toBe(avant);
  await remplirSansCompte(page);
  await envoyer(page).click();
  await expect(page.locator('[data-confirmation]')).toBeVisible();
  expect(suivi.requetes).toEqual([]);
  expect(await etat()).toBe(avant);
  expect(await context.cookies()).toEqual([]);
  expect(page.url()).toBe(url);
});

test('mesures : carte de 896 px au plus et coordonnées par paires à 1440 px, une colonne à 375 px', async ({ page }) => {
  await ouvrir(page, { achat: 'CMD-1037' });
  const mesure = () => page.evaluate(() => {
    const boite = (s) => document.querySelector(s).getBoundingClientRect();
    const carte = boite('[data-carte-formulaire]');
    return { carte: carte.width, prenom: boite('#prenom'), nom: boite('#nom'), ville: boite('#ville'), cp: boite('#code-postal'), cartes: [...document.querySelectorAll('#ligne label')].map((l) => l.getBoundingClientRect().top) };
  });
  const grand = await mesure();
  expect(grand.carte).toBeLessThanOrEqual(896);
  expect(Math.abs(grand.prenom.top - grand.nom.top)).toBeLessThan(2);
  expect(grand.nom.left).toBeGreaterThan(grand.prenom.right);
  expect(Math.abs(grand.cp.top - grand.ville.top)).toBeLessThan(2);
  expect(Math.abs(grand.cartes[0] - grand.cartes[1])).toBeLessThan(2);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect.poll(async () => (await mesure()).nom.top > (await mesure()).prenom.top + 10).toBe(true);
  const petit = await mesure();
  expect(Math.abs(petit.prenom.left - petit.nom.left)).toBeLessThan(2);
  expect(petit.cartes[1]).toBeGreaterThan(petit.cartes[0] + 20);
});

for (const largeur of LARGEURS) {
  test(`aucun débordement à ${largeur} px : titre de 120 caractères, commande de 10 lignes, erreurs affichées`, async ({ page }) => {
    const donnees = structuredClone(compte);
    const commande = donnees.commandes.find((c) => c.id === 'CMD-1037');
    const modele = commande.lignes[0];
    commande.lignes = Array.from({ length: 10 }, (_, i) => ({ ...modele, titre: i === 0 ? 'T'.repeat(120) : `${'Titre long '.repeat(8)}${i}`, reference: 'R'.repeat(60) }));
    await ouvrir(page, { achat: 'CMD-1037' }, { largeur, donnees });
    await envoyer(page).click();
    await expect(resume(page)).toBeVisible();
    await expect(page.locator('#ligne input[type="radio"]')).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('clavier : Tab traverse radios, champs, consentement et bouton ; flèches dans un groupe ; Entrée et Espace valident', async ({ page }) => {
  await ouvrir(page, { acces: 'CMD-1037' });
  await focaliser(page.locator('#ligne input').first());
  const vus = [];
  for (let i = 0; i < 12; i += 1) {
    vus.push(await page.evaluate(() => {
      const el = document.activeElement;
      return el.type === 'radio' ? `radio:${el.value}` : el.id || el.textContent.trim();
    }));
    await page.keyboard.press('Tab');
  }
  expect(vus).toEqual(['radio:0', 'radio:livraison', 'description', 'prenom', 'nom', 'email', 'telephone', 'adresse', 'code-postal', 'ville', 'consentement', 'Envoyer ma demande']);
  await focaliser(page.locator('#ligne input').first());
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#ligne input').nth(1)).toBeChecked();
  await expect(page.locator('#ligne input').nth(1)).toBeFocused();
  await focaliser(page.locator('#motif input').first());
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Défaut de fonctionnement' })).toBeChecked();
  for (const touche of ['Enter', 'Space']) {
    await page.reload();
    await page.waitForSelector('html[data-formulaire="pret"]');
    await focaliser(envoyer(page));
    await page.keyboard.press(touche);
    await expect(resume(page), touche).toBeVisible();
  }
});

for (const largeur of LARGEURS) {
  test(`axe sans violation à ${largeur} px avec le récapitulatif affiché (compte et sans compte)`, async ({ page }) => {
    const suivi = await ouvrir(page, { acces: 'CMD-1037' }, { largeur });
    await envoyer(page).click();
    await expect(resume(page)).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const autre = await page.context().newPage();
    await ouvrir(autre, { achat: 'CMD-1037' }, { largeur });
    await autre.getByRole('button', { name: 'Envoyer ma demande' }).click();
    const axe2 = await new AxeBuilder({ page: autre }).analyze();
    expect(axe2.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
  });
}
