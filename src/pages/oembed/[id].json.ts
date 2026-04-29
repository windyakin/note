import type { APIRoute, GetStaticPaths } from "astro";
import {
  getPublishedPosts,
  getPageById,
  extractTextFromBlocks,
} from "@/lib/notion";
import { siteName, author } from "@/site";

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { id: post.id },
  }));
};

export const GET: APIRoute = async ({ params, site }) => {
  const data = await getPageById(params.id!);
  if (!data) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
    });
  }

  const { meta, blocks } = data;
  const description = extractTextFromBlocks(blocks);
  const title = meta.title || description;
  const pageUrl = new URL(`/posts/${meta.id}`, site).href;
  const providerUrl = new URL("/", site).href;

  const oEmbed = {
    version: "1.0",
    type: "link",
    title,
    author_name: author,
    author_url: providerUrl,
    provider_name: siteName,
    provider_url: providerUrl,
    url: pageUrl,
  };

  return new Response(JSON.stringify(oEmbed), {
    headers: { "Content-Type": "application/json" },
  });
};
