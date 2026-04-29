import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublishedPostsWithBlocks, extractTextFromBlocks } from "@/lib/notion";
import { siteName, siteDescription } from "@/site";

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error("site is not configured in astro.config.mjs");
  }

  const posts = await getPublishedPostsWithBlocks();

  return rss({
    title: siteName,
    description: siteDescription,
    site,
    items: posts.map(({ meta, blocks }) => {
      const description = extractTextFromBlocks(blocks);
      return {
        title: meta.title || description,
        link: `/posts/${meta.id}/`,
        pubDate: new Date(meta.firstPublishedAt),
        description,
      };
    }),
  });
};
