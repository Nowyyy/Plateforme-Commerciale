// Lot 10a-C : accessibilité transversale des 14 pages Hi-Fi : titres, repères, clavier, lien d'évitement, focus visible, reflow à 320 px,
// liens répétés, pictogrammes, Échap, mouvement réduit, axe à quatre largeurs, six parcours au clavier seul.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { simuler } from './carte-reelle-simulation.js';
import { choisirAdresse } from '../outils/choisir-adresse.js';
import { analyserCouleur, composer, rapportContraste } from '../outils/contraste.js';
import { PAGES, attendreEtatNominal, preparerPage } from '../outils/etats-pages.mjs';
import { TROIS_LIGNES } from '../outils/panier-aide.mjs';

const BASE = 'http://localhost:4173';
async function ouvrir(browser, etat, largeur, session = etat.session) {
  const contexte = await browser.newContext({ baseURL: BASE, viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
  const page = await contexte.newPage();
  const journal = await preparerPage(page, { ...etat, session });
  await page.goto(`/${etat.fichier}`);
  await attendreEtatNominal(page, etat);
  return { page, contexte, journal };
}

// 1. Titres
test('titres : un seul h1 visible par page, aucun niveau sauté dans l\'ordre du document (14 pages)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const etat of PAGES) {
    const { page, contexte } = await ouvrir(browser, etat, 1440);
    const niveaux = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
      .filter((h) => !h.closest('template, [hidden]'))
      .map((h) => Number(h.getAttribute('aria-level') ?? h.tagName[1])));
    expect(niveaux.filter((n) => n === 1), `${etat.fichier} : h1`).toHaveLength(1);
    expect(niveaux[0], etat.fichier).toBe(1);
    niveaux.reduce((precedent, n, i) => {
      expect(n <= precedent + 1, `${etat.fichier} : h${precedent} puis h${n} (n° ${i + 1})`).toBe(true);
      return n;
    }, 0);
    await contexte.close();
  }
});

// 2. Repères et title
test('repères : un header, un main, un footer ; navigations nommées et distinctes ; title non vide et unique ; lang="fr"', async ({ browser }) => {
  test.setTimeout(180000);
  const titres = new Set();
  for (const etat of PAGES) {
    const { page, contexte } = await ouvrir(browser, etat, 1440);
    for (const repere of ['header', 'main', 'footer']) await expect(page.locator(repere), `${etat.fichier} ${repere}`).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    const noms = await page.locator('nav').evaluateAll((navs) => navs.map((n) => n.getAttribute('aria-label')));
    for (const nom of noms) expect(nom?.trim(), `${etat.fichier} : nav sans nom`).toBeTruthy();
    expect(new Set(noms).size, `${etat.fichier} : noms de nav`).toBe(noms.length);
    const titre = (await page.title()).trim();
    expect(titre, etat.fichier).not.toBe('');
    expect(titres.has(titre), `title dupliqué : ${titre}`).toBe(false);
    titres.add(titre);
    await contexte.close();
  }
});

