import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

/**
 * Линт здесь нужен ради двух правил из PLAN §3.3, остальное — приятный довесок.
 * Правило 1: sim/ не знает про рендер, DOM и платформу.
 * Правило 3: в sim/ нет часов и Math.random — иначе прогон перестаёт быть воспроизводимым.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.ts'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': { typescript: true },
    },
    rules: {
      // Подчёркивание = «знаю, что не использую». Так же ведёт себя noUnusedParameters в tsc.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // Правило 1. Стрелка направлена только в одну сторону: рендер знает про мир,
      // мир про рендер — нет.
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/sim',
              from: './src/render',
              message: 'PLAN §3.3, правило 1: sim/ не импортирует рендер.',
            },
            {
              target: './src/sim',
              from: './src/ui',
              message: 'PLAN §3.3, правило 1: sim/ не импортирует UI.',
            },
            {
              target: './src/sim',
              from: './src/platform',
              message: 'PLAN §3.3, правило 1: sim/ не импортирует платформу.',
            },
          ],
        },
      ],
    },
  },

  {
    // Правило 3 и заодно запрет на реальное время внутри симуляции.
    files: ['src/sim/**/*.ts'],
    languageOptions: {
      globals: {},
    },
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'PLAN §3.3, правило 3: в sim/ только world.rng, иначе прогон не повторить.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'PLAN §3.3: симуляция считает шаги, а не секунды. Часы живут в main.ts.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'PLAN §3.3: симуляция считает шаги, а не секунды. Часы живут в main.ts.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'PLAN §3.3, правило 1: sim/ не знает про DOM.' },
        { name: 'window', message: 'PLAN §3.3, правило 1: sim/ не знает про DOM.' },
        { name: 'performance', message: 'PLAN §3.3: часы живут в main.ts.' },
      ],
    },
  },

  {
    files: ['*.config.js', '*.config.ts'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
);
