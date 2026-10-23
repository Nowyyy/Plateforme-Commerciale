// Module générique de formulaire simulé : ni logique de validation ni texte métier (ils lui sont passés).
// Contrat : voir « Formulaires » dans Docs/ref/conventions.md. Aucune donnée n'est conservée ni transmise.

// champs : { champ: { ancre, zone, erreur, controles: () => [éléments] } } dans l'ordre du formulaire.
// lire() : saisie brute ; valider(saisie) : { ok, erreurs: [{ champ, raison }] } ; texte(champ, raison) : message ;
// resume : { titre(n), liens(erreurs) → [{ champ, libelle }] } ; apres() : appelé après un envoi sans erreur (champs déjà vidés).
export function brancherFormulaire({ formulaire, champs, lire, valider, texte, resume, apres }) {
  const noms = Object.keys(champs);
  const zoneResume = formulaire.querySelector('[data-resume]');
  const titre = zoneResume.querySelector('[data-resume-titre]');
  const liste = zoneResume.querySelector('[data-resume-liste]');
  const modele = zoneResume.querySelector('template[data-resume-modele]');
  const affichees = new Map();
  let soumis = false;

  const afficher = (champ, raison) => {
    const { erreur, controles } = champs[champ];
    erreur.textContent = texte(champ, raison);
    erreur.hidden = false;
    for (const controle of controles()) controle.setAttribute('aria-invalid', 'true');
    affichees.set(champ, raison);
  };

  const effacer = (champ) => {
    const { erreur, controles } = champs[champ];
    erreur.textContent = '';
    erreur.hidden = true;
    for (const controle of controles()) controle.removeAttribute('aria-invalid');
    affichees.delete(champ);
  };

  // Le récapitulatif reflète les erreurs affichées, dans l'ordre du formulaire ; il se masque sans erreur.
  const majResume = () => {
    const erreurs = noms.filter((champ) => affichees.has(champ)).map((champ) => ({ champ, raison: affichees.get(champ) }));
    if (erreurs.length === 0) {
      zoneResume.hidden = true;
      liste.replaceChildren();
      return;
    }
    titre.textContent = resume.titre(erreurs.length);
    liste.replaceChildren(...resume.liens(erreurs).map(({ champ, libelle }) => {
      const element = modele.content.cloneNode(true);
      const lien = element.querySelector('a');
      lien.textContent = libelle;
      lien.setAttribute('href', `#${champs[champ].ancre}`);
      lien.setAttribute('data-champ', champ);
      return element;
    }));
    zoneResume.hidden = false;
  };

  const reinitialiser = () => {
    formulaire.reset();
    for (const champ of noms) effacer(champ);
    majResume();
    soumis = false;
  };

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    soumis = true;
    const { ok, erreurs } = valider(lire());
    for (const champ of noms) {
      const trouvee = erreurs.find((erreur) => erreur.champ === champ);
      if (trouvee) afficher(champ, trouvee.raison);
      else effacer(champ);
    }
    majResume();
    if (!ok) {
      zoneResume.focus();
      return;
    }
    reinitialiser();
    apres();
  });

  // Après le premier envoi seulement : le champ modifié est revalidé, son message disparaît dès qu'il est valide.
  const revalider = (evenement) => {
    if (!soumis) return;
    const champ = noms.find((nom) => champs[nom].zone.contains(evenement.target));
    if (champ === undefined) return;
    const trouvee = valider(lire()).erreurs.find((erreur) => erreur.champ === champ);
    if (trouvee) afficher(champ, trouvee.raison);
    else effacer(champ);
    majResume();
  };
  formulaire.addEventListener('input', revalider);
  formulaire.addEventListener('change', revalider);

  // Un lien du récapitulatif place le focus sur le champ, sans changer l'adresse de la page.
  liste.addEventListener('click', (evenement) => {
    const lien = evenement.target.closest('a[data-champ]');
    if (!lien) return;
    evenement.preventDefault();
    champs[lien.getAttribute('data-champ')].controles()[0].focus();
  });

  formulaire.hidden = false;
  return { reinitialiser };
}
