/* eslint-disable no-console -- for debugging */
/* eslint-disable no-restricted-imports -- vite doesn`t use aliases in imports */
/* eslint-disable import/no-extraneous-dependencies -- vite mostly should use dev dependencies */
import vue from '@vitejs/plugin-vue';
import dns from 'dns';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import mkcert from 'vite-plugin-mkcert';
import packageJson from './package.json';

// set ip4 as default dns lookup in order to support localhost
// https://vitejs.dev/config/server-options.html#server-host
dns.setDefaultResultOrder('ipv4first');

const CONFIG = {
  appName: 'Akordi.lv',
  appTitle: 'Dziesmu vārdu, akordu un tabu krātuve',
  appDescription:
    'Meklējiet akordus un dziesmu vārdus latviešu dziesmām un atrodiet tūkstošiem populāru dziesmu datubāzē.',
};

/**
 * @param { ReturnType<getEnvVariables> } env
 * @returns { import('vite').ServerOptions }
 */
const devServerSettings = (env) => {
  const url = new URL(env.BASE_URL);
  return {
    port: url.port,
    https: url.protocol === 'https:',
    allowedHosts: ['localhost.akordi.lv', 'localhost'],
    proxy: {
      '/api/v1/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
      '/api/v2/': {
        target: 'https://www.akordi.lv/',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://www.akordi.lv/',
        changeOrigin: true,
        secure: false,
      },
    },
  };
};

const getEnvVariables = (mode, serving) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  const envVariables = {
    VUE_APP_VERSION: `${packageJson.version}`,
    VUE_APP_ENVIRONMENT: serving ? 'local' : env.NODE_ENV,
    VUE_APP_NAME: CONFIG.appName,
    VUE_APP_TITLE: CONFIG.appTitle,
    VUE_APP_DESCRIPTION: CONFIG.appDescription,
    VUE_APP_AUTH_URL: env.AUTH_URL,
    VUE_APP_SERVICE_URL: env.SERVICE_URL,
    VUE_APP_GTAG_ENABLED: env.GTAG_ENABLED,
    VUE_APP_GTAG_ID: env.GTAG_ID,
    VUE_APP_DEFAULT_LANGUAGE: env.DEFAULT_LANGUAGE,
    BASE_PATH: env.BASE_PATH,
    BASE_URL: env.PUBLIC_URL,
    // dev only
    VUE_APP_SERVICE_URL_PROXY: '',
    MOCK_SERVICE: false,
    VUE_APP_AUTH_URL_PROXY: '',
    MOCK_AUTH: false,
  };
  if (serving) {
    envVariables.BASE_URL = env.PUBLIC_URL;
    envVariables.BASE_PATH = envVariables.BASE_PATH || '/';
    envVariables.VUE_APP_VERSION += '-serve';
    envVariables.VUE_APP_SERVICE_URL = '/api/';
    envVariables.VUE_APP_SERVICE_URL_PROXY = env.SERVICE_URL;
    envVariables.VUE_APP_AUTH_URL_PROXY = env.AUTH_URL;
    envVariables.VUE_APP_GTAG_ENABLED = false;
    envVariables.VUE_APP_DEFAULT_LANGUAGE = env.DEFAULT_LANGUAGE || 'lv';
  } else {
    envVariables.VUE_APP_ENVIRONMENT = '{{ENVIRONMENT}}';
    envVariables.VUE_APP_SERVICE_URL = '{{SERVICE_URL}}';
    envVariables.VUE_APP_AUTH_URL = '{{AUTH_URL}}';
    envVariables.VUE_APP_GTAG_ENABLED = '{{GTAG_ENABLED}}';
    envVariables.VUE_APP_GTAG_ID = '{{GTAG_ID}}';
    envVariables.BASE_PATH = envVariables.BASE_PATH || '//BASE_PATH//';
    envVariables.BASE_URL = '{{PUBLIC_URL}}';
    envVariables.VUE_APP_DEFAULT_LANGUAGE = '{{DEFAULT_LANGUAGE}}';
    envVariables.VUE_APP_NAME = '{{APP_NAME}}';
    envVariables.VUE_APP_TITLE = '{{APP_TITLE}}';
    envVariables.VUE_APP_DESCRIPTION = '{{APP_DESCRIPTION}}';
  }
  return envVariables;
};

/**
 * @returns { import('vite').UserConfigExport }
 * @description https://vitejs.dev/config/
 */
export default defineConfig((command) => {
  const serving = command?.command === 'serve' && command?.mode === 'development';
  const envVariables = getEnvVariables(command.mode, serving);
  return {
    base: envVariables.BASE_PATH,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '/lx-fonts': fileURLToPath(
          new URL('./node_modules/@wntr/lx-ui/dist/lx-fonts', import.meta.url)
        ),
      },
    },
    plugins: [
      vue(),
      createHtmlPlugin({
        minify: true,
        inject: {
          data: envVariables,
        },
      }),
      serving && mkcert(),
    ],
    build: {
      // https://vitejs.dev/config/#build-target
      target: ['es2020'],
      outDir: './dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            abcjs: ['abcjs'],
            chords: ['chord-transposer', 'vexchords', '@akordi/jtab'],
          },
        },
      },
    },
    server: serving ? devServerSettings(envVariables) : {},
    test: {
      globals: true,
      setupFiles: [path.resolve(__dirname, './tests/setup.js')],
      environment: 'jsdom',
      isolate: false,
      include: ['tests/unit/**/*.js'],
    },
  };
});
