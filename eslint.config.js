// ESLint v9 flat config
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignorar saídas e deps
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base para TS/JS
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },

  // Ambiente de testes (Vitest)
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  }
);