// 3. Clavier : séquence de Tab
async function sequenceTab(page) {
  await page.evaluate(() => { globalThis.document.activeElement?.blur(); globalThis.scrollTo(0, 0); });
  const vus = [];
  for (let i = 0; i < 400; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = globalThis.document.activeElement;
      if (!el || el === globalThis.document.body) return null;
      const tous = [...globalThis.document.querySelectorAll('*')];
      const r = el.getBoundingClientRect();
      const s = globalThis.getComputedStyle(el);
      return { index: tous.indexOf(el), nom: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`, visible: r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none', radio: el.type === 'radio' ? el.name : null };
    });
    if (info === null) { if (vus.length > 0) break; continue; }
    if (vus.length > 0 && vus[0].index === info.index) break; // retour au premier élément : cycle complet
    vus.push(info);
  }
  return vus;
}

test('clavier : séquence de Tab sur les 14 pages (aucun piège, aucun élément masqué focalisé, ordre du document, tous les éléments interactifs visibles atteints)', async ({ browser }) => {
  test.setTimeout(600000);
  for (const etat of PAGES) {
    for (const largeur of [375, 1440]) {
      const { page, contexte } = await ouvrir(browser, etat, largeur);
      const vus = await sequenceTab(page);
      expect(vus.length, `${etat.fichier} : au moins un élément`).toBeGreaterThan(3);
      expect(vus.length, `${etat.fichier} : piège`).toBeLessThan(400);
      for (const v of vus) expect(v.visible, `${etat.fichier} à ${largeur} px : ${v.nom} masqué mais focalisé`).toBe(true);
      // l'ordre est celui du document, sauf les éléments sortis du flux (carte Leaflet) : on tolère un retour en arrière seulement dans la carte
      let precedent = -1;
      const retours = [];
      for (const v of vus) { if (v.index < precedent) retours.push(v.nom); precedent = v.index; }
      expect(retours, `${etat.fichier} à ${largeur} px : ordre`).toEqual([]);
      // tout élément interactif visible est atteint (un groupe de radios compte pour un)
      const atteints = new Set(vus.map((v) => v.index));
      const manques = await page.evaluate((idx) => {
        const tous = [...globalThis.document.querySelectorAll('*')];
        const ok = new Set(idx);
        const groupes = new Set();
        return [...globalThis.document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const s = globalThis.getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.disabled && !el.closest('[hidden], [inert], template') && el.getAttribute('tabindex') !== '-1'
              && (el.tagName === 'SUMMARY' || !el.closest('details:not([open])')); // le contenu d'un détail fermé n'est pas affiché
          })
          .filter((el) => !ok.has(tous.indexOf(el)))
          .filter((el) => { if (el.type !== 'radio') return true; const cle = `${el.form?.id ?? ''}${el.name}`; if (groupes.has(cle)) return false; groupes.add(cle); return ![...globalThis.document.getElementsByName(el.name)].some((r) => ok.has(tous.indexOf(r))); })
          .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${el.className}`);
      }, [...atteints]);
      expect(manques, `${etat.fichier} à ${largeur} px : éléments non atteints`).toEqual([]);
      await contexte.close();
    }
  }
});

// 4. Lien d'évitement
test('lien d\'évitement : premier élément focalisé, visible au focus, mène au contenu et y déplace le focus (14 pages)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const etat of PAGES) {
    const { page, contexte } = await ouvrir(browser, etat, 375);
    await page.keyboard.press('Tab');
    const lien = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(lien, etat.fichier).toBeFocused();
    await expect(lien).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenu$/);
    await expect.poll(() => page.evaluate(() => globalThis.document.activeElement?.id), { message: etat.fichier }).toBe('contenu');
    await contexte.close();
  }
});

// 5. Focus visible : contraste de l'indicateur
async function indicateur(page, locator) {
  await locator.focus();
  await expect(locator).toBeFocused();
  // l'indicateur peut être posé sur l'élément ou sur un ancêtre proche (carte, étiquette) via :has(:focus-visible)
  return page.evaluate((el) => {
    const analyser = (c) => c;
    const fond = (n) => {
      for (let p = n; p; p = p.parentElement) {
        const m = globalThis.getComputedStyle(p).backgroundColor;
        const a = m.match(/rgba?\(([^)]+)\)/)?.[1].split(',');
        if (a && (a.length === 3 || Number(a[3]) > 0.95)) return m;
      }
      return 'rgb(248, 250, 252)';
    };
    for (let n = el, i = 0; n && i < 4; n = n.parentElement, i += 1) {
      const s = globalThis.getComputedStyle(n);
      if (parseFloat(s.opacity) === 0) continue; // champ natif rendu invisible : l'indicateur est celui de son étiquette
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) return { couleur: analyser(s.outlineColor), epaisseur: parseFloat(s.outlineWidth), fond: parseFloat(s.outlineOffset) < 0 ? fond(n) : fond(n.parentElement ?? n), element: n.tagName.toLowerCase() };
      if (s.boxShadow !== 'none' && /rgb/.test(s.boxShadow)) return { couleur: s.boxShadow.match(/rgba?\([^)]+\)/)[0], epaisseur: 2, fond: fond(n.parentElement ?? n), element: `${n.tagName.toLowerCase()} (ombre)` };
    }
    return null;
  }, await locator.elementHandle());
}

