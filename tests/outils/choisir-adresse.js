// Utilitaire partagé des tests Playwright : saisie stricte de l'adresse. Tape le texte, attend les suggestions (simulées par
// `simuler` de tests/e2e/carte-reelle-simulation.js) et choisit l'une d'elles ; renvoie le libellé choisi (celui du champ ensuite).
import { expect } from '@playwright/test';

export async function choisirAdresse(page, champ, texte = '12 rue des Tilleuls', index = 0) {
  await champ.fill(texte);
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible();
  const libelle = ((await options.nth(index).textContent()) ?? '').trim();
  await options.nth(index).click();
  await expect(champ).toHaveValue(libelle);
  return libelle;
}
