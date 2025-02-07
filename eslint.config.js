import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
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
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports,
    },
    // Rules configuration
    rules: {
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Unused imports
      'unused-imports/no-unused-imports': 'warn',

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

      // Stylistic
      'indent': [0, 'tab'],
      'no-trailing-spaces': 'off',
      'no-mixed-spaces-and-tabs': 'error',
      'no-tabs': 'error',

      // ES2015 rules
      'constructor-super': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-imports': 'error',
      'no-this-before-super': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off'
    },
  },
];