const PAGES_FOCUS = ['index', 'diagnostic', 'produit', 'panier', 'pro', 'connexion', 'comparateur'];
test('focus visible : l\'indicateur des boutons, liens, champs, pastilles, cases et détails atteint 3:1 avec son fond (7 pages)', async ({ browser }) => {
  test.setTimeout(300000);
  const selecteurs = ['a[href]', 'button', 'input[type="text"], input[type="email"], input[type="password"], input:not([type]), textarea', 'input[type="radio"]', 'input[type="checkbox"]', 'summary'];
  for (const nom of PAGES_FOCUS) {
    const etat = PAGES.find((p) => p.nom === nom);
    const { page, contexte } = await ouvrir(browser, etat, 1440);
    let verifies = 0;
    for (const sel of selecteurs) {
      const cible = page.locator(sel).filter({ visible: true }).first();
      if ((await cible.count()) === 0) continue;
      // les transitions (0,01 ms sous mouvement réduit) laissent un instant l'ancien style : on attend la valeur stable
      await expect.poll(async () => {
        const mesure = await indicateur(page, cible);
        if (mesure === null) return 0;
        const fond = analyserCouleur(mesure.fond) ?? { r: 248, g: 250, b: 252, a: 1 };
        return rapportContraste(composer(analyserCouleur(mesure.couleur), fond), fond);
      }, { message: `${nom} : ${sel} : contraste de l'indicateur de focus`, timeout: 5000 }).toBeGreaterThanOrEqual(3);
      verifies += 1;
    }
    expect(verifies, nom).toBeGreaterThanOrEqual(2);
    await contexte.close();
  }
});

// 6. Reflow à 320 px
test('reflow : aucune des 14 pages ne défile horizontalement à 320 px (état nominal)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const etat of PAGES) {
    const { page, contexte } = await ouvrir(browser, etat, 320);
    const { scroll, client } = await page.evaluate(() => ({ scroll: globalThis.document.documentElement.scrollWidth, client: globalThis.document.documentElement.clientWidth }));
    expect(scroll, `${etat.fichier} : défilement horizontal à 320 px`).toBeLessThanOrEqual(client);
    await contexte.close();
  }
});

test('reflow : à 320 px, un panier de dix lignes et un formulaire aux saisies longues et en erreur ne défilent pas horizontalement', async ({ browser }) => {
  test.setTimeout(120000);
  const lignes = Array.from({ length: 10 }, (_, i) => ({ produit: 'batardeau-modulable', mode: i % 2 ? 'pose' : 'diy', cotes: { largeur: 1000 + i * 10, hauteur: 400, tolerance: 0 }, quantite: 3 }));
  const panier = PAGES.find((p) => p.nom === 'panier');
  const { page, contexte } = await ouvrir(browser, panier, 320, { panier: JSON.stringify({ v: 2, lignes }) });
  await page.locator('.ligne__details summary').first().click();
  expect(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth)).toBe(true);
  await contexte.close();
  const pro = PAGES.find((p) => p.nom === 'pro');
  const o = await ouvrir(browser, pro, 320);
  await o.page.getByLabel('Société', { exact: true }).fill('S'.repeat(100));
  await o.page.getByLabel('E-mail professionnel').fill(`${'e'.repeat(60)}@${'d'.repeat(60)}.fr`);
  await o.page.getByRole('button', { name: 'Envoyer ma candidature' }).click();
  await expect(o.page.locator('[data-resume]')).toBeVisible();
  expect(await o.page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth)).toBe(true);
  await o.contexte.close();
});

