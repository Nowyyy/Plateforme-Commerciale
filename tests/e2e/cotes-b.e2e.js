import { test, expect } from '@playwright/test';

const LARGEURS = [375, 768, 1440];

async function ouvrir(page, largeur, session = {}) {
  await page.setViewportSize({ width: largeur, height: 900 });
  await page.addInitScript((valeurs) => {
    for (const [cle, valeur] of Object.entries(valeurs)) if (!sessionStorage.getItem('__init')) sessionStorage.setItem(cle, valeur);
    sessionStorage.setItem('__init', '1');
  }, session);
  await page.goto('/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => document.fonts.ready);
}

const saisir = async (page, largeur, hauteur, tolerance = '') => {
  await page.locator('#cote-largeur').fill(largeur);
  await page.locator('#cote-hauteur').fill(hauteur);
  await page.locator('#cote-tolerance').fill(tolerance);
};
const etat = (page) => page.locator('#cotes-faisabilite');

test('saisie : compatible, hors tolérance avec écart, état « à saisir », erreur de format, tolérance trop grande', async ({ page }) => {
  await ouvrir(page, 1440);
  await expect(etat(page)).toHaveAttribute('data-etat', 'saisir');
  await expect(etat(page)).toHaveAttribute('role', 'status');
  await expect(etat(page)).toHaveAttribute('aria-live', 'polite');
  await saisir(page, '1 200', '400');
  await expect(etat(page)).toHaveAttribute('data-etat', 'compatible');
  await expect(etat(page)).toContainText('Compatible');
  await expect(etat(page)).toContainText('Vos cotes entrent dans la plage du produit');
  await page.locator('#cote-largeur').fill('699');
  await expect(etat(page)).toHaveAttribute('data-etat', 'hors');
  await expect(etat(page)).toContainText('Hors tolérance');
  await expect(etat(page)).toContainText('La largeur est trop petite de 1 mm par rapport à la plage du produit.');
  await page.locator('#cote-hauteur').fill('');
  await expect(etat(page)).toHaveAttribute('data-etat', 'saisir');
  await expect(etat(page).locator('li')).toHaveCount(0);
  await page.locator('#cote-hauteur').fill('400');
  await page.locator('#cote-largeur').fill('abc');
  const champ = page.locator('#cote-largeur');
  await expect(champ).toHaveAttribute('aria-invalid', 'true');
  const ids = (await champ.getAttribute('aria-describedby')).split(' ');
  expect(ids).toContain('erreur-largeur');
  await expect(page.locator('#erreur-largeur')).toContainText('Entrez un nombre entier de millimètres, par exemple 1 200.');
  const icone = await page.locator('#erreur-largeur').evaluate((el) => getComputedStyle(el, '::before').content);
  expect(icone).toContain('!');
  await page.locator('#cote-largeur').fill('800');
  await expect(page.locator('#erreur-largeur')).toHaveText('');
  await expect(champ).not.toHaveAttribute('aria-invalid', 'true');
  await page.locator('#cote-tolerance').fill('51');
  await expect(page.locator('#erreur-tolerance')).toContainText('ne peut pas dépasser 50 mm');
  await expect(page.locator('#cote-tolerance')).toHaveAttribute('aria-invalid', 'true');
});

test('tolérance : (705, 400, 10) hors avec 5 mm ; (710, 400, 10) compatible', async ({ page }) => {
  await ouvrir(page, 1440);
  await saisir(page, '705', '400', '10');
  await expect(etat(page)).toHaveAttribute('data-etat', 'hors');
  await expect(etat(page)).toContainText('trop petite de 5 mm');
  await page.locator('#cote-largeur').fill('710');
  await expect(etat(page)).toHaveAttribute('data-etat', 'compatible');
  await page.locator('#cote-largeur').fill('1595');
  await expect(etat(page)).toContainText('La largeur est trop grande de 5 mm');
});

test('interaction : le focus met en évidence la cote (trait épais, aria-current) et la perte du focus la retire', async ({ page }) => {
  await ouvrir(page, 1440);
  const cas = [['largeur', 'a'], ['hauteur', 'b'], ['tolerance', 'c']];
  for (const [champ, cote] of cas) {
    await page.locator(`#cote-${champ}`).focus();
    for (const [, autre] of cas) {
      const groupe = page.locator(`#cote-${autre}`);
      const item = page.locator(`.etapes__item[data-id="${autre}"]`);
      if (autre === cote) {
        await expect(groupe).toHaveClass(/est-actif/);
        await expect(item).toHaveAttribute('aria-current', 'true');
        const epaisseur = await groupe.locator('.schema__fleche, .schema__bande').first().evaluate((el) => parseFloat(getComputedStyle(el).strokeWidth));
        expect(epaisseur).toBeGreaterThanOrEqual(5);
      } else {
        await expect(groupe).not.toHaveClass(/est-actif/);
        await expect(item).not.toHaveAttribute('aria-current', 'true');
      }
    }
    await page.locator(`#cote-${champ}`).blur();
    await expect(page.locator('.schema__cote.est-actif')).toHaveCount(0);
    await expect(page.locator('.etapes__item[aria-current="true"]')).toHaveCount(0);
  }
  await expect(page.locator('.etapes__item')).toHaveCount(3);
});

test('persistance : sessionStorage.cotes, restauration, autre produit mémorisé, valeur illisible', async ({ page, browser }) => {
  const messages = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
  page.on('pageerror', (e) => messages.push(e.message));
  await ouvrir(page, 1440);
  await saisir(page, '1 200', '400', '10');
  const memo = JSON.parse(await page.evaluate(() => sessionStorage.getItem('cotes')));
  expect(memo).toEqual({ produit: 'batardeau-modulable', largeur: '1 200', hauteur: '400', tolerance: '10' });
  await page.reload();
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#cote-largeur')).toHaveValue('1 200');
  await expect(page.locator('#cote-hauteur')).toHaveValue('400');
  await expect(page.locator('#cote-tolerance')).toHaveValue('10');
  await expect(etat(page)).toHaveAttribute('data-etat', 'compatible');
  for (const brut of [JSON.stringify({ produit: 'bouclier-de-baie', largeur: '900', hauteur: '400', tolerance: '' }), 'pas du json', '{"produit":']) {
    const contexte = await browser.newContext({ baseURL: 'http://localhost:4173/' });
    const autre = await contexte.newPage();
    autre.on('console', (m) => { if (['error', 'warning'].includes(m.type())) messages.push(m.text()); });
    autre.on('pageerror', (e) => messages.push(e.message));
    await ouvrir(autre, 1440, { cotes: brut });
    for (const nom of ['largeur', 'hauteur', 'tolerance']) await expect(autre.locator(`#cote-${nom}`)).toHaveValue('');
    await expect(autre.locator('#cotes-faisabilite')).toHaveAttribute('data-etat', 'saisir');
    await contexte.close();
  }
  expect(messages).toEqual([]);
});

for (const largeur of LARGEURS) {
  test(`mise en page à ${largeur} px : colonnes, schéma 4:3, aucun débordement, pied stable`, async ({ page }) => {
    await ouvrir(page, largeur);
    const rect = (sel) => page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height, bas: r.bottom + window.scrollY }; });
    const schema = await rect('.schema');
    const saisie = await rect('#cotes-saisie');
    console.log(`${largeur} px : schéma x=${schema.x} l=${schema.w.toFixed(0)} h=${schema.h.toFixed(0)} ; saisie x=${saisie.x} l=${saisie.w.toFixed(0)}`);
    expect(Math.abs(schema.w / schema.h - 4 / 3) / (4 / 3)).toBeLessThan(0.02);
    if (largeur >= 768) {
      expect(saisie.x).toBeGreaterThan(schema.x + schema.w - 1);
      expect(Math.abs(schema.w - saisie.w)).toBeLessThan(schema.w * 0.1);
      expect(saisie.y).toBeLessThan(schema.y + schema.h);
    } else {
      expect(Math.abs(saisie.x - schema.x)).toBeLessThan(2);
      expect(saisie.y).toBeGreaterThan(schema.bas);
    }
    const pied = () => page.locator('[data-role="pied"]').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const bas = () => page.locator('[data-role="configurateur"]').evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
    const mesures = [];
    mesures.push([await pied(), await bas()]);
    await saisir(page, '1200', '400');
    mesures.push([await pied(), await bas()]);
    await saisir(page, '699', '400');
    mesures.push([await pied(), await bas()]);
    await saisir(page, '705', '400', '10');
    mesures.push([await pied(), await bas()]);
    console.log(`${largeur} px : pied ${mesures.map((m) => m[0].toFixed(1)).join(' / ')}`);
    for (const m of mesures) {
      expect(Math.abs(m[0] - mesures[0][0])).toBeLessThanOrEqual(2);
      expect(Math.abs(m[1] - mesures[0][1])).toBeLessThanOrEqual(2);
    }
    // saisie de 4 chiffres dans chaque champ (tolérance invalide donc message d'erreur affiché) puis message d'écart
    await saisir(page, '9999', '9999', '9999');
    await expect(page.locator('#erreur-tolerance')).not.toHaveText('');
    await saisir(page, '1599', '600', '50');
    await expect(etat(page)).toHaveAttribute('data-etat', 'hors');
    const { defilement, fenetre } = await page.evaluate(() => ({ defilement: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(defilement).toBeLessThanOrEqual(fenetre);
    await saisir(page, '1200', '400');
    await page.locator('#cote-largeur').focus();
    for (const [nom, valeurs] of [['saisir', ['', '']], ['compatible', ['1200', '400']], ['hors', ['699', '400']]]) {
      await saisir(page, ...valeurs);
      await expect(etat(page)).toHaveAttribute('data-etat', nom);
      await page.locator('[data-role="configurateur"]').screenshot({ path: `test-results/cotes-B-${nom}-${largeur}.png` });
    }
  });
}
