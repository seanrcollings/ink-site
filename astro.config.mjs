// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://ink.seancollings.dev',
  output: 'hybrid',
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()]
  }
});