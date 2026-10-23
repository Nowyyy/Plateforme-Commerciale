// Détail d'une commande (écran 9) : lecture seule. La commande vient de la clé « achat » (compte-session.js) et de data/compte.json ;
// les lignes sont des instantanés (titre, prix, cotes). Gabarits <template data-gabarit="…"> copiés de panier.html, sans quantité ni « Retirer ».
// Le remplissage de l'aperçu schématique est repris de panier.js (même gabarit, mêmes champs) sans modifier ce module.
import { donneesPretes } from './rendu.js';
import { remplirGabarit, formaterMm } from './cotes-logique.js';
import { formaterPrix } from './diagnostic-logique.js';
import { formaterDate, totauxCommande, modeCommande, documentsCommande, MODE_POSE } from './compte-logique.js';
import { appliquerGarde, brancherDeconnexion, lireAchat, remplacerContenu } from './compte-session.js';

const par = (racine, selecteur) => racine.querySelector(selecteur);

function paires(liste, entrees) {
  const nouvelles = [];
  for (const [libelle, valeur] of entrees) {
    const dt = liste.ownerDocument.createElement('dt');
    dt.textContent = libelle;
    const dd = liste.ownerDocument.createElement('dd');
    dd.textContent = valeur;
    nouvelles.push(dt, dd);
  }
  liste.replaceChildren(...nouvelles);
}

function remplirApercu(conteneur, gabarit, cotes, t) {
  const svg = gabarit.content.cloneNode(true);
  const [lettreA, lettreB] = svg.querySelectorAll('.schema__lettre');
  lettreA.textContent = t.lettres.a;
  lettreB.textContent = t.lettres.b;
  svg.querySelector('.schema__valeur--a').textContent = `${formaterMm(cotes.largeur)} mm`;
  svg.querySelector('.schema__valeur--b').textContent = `${formaterMm(cotes.hauteur)} mm`;
  svg.querySelector('svg').setAttribute('aria-label', remplirGabarit(t.apercuAria, { largeur: formaterMm(cotes.largeur), hauteur: formaterMm(cotes.hauteur) }));
  conteneur.append(svg);
}

export function construireLigne(gabarit, gabaritApercu, ligne, commande, compte) {
  const t = compte.pages.achat.ligne;
  const li = gabarit.content.firstElementChild.cloneNode(true);
  par(li, '.ligne__nom').textContent = ligne.titre;
  par(li, '.ligne__reference').textContent = remplirGabarit(t.reference, { reference: ligne.reference });
  par(li, '.ligne__pictogramme use').setAttribute('href', `#${ligne.icone}`);
  par(li, '.ligne__mode').textContent = remplirGabarit(t.mode, { mode: compte.commande.modes[ligne.mode === MODE_POSE ? 'pose' : 'diy'] });
  par(li, '.ligne__cotes').textContent = ligne.cotes
    ? remplirGabarit(t.surMesure, { largeur: formaterMm(ligne.cotes.largeur), hauteur: formaterMm(ligne.cotes.hauteur) })
    : t.sansMesure;
  par(li, '.ligne__quantite').textContent = `${t.quantite} ${ligne.quantite}`;
  const unitaire = ligne.prixUnitaire.materiel + (ligne.mode === MODE_POSE ? ligne.prixUnitaire.pose : 0);
  par(li, '.ligne__prix').textContent = remplirGabarit(t.prixUnitaire, { prix: formaterPrix(unitaire), quantite: ligne.quantite });
  par(li, '.ligne__total').textContent = remplirGabarit(t.totalLigne, { total: formaterPrix(unitaire * ligne.quantite) });
  par(li, '.ligne__resume').textContent = t.resume;
  if (ligne.cotes) {
    const { largeur, hauteur, tolerance } = ligne.cotes;
    paires(par(li, '.ligne__liste-cotes'), [
      [t.cotes.largeur, `${formaterMm(largeur)} mm`],
      [t.cotes.hauteur, `${formaterMm(hauteur)} mm`],
      [t.cotes.tolerance, `${formaterMm(tolerance)} mm`],
    ]);
    par(li, '.ligne__liste-cotes').setAttribute('aria-label', t.cotesAria);
    remplirApercu(par(li, '.ligne__apercu'), gabaritApercu, ligne.cotes, t);
  } else {
    par(li, '.ligne__liste-cotes').remove();
    par(li, '.ligne__apercu').remove();
  }
  const delais = [[t.delais.livraison, commande.livraison.delaiLivraison]];
  if (ligne.mode === MODE_POSE && commande.livraison.delaiPose) delais.push([t.delais.pose, commande.livraison.delaiPose]);
  par(li, '.ligne__liste-delais').setAttribute('aria-label', t.delaisAria);
  paires(par(li, '.ligne__liste-delais'), delais);
  return li;
}

export function initialiser(donnees, racine = document) {
  if (!appliquerGarde(donnees, racine)) return false;
  brancherDeconnexion(donnees, racine);
  const { compte, site } = donnees;
  const commande = compte.commandes.find((c) => c.id === lireAchat());
  if (!commande) {
    const textes = compte.gardes.aucunAchat;
    remplacerContenu({ titre: textes.titre, phrase: textes.phrase, lien: textes.lien, adresse: site.liens.achats }, racine);
    racine.documentElement.dataset.compte = 'vide';
    return false;
  }
  const t = compte.pages.achat;
  const numero = remplirGabarit(compte.commande.numero, { id: commande.id });
  racine.getElementById('titre-resume').textContent = numero;
  par(racine, '.fil__courant').textContent = numero;

  const totaux = totauxCommande(commande.lignes);
  const statut = compte.statuts.find((s) => s.id === commande.statut)?.libelle ?? commande.statut;
  const resume = [[t.resume.date, formaterDate(commande.date)], [t.resume.statut, statut], [t.resume.materiel, formaterPrix(totaux.materiel)]];
  if (modeCommande(commande) !== 'diy') resume.push([t.resume.pose, formaterPrix(totaux.pose)]);
  resume.push([t.resume.total, formaterPrix(totaux.total)]);
  paires(par(racine, '.achat__resume'), resume);

  const liste = par(racine, '.lignes');
  const gabarit = par(racine, 'template[data-gabarit="ligne"]');
  const gabaritApercu = par(racine, 'template[data-gabarit="apercu"]');
  liste.replaceChildren(gabarit, gabaritApercu, ...commande.lignes.map((l) => construireLigne(gabarit, gabaritApercu, l, commande, compte)));
  liste.setAttribute('aria-busy', 'false');

  const livraison = [[t.livraisonTextes.statut, statut], [t.livraisonTextes.delai, commande.livraison.delaiLivraison]];
  if (commande.artisan) {
    livraison.push([t.livraisonTextes.artisan, commande.artisan.nom], [t.livraisonTextes.intervention, formaterDate(commande.artisan.date)]);
  }
  paires(par(racine, '.achat__livraison'), livraison);

  const documents = par(racine, '.documents');
  const modeleDocument = par(racine, 'template[data-gabarit="document"]');
  documents.replaceChildren(modeleDocument, ...documentsCommande(commande, compte.documents).map((document_) => {
    const li = modeleDocument.content.firstElementChild.cloneNode(true);
    const lien = par(li, 'a');
    lien.setAttribute('href', document_.fichier);
    lien.textContent = remplirGabarit(t.documentsTextes.libelle, { titre: document_.titre });
    return li;
  }));
  documents.setAttribute('aria-busy', 'false');
  racine.documentElement.dataset.compte = 'pret';
  return true;
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    if (donnees) initialiser(donnees);
  });
}
