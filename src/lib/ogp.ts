import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OgpMeta {
  title: string | null;
  description: string | null;
  siteName: string | null;
  /** ローカルパス (例: "/ogp/abc123.webp") */
  imageUrl: string | null;
  /** Favicon URL (外部リンク) */
  faviconUrl: string | null;
  /** 元の URL */
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OGP_IMAGE_DIR = "public/ogp";
const OGP_DIST_DIR = "dist/ogp";
const OGP_IMAGE_PUBLIC_PATH = "/ogp";
const NOTION_IMAGE_DIR = "public/notion-images";
const NOTION_IMAGE_DIST_DIR = "dist/notion-images";
const NOTION_IMAGE_PUBLIC_PATH = "/notion-images";
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
        "User-Agent": " Mozilla/5.0 (compatible; Googlebot/2.1; +https://www.google.com/bot.html)",
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
// 共通: 画像ダウンロード + sharp 再エンコード + 保存
// ---------------------------------------------------------------------------

interface DownloadImageOptions {
  url: string;
  publicDir: string;
  distDir: string;
  publicPath: string;
  filename: string;
  transform: (input: sharp.Sharp) => sharp.Sharp;
}

/** dist/ へのコピーはベストエフォート (dev 時は不要、build 時のみ有効) */
async function copyToDist(distDir: string, distPath: string, data: Buffer): Promise<void> {
  try {
    await mkdir(distDir, { recursive: true });
    await writeFile(distPath, data);
  } catch {
    // dist 書き込み失敗は無視 (dev モード等)
  }
}

async function downloadAndSaveImage(
  opts: DownloadImageOptions,
): Promise<string | null> {
  const localPath = join(opts.publicDir, opts.filename);
  const distPath = join(opts.distDir, opts.filename);
  const publicUrl = `${opts.publicPath}/${opts.filename}`;

  // キャッシュ: 既にダウンロード済みならスキップ
  try {
    await access(localPath);
    // dist にもコピー (ベストエフォート)
    await copyToDist(opts.distDir, distPath, await readFile(localPath));
    return publicUrl;
  } catch {
    // ファイルなし → ダウンロード続行
  }

  await mkdir(opts.publicDir, { recursive: true });

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
  await copyToDist(opts.distDir, distPath, output);
  return publicUrl;
}

/**
 * URL からキャッシュキーとなるハッシュを生成する。
 * Notion の S3 署名付き URL はリクエストごとにクエリパラメータ
 * (X-Amz-Signature 等) が変わるため、パス部分のみをハッシュする。
 */
function hashUrl(url: string): string {
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
      publicDir: OGP_IMAGE_DIR,
      distDir: OGP_DIST_DIR,
      publicPath: OGP_IMAGE_PUBLIC_PATH,
      filename: `${hashUrl(imageUrl)}.webp`,
      transform: (s) =>
        s.resize(1200, 630, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 }),
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Favicon ダウンロード (PNG, 32x32)
// SVG も sharp (librsvg) でラスタライズされるため安全
// ---------------------------------------------------------------------------

export async function downloadFavicon(
  faviconUrl: string,
): Promise<string | null> {
  try {
    return await downloadAndSaveImage({
      url: faviconUrl,
      publicDir: OGP_IMAGE_DIR,
      distDir: OGP_DIST_DIR,
      publicPath: OGP_IMAGE_PUBLIC_PATH,
      filename: `favicon-${hashUrl(faviconUrl)}.png`,
      transform: (s) =>
        s.resize(32, 32, { fit: "cover" })
          .png(),
    });
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
      publicDir: NOTION_IMAGE_DIR,
      distDir: NOTION_IMAGE_DIST_DIR,
      publicPath: NOTION_IMAGE_PUBLIC_PATH,
      filename: `${hashUrl(imageUrl)}.webp`,
      transform: (s) =>
        s.resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 }),
    });
  } catch {
    return null;
  }
}
