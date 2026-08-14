import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { writeFile, readFile, mkdir, stat, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OgpMeta {
  title: string | null;
  description: string | null;
  siteName: string | null;
  /** 画像 URL (ローカル相対パス or CDN 絶対 URL、`?t=mtime` 付き) */
  imageUrl: string | null;
  /** Favicon URL (同上) */
  faviconUrl: string | null;
  /** 元の URL */
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PUBLIC_DIR = "public";
const DIST_DIR = "dist";
export const OGP_META_DIR = "public/ogp/meta";
export const MEDIA_CACHE_DIRTY_LIST = ".media-cache-dirty";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// ---------------------------------------------------------------------------
// OGP メタデータ取得
// ---------------------------------------------------------------------------

export async function fetchOgpMeta(url: string): Promise<OgpMeta | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }

    const html = await response.text();
    if (html.length > MAX_HTML_SIZE) return null;

    return parseOgpFromHtml(html, url);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML パース
// ---------------------------------------------------------------------------

function parseOgpFromHtml(html: string, sourceUrl: string): OgpMeta {
  const $ = cheerio.load(html);

  const getMeta = (property: string): string | null => {
    const content =
      $(`meta[property="${property}"]`).attr("content") ??
      $(`meta[name="${property}"]`).attr("content") ??
      null;
    return content?.trim() || null;
  };

  const title = getMeta("og:title") ?? ($("title").text().trim() || null);
  const description = getMeta("og:description") ?? getMeta("description");
  const siteName = getMeta("og:site_name");
  const rawImageUrl = getMeta("og:image");
  const faviconUrl = resolveFaviconUrl($, sourceUrl);

  let resolvedImageUrl: string | null = null;
  if (rawImageUrl) {
    try {
      resolvedImageUrl = new URL(rawImageUrl, sourceUrl).href;
    } catch {
      resolvedImageUrl = rawImageUrl;
    }
  }

  return {
    title,
    description,
    siteName,
    imageUrl: resolvedImageUrl,
    faviconUrl,
    url: sourceUrl,
  };
}

function resolveFaviconUrl(
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): string | null {
  const iconLink =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    $('link[rel="apple-touch-icon"]').attr("href");

  if (!iconLink) {
    try {
      const u = new URL(sourceUrl);
      return `${u.origin}/favicon.ico`;
    } catch {
      return null;
    }
  }

  try {
    return new URL(iconLink, sourceUrl).href;
  } catch {
    return iconLink;
  }
}

// ---------------------------------------------------------------------------
// メディアキャッシュ
// ---------------------------------------------------------------------------

/** CDN モード判定 (本番ビルド + S3_PUBLIC_BASE_URL 設定) */
function isCdnMode(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    !!process.env.S3_PUBLIC_BASE_URL?.trim()
  );
}

function cdnBaseUrl(): string {
  return (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
}

/** `.media-cache-dirty` に objectKey を追記する。失敗は無視 */
export async function recordMediaCacheEntry(objectKey: string): Promise<void> {
  try {
    await appendFile(MEDIA_CACHE_DIRTY_LIST, `${objectKey}\n`);
  } catch {
    // 記録失敗は致命的でないので無視
  }
}

interface DownloadImageOptions {
  url: string;
  /** R2 オブジェクトキー兼 `public/` 相対パス (例: `ogp/abc.webp`, `notion-images/def.webp`) */
  objectKey: string;
  transform: (input: sharp.Sharp) => sharp.Sharp;
}

/** dist/ へのコピーはベストエフォート (dev 時は不要、build 時のみ有効) */
async function copyToDist(distPath: string, data: Buffer): Promise<void> {
  try {
    await mkdir(dirname(distPath), { recursive: true });
    await writeFile(distPath, data);
  } catch {
    // dist 書き込み失敗は無視 (dev モード等)
  }
}

async function buildPublicUrl(
  objectKey: string,
  localPath: string,
): Promise<string> {
  const base = isCdnMode() ? `${cdnBaseUrl()}/${objectKey}` : `/${objectKey}`;
  try {
    const s = await stat(localPath);
    return `${base}?t=${Math.floor(s.mtimeMs)}`;
  } catch {
    return base;
  }
}

async function downloadAndSaveImage(
  opts: DownloadImageOptions,
): Promise<string | null> {
  const localPath = join(PUBLIC_DIR, opts.objectKey);
  const distPath = join(DIST_DIR, opts.objectKey);
  const cdn = isCdnMode();

  // キャッシュ: 既にダウンロード済みならスキップ
  try {
    const cached = await readFile(localPath);
    if (!cdn) await copyToDist(distPath, cached);
    return await buildPublicUrl(opts.objectKey, localPath);
  } catch {
    // ファイルなし → ダウンロード続行
  }

  await mkdir(dirname(localPath), { recursive: true });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(opts.url, {
    signal: controller.signal,
    headers: { "User-Agent": "bot (notion-astro-blog OGP fetcher)" },
  });
  clearTimeout(timeoutId);

  if (!response.ok) return null;

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) return null;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_SIZE) return null;

  // sharp で再エンコード
  // - 有効な画像でなければ例外が発生 → 悪意あるバイナリを排除
  // - EXIF やメタデータも除去される
  // - SVG は librsvg でラスタライズされ、スクリプトは除去される
  const output = await opts.transform(sharp(buffer)).toBuffer();

  await writeFile(localPath, output);
  if (!cdn) await copyToDist(distPath, output);
  await recordMediaCacheEntry(opts.objectKey);
  return await buildPublicUrl(opts.objectKey, localPath);
}

