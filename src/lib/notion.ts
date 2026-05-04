import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { OgpMeta } from "./ogp";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });
const databaseId = import.meta.env.NOTION_DATABASE_ID;

// ---------------------------------------------------------------------------
// Types (re-export + helpers)
// ---------------------------------------------------------------------------

export type Block = BlockObjectResponse & {
  children?: Block[];
  ogp?: OgpMeta;
  /** ビルド時にダウンロードされたローカル画像パス */
  localImageUrl?: string;
};
export type RichText = RichTextItemResponse;
export type Page = PageObjectResponse;

export interface PostTag {
  name: string;
  color: string;
}

export interface PostMeta {
  id: string;
  title: string;
  firstPublishedAt: string;
  lastEditedAt: string;
  tags: PostTag[];
}

// ---------------------------------------------------------------------------
// Database → 記事一覧
// ---------------------------------------------------------------------------

/**
 * 公開済み記事を取得する。
 *
 * Notion DB に以下のプロパティを想定:
 *   - Title              (title)    : 記事タイトル
 *   - Published          (checkbox) : 公開フラグ
 *   - First published at (date)     : 公開日（未入力なら last_edited_time にフォールバック）
 *   - Last edited time              : 最終更新日時（自動）
 *
 * 注: First published at は未公開ページでは空のことがあるため、
 *     Notion 側でソートせず取得後に firstPublishedAt で降順ソートする。
 */
export async function getPublishedPosts(): Promise<PostMeta[]> {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Published",
      checkbox: { equals: true },
    },
  });

  return response.results
    .filter((p): p is PageObjectResponse => "properties" in p)
    .map(pageToMeta)
    .sort((a, b) => b.firstPublishedAt.localeCompare(a.firstPublishedAt));
}

/**
 * 公開済み記事をブロック付きで取得する（一覧ページ用）。
 */
export async function getPublishedPostsWithBlocks(): Promise<
  { meta: PostMeta; blocks: Block[] }[]
> {
  const posts = await getPublishedPosts();

  return Promise.all(
    posts.map(async (meta) => {
      const blocks = await getBlocks(meta.id);
      return { meta, blocks };
    })
  );
}

// ---------------------------------------------------------------------------
// Page → メタ情報
// ---------------------------------------------------------------------------

function pageToMeta(page: PageObjectResponse): PostMeta {
  const props = page.properties;
  const title = extractTitle(props.Title ?? props.Name);
  const firstPublishedAt =
    extractDate(props["First published at"]) ?? page.last_edited_time;
  return {
    id: page.id,
    title,
    firstPublishedAt,
    lastEditedAt: page.last_edited_time,
    tags: extractMultiSelect(props.Tags),
  };
}

// ---------------------------------------------------------------------------
// Blocks → 再帰取得
// ---------------------------------------------------------------------------

export async function getBlocks(blockId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let cursor: string | undefined;

  // ページネーション対応
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if (!("type" in block)) continue;
      const b = block as Block;

      // 子ブロックがある場合は再帰的に取得
      if (b.has_children) {
        b.children = await getBlocks(b.id);
      }

      blocks.push(b);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

// ---------------------------------------------------------------------------
// 単一ページ取得
// ---------------------------------------------------------------------------

export async function getPage(pageId: string): Promise<Page> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return page as Page;
}

// ---------------------------------------------------------------------------
// Page ID → 記事取得
// ---------------------------------------------------------------------------

export async function getPageById(
  pageId: string
): Promise<{ meta: PostMeta; blocks: Block[] } | null> {
  const page = await getPage(pageId);
  const props = page.properties;

  // Published チェック
  const published = props.Published;
  if (
    !published ||
    typeof published !== "object" ||
    !("checkbox" in published) ||
    !(published as { checkbox: boolean }).checkbox
  ) {
    return null;
  }

  const meta = pageToMeta(page);
  const blocks = await getBlocks(page.id);

  return { meta, blocks };
}

// ---------------------------------------------------------------------------
// Blocks → divider で分割
// ---------------------------------------------------------------------------

/**
 * 最初の divider ブロックより前のブロックを返す。
 * divider が無い場合は全ブロックを返す。
 */
export function getBlocksBeforeDivider(blocks: Block[]): Block[] {
  const idx = blocks.findIndex((b) => b.type === "divider");
  return idx === -1 ? blocks : blocks.slice(0, idx);
}

// ---------------------------------------------------------------------------
// Property Extractors
// ---------------------------------------------------------------------------

/**
 * ブロック配列からプレーンテキストを抽出し、指定文字数で切り詰める。
 */
export function extractTextFromBlocks(blocks: Block[], maxLength = 200): string {
  const textParts: string[] = [];

  for (const block of blocks) {
    const data = block[block.type as keyof typeof block] as
      | { rich_text?: RichText[] }
      | undefined;
    if (data?.rich_text) {
      const text = data.rich_text.map((t) => t.plain_text).join("");
      if (text) textParts.push(text);
    }
    if (textParts.join(" ").length >= maxLength) break;
  }

  const joined = textParts.join(" ");
  return joined.length > maxLength
    ? joined.slice(0, maxLength) + "…"
    : joined;
}

function extractTitle(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as Record<string, unknown>;
  if (p.type === "title" && Array.isArray(p.title)) {
    return (p.title as RichText[]).map((t) => t.plain_text).join("");
  }
  return "";
}

function extractDate(prop: unknown): string | null {
  if (!prop || typeof prop !== "object") return null;
  const p = prop as Record<string, unknown>;
  if (p.type !== "date" || !p.date || typeof p.date !== "object") return null;
  const d = p.date as { start?: string };
  return d.start ?? null;
}

function extractMultiSelect(prop: unknown): PostTag[] {
  if (!prop || typeof prop !== "object") return [];
  const p = prop as Record<string, unknown>;
  if (p.type !== "multi_select" || !Array.isArray(p.multi_select)) return [];
  return (p.multi_select as { name: string; color: string }[]).map((item) => ({
    name: item.name,
    color: item.color,
  }));
}
