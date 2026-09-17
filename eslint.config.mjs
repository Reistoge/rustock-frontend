// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // 1. Ignorados globales (debe ser un objeto independiente)
  {
    ignores: ['.angular/', 'node_modules/', 'dist/', 'build/']
  },

  // 2. Reglas recomendadas base
  // Se aplican a todos los archivos que no estén en la lista de ignorados
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. archivos específicos y reglas personalizadas
  {
    files: ['src/**/*.{js,ts}'],
    rules: {
      semi: 'error'
    }
  }
]);