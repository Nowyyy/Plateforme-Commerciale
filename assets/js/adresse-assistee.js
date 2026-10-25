// Saisie assistée de l'adresse (accueil et diagnostic, un seul code) : motif combobox ARIA 1.2, suggestions de l'IGN pendant la frappe,
// vérification de l'adresse à la validation. Aucune requête avant 3 caractères ; l'adresse (ou son début) n'est envoyée qu'à data.geopf.fr ;
// rien n'est conservé (ni suggestions, ni cache, ni stockage) : la sélection n'existe qu'en mémoire de la page.
import { analyserGeocodage } from './carte-reelle-logique.js';
import { analyserCompletion, analyserSuggestionsRecherche, construireUrlCompletion, construireUrlRecherche, decisionVerification, doitInterroger, indexSuivant, nettoyerSaisie } from './adresse-assistee-logique.js';

// config : donnees.diagnostic.carteReelle ; textes : accueil.recherche.assistee ou diagnostic.textes.assistee.
export function brancherAssistant({ champ, liste, statut, config, textes }) {
  const { saisie, geocodage } = config;
  const etat = { controle: null, minuterie: null, version: 0, dernier: null, selection: null, suggestions: [], actif: -1, ignorer: false };

  const annoncer = (message) => { statut.textContent = message; };

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
      return;
    }
    afficher(suggestions);
  }

  // Frappe : toute requête en cours est annulée, la suivante part après l'anti-rebond (jamais avant 3 caractères).
  champ.addEventListener('input', () => {
    if (etat.ignorer) return;
    if (etat.selection && champ.value !== etat.selection.libelle) etat.selection = null;
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
    } else if (e.key === 'Enter' && ouvert && etat.actif >= 0) {
      e.preventDefault();
      choisir(etat.actif);
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

  // Vérification à la validation (la validation locale `valider` a déjà été appliquée par la page).
  // Renvoie { decision: 'accepte' | 'refuse' | 'indisponible', ... } ; l'adresse officielle est reprise dans le champ.
  async function verifier() {
    clearTimeout(etat.minuterie);
    etat.version += 1;
    fermer();
    const nette = nettoyerSaisie(champ.value);
    let resultat = null;
    if (!(etat.selection && nettoyerSaisie(etat.selection.libelle) === nette)) {
      const reponse = await lancer(construireUrlRecherche(nette, 1, geocodage.base), geocodage.delaiMs);
      resultat = reponse.ok ? analyserGeocodage(reponse.texte, geocodage.seuil) : null;
    }
    const decision = decisionVerification({ texte: nette, selection: etat.selection, resultat, types: geocodage.typesAcceptes });
    if (decision.decision === 'accepte' && decision.source === 'service') {
      etat.ignorer = true;
      champ.value = decision.adresse;
      etat.ignorer = false;
      etat.selection = { libelle: decision.adresse };
      annoncer(textes.reconnue.replace('{libelle}', decision.adresse));
    }
    return decision;
  }

  liste.setAttribute('aria-label', textes.listeNom);
  return { verifier, annoncer, fermer };
}
