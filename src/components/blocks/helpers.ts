import type { Block, RichText as RichTextType } from "@/lib/notion";

/** ブロックから rich_text を取り出す汎用ヘルパー */
export function getRichText(block: Block): RichTextType[] {
  const data = (block as Record<string, any>)[block.type];
  return data?.rich_text ?? [];
}

/** ブロックからキャプションを取り出す */
export function getCaption(block: Block): RichTextType[] {
  const data = (block as any)[block.type];
  return data?.caption ?? [];
}

/** file / image / video 系のメディア URL を取り出す */
export function getMediaUrl(block: Block): string {
  const data = (block as any)[block.type];
  if (!data) return "";
  if (data.type === "external") return data.external?.url ?? "";
  if (data.type === "file") return data.file?.url ?? "";
  return "";
}