/**
 * URL からキャッシュキーとなるハッシュを生成する。
 * Notion の S3 署名付き URL はリクエストごとにクエリパラメータ
 * (X-Amz-Signature 等) が変わるため、パス部分のみをハッシュする。
 */
export function hashUrl(url: string): string {
  try {
    const u = new URL(url);
    // origin + pathname のみ (クエリ・フラグメント除外)
    return createHash("sha256")
      .update(`${u.origin}${u.pathname}`)
      .digest("hex")
      .slice(0, 16);
  } catch {
    return createHash("sha256").update(url).digest("hex").slice(0, 16);
  }
}

// ---------------------------------------------------------------------------
// OG画像ダウンロード (WebP, max 1200x630)
// ---------------------------------------------------------------------------

export async function downloadOgpImage(
  imageUrl: string,
): Promise<string | null> {
  try {
    return await downloadAndSaveImage({
      url: imageUrl,
      objectKey: `ogp/${hashUrl(imageUrl)}.webp`,
      transform: (s) =>
        s.resize(1200, 630, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Favicon ダウンロード (WebP, 32x32)
// SVG も sharp (librsvg) でラスタライズされるため安全
// ---------------------------------------------------------------------------

export async function downloadFavicon(
  faviconUrl: string,
): Promise<string | null> {
  try {
    return await downloadAndSaveImage({
      url: faviconUrl,
      objectKey: `ogp/favicon-${hashUrl(faviconUrl)}.webp`,
      transform: (s) =>
        s.resize(32, 32, { fit: "cover" })
          .webp({ quality: 80 }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ページURLから favicon URL を解決する
// ---------------------------------------------------------------------------

export async function fetchFaviconUrl(pageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return fallbackFaviconUrl(pageUrl);
    }

    const html = await response.text();
    if (html.length > MAX_HTML_SIZE) return fallbackFaviconUrl(pageUrl);

    const $ = cheerio.load(html);
    return resolveFaviconUrl($, pageUrl);
  } catch {
    return fallbackFaviconUrl(pageUrl);
  }
}

function fallbackFaviconUrl(pageUrl: string): string | null {
  try {
    return `${new URL(pageUrl).origin}/favicon.ico`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 記事中の画像ダウンロード (WebP, 高品質)
// ---------------------------------------------------------------------------

export async function downloadNotionImage(
  imageUrl: string,
): Promise<string | null> {
  try {
    return await downloadAndSaveImage({
      url: imageUrl,
      objectKey: `notion-images/${hashUrl(imageUrl)}.webp`,
      transform: (s) =>
        s.resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// OGP 用 JPEG 画像ダウンロード
// WebP を認識しないクローラー向けに JPEG で提供する
// ---------------------------------------------------------------------------

export async function downloadNotionImageForOgp(
  imageUrl: string,
): Promise<string | null> {
  try {
    return await downloadAndSaveImage({
      url: imageUrl,
      objectKey: `notion-images/${hashUrl(imageUrl)}-ogp.jpg`,
      transform: (s) =>
        s.resize(1200, 630, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 }),
    });
  } catch {
    return null;
  }
}

