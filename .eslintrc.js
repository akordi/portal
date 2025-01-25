module.exports = {
  ignorePatterns: ['jsconfig.js'],
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
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier',
    'airbnb-base',
    'plugin:import/recommended',
    'plugin:import/errors',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './jsconfig.json',
  },
  plugins: ['vue', 'prettier'],
  rules: {
    'prettier/prettier': ['error'],
    'no-restricted-imports': [
      'error',
      {
        patterns: ['.*'],
      },
    ],
    'vue/html-indent': [
      'error',
      2,
      {
        attribute: 1,
        baseIndent: 1,
        closeBracket: 0,
        alignAttributesVertically: true,
        ignores: [],
      },
    ],
    'vue/multi-word-component-names': 'off',
    'vuejs-accessibility/label-has-for': 'off',
    'no-param-reassign': ['error', { props: true, ignorePropertyModificationsFor: ['state'] }],
    // use ' instead of "
    quotes: ['error', 'single'],
    // use 2 spaces for indentation
    indent: ['off'], // leave it to prettier
    // prefer non-default exports
    'import/prefer-default-export': 'off',
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
    withDefaults: 'readonly',
  },
};
