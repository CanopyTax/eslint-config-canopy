import tsParser from '@typescript-eslint/parser';
import jsPlugin from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  jsPlugin.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    // Global settings
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
          legacyDecorators: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
        ...globals.nodeBuiltin,
        ...globals.esnext,
        ...globals.worker,
        // SystemJS globals
        SystemJS: 'readonly',
        module: 'readonly',
        global: 'writable',
        __webpack_public_path__: 'writable',
        __webpack_require__: 'readonly',
      },
    },
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/node_modules/**'],
    // Plugin configurations
    plugins: {
      'react-hooks': reactHooksPlugin,
      'react': reactPlugin,
      'unused-imports': unusedImports,
      'import': importPlugin,
    },
    // Rules configuration
    rules: {
      'no-useless-escape': 'off',
      'no-extra-boolean-cast': 'off',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // Imports
      'unused-imports/no-unused-imports': 'warn',
      'import/no-duplicates': 'error',

      // Possible Errors
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-constant-condition': 'error',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-extra-semi': 'error',
      'no-obj-calls': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',

      // Best practices
      'no-empty-pattern': 'error',
      'no-extra-bind': 'error',
      'no-implied-eval': 'error',
      'no-labels': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'no-void': 'error',
      'no-with': 'error',

      // Variables
      'no-shadow-restricted-names': 'error',
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',

      // ES2015 rules
      'constructor-super': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-this-before-super': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];