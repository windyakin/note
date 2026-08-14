import { getBlocks, getPageById, extractFirstImageUrl, extractTextFromBlocks, resolveDisplayTitle, TITLE_MAX_LENGTH } from "./notion";
import type { Block, PostMeta, RichText } from "./notion";
import { SITE_NAME } from "astro:env/server";
import { fetchOgpMeta, downloadOgpImage, downloadFavicon, downloadNotionImage, downloadNotionImageForOgp } from "./ogp";
import { readMetaCache, writeMetaCache } from "./ogpMetaCache";

const CONCURRENCY_LIMIT = 5;

type EnrichTask = { type: "ogp"; block: Block; url: string }
  | { type: "image"; block: Block; url: string };

/**
 * ブロックツリーを走査し、以下を並列で実行する:
 * - bookmark / link_preview: OGP メタデータ取得 + カバー画像 & favicon ダウンロード
 * - image: 画像をローカルにダウンロード
 */
export async function enrichBlocksWithOgp(blocks: Block[]): Promise<Block[]> {
  const tasks: EnrichTask[] = [];
  collectTasks(blocks, tasks);

  if (tasks.length === 0) return blocks;

  await processWithConcurrency(tasks, CONCURRENCY_LIMIT, async (task) => {
    if (task.type === "ogp") {
      const cached = await readMetaCache(task.url);
      if (cached) {
        task.block.ogp = cached;
        return;
      }

      const meta = await fetchOgpMeta(task.url);
      if (!meta) return;

      if (meta.imageUrl) {
        meta.imageUrl = await downloadOgpImage(meta.imageUrl);
      }
      if (meta.faviconUrl) {
        meta.faviconUrl = await downloadFavicon(meta.faviconUrl);
      }

      await writeMetaCache(meta);
      task.block.ogp = meta;
    } else {
      const [localPath, ogpPath] = await Promise.all([
        downloadNotionImage(task.url),
        downloadNotionImageForOgp(task.url),
      ]);
      if (localPath) {
        task.block.localImageUrl = localPath;
      }
      if (ogpPath) {
        task.block.ogpImageUrl = ogpPath;
      }
    }
  });

  return blocks;
}

function getMediaUrl(block: Block): string {
  const data = (block as any)[block.type];
  if (!data) return "";
  if (data.type === "external") return data.external?.url ?? "";
  if (data.type === "file") return data.file?.url ?? "";
  return "";
}

function collectTasks(blocks: Block[], tasks: EnrichTask[]): void {
  for (const block of blocks) {
    if (block.type === "bookmark") {
      const url = (block as any).bookmark?.url;
      if (url) tasks.push({ type: "ogp", block, url });
    } else if (block.type === "link_preview") {
      const url = (block as any).link_preview?.url;
      if (url) tasks.push({ type: "ogp", block, url });
    } else if (block.type === "image") {
      const url = getMediaUrl(block);
      if (url) tasks.push({ type: "image", block, url });
    }

    if (block.children) {
      collectTasks(block.children, tasks);
    }
  }
}

// ---------------------------------------------------------------------------
// 内部リンク解決
// ---------------------------------------------------------------------------

function normalizeId(id: string): string {
  return id.replace(/-/g, "");
}

function getRichTextsFromBlock(block: Block): RichText[][] {
  if (block.type === "table_row") {
    const cells = (block as any).table_row?.cells;
    return Array.isArray(cells) ? cells : [];
  }
  const data = (block as any)[block.type];
  const rt = data?.rich_text;
  return rt ? [rt] : [];
}

export async function resolveInternalLinks(blocks: Block[], publishedPosts: PostMeta[]): Promise<void> {
  const postMap = new Map(publishedPosts.map((p) => [normalizeId(p.id), p]));
  const siteUrl = (import.meta.env.SITE ?? "").replace(/\/$/, "");
  await resolveRecursive(blocks, postMap, siteUrl);
}

