// Chargement des données (2 requêtes, même origine) et remplissage de la page.
// Attributs lus : data-texte, data-lien, data-aria-label, data-placeholder (clé = chemin dans les données).
// Listes : <template data-liste="aleas.liste"> (clé relative aux données de accueil.json) est cloné pour chaque
// élément du tableau. Dans un gabarit, data-texte et data-icone sont relatifs à l'élément ("." = l'élément
// lui-même, une chaîne) ; data-lien, data-aria-label, data-placeholder et data-texte-global restent globaux.
// Une clé de liste commençant par « site. » est lue dans data/site.json ; data-lien-element lit le lien dans l'élément
// (sans lien, l'<a> devient un <span>).

const MESSAGE_ERREUR =
  "Le contenu de la page n'a pas pu être chargé. Rechargez la page ou réessayez plus tard.";

const FICHIERS = {
  site: '../../data/site.json',
  accueil: '../../data/accueil.json',
};

const poserTexte = (el, valeur) => { el.textContent = valeur; };

const ATTRIBUTS = [
  ['data-texte', poserTexte],
  ['data-texte-global', poserTexte],
  ['data-lien', (el, valeur) => { el.setAttribute('href', valeur); }],
  ['data-aria-label', (el, valeur) => { el.setAttribute('aria-label', valeur); }],
  ['data-placeholder', (el, valeur) => { el.setAttribute('placeholder', valeur); }],
];

// Dans un gabarit de liste, data-texte est relatif à l'élément : le reste reste global.
const ATTRIBUTS_GLOBAUX = ATTRIBUTS.filter(([attribut]) => attribut !== 'data-texte');

// Clés requises par liste (validerListe).
const CLES_REQUISES = {
  'aleas.liste': ['id', 'icone', 'titre', 'familles'],
  'protection.liste': ['id', 'icone', 'titre', 'familles'],
  'comment.liste': ['titre', 'texte'],
  'reassurance.liste': ['id', 'titre'],
  'preuve.chiffres': ['valeur', 'libelle'],
  'site.pied.colonnes': ['titre', 'entrees'],
  entrees: ['texte'],
};

const SYMBOLE = /^[a-z0-9-]+$/;

function parcourir(donnees, cle) {
  if (typeof cle !== 'string' || cle.trim() === '') {
    throw new Error('Clé vide ou invalide');
  }
  let courant = donnees;
  for (const segment of cle.split('.')) {
    if (courant === null || typeof courant !== 'object' || !Object.hasOwn(courant, segment)) {
      throw new Error(`Clé absente des données : « ${cle} » (segment « ${segment} »)`);
    }
    courant = courant[segment];
  }
  return courant;
}

// Résolution pure d'une clé pointée ("site.liens.panier") dans un objet de données.
export function resoudre(donnees, cle) {
  const valeur = parcourir(donnees, cle);
  if (typeof valeur !== 'string') {
    throw new Error(`La clé « ${cle} » ne désigne pas un texte`);
  }
  return valeur;
}

// Résolution relative à un élément de liste : clé simple, imbriquée, ou "." (l'élément est une chaîne).
export function resoudreDans(element, cle) {
  if (cle === '.') {
    if (typeof element !== 'string') throw new Error('La clé « . » demande un élément de type texte');
    return element;
  }
  return resoudre(element, cle);
}

// Une liste doit être un tableau non vide dont chaque élément porte les clés requises.
export function validerListe(valeur, cle, requises = CLES_REQUISES[cle] ?? []) {
  if (!Array.isArray(valeur)) throw new Error(`« ${cle} » n'est pas une liste`);
  if (valeur.length === 0) throw new Error(`« ${cle} » est une liste vide`);
  valeur.forEach((element, i) => {
    for (const requise of requises) {
      if (element === null || typeof element !== 'object' || !Object.hasOwn(element, requise)) {
        throw new Error(`« ${cle} », élément ${i + 1} : clé « ${requise} » absente`);
      }
    }
  });
  return valeur;
}

// Remplit les éléments portant un attribut de clé ; renvoie la liste des erreurs de clé.
export function remplir(racine, donnees, attributs = ATTRIBUTS) {
  const erreurs = [];
  for (const [attribut, appliquer] of attributs) {
    for (const el of racine.querySelectorAll(`[${attribut}]`)) {
      try {
        appliquer(el, resoudre(donnees, el.getAttribute(attribut)));
      } catch (e) {
        erreurs.push(e.message);
      }
    }
  }
  return erreurs;
}

