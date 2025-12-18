import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // Error on undefined variables (catches scoping issues!)
      'no-undef': 'error',

      // Warn on unused variables
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],

      // Error on unreachable code
      'no-unreachable': 'error',

      // Warn on console.log in production code
      'no-console': 'off', // Keep enabled during development

      // Require === instead of ==
      'eqeqeq': ['warn', 'always'],

      // Disallow var (use let/const)
      'no-var': 'error',

      // Prefer const for variables that are never reassigned
      'prefer-const': 'warn',

      // Disallow empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Allow control characters in regex (for ANSI color codes)
      'no-control-regex': 'off',

      // React rules
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off', // TypeScript handles this better
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'output/**',
      '.husky/**'
    ]
  }
];
