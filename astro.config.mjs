import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://thesignalroomstudio.com',
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
  integrations: [sitemap()],
  vite: { build: { cssMinify: true } },
});