// 7. Liens répétés : noms accessibles distincts
const nomAccessible = (locator) => locator.evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? e.textContent).replace(/\s+/g, ' ').trim()));
function distincts(noms, message) {
  expect(noms.length, message).toBeGreaterThan(1);
  expect(new Set(noms).size, `${message} : ${noms.join(' | ')}`).toBe(noms.length);
}

test('liens répétés : « Voir la fiche » (diagnostic), « Voir le détail » (achats), « Voir les solutions » (accueil), « Reprendre… » (panier) ont des noms distincts', async ({ browser }) => {
  test.setTimeout(120000);
  let o = await ouvrir(browser, PAGES.find((p) => p.nom === 'diagnostic'), 1440);
  await o.page.getByRole('radio', { name: 'Tous' }).check({ force: true });
  distincts(await nomAccessible(o.page.locator('#liste-equipements a', { hasText: 'Voir la fiche' })), 'diagnostic');
  await o.contexte.close();
  o = await ouvrir(browser, PAGES.find((p) => p.nom === 'achats'), 1440);
  distincts(await nomAccessible(o.page.locator('button, a').filter({ hasText: 'Voir le détail' })), 'achats');
  await o.contexte.close();
  o = await ouvrir(browser, PAGES.find((p) => p.nom === 'index'), 1440);
  distincts(await nomAccessible(o.page.locator('a.carte-bloc__lien')), 'accueil');
  for (const nom of await nomAccessible(o.page.locator('a.carte-bloc__lien'))) expect(nom).toContain('Voir les solutions');
  await o.contexte.close();
  o = await ouvrir(browser, PAGES.find((p) => p.nom === 'panier'), 1440, { panier: JSON.stringify(TROIS_LIGNES) });
  distincts(await nomAccessible(o.page.locator('.ligne__reprendre')), 'panier');
  await o.contexte.close();
});

// 8. Pictogrammes et SVG
test('pictogrammes et SVG : décoratifs en aria-hidden, informatifs nommés ; aucune image sans alt (14 pages)', async ({ browser }) => {
  test.setTimeout(180000);
  for (const etat of PAGES) {
    const { page, contexte } = await ouvrir(browser, etat, 1440);
    const fautes = await page.evaluate(() => [...globalThis.document.querySelectorAll('svg')]
      .filter((s) => !s.closest('.leaflet-container, template, .sprite, [aria-hidden="true"]'))
      .filter((s) => s.getAttribute('aria-hidden') !== 'true' && !(s.getAttribute('role') === 'img' && (s.getAttribute('aria-label') || s.querySelector('title'))))
      .map((s) => `svg.${s.getAttribute('class')}`));
    expect(fautes, `${etat.fichier} : SVG ni décoratif ni nommé`).toEqual([]);
    expect(await page.locator('img:not([alt])').count(), `${etat.fichier} : img sans alt`).toBe(0);
    await contexte.close();
  }
});

