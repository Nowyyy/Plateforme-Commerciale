// Saisie assistée de l'adresse (accueil et diagnostic, un seul code) : motif combobox ARIA 1.2, suggestions de l'IGN pendant la frappe.
// Saisie stricte : l'adresse n'est valide que si elle a été choisie dans la liste et n'a pas été modifiée ; aucune vérification par
// recherche libre. Aucune requête avant 3 caractères ; l'adresse (ou son début) n'est envoyée qu'à data.geopf.fr ; rien n'est conservé
// (ni suggestions, ni cache, ni stockage) : la sélection n'existe qu'en mémoire de la page.
import { valider } from './adresse-validation.js';
import { actionEntree, analyserCompletion, analyserSuggestionsRecherche, construireUrlCompletion, construireUrlRecherche, doitInterroger, etatValidation, indexSuivant, nettoyerSaisie } from './adresse-assistee-logique.js';

// config : donnees.diagnostic.carteReelle ; textes : accueil.recherche.assistee ou diagnostic.textes.assistee.
// bouton : bouton de validation (jamais `disabled` : `aria-disabled`, classes `data-classe-active` et `data-classe-inactive` échangées) ;
// erreur : zone du message de panne ; adresseCourante : adresse déjà affichée (diagnostic), le bouton reste inactif tant qu'elle est identique.
export function brancherAssistant({ champ, liste, statut, config, textes, bouton, erreur, adresseCourante = '' }) {
  const { saisie, geocodage } = config;
  const etat = { controle: null, minuterie: null, version: 0, dernier: null, selection: null, suggestions: [], actif: -1, ignorer: false, panne: false, courante: adresseCourante };

  const annoncer = (message) => { statut.textContent = message; };

  const validation = () => etatValidation({ texte: champ.value, selection: etat.selection, adresseCourante: etat.courante, panne: etat.panne, valideLocal: valider(champ.value).valide });

  // Bouton : actif seulement pour une adresse valide ; focalisable (`aria-disabled`), classe d'action posée à l'état actif seulement.
  function majBouton() {
    if (!bouton) return;
    const { valide } = validation();
    bouton.setAttribute('aria-disabled', String(!valide));
    const [actif, inactif] = [bouton.dataset.classeActive, bouton.dataset.classeInactive];
    if (actif) bouton.classList.toggle(actif, valide);
    if (inactif) bouton.classList.toggle(inactif, !valide);
  }

  // Panne du service : la complétion et son repli ont échoué ; le message reste affiché tant que la panne dure.
  function definirPanne(panne) {
    etat.panne = panne;
    if (erreur) erreur.textContent = panne ? textes.nonVerifiee : '';
    majBouton();
  }

  // Une seule requête à la fois : toute nouvelle requête annule la précédente ; délai maximal `delai`.
  async function lancer(url, delai) {
    etat.controle?.abort();
    if (url === '') return { ok: false };
    const controle = new AbortController();
    etat.controle = controle;
    const minuterie = setTimeout(() => controle.abort(), delai);
    try {
      const reponse = await fetch(url, { signal: controle.signal, credentials: 'omit' });
      if (!reponse.ok) return { ok: false };
      return { ok: true, texte: await reponse.text() };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(minuterie);
    }
  }

  const options = () => [...liste.children];

  function marquerActif(index) {
    etat.actif = index;
    options().forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
    if (index >= 0) {
      champ.setAttribute('aria-activedescendant', options()[index].id);
      options()[index].scrollIntoView?.({ block: 'nearest' });
    } else champ.removeAttribute('aria-activedescendant');
  }

  function fermer() {
    liste.hidden = true;
    liste.replaceChildren();
    etat.suggestions = [];
    champ.setAttribute('aria-expanded', 'false');
    marquerActif(-1);
  }

  // Clic ou Entrée sur le bouton inactif : aucune action, la phrase d'aide est annoncée et le focus revient dans le champ.
  function refuser() {
    statut.textContent = '';
    setTimeout(() => { statut.textContent = textes.aideInactif; }, 50);
    champ.focus();
  }

  function choisir(index) {
    const suggestion = etat.suggestions[index];
    if (!suggestion) return;
    etat.ignorer = true;
    champ.value = suggestion.libelle;
    champ.dispatchEvent(new Event('input', { bubbles: true })); // les pages effacent leur message d'erreur
    etat.ignorer = false;
    etat.selection = suggestion;
    etat.dernier = nettoyerSaisie(suggestion.libelle);
    fermer();
    annoncer(textes.choisie.replace('{libelle}', suggestion.libelle));
    definirPanne(false);
    champ.focus();
  }

  function afficher(suggestions) {
    etat.suggestions = suggestions;
    liste.replaceChildren(...suggestions.map((suggestion, i) => {
      const option = document.createElement('li');
      option.id = `${liste.id}-option-${i}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.className = 'suggestions__option';
      option.textContent = suggestion.libelle;
      return option;
    }));
    const ouvert = suggestions.length > 0;
    liste.hidden = !ouvert;
    champ.setAttribute('aria-expanded', String(ouvert));
    marquerActif(-1);
    const n = suggestions.length;
    annoncer(n === 0 ? textes.aucune : n === 1 ? textes.suggestionUne : textes.suggestionsN.replace('{n}', String(n)));
  }

  // Complétion, puis une seule nouvelle tentative avec `search` si elle échoue (réseau, CORS, code non 2xx, réponse illisible).
  async function interroger(nette) {
    etat.dernier = nette;
    const version = (etat.version += 1);
    let suggestions = null;
    let reponse = await lancer(construireUrlCompletion(nette, geocodage.completion, saisie.maxSuggestions), saisie.delaiRequeteMs);
    if (version !== etat.version) return;
    if (reponse.ok) {
      const analyse = analyserCompletion(reponse.texte);
      if (analyse.ok) suggestions = analyse.suggestions;
    }
    if (suggestions === null) {
      reponse = await lancer(construireUrlRecherche(nette, saisie.maxSuggestions, geocodage.base), saisie.delaiRequeteMs);
      if (version !== etat.version) return;
      if (reponse.ok) {
        const analyse = analyserSuggestionsRecherche(reponse.texte);
        if (analyse.ok) suggestions = analyse.suggestions;
      }
    }
    if (suggestions === null) {
      fermer();
      annoncer(textes.indisponible);
      definirPanne(true); // les deux appels ont échoué
      return;
    }
    definirPanne(false);
    afficher(suggestions);
  }

  // Frappe : toute requête en cours est annulée, la suivante part après l'anti-rebond (jamais avant 3 caractères).
  champ.addEventListener('input', () => {
    if (etat.ignorer) return;
    if (etat.selection && champ.value !== etat.selection.libelle) etat.selection = null;
    if (etat.panne) definirPanne(false);
    majBouton();
    etat.version += 1;
    clearTimeout(etat.minuterie);
    etat.controle?.abort();
    const nette = nettoyerSaisie(champ.value);
    if (!doitInterroger(nette, etat.dernier, etat.selection?.libelle, saisie.minCaracteres)) {
      if (Array.from(nette).length < saisie.minCaracteres) {
        etat.dernier = null;
        fermer();
      }
      return;
    }
    etat.minuterie = setTimeout(() => interroger(nette), saisie.delaiMs);
  });

  champ.addEventListener('keydown', (e) => {
    const ouvert = !liste.hidden;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!ouvert) return;
      e.preventDefault();
      marquerActif(indexSuivant(etat.suggestions.length, etat.actif, e.key));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // jamais de soumission native : ni choix de la première suggestion, ni recherche libre
      const action = actionEntree({ activeIndex: ouvert ? etat.actif : -1, valide: validation().valide });
      if (action === 'choisir') choisir(etat.actif);
      else if (action === 'valider') bouton?.click();
      else refuser();
    } else if (e.key === 'Escape' && ouvert) {
      e.preventDefault();
      fermer();
    }
  });

  champ.addEventListener('blur', () => { if (!liste.hidden) fermer(); });
  // La souris et le toucher choisissent sans retirer le focus du champ.
  liste.addEventListener('mousedown', (e) => e.preventDefault());
  liste.addEventListener('click', (e) => {
    const option = e.target.closest('[role="option"]');
    if (option) choisir(options().indexOf(option));
  });

  // Après une validation réussie (diagnostic) : l'adresse affichée devient l'adresse courante, le bouton se désactive.
  function definirCourante(adresse) {
    etat.courante = typeof adresse === 'string' ? adresse : '';
    majBouton();
  }

  liste.setAttribute('aria-label', textes.listeNom);
  majBouton();
  return { valide: () => validation().valide, refuser, definirCourante, annoncer, fermer };
}
