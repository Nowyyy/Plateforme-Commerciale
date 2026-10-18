// Rendu HTML de la page Lots et de la redirection /apercus/. Fonctions pures :
// tous les textes viennent de textes.json (paramètre), tout est échappé.

export function echapper(valeur) {
  return String(valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ENTETE = (titre, extra = '') => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">${extra}
<title>${echapper(titre)}</title>
`;

function carte(t, cle, vue, secondaire) {
  const bloc = t[cle];
  if (!vue) return `<div class="lots-carte"><p class="lots-vide">${echapper(bloc.aucun)}</p></div>`;
  const classe = secondaire ? 'lots-bouton lots-bouton--secondaire' : 'lots-bouton lots-bouton--principal';
  return `<div class="lots-carte">
<a class="${classe}" href="${echapper(vue.href)}">${echapper(bloc.bouton)}</a>
<p class="lots-aide">${echapper(bloc.aide)}</p>
<p class="lots-lot">${echapper(vue.libelle)}</p>
<p class="lots-etat">${echapper(t.etat.prefixe)} ${echapper(t.etat[vue.etat])}</p>
</div>`;
}

function menu(t, anciens) {
  const corps = anciens.length
    ? `<ul class="lots-liste">${anciens.map((a) => `<li><a href="${echapper(a.href)}">${echapper(a.libelle)}</a></li>`).join('\n')}</ul>`
    : `<p class="lots-vide">${echapper(t.anciens.vide)}</p>`;
  return `<details class="lots-anciens">
<summary>${echapper(t.anciens.resume)}</summary>
${corps}
</details>`;
}

function page(t, milieu) {
  return `${ENTETE(t.titre)}<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/base.css">
<link rel="stylesheet" href="lots.css">
</head>
<body>
<header class="lots-entete">
<h1>${echapper(t.titre)}</h1>
<p>${echapper(t.introduction)}</p>
</header>
<main class="lots-main">
${milieu}
</main>
<footer class="lots-pied">
<p>${echapper(t.pied)}</p>
</footer>
</body>
</html>
`;
}

// vues : résultat de choisirVues()
export function rendrePageLots(vues, textes) {
  return page(textes, `<div class="lots-acces">
${carte(textes, 'wireframe', vues.wireframe, true)}
${carte(textes, 'hifi', vues.hifi, false)}
</div>
${menu(textes, vues.anciens)}`);
}

// Page minimale quand la génération échoue.
export function rendrePageRepli(textes) {
  return page(textes, `<p class="lots-vide">${echapper(textes.repli)}</p>`);
}

export function rendreRedirection(textes) {
  const r = textes.redirection;
  return `${ENTETE(r.titre, '\n<meta http-equiv="refresh" content="0; url=../lots/">')}</head>
<body>
<main>
<p><a href="../lots/">${echapper(r.lien)}</a></p>
</main>
</body>
</html>
`;
}
