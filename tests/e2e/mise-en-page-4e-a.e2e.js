import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ouvrirDiagnostic, simuler, surveillerConsole } from './carte-reelle-simulation.js';

const boite = async (page, role) => {
  const b = await page.locator(`[data-role="${role}"]`).boundingBox();
  expect(b, role).not.toBeNull();
  return b;
};
const carteAffichee = async (page) => {
  await expect(page.locator('#carte-reelle .carte-reelle__repere')).toHaveCount(1);
  await expect(page.locator('#liste-calques label')).toHaveCount(3);
};
const entreesVisibles = (page) => page.locator('#legende-reelle li:not([hidden])');
const colonnes = (page) => page.locator('#liste-equipements > li').evaluateAll((els) => {
  const rangees = new Map();
  for (const e of els) {
    const b = e.getBoundingClientRect();
    const cle = Math.round(b.top);
    rangees.set(cle, [...(rangees.get(cle) ?? []), Math.round(b.height)]);
  }
  return [...rangees.values()];
});

test('1440 px : cadre 800 × 460 au moins, exposition de 330 à 420 px alignée en haut (2 px) et en bas (8 px) sur carte et légende, équipements dessous', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  const [cadre, carte, legende, expo, equip] = [await page.locator('.carte-cadre').boundingBox(), await boite(page, 'carte'), await boite(page, 'legende'), await boite(page, 'exposition'), await boite(page, 'equipements')];
  console.log(`1440 px : cadre ${cadre.width} × ${cadre.height}, exposition ${expo.width} px, haut ${expo.y - carte.y}, bas ${expo.y + expo.height - (legende.y + legende.height)}`);
  expect(cadre.width).toBeGreaterThanOrEqual(800);
  expect(cadre.height).toBeGreaterThanOrEqual(460);
  expect(expo.width).toBeGreaterThanOrEqual(330);
  expect(expo.width).toBeLessThanOrEqual(420);
  expect(Math.abs(expo.y - carte.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(expo.y + expo.height - (legende.y + legende.height))).toBeLessThanOrEqual(8);
  expect(legende.y).toBeGreaterThanOrEqual(carte.y + carte.height);
  expect(Math.abs(legende.x - carte.x)).toBeLessThanOrEqual(1);
  expect(equip.y).toBeGreaterThanOrEqual(Math.max(expo.y + expo.height, legende.y + legende.height) - 1);
});