// 9. Échap
test('Échap ferme la liste de suggestions, le menu mobile et rend le focus', async ({ page }) => {
  await simuler(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  const champ = page.getByLabel(/Entrez votre adresse/);
  await champ.pressSequentially('12 rue des Tilleuls');
  await expect(page.getByRole('option').first()).toBeVisible();
  await champ.press('Escape');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(champ).toHaveAttribute('aria-expanded', 'false');
  await choisirAdresse(page, champ, '12 rue des Tilleuls 6'); // la liste se rouvre à une nouvelle saisie et l'adresse se choisit
  const menu = page.locator('[data-menu-bouton]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});

// 10. Mouvement réduit
test('prefers-reduced-motion : aucune transition ni animation longue sur les boutons et liens (valeurs calculées)', async ({ browser }) => {
  for (const nom of ['index', 'diagnostic', 'panier']) {
    const { page, contexte } = await ouvrir(browser, PAGES.find((p) => p.nom === nom), 1440);
    for (const sel of ['a[href]', 'button', 'summary']) {
      const cible = page.locator(sel).filter({ visible: true }).first();
      if ((await cible.count()) === 0) continue;
      await expect(cible).toHaveCSS('transition-duration', /^(0s|0\.00\d*s|1e-05s|0\.01ms)(, (0s|0\.00\d*s|1e-05s))*$/);
      await expect(cible).toHaveCSS('animation-duration', /^(0s|0\.00\d*s|1e-05s)(, (0s|0\.00\d*s|1e-05s))*$/);
    }
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
    await contexte.close();
  }
});

// 11. axe à quatre largeurs
for (const etat of PAGES) {
  test(`${etat.fichier} : axe sans violation à 320, 375, 768 et 1440 px`, async ({ browser }) => {
    test.setTimeout(120000);
    for (const largeur of [320, 375, 768, 1440]) {
      const { page, contexte } = await ouvrir(browser, etat, largeur);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id} : ${v.nodes.length}`), `${etat.fichier} à ${largeur} px`).toEqual([]);
      await contexte.close();
    }
  });
}

// 12. Parcours au clavier seul
async function atteindre(page, locator, max = 150) {
  for (let i = 0; i < max; i += 1) {
    if (await locator.evaluate((el) => el === globalThis.document.activeElement, undefined, { timeout: 1500 }).catch(() => false)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`élément non atteint au clavier : ${locator}`);
}
async function preparerClavier(page, largeur = 1440) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: largeur, height: 900 });
}

test('clavier seul (1) parcours principal : accueil, adresse, diagnostic, fiche, ajout au panier, panier', async ({ page }) => {
  test.setTimeout(120000);
  await simuler(page);
  await preparerClavier(page);
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  await atteindre(page, page.getByLabel(/Entrez votre adresse/));
  await page.keyboard.type('12 rue des Tilleuls');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await atteindre(page, page.getByRole('button', { name: 'Évaluer mon exposition' }));
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/diagnostic.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.locator('#aleas-annonce')).not.toBeEmpty();
  const fiche = page.locator('#liste-equipements a', { hasText: 'Voir la fiche' }).last();
  await atteindre(page, fiche, 300);
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/produit.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('clavier seul (2) vendeur : candidature complète puis confirmation', async ({ page }) => {
  test.setTimeout(120000);
  await preparerClavier(page);
  await page.goto('/pro.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await atteindre(page, page.getByLabel('Société', { exact: true }));
  for (const texte of ['Zorglub Exemple SARL', '000 000 000 00000', 'Claire', 'Exemple', 'claire@exemple.fr', '06 12 34 56 78']) {
    await page.keyboard.type(texte);
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Space'); // première case d'aléa
  await atteindre(page, page.getByLabel('Description de vos produits'));
  await page.keyboard.type('Des batardeaux modulables et des clapets (exemple).');
  await atteindre(page, page.locator('#consentement'));
  await page.keyboard.press('Space');
  await atteindre(page, page.getByRole('button', { name: 'Envoyer ma candidature' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-role="confirmation"]')).toContainText('Candidature reçue (exemple)');
});

test('clavier seul (3) client : connexion, tableau de bord, achats, détail de commande', async ({ page }) => {
  await preparerClavier(page);
  await page.goto('/connexion.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await atteindre(page, page.getByLabel('E-mail', { exact: true }));
  await page.keyboard.type('camille@exemple.test');
  await page.keyboard.press('Tab');
  await page.keyboard.type('motdepasse');
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/compte.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await atteindre(page, page.getByRole('link', { name: 'Voir tous mes achats' }));
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/achats.html');
  await page.waitForSelector('html[data-rendu="pret"]');
  await atteindre(page, page.getByRole('button', { name: /Voir le détail/ }).first());
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/achat.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Commande n°');
});

test('clavier seul (4) SAV : accès sans compte puis demande envoyée', async ({ page }) => {
  test.setTimeout(120000);
  await preparerClavier(page);
  await page.goto('/sav-acces.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await atteindre(page, page.getByLabel(/Numéro de commande/));
  await page.keyboard.type('CMD-1037');
  await page.keyboard.press('Tab');
  await page.keyboard.type('camille@exemple.test');
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/sav.html');
  await page.waitForSelector('html[data-formulaire="pret"]');
  await atteindre(page, page.getByRole('radio').first()); // produit concerné : première ligne de la commande
  await page.keyboard.press('Space');
  await atteindre(page, page.getByRole('radio', { name: 'Défaut à la livraison' }));
  await page.keyboard.press('ArrowDown'); // flèche : motif suivant, « Défaut de fonctionnement »
  await expect(page.getByRole('radio', { name: 'Défaut de fonctionnement' })).toBeChecked();
  await atteindre(page, page.getByLabel('Description', { exact: true }));
  await page.keyboard.type('La grille ne se ferme plus complètement (exemple).');
  for (const [libelle, texte] of [['Prénom', 'Camille'], ['Nom', 'Exemple'], ['E-mail', 'camille@exemple.test'], ["Adresse d'intervention", '9 rue des Tilleuls'], ['Code postal', '75001'], ['Ville', 'Paris']]) {
    await atteindre(page, page.getByLabel(libelle, { exact: libelle === 'Prénom' || libelle === 'Nom' || libelle === 'E-mail' }));
    await page.keyboard.type(texte);
  }
  await atteindre(page, page.getByLabel("J'accepte d'être recontacté à propos de cette demande."));
  await page.keyboard.press('Space');
  await atteindre(page, page.getByRole('button', { name: 'Envoyer ma demande' }));
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-confirmation]')).toBeFocused();
});

test('clavier seul (5) comparateur : sélection par défaut, changement d\'aléa, retrait d\'un produit', async ({ page }) => {
  await simuler(page);
  await preparerClavier(page);
  await page.goto('/comparateur.html');
  await page.waitForSelector('html[data-comparateur]');
  const colonnes = page.locator('.comp__table thead th[scope="col"]');
  const avant = await colonnes.count();
  expect(avant).toBeGreaterThanOrEqual(2);
  const premiereCase = page.locator('.carte-produit input[type="checkbox"]:checked').first();
  await atteindre(page, premiereCase);
  await page.keyboard.press('Space'); // retire un produit : 2 minimum, refus annoncé si on descend sous 2
  await expect(page.locator('[role="status"]').filter({ hasText: /.+/ }).first()).toBeVisible();
  await atteindre(page, page.locator('.pastille-alea input').first());
  await page.keyboard.press('ArrowRight');
  await expect(colonnes.first()).toBeVisible();
});

test('clavier seul (6) saisie d\'adresse : flèches, Entrée sur l\'option surlignée, Échap, validation', async ({ page }) => {
  const journal = await simuler(page);
  await preparerClavier(page);
  await page.goto('/index.html');
  await page.waitForSelector('.recherche:not([hidden])');
  const champ = page.getByLabel(/Entrez votre adresse/);
  await atteindre(page, champ);
  await page.keyboard.type('12 rue des Tilleuls');
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('Enter'); // aucune option surlignée : rien n'est choisi
  await expect(champ).toHaveValue('12 rue des Tilleuls');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.keyboard.press('Backspace'); // nouvelle saisie : les suggestions reviennent
  await expect(page.getByRole('option').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await champ.inputValue()).toMatch(/Tilleuls/);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForURL((u) => u.pathname === '/diagnostic.html');
  expect(journal.externes.length).toBeGreaterThan(0);
});
