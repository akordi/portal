import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import vueEslintConfigPrettier from '@vue/eslint-config-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

// airbnb-base only ships an eslintrc config; the import plugin's config is
// loaded the same way so both share one instance of the plugin.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ['dist/', 'jsconfig.js'] },
  ...pluginVue.configs['flat/essential'],
  js.configs.recommended,
  vueEslintConfigPrettier,
  ...compat.extends('airbnb-base', 'plugin:import/recommended'),
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
        },
        alias: {
          extensions: ['.js', '.vue'],
          map: [['@', './src']],
        },
      },
    },
    rules: {
      'prettier/prettier': ['error'],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['.*'],
        },
      ],
      'vue/html-indent': ['off'], // leave it to prettier
      'vue/multi-word-component-names': 'off',
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['state'] }],
      // use ' instead of "
      quotes: ['error', 'single'],
      // use 2 spaces for indentation
      indent: ['off'], // leave it to prettier
      // prefer non-default exports
      'import/prefer-default-export': 'off',
    },
  },
];
