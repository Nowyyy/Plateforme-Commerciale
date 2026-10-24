import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const produit = JSON.parse(readFileSync('data/produit.json', 'utf8'));
const c = produit.comparateur;
const LARGEURS = [375, 768, 1440];
const FINE = ' ';
const euro = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, FINE)}${FINE}€`;
const ids = (alea) => produit.produits.filter((p) => p.aleas.includes(alea)).map((p) => p.id);
const trouver = (id) => produit.produits.find((p) => p.id === id);

async function ouvrir(page, largeur, session = null) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeur) => {
    if (valeur !== null && sessionStorage.getItem('comparaison') === null) sessionStorage.setItem('comparaison', valeur);
  }, session);
  await page.goto('/comparateur.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}
const sel = (alea, liste) => JSON.stringify({ v: 1, alea, produits: liste });
const colonnes = (page) => page.locator('.comp__table thead th[scope="col"]:not(:first-child)');
const sansDebordement = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

for (const alea of c.aleas) {
  test(`tableau de l'aléa ${alea.id} : en-têtes, cinq lignes, valeurs de produit.json formatées`, async ({ page }) => {
    const choisis = ids(alea.id).slice(0, 3);
    await ouvrir(page, 1440, sel(alea.id, choisis));
    await expect(colonnes(page)).toHaveCount(choisis.length);
    await expect(page.locator('.comp__table thead th:first-child')).toHaveAttribute('scope', 'col');
    for (let i = 0; i < choisis.length; i++) {
      const p = trouver(choisis[i]);
      await expect(colonnes(page).nth(i)).toContainText(p.titre);
      await expect(colonnes(page).nth(i)).toContainText(p.reference);
      await expect(colonnes(page).nth(i).getByRole('link')).toHaveAccessibleName(`Voir la fiche : ${p.titre}`);
    }
    const critere = c.criteres[alea.id];
    await expect(page.locator('.comp__table tbody tr')).toHaveCount(5);
    await expect(page.locator('.comp__table tbody th[scope="row"]')).toHaveText([critere.titre, 'Temps de montage', 'Poids', 'Prix TTC', 'Pose estimée']);
    const attendu = (cle) => choisis.map((id) => ({
      principale: `${trouver(id).performances.principale} ${critere.unite}`,
      montage: `${trouver(id).performances.montage} min`,
      poids: `${trouver(id).performances.poids} kg`,
      prix: euro(trouver(id).prix),
      pose: euro(trouver(id).pose),
    })[cle]);
    for (const [i, cle] of ['principale', 'montage', 'poids', 'prix', 'pose'].entries()) {
      await expect(page.locator('.comp__table tbody tr').nth(i).locator('td')).toHaveText(attendu(cle));
    }
    await expect(page.locator('.comp__niveau-texte')).toHaveText(`Exposition illustrative à cet aléa : ${c.niveaux[alea.niveau - 1]}`);
    await expect(page.locator('.comp__niveau .jauge__segment.est-plein')).toHaveCount(alea.niveau);
    await expect(page.locator('.comp__note')).toHaveText(c.comparaison.note);
    await expect(page.locator('.comp__zone')).toHaveAttribute('role', 'region');
    await expect(page.locator('.comp__zone')).toHaveAccessibleName(c.comparaison.regionAria);
  });
}

test('changement de sélection : colonnes ajoutées et retirées sans rechargement, annonce, session à jour', async ({ page }) => {
  await ouvrir(page, 1440);
  await page.evaluate(() => { globalThis.__sansRechargement = true; });
  await expect(colonnes(page)).toHaveCount(2);
  await page.locator('.carte-produit input[value="pompe-de-relevage"]').check();
  await expect(colonnes(page)).toHaveCount(3);
  await expect(colonnes(page).nth(2)).toContainText('Pompe de relevage');
  await expect(page.locator('#comparateur-etat')).toHaveText('3 produits comparés.');
  expect((await page.evaluate(() => JSON.parse(sessionStorage.getItem('comparaison')))).produits).toEqual(['batardeau-modulable', 'clapet-anti-retour', 'pompe-de-relevage']);
  await page.locator('.carte-produit input[value="batardeau-modulable"]').uncheck();
  await expect(colonnes(page)).toHaveCount(2);
  await expect(page.locator('.comp__table thead')).not.toContainText('Batardeau modulable');
  await expect(page.locator('#comparateur-etat')).toHaveText('2 produits comparés.');
  expect((await page.evaluate(() => JSON.parse(sessionStorage.getItem('comparaison')))).produits).toEqual(['clapet-anti-retour', 'pompe-de-relevage']);
  await page.locator('.pastille-alea input[value="canicule"]').check();
  await expect(colonnes(page)).toHaveCount(2);
  await expect(page.locator('.comp__table tbody th[scope="row"]').first()).toHaveText(c.criteres.canicule.titre);
  await expect(page.locator('.comp__niveau-texte')).toHaveText('Exposition illustrative à cet aléa : modéré');
  expect(await page.evaluate(() => globalThis.__sansRechargement)).toBe(true);
});

