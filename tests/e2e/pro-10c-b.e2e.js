// Lot 10c-B : catégorie « Protection de la personne » dans les aléas couverts de pro.html (services simulés : aucune requête externe attendue).
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const NOUVELLE = 'Protection de la personne (froid, chaleur, chutes)';
const champ = (page, nom) => page.getByLabel(nom, { exact: true });
const envoyer = (page) => page.getByRole('button', { name: 'Envoyer ma candidature' });
const resume = (page) => page.locator('[data-resume]');
const confirmation = (page) => page.locator('[data-role="confirmation"]');

async function ouvrir(page, largeur = 1440) {
  const suivi = { requetes: [], messages: [] };
  page.on('request', (r) => suivi.requetes.push(r.url()));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}
const remplir = async (page) => {
  await champ(page, 'Société').fill('Société Exemple');
  await champ(page, 'Numéro SIRET').fill('000 000 000 00000');
  await champ(page, 'Prénom').fill('Claire');
  await champ(page, 'Nom').fill('Exemple');
  await champ(page, 'E-mail professionnel').fill('claire@exemple.fr');
  await champ(page, 'Description de vos produits').fill('Des gilets de protection et des antidérapants (exemple).');
  await page.getByLabel("J'accepte d'être recontacté à propos de ma candidature.").check();
};

for (const largeur of [375, 768, 1440]) {
  test(`cinq cases à ${largeur} px : la catégorie est en dernier, cases alignées, texte sans coupure ni débordement`, async ({ page }) => {
    await ouvrir(page, largeur);
    const cases = page.locator('#aleas .formulaire__case');
    await expect(cases).toHaveCount(5);
    await expect(cases.last()).toContainText(NOUVELLE);
    await expect(page.getByRole('group', { name: 'Aléas et catégories couverts' })).toBeVisible();
    await expect(page.locator('#aide-aleas')).toHaveText('Cochez au moins une case.');
    const boites = await cases.evaluateAll((els) => els.map((e) => {
      const b = e.getBoundingClientRect();
      const t = e.querySelector('span').getBoundingClientRect();
      const i = e.querySelector('input').getBoundingClientRect();
      return { x: Math.round(b.x), y: b.y, h: b.height, w: b.width, droite: t.right, entree: Math.round(i.x), scroll: e.scrollWidth - e.clientWidth };
    }));
    expect(new Set(boites.map((b) => b.x)).size).toBe(1); // même colonne
    expect(new Set(boites.map((b) => b.entree)).size).toBe(1);
    for (const [i, b] of boites.entries()) {
      expect(b.h, `case ${i}`).toBeGreaterThanOrEqual(44);
      expect(b.scroll, `case ${i} : coupure`).toBeLessThanOrEqual(0);
      if (i > 0) expect(b.y, `case ${i}`).toBeGreaterThanOrEqual(boites[i - 1].y + boites[i - 1].h - 1);
    }
    const debord = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth);
    expect(debord).toBeLessThanOrEqual(0);
    await page.locator('#aleas').screenshot({ path: `test-results/pro-10c/aleas-${largeur}.png` });
  });
}

test('envoi à vide : récapitulatif avec le texte adapté et lien vers le groupe ; cocher seulement la nouvelle catégorie supprime l\'erreur', async ({ page }) => {
  await ouvrir(page);
  await envoyer(page).click();
  await expect(resume(page)).toBeFocused();
  await expect(resume(page)).toContainText('Le formulaire contient 8 erreurs à corriger :');
  await expect(page.locator('#erreur-aleas')).toHaveText('Choisissez au moins un aléa ou une catégorie.');
  await expect(page.locator('#aleas')).toHaveAttribute('aria-describedby', 'aide-aleas erreur-aleas');
  await resume(page).getByRole('link', { name: 'Aléas couverts par vos produits' }).click();
  await expect(page.locator('#aleas input').first()).toBeFocused();
  await page.getByLabel(NOUVELLE).check();
  await expect(page.locator('#erreur-aleas')).toBeHidden();
  await expect(resume(page)).toContainText('Le formulaire contient 7 erreurs à corriger :');
  await page.getByLabel(NOUVELLE).uncheck();
  await expect(page.locator('#erreur-aleas')).toBeVisible();
});

test('candidature complète avec la nouvelle catégorie seule : confirmation « PRO-000 (exemple) », aucun écho, formulaire remis à zéro, aucun réseau', async ({ page }) => {
  const suivi = await ouvrir(page);
  const avant = suivi.requetes.length;
  await remplir(page);
  await page.getByLabel(NOUVELLE).check();
  await expect(page.locator('#aleas input:checked')).toHaveCount(1);
  await envoyer(page).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(confirmation(page).locator('[role="status"]')).toBeFocused();
  await expect(confirmation(page)).toContainText('PRO-000 (exemple)');
  const texte = await page.evaluate(() => globalThis.document.body.innerText);
  await expect(confirmation(page)).not.toContainText(/Claire|Société Exemple|claire@exemple\.fr|Protection de la personne|000 000 000/);
  expect(texte.includes('claire@exemple.fr')).toBe(false);
  expect(suivi.requetes.length).toBe(avant);
  expect(await page.evaluate(() => globalThis.sessionStorage.length + globalThis.localStorage.length)).toBe(0);
  expect(new URL(page.url()).search).toBe('');
  await page.getByRole('button', { name: 'Déposer une autre candidature' }).click();
  await expect(page.locator('#aleas input:checked')).toHaveCount(0);
  await expect(champ(page, 'Société')).toHaveValue('');
  expect(suivi.messages).toEqual([]);
});

