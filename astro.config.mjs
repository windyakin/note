import { defineConfig, envField } from "astro/config";
import vue from "@astrojs/vue";

export default defineConfig({
  site: "https://your-blog.pages.dev",
  output: "static",
  integrations: [vue()],
  env: {
    schema: {
      SITE_NAME: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "note",
      }),
      SITE_DESCRIPTION: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "Notionをブログのように公開するためのサイト",
      }),
      SITE_AUTHOR: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "author",
      }),
    },
  },
});