test('cohérence : le batardeau affiche 60 cm et 12 min, comme sa fiche', async ({ page }) => {
  await ouvrir(page, 1440);
  const colonne = page.locator('.comp__table thead th:nth-child(2)');
  await expect(colonne).toContainText('Batardeau modulable');
  await expect(page.locator('.comp__table tbody tr').nth(0).locator('td').first()).toHaveText('60 cm');
  await expect(page.locator('.comp__table tbody tr').nth(1).locator('td').first()).toHaveText('12 min');
  await colonne.getByRole('link').click();
  await expect(page.getByText("60 cm d'eau retenue (exemple)")).toBeVisible();
  await expect(page.getByText('12 minutes (exemple)')).toBeVisible();
});

test('« Voir la fiche » mène à produit.html avec le produit de la colonne, sans donnée dans l\'URL', async ({ page }) => {
  await ouvrir(page, 1440, sel('grele-vents', ['bouclier-de-baie', 'volet-extrude']));
  await colonnes(page).nth(1).getByRole('link', { name: /Voir la fiche/ }).click();
  await expect(page).toHaveURL(/\/produit\.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Volet extrudé renforcé' })).toBeVisible();
});

test('à 375 px : zone défilante et focalisable, clavier, première colonne figée, page sans défilement horizontal', async ({ page }, info) => {
  await ouvrir(page, 375);
  const zone = page.locator('.comp__zone');
  await expect(page.locator('.comp__aide-defilement')).toBeVisible();
  expect(await zone.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  expect(await sansDebordement(page)).toBe(true);
  await zone.focus();
  await expect(zone).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => zone.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  const premiere = page.locator('.comp__table tbody th').first();
  const [boiteZone, boitePremiere] = await Promise.all([zone.boundingBox(), premiere.boundingBox()]);
  expect(Math.abs(boitePremiere.x - boiteZone.x)).toBeLessThanOrEqual(2);
  await expect(premiere).toBeVisible();
  await page.screenshot({ path: 'test-results/comparateur-b-defilement-375.png', fullPage: true });
  info.annotations.push({ type: 'capture', description: 'comparateur-b-defilement-375.png' });
});

test('à 1440 px : tableau de 1 024 px au plus, aucun défilement interne', async ({ page }) => {
  await ouvrir(page, 1440, sel('inondations', ids('inondations')));
  const table = await page.locator('.comp__table').boundingBox();
  expect(table.width).toBeLessThanOrEqual(1024);
  expect(table.width).toBeGreaterThan(600);
  expect(await page.locator('.comp__zone').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  expect((await page.locator('.comp__zone').boundingBox()).x).toBeCloseTo((await page.locator('h2').first().boundingBox()).x, 0);
});

test('robustesse : titre de 120 caractères, valeurs de 3 chiffres, prix de 7 chiffres : aucun débordement de la page', async ({ page }) => {
  const gros = structuredClone(produit);
  gros.produits = gros.produits.map((p) => ({
    ...p, titre: `${'Équipement de protection '.repeat(5)}`.slice(0, 120), prix: 1234567, pose: 7654321, performances: { principale: 480, montage: 240, poids: 199 },
  }));
  await page.route('**/data/produit.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(gros) }));
  for (const largeur of LARGEURS) {
    await ouvrir(page, largeur, sel('inondations', ids('inondations')));
    expect(await sansDebordement(page), `${largeur} px`).toBe(true);
    await expect(colonnes(page)).toHaveCount(3);
    await expect(page.locator('.comp__table tbody tr').nth(3).locator('td').first()).toHaveText(`1${FINE}234${FINE}567${FINE}€`);
    expect(await page.locator('.comp__zone').evaluate((e) => e.getBoundingClientRect().right <= document.documentElement.clientWidth + 1)).toBe(true);
  }
});

for (const largeur of LARGEURS) {
  for (const nombre of [2, 3]) {
    test(`axe sans violation à ${largeur} px avec ${nombre} produits`, async ({ page }) => {
      const erreurs = [];
      page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
      await ouvrir(page, largeur, sel('inondations', ids('inondations').slice(0, nombre)));
      await expect(colonnes(page)).toHaveCount(nombre);
      const resultats = await new AxeBuilder({ page }).analyze();
      expect(resultats.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      expect(await sansDebordement(page)).toBe(true);
      expect(erreurs).toEqual([]);
      await page.screenshot({ path: `test-results/comparateur-b-${nombre}-${largeur}.png`, fullPage: true });
    });
  }
}