test('375 et 768 px : ordre vertical adresse, carte, légende, exposition, équipements ; cadre de 340 × 350 au moins à 375 px ; aucun débordement à 375, 768 et 1440 px', async ({ page }) => {
  await simuler(page);
  for (const largeur of [375, 768, 1440]) {
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${largeur} px`).toBe(true);
    if (largeur === 1440) continue;
    const ys = [];
    for (const role of ['adresse', 'carte', 'legende', 'exposition', 'equipements']) ys.push((await boite(page, role)).y);
    expect(ys, `${largeur} px`).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(5);
    const cadre = await page.locator('.carte-cadre').boundingBox();
    if (largeur === 375) {
      expect(cadre.width).toBeGreaterThanOrEqual(340);
      expect(cadre.height).toBeGreaterThanOrEqual(350);
    }
  }
});

test('légende : une entrée par couche affichée plus « Votre adresse » ; décocher une case masque l\'entrée ; nom technique masqué visuellement ; phrase de fond de carte', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(entreesVisibles(page)).toHaveCount(5); // inondation (2 couches), argiles, feux, adresse
  await expect(entreesVisibles(page).last()).toHaveText('Votre adresse');
  const argile = entreesVisibles(page).filter({ hasText: 'Aléa retrait-gonflement des argiles (Géorisques)' });
  await expect(argile).toHaveCount(1);
  await expect(argile.locator('.legende__technique')).toHaveText('Couche : ALEARG');
  await expect(argile.locator('.legende__libelle')).not.toContainText('ALEARG');
  const technique = await argile.locator('.legende__technique').boundingBox();
  expect(technique.width).toBeLessThanOrEqual(1); // masqué visuellement, lisible par les lecteurs d'écran
  const legende = page.locator('[data-role="legende"]');
  await expect(legende.getByRole('heading', { level: 2, name: 'Légende' })).toBeVisible();
  await expect(legende).toContainText('Elle suit les cases cochées. Fond de carte : OpenStreetMap, repli automatique sur le Plan IGN.');
  await page.getByRole('checkbox', { name: 'Retrait-gonflement des argiles' }).uncheck();
  await expect(entreesVisibles(page)).toHaveCount(4);
  await expect(page.locator('#legende-reelle li[hidden] .legende__technique')).toHaveText('Couche : ALEARG');
  await page.getByRole('checkbox', { name: 'Zone inondable' }).uncheck();
  await expect(entreesVisibles(page)).toHaveCount(2); // feux et adresse
  await page.getByRole('checkbox', { name: 'Zone inondable' }).check();
  await expect(entreesVisibles(page)).toHaveCount(4);
});

test('aucun choix de fond : ni groupe « Fond de carte », ni radio OpenStreetMap ou Plan IGN', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  await carteAffichee(page);
  await expect(page.getByRole('group', { name: 'Fond de carte' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /OpenStreetMap|Plan IGN/ })).toHaveCount(0);
  await expect(page.locator('input[name="fond-carte"]')).toHaveCount(0);
});

test('repli automatique : tuiles OpenStreetMap refusées, bascule annoncée sur le Plan IGN sans aucune radio', async ({ page }) => {
  const journal = await simuler(page, { tuiles: { osm: 'abandon' } });
  await ouvrirDiagnostic(page, 1440);
  await expect(page.locator('#carte-reelle-fond-etat')).toHaveText("Le fond OpenStreetMap n'a pas répondu : bascule sur le Plan IGN.");
  await expect(page.locator('#carte-reelle-fond-etat')).toHaveAttribute('role', 'status');
  await expect.poll(() => journal.ign.length).toBeGreaterThan(0);
  await expect(page.getByRole('radio', { name: 'Plan IGN' })).toHaveCount(0);
});

test('équipements : trois colonnes à 1440 px, deux à 768 px, une à 375 px, cartes de même hauteur par rangée', async ({ page }) => {
  await simuler(page);
  for (const [largeur, attendu] of [[1440, [3]], [768, [2, 1]], [375, [1, 1, 1]]]) {
    await ouvrirDiagnostic(page, largeur);
    await expect(page.locator('#liste-equipements > li')).toHaveCount(3);
    const rangees = await colonnes(page);
    expect(rangees.map((r) => r.length), `${largeur} px`).toEqual(attendu);
    for (const hauteurs of rangees) expect(Math.max(...hauteurs) - Math.min(...hauteurs), `${largeur} px`).toBeLessThanOrEqual(1);
    const premiere = page.locator('#liste-equipements > li').first();
    expect((await premiere.locator('.equipement__visuel').boundingBox()).height).toBeGreaterThanOrEqual(127);
    await expect(premiere.getByRole('link', { name: /Voir la fiche/ })).toBeVisible();
  }
});

test('pastilles d\'aléa dans le bloc équipements (selon les aléas recensés), absentes du bloc adresse, filtrage par aléa', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  const equipements = page.locator('[data-role="equipements"]');
  await expect(equipements.getByRole('group', { name: 'Aléa' }).getByRole('radio')).toHaveCount(3);
  await expect(page.locator('[data-role="adresse"] input[type="radio"]')).toHaveCount(0);
  await expect(equipements.getByRole('radio', { name: 'Tous' })).toBeChecked();
  await expect(page.locator('#liste-equipements > li')).toHaveCount(3);
  await equipements.getByRole('radio', { name: 'Inondations', exact: true }).check({ force: true });
  for (const carte of await page.locator('#liste-equipements > li').all()) await expect(carte).toContainText('Neutralise : Inondations et crues');
  await expect(page.locator('#annonce-diagnostic')).toContainText('équipements pour Inondations');
});

test('exposition : jauge décorative et niveau visibles dans le cadre blanc', async ({ page }) => {
  await simuler(page);
  await ouvrirDiagnostic(page, 1440);
  const expo = page.locator('[data-role="exposition"]');
  await expect(expo.getByRole('heading', { level: 2, name: 'Exposition à cette adresse' })).toBeVisible();
  await expect(expo.locator('#jauge')).toBeVisible();
  await expect(expo.locator('#jauge')).toHaveAttribute('aria-hidden', 'true');
  await expect(expo.locator('#jauge > li')).toHaveCount(4);
  await expect(expo.locator('#exposition-niveau')).toHaveText("Niveau d'exposition : modéré (indicatif)");
  await expect(expo.getByRole('link', { name: /Source officielle : Géorisques/ })).toBeVisible();
  const cadre = expo.locator('.carte');
  await expect(cadre).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('[data-role="legende"] .carte')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

for (const largeur of [375, 768, 1440]) {
  test(`axe sans violation (légende, exposition, pastilles) et console propre à ${largeur} px`, async ({ page }) => {
    await simuler(page);
    const console_ = surveillerConsole(page);
    await ouvrirDiagnostic(page, largeur);
    await carteAffichee(page);
    await page.waitForTimeout(400);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(' ; ')}`)).toEqual([]);
    expect(console_.filter((m) => !m.includes('Failed to load resource'))).toEqual([]);
  });
}

test('JavaScript désactivé : seul le message noscript est visible, aucun cadre ni panneau', async ({ browser }) => {
  const contexte = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await contexte.newPage();
  await page.goto('/diagnostic.html');
  await expect(page.locator('.noscript')).toBeVisible();
  expect((await page.locator('body').innerText()).trim()).toBe('Ce démonstrateur nécessite JavaScript');
  for (const selecteur of ['.carte-cadre', '.exposition', '.diag__legende .bloc-carte', '.diag__panneau']) await expect(page.locator(selecteur).first()).toBeHidden();
  await contexte.close();
});
