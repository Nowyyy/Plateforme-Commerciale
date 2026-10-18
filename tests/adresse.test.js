import { describe, it, expect } from 'vitest';
import { valider } from '../assets/js/adresse.js';

describe('adresse.js : valider', () => {
  it('accepte une adresse correcte', () => {
    expect(valider('12 rue des Tilleuls, 69000 Lyon')).toEqual({
      valide: true,
      adresse: '12 rue des Tilleuls, 69000 Lyon',
      raison: null,
    });
  });

  it('refuse les espaces seuls et le texte vide ou absent', () => {
    expect(valider('     ')).toMatchObject({ valide: false, raison: 'vide' });
    expect(valider('')).toMatchObject({ valide: false, raison: 'vide' });
    expect(valider(undefined)).toMatchObject({ valide: false, raison: 'vide' });
  });

  it('refuse une adresse trop courte (moins de 5 caractères) et accepte exactement 5', () => {
    expect(valider('Rue')).toMatchObject({ valide: false, raison: 'courte' });
    expect(valider('  abcd  ')).toMatchObject({ valide: false, raison: 'courte' });
    expect(valider('Paris').valide).toBe(true);
  });

  it('refuse une chaîne de chiffres ou de signes seulement', () => {
    expect(valider('123456789')).toMatchObject({ valide: false, raison: 'sans-lettre' });
    expect(valider('12 34 - 56 / 78')).toMatchObject({ valide: false, raison: 'sans-lettre' });
    expect(valider('!!!!!!!')).toMatchObject({ valide: false, raison: 'sans-lettre' });
  });

  it('refuse une adresse trop longue (plus de 200 caractères) et accepte exactement 200', () => {
    expect(valider('a'.repeat(201))).toMatchObject({ valide: false, raison: 'longue' });
    expect(valider('a'.repeat(200)).valide).toBe(true);
  });

  it('retire les espaces en bordure, garde les espaces internes et les lettres accentuées', () => {
    expect(valider('   5 allée Étoile   ').adresse).toBe('5 allée Étoile');
    expect(valider('  éééééé ').valide).toBe(true);
  });
});
