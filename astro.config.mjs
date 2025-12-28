// @ts-check
import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://ink.seancollings.dev",
  env: {
    schema: {
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
      RESEND_SEGMENT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },

    imageService: "cloudflare",
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