// Pied de page : les colonnes « navigation » reprennent les libellés (site.navigation) et les liens (site.liens)
// de l'en-tête ; chaque entrée devient { texte, lien? } où lien est la cible finale (absente = texte non lié).
export function resoudrePied(site) {
  const cibleDe = (cle) => {
    if (typeof site.liens?.[cle] !== 'string') throw new Error(`Lien inconnu dans le pied : « ${cle} »`);
    return site.liens[cle];
  };
  return site.pied.colonnes.map((colonne) => {
    const { navigation, entrees = [], ...reste } = colonne;
    const issues = (navigation ?? []).map(({ cle, lien }) => ({
      texte: resoudre(site, `navigation.${cle}`),
      lien: cibleDe(lien),
    }));
    const propres = entrees.map(({ texte, lien }) => (lien === undefined ? { texte } : { texte, lien: cibleDe(lien) }));
    return { ...reste, entrees: [...issues, ...propres] };
  });
}

// Une entrée sans lien est un texte simple : aucune balise <a>.
export const baliseEntree = (entree) => (typeof entree?.lien === 'string' && entree.lien !== '' ? 'a' : 'span');

function remplirElement(clone, element, donnees) {
  for (const el of clone.querySelectorAll('[data-texte]')) {
    el.textContent = resoudreDans(element, el.getAttribute('data-texte'));
  }
  for (const el of clone.querySelectorAll('[data-icone]')) {
    const nom = resoudreDans(element, el.getAttribute('data-icone'));
    if (!SYMBOLE.test(nom) || !document.getElementById(nom)) {
      throw new Error(`Pictogramme inconnu : « ${nom} »`);
    }
    el.setAttribute('href', `#${nom}`);
  }
  const erreurs = remplir(clone, donnees, ATTRIBUTS_GLOBAUX);
  if (erreurs.length > 0) throw new Error(erreurs.join(' ; '));
  // data-lien-element : lien porté par l'élément de liste ; sans lien, l'<a> devient un <span>
  for (const el of clone.querySelectorAll('[data-lien-element]')) {
    const cle = el.getAttribute('data-lien-element');
    if (baliseEntree({ lien: element[cle] }) === 'a') {
      el.setAttribute('href', element[cle]);
      el.removeAttribute('data-lien-element');
    } else {
      const texte = document.createElement('span');
      texte.className = el.className;
      texte.textContent = el.textContent;
      el.replaceWith(texte);
    }
  }
}

// Clone le gabarit pour chaque élément de la liste ; les gabarits imbriqués sont rendus à leur tour.
function instancier(modele, source, donnees, imbrique) {
  const cle = modele.getAttribute('data-liste');
  const liste = validerListe(parcourir(cle.startsWith('site.') ? donnees : source, cle), cle);
  const rendu = document.createDocumentFragment();
  for (const element of liste) {
    const clone = modele.content.cloneNode(true);
    remplirElement(clone, element, donnees);
    for (const sous of clone.querySelectorAll('template[data-liste]')) {
      instancier(sous, element, donnees, true);
    }
    rendu.append(clone);
  }
  modele.parentNode.insertBefore(rendu, modele);
  if (imbrique) modele.remove();
}

export function remplirListes(racine, donneesAccueil, donnees) {
  for (const modele of racine.querySelectorAll('template[data-liste]')) {
    instancier(modele, donneesAccueil, donnees, false);
    modele.parentElement.setAttribute('aria-busy', 'false');
  }
}

async function charger() {
  const entrees = await Promise.all(
    Object.entries(FICHIERS).map(async ([nom, chemin]) => {
      const reponse = await fetch(new URL(chemin, import.meta.url));
      if (!reponse.ok) throw new Error(`${nom}.json : HTTP ${reponse.status}`);
      return [nom, await reponse.json()];
    }),
  );
  return Object.fromEntries(entrees);
}

function afficherErreur(details) {
  const alerte = document.createElement('p');
  alerte.className = 'erreur-chargement';
  alerte.setAttribute('role', 'alert');
  alerte.textContent = MESSAGE_ERREUR;
  alerte.title = details;
  (document.querySelector('main') ?? document.body).prepend(alerte);
}

// Renvoie les données chargées, ou null en cas d'échec (alerte affichée).
export async function demarrer() {
  const racine = document.documentElement;
  let donnees;
  try {
    donnees = await charger();
    donnees.site = { ...donnees.site, pied: { ...donnees.site.pied, colonnes: resoudrePied(donnees.site) } };
    const erreurs = remplir(document, donnees);
    if (erreurs.length > 0) throw new Error(erreurs.join(' ; '));
    remplirListes(document, donnees.accueil, donnees);
    if (typeof donnees.accueil.titrePage === 'string') document.title = donnees.accueil.titrePage;
    racine.dataset.rendu = 'pret';
  } catch (e) {
    console.warn(e);
    donnees = null;
    racine.dataset.rendu = 'erreur';
    for (const occupe of document.querySelectorAll('[aria-busy="true"]')) occupe.setAttribute('aria-busy', 'false');
    afficherErreur(e.message);
  }
  document.dispatchEvent(new CustomEvent('rendu:termine'));
  return donnees;
}

// Une seule exécution par page : les autres modules (adresse.js) attendent cette promesse.
export const donneesPretes = typeof document !== 'undefined' ? demarrer() : null;
