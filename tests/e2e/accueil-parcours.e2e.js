import { test, expect } from '@playwright/test';

const ROLES = ['en-tete', 'hero', 'recherche', 'aleas', 'protection', 'comment', 'avis'];

const colonnes = (page) => page.evaluate(() => new Set([...document.querySelectorAll('[data-role="comment"] ol > li')].map((li) => Math.round(li.getBoundingClientRect().left))).size);

test('comment ça marche : 3 étapes dans un <ol>, 1 colonne à 375 px, 3 à 1440 px', async ({ page }) => {
  await page.goto('/index.html');
  for (const [largeur, attendu] of [[375, 1], [768, 1], [1440, 3]]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForSelector('html[data-rendu="pret"]');
    await expect(page.locator('[data-role="comment"] ol')).toHaveCount(1);
    await expect(page.locator('[data-role="comment"] ol > li')).toHaveCount(3);
    await expect(page.locator('[data-role="comment"] ol > li h3')).toHaveCount(3);
    expect(await colonnes(page), `colonnes à ${largeur}`).toBe(attendu);
    const numeros = await page.locator('.etape__numero').evaluateAll((els) => els.map((e) => {
      const b = e.getBoundingClientRect();
      return [e.getAttribute('aria-hidden'), b.width === b.height && b.width > 0, getComputedStyle(e).borderRadius];
    }));
    expect(numeros).toEqual(Array(3).fill(['true', true, '50%']));
  }
  await page.screenshot({ path: 'test-results/accueil-comment-1440.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
});

for (const largeur of [375, 1440]) {
  test(`les sept blocs se suivent de haut en bas à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    const hauts = [];
    for (const role of ROLES) {
      const boite = await page.locator(`[data-role="${role}"]`).boundingBox();
      expect(boite, role).not.toBeNull();
      hauts.push(boite.y);
    }
    for (let i = 1; i < hauts.length; i++) {
      expect(hauts[i], `${ROLES[i]} sous ${ROLES[i - 1]}`).toBeGreaterThan(hauts[i - 1]);
    }
    // aucun trou entre « comment », « reassurance » et « preuve » (la réassurance s'intercale depuis le lot 3b)
    const [comment, reassurance, preuve] = await Promise.all(['comment', 'reassurance', 'preuve'].map((r) => page.locator(`[data-role="${r}"]`).boundingBox()));
    expect(Math.abs(reassurance.y - (comment.y + comment.height))).toBeLessThanOrEqual(1);
    expect(Math.abs(preuve.y - (reassurance.y + reassurance.height))).toBeLessThanOrEqual(1);
  });

  for (const [libelle, cible] of [['Vendre sur la plateforme', /\/pro\.html$/], ['Mon compte', /:4173\/connexion\.html$/]]) {
    test(`parcours à ${largeur} px : « ${libelle} »`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto('/index.html');
      await page.waitForSelector('html[data-rendu="pret"]');
      if (largeur === 375) await page.locator('[data-menu-bouton]').click();
      await page.getByRole('navigation').getByRole('link', { name: libelle, exact: true }).click();
      await expect(page).toHaveURL(cible);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }
}