test('clavier : Tab atteint la nouvelle case après la quatrième, Espace la coche, focus visible, ordre cohérent', async ({ page }) => {
  await ouvrir(page);
  const cases = page.locator('#aleas input');
  await cases.first().focus();
  for (let i = 1; i < 5; i += 1) await page.keyboard.press('Tab');
  const nouvelle = page.getByLabel(NOUVELLE);
  await expect(nouvelle).toBeFocused();
  const contour = await nouvelle.evaluate((e) => { const s = globalThis.getComputedStyle(e); return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth) }; });
  expect(contour.style).not.toBe('none');
  expect(contour.largeur).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Space');
  await expect(nouvelle).toBeChecked();
  await page.keyboard.press('Space');
  await expect(nouvelle).not.toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Description de vos produits')).toBeFocused(); // la case suivante dans l'ordre du formulaire
  await page.keyboard.press('Shift+Tab');
  await expect(nouvelle).toBeFocused();
});

test('CLS de 360 à 1440 px (JSON retardés de 400 ms) : 0,08 au plus ; réserve de hauteur conforme à la hauteur mesurée (8 px au plus)', async ({ browser }) => {
  test.setTimeout(240000);
  for (const largeur of [360, 375, 390, 414, 480, 600, 768, 900, 1024, 1199, 1200, 1440]) {
    const contexte = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: largeur, height: 900 } });
    const page = await contexte.newPage();
    await page.route('**/data/*.json', async (route) => {
      await new Promise((resolve) => { setTimeout(resolve, 400); });
      await route.continue();
    });
    await page.addInitScript(() => {
      globalThis.__cls = 0;
      new PerformanceObserver((liste) => { for (const e of liste.getEntries()) if (!e.hadRecentInput) globalThis.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/pro.html');
    await page.waitForSelector('html[data-formulaire="pret"]');
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => globalThis.__cls);
    console.log(`${largeur} px : CLS ${cls.toFixed(3)}`);
    expect(cls, `${largeur} px`).toBeLessThanOrEqual(0.08);
    const mesure = await page.evaluate(() => {
      const carte = globalThis.document.querySelector('.pro__carte--formulaire');
      const hauteur = carte.getBoundingClientRect().height;
      globalThis.document.documentElement.removeAttribute('data-formulaire');
      const reserve = parseFloat(globalThis.getComputedStyle(carte).minHeight);
      return { hauteur, reserve };
    });
    expect(Math.abs(mesure.reserve - mesure.hauteur), `${largeur} px : réserve ${mesure.reserve}, mesuré ${mesure.hauteur}`).toBeLessThanOrEqual(8);
    await contexte.close();
  }
});

for (const largeur of [375, 768, 1440]) {
  test(`à ${largeur} px : axe sans violation (aussi avec erreurs), console propre, aucune requête externe`, async ({ page }) => {
    const suivi = await ouvrir(page, largeur);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} : ${v.nodes.length}`)).toEqual([]);
    await envoyer(page).click();
    await expect(resume(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} : ${v.nodes.length}`)).toEqual([]);
    expect(suivi.messages).toEqual([]);
    expect(suivi.requetes.filter((u) => !['localhost', '127.0.0.1'].includes(new URL(u).hostname))).toEqual([]);
  });
}

test('JavaScript désactivé : seul le message noscript', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexte.newPage();
  await page.goto('http://localhost:4173/pro.html');
  expect((await page.evaluate(() => globalThis.document.body.innerText)).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  await contexte.close();
});

for (const largeur of [375, 1440]) {
  test(`parcours vendeur de bout en bout à ${largeur} px avec la nouvelle catégorie seule`, async ({ page }) => {
    const suivi = await ouvrir(page, largeur);
    await envoyer(page).click();
    await expect(resume(page)).toContainText('8 erreurs');
    await remplir(page);
    await expect(resume(page)).toContainText('1 erreur');
    await page.getByLabel(NOUVELLE).check();
    await expect(resume(page)).toBeHidden();
    await envoyer(page).click();
    await expect(confirmation(page)).toContainText('Candidature reçue (exemple)');
    await expect(confirmation(page)).toContainText('PRO-000 (exemple)');
    await confirmation(page).getByRole('link', { name: "Retour à l'accueil" }).click();
    await page.waitForURL((u) => u.pathname === '/index.html');
    expect(suivi.messages).toEqual([]);
  });
}
