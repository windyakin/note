# note-rebuild-trigger

Notion DB の変更を検知して Cloudflare Pages のビルドを自動で走らせる Cloudflare Worker。

## 何をするか

1. **Cron Trigger** (5分ごと) または **HTTP リクエスト** で起動する
2. Notion DB から `Published=true` の全ページを取得し、`{id, last_edited_time}` の一覧を作る
3. 一覧を id でソートして SHA-256 でハッシュ化
4. KV に保存した前回のハッシュと比較
5. 一致すれば何もしない。差分があれば Pages の Deploy Hook を POST で叩いてビルドを起動
6. Deploy Hook が **200 を返したときだけ** KV のハッシュを更新する (失敗時は次回の cron で再試行)

ハッシュ方式なので、新規追加・編集・archive・削除・`Published` フラグ off など、ページ集合に影響する変更は全て検知できる。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `src/index.ts` | Worker 本体 (`scheduled` / `fetch` ハンドラ) |
| `wrangler.toml` | Cron 設定・KV binding・compatibility_date |
| `package.json` | wrangler / 型定義の devDependencies |

## 必要な設定

### KV Namespace

`wrangler.toml` の `[[kv_namespaces]]` で `binding = "NOTE_STATE"` を割り当て済み。新規セットアップ時は以下で作成し、出力された id を `wrangler.toml` に貼る。

```bash
npx wrangler kv namespace create NOTE_STATE
```

### シークレット

```bash
npx wrangler secret put NOTION_TOKEN          # Notion Integration token
npx wrangler secret put NOTION_DATABASE_ID    # 監視対象の Notion DB ID
npx wrangler secret put DEPLOY_HOOK_URL       # Pages の Deploy Hook URL
npx wrangler secret put TRIGGER_TOKEN         # 任意。設定時のみ HTTP 経由の認証が有効になる
```

`TRIGGER_TOKEN` は省略可能。

- **未設定**: `fetch` ハンドラは認証なしで誰でも叩ける状態 (連打されると Notion API rate limit を消費する点に注意)
- **設定時**: `Authorization: Bearer <token>` ヘッダ必須。タイミング攻撃耐性のため定数時間で比較

## デプロイ

```bash
cd worker
npm install
npx wrangler deploy
```

## 使い方

### Cron による自動実行

`wrangler.toml` の `crons = ["*/5 * * * *"]` で5分間隔。間隔を変える場合はここを編集して再デプロイ。

### HTTP による手動実行

```bash
# トークン未設定時
curl https://note-rebuild-trigger.<account>.workers.dev/

# トークン設定時
curl -H "Authorization: Bearer <TRIGGER_TOKEN>" \
  https://note-rebuild-trigger.<account>.workers.dev/
```

レスポンス:

- `200 OK` — 実行成功 (差分があってビルドを叩いた場合も、差分が無く何もしなかった場合も同じ)
- `401 Unauthorized` — トークン不一致
- `500 Error: …` — Notion API か Deploy Hook が失敗

## ローカル開発

```bash
npx wrangler dev --test-scheduled
# 別シェルから cron を即実行
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"
# fetch ハンドラを叩く
curl http://localhost:8787/
```

ローカルでシークレットを使う場合は `.dev.vars` に `KEY=value` 形式で書く (gitignore 済み)。

## ログ

```bash
npx wrangler tail
```

`wrangler.toml` で `[observability] enabled = true` にしているため、Cloudflare ダッシュボード上でも履歴が確認できる。

## 監視対象 DB の前提

`getPublishedPosts` ([../src/lib/notion.ts](../src/lib/notion.ts)) と同じく、以下のプロパティを持つ Notion DB を想定している:

- `Published` (checkbox) — `true` のページだけが取得対象
- `Last edited time` (Notion 自動付与) — 変更検知に使用

`Published` の名前や型を変えた場合は、Worker 側 ([src/index.ts:32](src/index.ts#L32)) のフィルタも合わせて修正が必要。
