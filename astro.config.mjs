import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import { Client } from "@notionhq/client";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");

// サイトマップの lastmod 用に記事 ID → 公開日 (First published at) を引く。
// astro.config.mjs は Astro の env スキーマ (import.meta.env) の外で実行されるため、
// loadEnv で読んだ値から直接 Notion クライアントを作る。
const notion = env.NOTION_TOKEN && env.NOTION_DATABASE_ID
  ? new Client({ auth: env.NOTION_TOKEN })
  : null;

let lastmodMapPromise;
function getLastmodMap() {
  if (!notion) return Promise.resolve(new Map());
  if (!lastmodMapPromise) {
    lastmodMapPromise = notion.databases
      .query({
        database_id: env.NOTION_DATABASE_ID,
        filter: { property: "Published", checkbox: { equals: true } },
      })
      .then((response) => {
        const map = new Map();
        for (const page of response.results) {
          if (!("properties" in page)) continue;
          const dateProp = page.properties["First published at"];
          const firstPublishedAt =
            dateProp?.type === "date" && dateProp.date?.start ? dateProp.date.start : page.last_edited_time;
          map.set(page.id, firstPublishedAt);
        }
        return map;
      })
      .catch(() => new Map());
  }
  return lastmodMapPromise;
}

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
      // 記事ページには公開日 (First published at) を lastmod として出力する
      serialize: async (item) => {
        const { pathname } = new URL(item.url);
        const match = pathname.match(/^\/posts\/([^/]+)\/$/);
        if (!match) return item;

        const lastmod = (await getLastmodMap()).get(match[1]);
        return lastmod ? { ...item, lastmod } : item;
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
