// Espace professionnel (écran 5) : les listes (étapes, aléas) sont rendues par rendu.js à partir de data/pro.json
// (gabarits <template data-liste>). Le formulaire reste masqué tant que son gestionnaire n'est pas branché (partie B).

// Identifiants d'aléas acceptés par la validation : ceux de data/pro.json (mêmes que ceux de l'accueil).
export const idsAleas = (donnees) => donnees.pro.aleas.map((alea) => alea.id);
