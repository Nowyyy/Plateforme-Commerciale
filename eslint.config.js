import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/', 'coverage/', 'playwright-report/', 'test-results/', '.lighthouseci/'] },
  js.configs.recommended,
  {
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['assets/js/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
];
