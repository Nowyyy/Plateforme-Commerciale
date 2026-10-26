// Lot 10a-A : les deux tests de mise en page autrefois intermittents (pro-b « une colonne à 375 px » et compte-c « mesures à 1440 px … »)
// sont relancés 10 fois de suite en isolation. Cause relevée : mesure lue juste après setViewportSize, avant la fin de la mise en page ;
// correction : document.fonts.ready puis expect.poll sur la mesure (assertions inchangées). Test lent (relances imbriquées).
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

test('pro-b et compte-c : 10 relances isolées consécutives passent', () => {
  test.slow();
  test.setTimeout(600000);
  let sortie;
  try {
    sortie = execFileSync('npx', ['playwright', 'test', 'tests/e2e/pro-b.e2e.js', 'tests/e2e/compte-c.e2e.js',
      '-g', 'mise en page : carte de 56 rem|mesures à 1440 px : colonnes 3 / 2', '--repeat-each=10', '--workers=1', '--reporter=line', '--output=test-results/stabilite'],
    { encoding: 'utf8', env: { ...process.env, CI: '' }, timeout: 540000 });
  } catch (erreur) {
    sortie = `${erreur.stdout ?? ''}${erreur.stderr ?? ''}`;
    expect.soft(sortie, 'au moins une relance a échoué').toBe('');
  }
  expect(sortie).toMatch(/20 passed/);
});
