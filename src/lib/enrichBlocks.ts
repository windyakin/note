import type { Block } from "./notion";
import { fetchOgpMeta, downloadOgpImage, downloadFavicon, downloadNotionImage } from "./ogp";

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
      const meta = await fetchOgpMeta(task.url);
      if (!meta) return;

      if (meta.imageUrl) {
        meta.imageUrl = await downloadOgpImage(meta.imageUrl);
      }
      if (meta.faviconUrl) {
        meta.faviconUrl = await downloadFavicon(meta.faviconUrl);
      }

      task.block.ogp = meta;
    } else {
      const localPath = await downloadNotionImage(task.url);
      if (localPath) {
        task.block.localImageUrl = localPath;
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
