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
        "User-Agent": "bot (notion-astro-blog OGP fetcher)",
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
// OG画像ダウンロード + sharp 再エンコード
// ---------------------------------------------------------------------------

export async function downloadOgpImage(
  imageUrl: string,
): Promise<string | null> {
  try {
    const hash = createHash("sha256").update(imageUrl).digest("hex").slice(0, 16);
    const filename = `${hash}.webp`;
    const localPath = join(OGP_IMAGE_DIR, filename);
    const publicPath = `${OGP_IMAGE_PUBLIC_PATH}/${filename}`;

    const distPath = join(OGP_DIST_DIR, filename);

    // キャッシュ: 既にダウンロード済みならスキップ (dist にもコピー)
    try {
      await access(localPath);
      await mkdir(OGP_DIST_DIR, { recursive: true });
      await writeFile(distPath, await readFile(localPath));
      return publicPath;
    } catch {
      // ファイルなし → ダウンロード続行
    }

    await mkdir(OGP_IMAGE_DIR, { recursive: true });
    await mkdir(OGP_DIST_DIR, { recursive: true });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "bot (notion-astro-blog OGP fetcher)" },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    // Content-Type が image/* であることを検証
    const ct = response.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_SIZE) return null;

    // sharp で WebP に再エンコード
    // - 有効な画像でなければ例外が発生 → 悪意あるバイナリを排除
    // - EXIF やメタデータも除去される
    // - ポリグロットファイルも無害化される
    const webpBuffer = await sharp(buffer)
      .resize(1200, 630, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await writeFile(localPath, webpBuffer);
    await writeFile(distPath, webpBuffer);
    return publicPath;
  } catch {
    return null;
  }
}
