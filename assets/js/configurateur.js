// Configurateur de cotes (E3-5) : seul le produit « complet » en dispose ; les autres produits affichent un message.
// Les textes issus des données sont posés par textContent seulement.

export function initialiserConfigurateur(donnees, produit) {
  const section = document.querySelector('[data-role="configurateur"]');
  if (!section) return;
  const outil = section.querySelector('.configurateur__outil');
  const indisponible = section.querySelector('.configurateur__indisponible');
  if (!produit.complet || !produit.cotes) {
    outil.remove();
    indisponible.hidden = false;
    return;
  }
  indisponible.remove();
  outil.setAttribute('aria-busy', 'false');
}
