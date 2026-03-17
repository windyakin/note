import type { Block } from "./notion";
import { fetchOgpMeta, downloadOgpImage } from "./ogp";

const CONCURRENCY_LIMIT = 5;

/**
 * bookmark / link_preview ブロックに OGP メタデータを付与する。
 * ブロック配列を in-place で変更して返す。
 */
export async function enrichBlocksWithOgp(blocks: Block[]): Promise<Block[]> {
  const targets: { block: Block; url: string }[] = [];
  collectOgpTargets(blocks, targets);

  if (targets.length === 0) return blocks;

  await processWithConcurrency(targets, CONCURRENCY_LIMIT, async ({ block, url }) => {
    const meta = await fetchOgpMeta(url);
    if (!meta) return;

    if (meta.imageUrl) {
      const localPath = await downloadOgpImage(meta.imageUrl);
      meta.imageUrl = localPath;
    }

    block.ogp = meta;
  });

  return blocks;
}

function collectOgpTargets(
  blocks: Block[],
  targets: { block: Block; url: string }[],
): void {
  for (const block of blocks) {
    if (block.type === "bookmark") {
      const url = (block as any).bookmark?.url;
      if (url) targets.push({ block, url });
    } else if (block.type === "link_preview") {
      const url = (block as any).link_preview?.url;
      if (url) targets.push({ block, url });
    }

    if (block.children) {
      collectOgpTargets(block.children, targets);
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
