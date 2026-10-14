// Chargement des données (2 requêtes, même origine) et remplissage de la page.
// Attributs lus : data-texte, data-lien, data-aria-label, data-placeholder (clé = chemin dans les données).

const MESSAGE_ERREUR =
  "Le contenu de la page n'a pas pu être chargé. Rechargez la page ou réessayez plus tard.";

const FICHIERS = {
  site: '../../data/site.json',
  accueil: '../../data/accueil.json',
};

const ATTRIBUTS = [
  ['data-texte', (el, valeur) => { el.textContent = valeur; }],
  ['data-lien', (el, valeur) => { el.setAttribute('href', valeur); }],
  ['data-aria-label', (el, valeur) => { el.setAttribute('aria-label', valeur); }],
  ['data-placeholder', (el, valeur) => { el.setAttribute('placeholder', valeur); }],
];

// Résolution pure d'une clé pointée ("site.liens.panier") dans un objet de données.
export function resoudre(donnees, cle) {
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
  if (typeof courant !== 'string') {
    throw new Error(`La clé « ${cle} » ne désigne pas un texte`);
  }
  return courant;
}

// Remplit les éléments portant un attribut de clé ; renvoie la liste des erreurs de clé.
export function remplir(racine, donnees) {
  const erreurs = [];
  for (const [attribut, appliquer] of ATTRIBUTS) {
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

export async function demarrer() {
  const racine = document.documentElement;
  try {
    const donnees = await charger();
    const erreurs = remplir(document, donnees);
    if (erreurs.length > 0) throw new Error(erreurs.join(' ; '));
    if (typeof donnees.accueil.titrePage === 'string') document.title = donnees.accueil.titrePage;
    racine.dataset.rendu = 'pret';
  } catch (e) {
    console.warn(e);
    racine.dataset.rendu = 'erreur';
    afficherErreur(e.message);
  }
  document.dispatchEvent(new CustomEvent('rendu:termine'));
}

if (typeof document !== 'undefined') demarrer();
