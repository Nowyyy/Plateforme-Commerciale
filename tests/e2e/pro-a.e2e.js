import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { TROIS_LIGNES } from '../outils/panier-aide.mjs';

async function ouvrir(page, largeur, session = null) {
  const suivi = { messages: [], externes: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) suivi.messages.push(m.text()); });
  page.on('pageerror', (e) => suivi.messages.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173/') && !r.url().startsWith('data:')) suivi.externes.push(r.url()); });
  await page.setViewportSize({ width: largeur, height: 900 });
  if (session !== null) {
    await page.addInitScript((brut) => {
      if (sessionStorage.getItem('__init')) return;
      sessionStorage.setItem('panier', brut);
      sessionStorage.setItem('__init', '1');
    }, JSON.stringify(session));
  }
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await page.evaluate(() => globalThis.document.fonts.ready);
  return suivi;
}

for (const largeur of [375, 768, 1440]) {
  test(`pro.html à ${largeur} px : console propre, pas de débordement, axe, aucune requête externe, blocs visibles`, async ({ page }) => {
    const suivi = await ouvrir(page, largeur);
    expect(suivi.messages).toEqual([]);
    expect(suivi.externes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Vendre sur la plateforme' })).toBeVisible();
    await expect(page.getByText("Réservé aux professionnels. Démonstrateur : aucune candidature n'est réellement transmise.")).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Comment devenir vendeur' })).toBeVisible();
    await expect(page.locator('[data-role="etapes"] li')).toHaveCount(3);
    for (const titre of ['Candidature', 'Validation du catalogue et des certifications', 'Mise en ligne']) {
      await expect(page.getByRole('heading', { level: 3, name: titre })).toBeVisible();
    }
    await expect(page.getByRole('heading', { level: 2, name: 'Déposer ma candidature' })).toBeVisible();
    await expect(page.locator('[data-role="confirmation"]')).toBeHidden();
    await page.screenshot({ path: `test-results/pro-a-${largeur}.png`, fullPage: true });
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(resultats.violations.map((v) => v.id)).toEqual([]);
  });
}

for (const [largeur, colonnes] of [[375, 1], [768, 1], [1440, 3]]) {
  test(`étapes à ${largeur} px : ${colonnes} colonne(s)`, async ({ page }) => {
    await ouvrir(page, largeur);
    const boites = await page.locator('[data-role="etapes"] li').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y) };
    }));
    expect(boites).toHaveLength(3);
    if (colonnes === 1) {
      expect(new Set(boites.map((b) => b.x)).size).toBe(1);
      expect(boites[0].y).toBeLessThan(boites[1].y);
      expect(boites[1].y).toBeLessThan(boites[2].y);
    } else {
      expect(new Set(boites.map((b) => b.y)).size).toBe(1);
      expect(boites[0].x).toBeLessThan(boites[1].x);
      expect(boites[1].x).toBeLessThan(boites[2].x);
    }
  });
}

for (const largeur of [375, 1440]) {
  test(`navigation à ${largeur} px : « Vendre sur la plateforme » mène à pro.html, sans paramètre ni fragment`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto('/index.html');
    await page.waitForSelector('html[data-rendu="pret"]');
    if (largeur === 375) await page.locator('[data-menu-bouton]').click();
    await page.getByRole('navigation').getByRole('link', { name: 'Vendre sur la plateforme', exact: true }).click();
    await page.waitForURL((u) => u.pathname === '/pro.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
}

test('le compteur d\'en-tête de pro.html affiche le nombre d\'articles de la session panier', async ({ page }) => {
  await ouvrir(page, 1440, TROIS_LIGNES);
  await expect(page.locator('.entete .compteur__nombre').first()).toHaveText('(6)');
});
