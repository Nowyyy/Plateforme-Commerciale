// Chevauchement du relief décoratif et du texte, mesuré par rectangles englobants (repère de la page entière).
// Rectangle du relief = union des tracés visibles (les <use> du groupe affiché) ; rectangle du texte = union des rectangles de ses
// nœuds texte. Un texte posé sur un fond opaque (carte blanche, pastille, en-tête, pied, dégradé du hero) recouvre le relief : ignoré.
// Usage : node tests/outils/relief.mjs [largeur ...]   (état nominal des 14 pages, services simulés ; serveur propre, port 4184)
import { chromium } from '@playwright/test';
import { demarrer } from './serveur.mjs';
import { PAGES, attendreEtatNominal, preparerPage } from './etats-pages.mjs';

// Exécuté dans la page. Renvoie { groupes: [rect], textes: [{ texte, rect, groupe }] } des textes qui chevauchent un tracé visible.
export function mesurerReliefDansLaPage() {
  const doc = globalThis.document;
  const dec = (r) => ({ x: r.left + globalThis.scrollX, y: r.top + globalThis.scrollY, w: r.width, h: r.height });
  const groupes = [...doc.querySelectorAll('.relief__groupe')].filter((g) => globalThis.getComputedStyle(g).display !== 'none').map((g, i) => {
    const traces = [...g.querySelectorAll('use')].map((u) => u.getBoundingClientRect()).filter((r) => r.width > 0);
    const gauche = Math.min(...traces.map((r) => r.left));
    const haut = Math.min(...traces.map((r) => r.top));
    const droite = Math.max(...traces.map((r) => r.right));
    const bas = Math.max(...traces.map((r) => r.bottom));
    return { nom: g.getAttribute('class').split(' ').pop(), i, ...dec({ left: gauche, top: haut, width: droite - gauche, height: bas - haut }) };
  });
  const recouvert = (el) => {
    for (let n = el; n && n !== doc.body; n = n.parentElement) {
      const s = globalThis.getComputedStyle(n);
      const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/);
      const alpha = m ? (m[1].split(',').length === 4 ? Number(m[1].split(',')[3]) : 1) : 0;
      if (alpha >= 0.95 || s.backgroundImage !== 'none') return `${n.tagName.toLowerCase()}.${n.className}`.slice(0, 50);
    }
    return '';
  };
  const textes = [];
  const marcheur = doc.createTreeWalker(doc.body, globalThis.NodeFilter.SHOW_TEXT);
  const parElement = new Map();
  for (let noeud = marcheur.nextNode(); noeud; noeud = marcheur.nextNode()) {
    const parent = noeud.parentElement;
    if (!noeud.textContent.trim() || parent.closest('.relief, template, script, style, noscript, [hidden], svg')) continue;
    const s = globalThis.getComputedStyle(parent);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    const plage = doc.createRange();
    plage.selectNodeContents(noeud);
    const r = plage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const prev = parElement.get(parent);
    parElement.set(parent, prev ? { left: Math.min(prev.left, r.left), top: Math.min(prev.top, r.top), right: Math.max(prev.right, r.right), bottom: Math.max(prev.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  const libres = [];
  for (const [el, r] of parElement) {
    const couvert = recouvert(el);
    if (couvert && !globalThis.__relieDebug) continue;
    const rect = dec({ left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top });
    libres.push([rect.x, rect.y, rect.w, rect.h]);
    for (const g of groupes) {
      if (rect.x < g.x + g.w && rect.x + rect.w > g.x && rect.y < g.y + g.h && rect.y + rect.h > g.y) {
        textes.push({ texte: el.textContent.trim().slice(0, 50), element: `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60), groupe: g.nom, couvert, rect: [rect.x, rect.y, rect.w, rect.h].map(Math.round) });
      }
    }
  }
  return { groupes: groupes.map((g) => ({ nom: g.nom, rect: [g.x, g.y, g.w, g.h].map(Math.round) })), textes, libres, hauteurPage: doc.querySelector('.relief').getBoundingClientRect().height };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const largeurs = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [375, 768];
  const serveur = await demarrer(4184);
  const navigateur = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
  let total = 0;
  for (const etat of PAGES) for (const largeur of largeurs) {
    const contexte = await navigateur.newContext({ baseURL: 'http://localhost:4184', viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce' });
    const page = await contexte.newPage();
    await preparerPage(page, etat);
    await page.goto(`/${etat.fichier}`);
    await attendreEtatNominal(page, etat);
    if (process.env.DEBUG_RELIEF) await page.evaluate(() => { globalThis.__relieDebug = true; });
    const m = await page.evaluate(mesurerReliefDansLaPage);
    total += m.textes.length;
    console.log(`${etat.fichier} ${largeur} px : ${m.textes.length} chevauchement(s) ; relief ${JSON.stringify(m.groupes)}`);
    for (const t of m.textes) console.log(`    ${t.groupe} [${t.couvert}] ${t.element} « ${t.texte} » ${JSON.stringify(t.rect)}`);
    await contexte.close();
  }
  console.log(`Total : ${total}`);
  await navigateur.close();
  serveur.close();
}
