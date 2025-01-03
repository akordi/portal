# Akordi UI

<!-- TOC -->

- [Akordi UI](#akordi-ui)
  - [About](#about)
  - [App specifications](#app-specifications)
  - [Development](#development)
  - [Requirements](#requirements)

<!-- /TOC -->

## About

Repository with Vue.js application that serves song lyrics and tabs website akordi.lv

## App specifications

[Vue3](https://v3.vuejs.org/) template with (_inspired from Vue.js creator recommendations at conference in Toronto (<https://www.youtube.com/watch?v=2KBHvaAWJOA>)_):

- [Vite](https://vitejs.dev/)
- [Pinia (de facto Vuex 5)](https://pinia.vuejs.org/)
- [Vue Router 4](https://next.router.vuejs.org/guide/)
- [Vitest](https://vitest.dev/)
- [Vue I18n](https://kazupon.github.io/vue-i18n/)

Extras:

- Relative paths
- [ESLint](https://eslint.org/)
- [PNPM](https://pnpm.io/)
- [Docker dev configuration](https://docker.com/)

Recommended IDE:

- [VSCode](https://code.visualstudio.com/)

## Development

1. Build dev server:

    ```bash
    pnpm i
    ```

2. Run dev server (_also possible with vs code debug functionality (F5)_) :

    ```bash
    pnpm dev
    ```

## Requirements

- [Node.js](https://nodejs.org/en/) (at least v18.0.0)
- [PNPM](https://pnpm.io/) (at least v7.0.0 )
