interface Env {
  NOTE_STATE: KVNamespace;
  NOTION_TOKEN: string;
  NOTION_DATABASE_ID: string;
  DEPLOY_HOOK_URL: string;
  TRIGGER_TOKEN?: string;
}

const NOTION_VERSION = "2022-06-28";
const KV_KEY = "lastHash";

interface NotionPage {
  id: string;
  last_edited_time: string;
}

interface QueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

async function fetchAllPublishedPages(
  token: string,
  databaseId: string,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filter: { property: "Published", checkbox: { equals: true } },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      throw new Error(`Notion API ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as QueryResponse;
    for (const r of data.results) {
      pages.push({ id: r.id, last_edited_time: r.last_edited_time });
    }
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function hashPages(pages: NotionPage[]): Promise<string> {
  const sorted = [...pages].sort((a, b) => a.id.localeCompare(b.id));
  const text = sorted.map((p) => `${p.id}:${p.last_edited_time}`).join("\n");
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkAndTrigger(env: Env): Promise<void> {
  const pages = await fetchAllPublishedPages(
    env.NOTION_TOKEN,
    env.NOTION_DATABASE_ID,
  );
  const currentHash = await hashPages(pages);
  const previousHash = await env.NOTE_STATE.get(KV_KEY);

  if (currentHash === previousHash) {
    console.log(
      `No changes (${pages.length} pages, hash=${currentHash.slice(0, 8)})`,
    );
    return;
  }

  console.log(
    `Change detected: ${previousHash?.slice(0, 8) ?? "none"} → ${currentHash.slice(0, 8)} (${pages.length} pages)`,
  );

  const res = await fetch(env.DEPLOY_HOOK_URL, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Deploy hook failed ${res.status}: ${await res.text()}`);
  }

  await env.NOTE_STATE.put(KV_KEY, currentHash);
  console.log("Deploy hook triggered, hash updated");
}

function isAuthorized(req: Request, expected: string | undefined): boolean {
  if (!expected) return true;

  const auth = req.headers.get("Authorization");
  const presented = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!presented || presented.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(checkAndTrigger(env));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    if (!isAuthorized(req, env.TRIGGER_TOKEN)) {
      return new Response("Unauthorized\n", { status: 401 });
    }
    try {
      await checkAndTrigger(env);
      return new Response("OK\n", { status: 200 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      return new Response(`Error: ${msg}\n`, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
