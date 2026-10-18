// Outil de test : sépare un HTML en texte hors gabarits et gabarits <template data-liste> de premier niveau.
export function extraire(source) {
  const modeles = [];
  let hors = '';
  let profondeur = 0;
  let debut = 0;
  let cle = '';
  let dernier = 0;
  for (const m of source.matchAll(/<template\b([^>]*)>|<\/template>/g)) {
    if (m[0] !== '</template>') {
      if (profondeur === 0) {
        hors += source.slice(dernier, m.index);
        cle = /data-liste="([^"]+)"/.exec(m[1])[1];
        debut = m.index + m[0].length;
      }
      profondeur += 1;
    } else {
      profondeur -= 1;
      if (profondeur === 0) {
        modeles.push({ cle, contenu: source.slice(debut, m.index) });
        dernier = m.index + m[0].length;
      }
    }
  }
  return { hors: hors + source.slice(dernier), modeles };
}
