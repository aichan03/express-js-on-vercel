// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  {
    ignores: ['dist', 'coverage', 'node_modules'],
  },
  { linterOptions: { reportUnusedDisableDirectives: 'warn' } },

  // App code (Node / Express)
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module', // use 'commonjs' for .js files if you use require()
      globals: { ...globals.node },
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.mjs', '.cjs', '.json'] },
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,

      // Undefined / unused values
      // `_next` in Express error handlers (err, req, res, _next) is allowed
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-undef': 'error',

      // ---------- Imports ----------
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-unresolved': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
      // Node ESM requires explicit extensions for local files (./app.js)
      'import/extensions': ['error', 'ignorePackages'],
      // 'import/order': [
      //   'warn',
      //   {
      //     groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
      //     'newlines-between': 'always',
      //     alphabetize: { order: 'asc', caseInsensitive: true },
      //   },
      // ],

      // ---------- Naming conventions ----------
      camelcase: ['error', { properties: 'never', ignoreDestructuring: false }],
      'new-cap': ['error', { newIsCap: true, capIsNew: false }],
      'id-length': [
        'warn',
        { min: 2, exceptions: ['i', 'j', 'x', 'y', 'e', '_', '$', 'o'], properties: 'never' },
      ],
      'no-restricted-globals': ['error', 'event', 'name', 'status', 'length'],
      'no-shadow': 'error',
      'no-underscore-dangle': ['warn', { allowAfterThis: false, allow: ['_id'] }], // `_id` for MongoDB

      // ---------- Code quality ----------
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      curly: ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      'consistent-return': 'off',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-nested-ternary': 'error',
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['req', 'res'] },
      ],
      'no-implicit-coercion': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-lonely-if': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': ['warn', { object: true, array: false }],
      'prefer-object-spread': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'dot-notation': 'error',
      'max-params': ['warn', 4], // Express error handlers have exactly 4
      'max-depth': ['warn', 4],
      complexity: ['warn', 15],

      // ---------- Async / Node ----------
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'off',
    },
  },

  // Vitest tests (globals: true in vitest.config.js)
  {
    files: ['**/*.test.{js,mjs}', 'tests/**/*.{js,mjs}'],
    languageOptions: { globals: { ...(globals.vitest ?? {}) } },
    rules: {
      'max-params': 'off',
      'id-length': 'off',
      'no-console': 'off',
      'no-await-in-loop': 'off',
    },
  },

  // Config files
  {
    files: ['*.config.{js,cjs,mjs}'],
    rules: { 'no-console': 'off' },
  },

  // Must be last: disables rules that conflict with Prettier
  prettier,
];
