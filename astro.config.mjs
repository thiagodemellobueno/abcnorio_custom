// @ts-check
import { defineConfig, fontProviders, memoryCache } from 'astro/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import icon from 'astro-icon';
import { loadEnv } from 'vite';

import node from '@astrojs/node';

const mode = process.env.MODE || 'development';
const env = {
  ...loadEnv(mode, process.cwd(), ''),
  ...process.env,
};

let buildPath = env.DEV_BUILD_PATH;
let siteUrl = env.SITE_URL;
const outDir = './dist';
const tokensDir = fileURLToPath(new URL('./src/styles/tokens', import.meta.url));

function resolveTokensSassPath(url) {
  if (!url.startsWith('@tokens/')) {
    return null;
  }

  const requestPath = url.slice('@tokens/'.length);
  const candidates = [
    `${requestPath}.scss`,
    `_${requestPath}.scss`,
    path.join(requestPath, 'index.scss'),
    path.join(requestPath, '_index.scss'),
  ];

  for (const candidate of candidates) {
    const absolutePath = path.join(tokensDir, candidate);
    if (existsSync(absolutePath)) {
      return pathToFileURL(absolutePath);
    }
  }

  return null;
}

switch (mode) {
  case 'production':
    buildPath = env.PRODUCTION_BUILD_PATH;
    siteUrl = env.PRODUCTION_FRONTEND_URL || siteUrl;
    break;
  case 'preview':
    siteUrl = env.PREVIEW_FRONTEND_URL || siteUrl;
    break;
  case 'staging':
    buildPath = env.STAGING_BUILD_PATH;
    siteUrl = env.STAGING_FRONTEND_URL || siteUrl;
    break;
  default:
    siteUrl = env.DEV_FRONTEND_URL || siteUrl;
    break;
}

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Impact Label',
      cssVariable: '--font-impact-label',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/Impact_Label.woff2'],
            weight: 'normal',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Impact Label Reversed',
      cssVariable: '--font-impact-label-reversed',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/Impact_Label_Reversed.woff2'],
            weight: 'normal',
            style: 'normal',
          },
        ],
      },
    },
  ],

  site: siteUrl,

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          importers: [
            {
              findFileUrl(url) {
                return resolveTokensSassPath(url);
              },
            },
          ],
        },
      },
    },
    ...(mode !== 'production' && {
      server: {
        watch: { usePolling: true },
      },
    }),
    optimizeDeps: {
      include: ['ics', 'file-saver'],
    },
    resolve: {
      alias: {        
        '@fonts': fileURLToPath(new URL('./src/assets/fonts', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@mixins': fileURLToPath(new URL('./src/styles/mixins', import.meta.url)),
        '@tokens': fileURLToPath(new URL('./src/styles/tokens', import.meta.url)),
        '@util': fileURLToPath(new URL('./src/util', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@consts': fileURLToPath(new URL('./src/consts.ts', import.meta.url)),
      },
    },
  },

  server: {
    port: 3033,
    allowedHosts: ['dev.itztlacoliuhqui.org', 'staging.itztlacoliuhqui.org', 'abcnorio.itztlacoliuhqui.org', 'preview.itztlacoliuhqui.org', 'localhost'],
  },

  outDir,
  compressHTML: (mode === 'production') ? true : false,

  integrations: [
    icon()
  ],

  adapter: node({
    mode: 'standalone',
  }),

  security: {
    checkOrigin: mode === 'production',
  },

  experimental: {
    cache: {
      provider: memoryCache({ max: 500 }),
    },
    routeRules: {
      '/search/api': { maxAge: 60, swr: 60 },
      '/events/listing': { maxAge: 30, swr: 60 },
    },
  },
});