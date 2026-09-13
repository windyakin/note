import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");

export default defineConfig({
  site: env.SITE_URL ?? "https://your-blog.pages.dev",
  output: "static",
  integrations: [
    vue(),
    sitemap({
      // タグ詳細ページは noindex のためサイトマップから除外し、
      // JSON/Markdown エンドポイントなど非 HTML ページも除外する
      filter: (page) => {
        const { pathname } = new URL(page);
        if (pathname.startsWith("/tags/") && pathname !== "/tags/") return false;
        if (pathname.endsWith(".json") || pathname.endsWith(".md") || pathname.endsWith(".xml")) return false;
        return true;
      },
    }),
  ],
  env: {
    schema: {
      SITE_LANG: envField.enum({
        values: ["en", "ja", "zh-TW"],
        context: "server",
        access: "public",
        optional: true,
        default: "en",
      }),
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
      SITE_COPYRIGHT_YEAR: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: String(new Date().getFullYear()),
      }),
    },
  },
});