async function resolveRecursive(blocks: Block[], postMap: Map<string, PostMeta>, siteUrl: string): Promise<void> {
  for (const block of blocks) {
    if (block.type === "link_to_page") {
      const data = (block as any).link_to_page;
      if (data?.type === "page_id") {
        const post = postMap.get(normalizeId(data.page_id));
        if (post) {
          const internalPath = `/posts/${post.id}`;
          block._internalUrl = internalPath;

          let imageUrl: string | null = null;
          let description: string | null = null;
          let displayTitle = post.title;
          try {
            const linked = await getPageById(post.id);
            const linkedBlocks = linked?.blocks ?? await getBlocks(post.id);
            displayTitle = resolveDisplayTitle(post, linkedBlocks);
            description = extractTextFromBlocks(linkedBlocks) || null;
            const firstImage = extractFirstImageUrl(linkedBlocks);
            if (firstImage) {
              imageUrl = firstImage.startsWith("/")
                ? firstImage
                : await downloadNotionImage(firstImage);
            }
          } catch { /* ignore */ }

          block.ogp = {
            title: displayTitle,
            description,
            siteName: SITE_NAME,
            imageUrl,
            faviconUrl: "/favicon.svg",
            url: `${siteUrl}${internalPath}`,
          };
        }
      }
    }

    for (const richTexts of getRichTextsFromBlock(block)) {
      for (const item of richTexts) {
        if (item.type === "mention") {
          const mention = (item as any).mention;
          if (mention?.type === "page") {
            const post = postMap.get(normalizeId(mention.page.id));
            if (post) {
              (item as any).href = `/posts/${post.id}`;
              (item as any)._icon = post.icon;
              continue;
            }
          }
          if (item.href && !item.href.startsWith("/")) {
            try {
              let meta = await readMetaCache(item.href);
              if (!meta) {
                meta = await fetchOgpMeta(item.href);
                if (meta) {
                  if (meta.faviconUrl) {
                    meta.faviconUrl = await downloadFavicon(meta.faviconUrl);
                  }
                  await writeMetaCache(meta);
                }
              }
              if (meta?.title) {
                (item as any).plain_text = meta.title.length > TITLE_MAX_LENGTH
                  ? meta.title.slice(0, TITLE_MAX_LENGTH) + "…"
                  : meta.title;
              }
              if (meta?.faviconUrl) {
                (item as any)._faviconUrl = meta.faviconUrl;
              }
            } catch { /* ignore */ }
          }
        }
      }
    }

    if (block.children) {
      await resolveRecursive(block.children, postMap, siteUrl);
    }
  }
}

// ---------------------------------------------------------------------------
// バックリンク収集
// ---------------------------------------------------------------------------

export interface BacklinkEntry {
  id: string;
  title: string;
  icon: string | null;
  firstPublishedAt: string;
}

export function collectBacklinks(
  posts: { meta: PostMeta; blocks: Block[] }[],
): Map<string, BacklinkEntry[]> {
  const postMap = new Map(posts.map((p) => [normalizeId(p.meta.id), p]));
  const backlinks = new Map<string, BacklinkEntry[]>();

  for (const post of posts) {
    const linkedIds = new Set<string>();
    collectLinkedPageIds(post.blocks, linkedIds);

    const entry: BacklinkEntry = {
      id: post.meta.id,
      title: resolveDisplayTitle(post.meta, post.blocks),
      icon: post.meta.icon,
      firstPublishedAt: post.meta.firstPublishedAt,
    };

    for (const rawId of linkedIds) {
      const targetId = normalizeId(rawId);
      if (targetId === normalizeId(post.meta.id)) continue;
      if (!postMap.has(targetId)) continue;

      const canonicalId = postMap.get(targetId)!.meta.id;
      if (!backlinks.has(canonicalId)) {
        backlinks.set(canonicalId, []);
      }
      backlinks.get(canonicalId)!.push(entry);
    }
  }

  return backlinks;
}

function collectLinkedPageIds(blocks: Block[], ids: Set<string>): void {
  for (const block of blocks) {
    if (block.type === "link_to_page") {
      const data = (block as any).link_to_page;
      if (data?.type === "page_id") {
        ids.add(data.page_id);
      }
    }

    for (const richTexts of getRichTextsFromBlock(block)) {
      for (const item of richTexts) {
        if (item.type === "mention") {
          const mention = (item as any).mention;
          if (mention?.type === "page") {
            ids.add(mention.page.id);
          }
        }
      }
    }

    if (block.children) {
      collectLinkedPageIds(block.children, ids);
    }
  }
}

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
