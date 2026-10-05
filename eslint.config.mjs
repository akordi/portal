import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

// airbnb-base has no flat config. The import plugin's config goes through the
// same compat layer so both share one plugin instance.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ['dist/'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...compat.extends('airbnb-base', 'plugin:import/recommended'),
  eslintConfigPrettier,
  {
    plugins: { prettier: pluginPrettier },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.vue'] },
        alias: { extensions: ['.js', '.vue'], map: [['@', './src']] },
      },
    },
    rules: {
      'prettier/prettier': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-unused-vars': ['error', { ignoreRestSiblings: true, caughtErrors: 'none' }],
      'no-restricted-imports': ['error', { patterns: ['.*'] }],
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['state'] }],
      'import/prefer-default-export': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
];
