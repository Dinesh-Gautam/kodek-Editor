import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['dist'] },
  // Configuration for React/Browser files (src/**)
  {
    files: ['src/**/*.{js,jsx}'], // Target only src directory
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser, // Keep browser globals for React
        // Add any other specific globals if needed, e.g., 'React': 'readonly'
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Add or override rules specific to React code if needed
    },
  },
  // Configuration for Node.js files (server/**)
  {
    files: ['server/**/*.js'], // Target server directory
    languageOptions: {
      ecmaVersion: 2021, // Use a recent ECMAScript version suitable for Node
      globals: {
        ...globals.node, // Use Node.js globals
      },
      sourceType: 'module', // Assuming you use ES Modules in server/index.js
    },
    rules: {
      ...js.configs.recommended.rules,
      // Add or override rules specific to Node.js code if needed
      // e.g., 'no-console': 'off' // if you want to allow console logs on the server
    },
  },
  // Add other configurations if needed (e.g., for config files)
  {
    files: ['*.config.js', 'vite.config.js'], // Target config files
    languageOptions: {
      globals: {
        ...globals.node, // Config files usually run in Node
        module: 'readonly',
        require: 'readonly',
        process: 'readonly', // Explicitly allow process here too if needed
      },
      sourceType: 'module', // Or 'commonjs' if they are CJS
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
