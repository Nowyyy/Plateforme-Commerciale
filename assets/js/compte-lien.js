// Lien « Mon compte » (en-tête, menu mobile, pied) : le balisage statique pointe vers la connexion ; session connectée,
// l'adresse devient celle du compte. Libellés et liens viennent de data/site.json (requête de rendu.js réutilisée).
// Mis à jour sur pageshow, storage et compte:modifie (l'événement storage ne part pas dans l'onglet qui écrit).
import { donneesPretes } from './rendu.js';
import { estConnecte, EVENEMENT } from './compte-session.js';

// Liens à réécrire : ceux de l'en-tête et du pied dont l'adresse est celle de la connexion ou du compte.
export function adresseVisee(liens, connecte) {
  return connecte ? liens.compte : liens.connexion;
}

function appliquer(liens) {
  const cible = adresseVisee(liens, estConnecte());
  for (const lien of document.querySelectorAll('.entete a[href], .pied a[href]')) {
    const adresse = lien.getAttribute('href');
    if (adresse === liens.connexion || adresse === liens.compte) lien.setAttribute('href', cible);
  }
}

if (typeof document !== 'undefined') {
  donneesPretes.then((donnees) => {
    const liens = donnees?.site?.liens;
    if (!liens?.compte || !liens?.connexion) return;
    const maj = () => appliquer(liens);
    maj();
    window.addEventListener('pageshow', maj);
    window.addEventListener('storage', maj);
    document.addEventListener(EVENEMENT, maj);
  });
}
