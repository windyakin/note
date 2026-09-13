import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error("site is not configured in astro.config.mjs");
  }

  const sitemapUrl = new URL("sitemap-index.xml", site).href;

  const lines = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemapUrl}`, ""];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
