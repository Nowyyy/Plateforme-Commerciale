// Fiche produit Hi-Fi : produit choisi au diagnostic (sessionStorage, clé « produit », lue sans être supprimée).
// Les textes issus des données sont posés par textContent seulement.
import { donneesPretes } from './rendu.js';
import { lignesPrixFormatees, modeValide, produitValide, totalEstime } from './produit-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { initialiserConfigurateur } from './configurateur.js';

export const CLE_PRODUIT = 'produit';
export const CLE_MODE = 'mode';

function lireSession(cle) {
  try {
    return sessionStorage.getItem(cle);
  } catch {
    return null; // stockage indisponible : produit par défaut
  }
}

function ecrireSession(cle, valeur) {
  try {
    sessionStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : le mode n'est pas conservé
  }
}

function afficherProduit(produit) {
  document.getElementById('titre-achat').textContent = produit.titre;
  document.getElementById('fil-produit').textContent = produit.titre;
  document.getElementById('achat-reference').textContent = produit.reference;
  document.getElementById('achat-prix').textContent = formaterPrix(produit.prix);
  document.getElementById('achat-delai').textContent = produit.delaiLivraison;
  document.querySelector('.achat').setAttribute('aria-busy', 'false');
}

// Galerie : un rectangle neutre (aucune image) et sa légende changent avec la vignette choisie (boutons radio, flèches natives).
function initialiserGalerie(vues) {
  const panneau = document.getElementById('galerie-panneau');
  const legende = document.getElementById('galerie-legende');
  const choisir = (id) => {
    const vue = vues.find((v) => v.id === id);
    if (!vue) return;
    panneau.dataset.type = vue.type === 'video' ? 'video' : 'image';
    legende.textContent = vue.legende;
  };
  const fieldset = document.querySelector('.galerie__vues');
  for (const vignette of fieldset.querySelectorAll('.vignette')) {
    vignette.querySelector('input').value = vignette.getAttribute('data-id');
  }
  const premiere = fieldset.querySelector('input');
  if (premiere) {
    premiere.checked = true;
    choisir(premiere.value);
  }
  fieldset.addEventListener('change', (e) => {
    if (e.target.matches('input[name="vue"]')) choisir(e.target.value);
  });
  document.querySelector('.galerie').setAttribute('aria-busy', 'false');
}

// Spécifications (E3-6) et documents (E3-7) : seule la fiche complète les affiche, les autres produits les masquent.
const BLOCS_COMPLETS = ['specs', 'documents'];

function afficherBlocsComplets(produit) {
  const complet = Boolean(produit?.complet);
  for (const role of BLOCS_COMPLETS) {
    const section = document.querySelector(`[data-role="${role}"]`);
    if (section) section.hidden = !complet;
  }
}

function ligne(classe, ...enfants) {
  const p = document.createElement('p');
  p.className = classe;
  p.append(...enfants);
  return p;
}

function fort(texte) {
  const el = document.createElement('strong');
  el.textContent = texte;
  return el;
}

// Mode de commande : détail, récapitulatif de prix (lignesPrix) et annonce (région aria-live) ; textContent seulement.
function afficherMode(donnees, produit, mode) {
  const { modes, textes } = donnees.produit;
  const detail = document.getElementById('mode-detail');
  const annonce = document.createElement('p');
  annonce.className = 'visuellement-cache';
  const total = formaterPrix(totalEstime(produit, mode));
  annonce.textContent = textes.mode.annonce.replace('{mode}', modes[mode].titre).replace('{total}', total);
  const paragraphes = mode === 'pose'
    ? [
      ligne('mode__ligne', `${textes.mode.estimation} `, fort(formaterPrix(produit.pose)), ` ${textes.mode.estimationSuffixe}`),
      ligne('mode__ligne', modes.pose.garantie),
      ligne('mode__ligne', `${textes.mode.delaiPose} ${produit.delaiPose}`),
    ]
    : [ligne('mode__ligne', textes.mode.detailDiy)];
  detail.replaceChildren(annonce, ...paragraphes);
  const lignes = lignesPrixFormatees(produit, mode).flatMap(({ cle, texte }) => {
    const dt = document.createElement('dt');
    dt.textContent = modes.lignes[cle];
    const dd = document.createElement('dd');
    dd.textContent = texte;
    if (cle === 'total') dt.className = dd.className = 'mode__total';
    return [dt, dd];
  });
  document.getElementById('mode-prix').replaceChildren(...lignes);
}

function initialiserMode(donnees, produit) {
  const radios = [...document.querySelectorAll('input[name="mode"]')];
  const initial = modeValide(lireSession(CLE_MODE));
  for (const radio of radios) radio.checked = radio.value === initial;
  afficherMode(donnees, produit, initial);
  document.querySelector('.mode__choix').addEventListener('change', (e) => {
    if (!e.target.matches('input[name="mode"]')) return;
    const mode = modeValide(e.target.value);
    ecrireSession(CLE_MODE, mode);
    afficherMode(donnees, produit, mode);
  });
  document.querySelector('.mode').setAttribute('aria-busy', 'false');
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (!donnees) return;
    const { produits, produitParDefaut } = donnees.produit;
    const produit = produitValide(produits, lireSession(CLE_PRODUIT), produitParDefaut);
    afficherBlocsComplets(produit);
    if (produit) afficherProduit(produit);
    initialiserGalerie(donnees.produit.galerie.vues);
    if (produit) {
      initialiserMode(donnees, produit);
      initialiserConfigurateur(donnees, produit);
    }
  });
}
