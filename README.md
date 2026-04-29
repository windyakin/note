<p align="center">
  <img src="public/favicon.svg" width="120" height="120" alt="note" />
</p>

<h1 align="center">note</h1>

<p align="center">
  Notion を CMS として、Astro (Vue) で静的ビルドし Cloudflare Pages にデプロイする短文ブログ。
</p>

---

## 特徴

- **Notion ブロック構造をそのままレンダリング** — Markdown 変換を挟まず、Notion API のブロックデータを Vue コンポーネントで再帰的に描画する
- **ビルド時に外部リソースをローカル化** — bookmark / link_preview の OGP 取得、Notion 画像と OGP 画像のダウンロード ([src/lib/enrichBlocks.ts](src/lib/enrichBlocks.ts))
- **oEmbed エンドポイント** — 各記事の埋め込みメタデータを `/oembed/<id>.json` で配信
- **自動ビルドトリガー** — Notion DB の変更を検知して Cloudflare Pages のビルドを叩く Cloudflare Worker を同梱 ([worker/](worker/))

---

## セットアップ

### 1. Notion Integration の作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「新しいインテグレーション」を作成し、**Internal Integration Token** を控える
3. 作成したインテグレーションに **コンテンツの読み取り** 権限があることを確認

### 2. Notion Database の準備

ブログ記事を管理するデータベースを作成し、以下のプロパティを設定する:

プロパティ名 | タイプ | 説明
--- | --- | ---
Title | Title | 記事タイトル
Published | Checkbox | 公開フラグ
First published at | Date | 公開日 (一覧のソートキー)

`Last edited time` は Notion が自動付与するため設定不要。

データベース ID は URL から取得:

```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=...
                                  ^^^^^^^^^^^^
```

### 3. プロジェクトのセットアップ

```bash
npm install

# .env を作成
cp .env.example .env
# NOTION_TOKEN と NOTION_DATABASE_ID を設定
```

#### 開発サーバー

```bash
npm run dev
```

#### ビルドとプレビュー

```bash
npm run build
npm run preview
```

### 4. サイト情報の設定

サイト名 / 説明文 / 著者名は環境変数で上書きできる ([astro.config.mjs](astro.config.mjs))。

環境変数 | デフォルト値
--- | ---
`SITE_NAME` | `note`
`SITE_DESCRIPTION` | `Notionをブログのように公開するためのサイト`
`SITE_AUTHOR` | `author`

[astro.config.mjs](astro.config.mjs) の `site` には公開ドメインを設定する (canonical URL や OGP に使用)。

### 5. Cloudflare Pages へのデプロイ

1. リポジトリを GitHub に push
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → 「プロジェクトを作成」
3. Git リポジトリを接続
4. ビルド設定:
   - **フレームワークプリセット**: Astro
   - **ビルドコマンド**: `npm run build`
   - **ビルド出力ディレクトリ**: `dist`
5. 環境変数に `NOTION_TOKEN` / `NOTION_DATABASE_ID` を設定
6. デプロイ

---

## 記事の更新を自動でビルドに反映する

`worker/` 以下に Cloudflare Worker を同梱している。Cron Trigger (デフォルト 5 分間隔) で Notion DB を覗き、ページ集合か `last_edited_time` に差分があれば Pages の Deploy Hook を叩いてビルドを起動する。

詳細は [worker/README.md](worker/README.md) を参照。

---

## プロジェクト構成

```
note/
├── astro.config.mjs            # Astro 設定 (Vue 統合 / env スキーマ)
├── public/
│   ├── favicon.svg             # ロゴ兼ファビコン
│   └── ogp/                    # ビルド時にダウンロードした OGP 画像置き場
├── src/
│   ├── site.ts                 # 環境変数からサイト情報を再エクスポート
│   ├── lib/
│   │   ├── notion.ts           # Notion API クライアント (一覧/ページ/ブロック取得)
│   │   ├── enrichBlocks.ts     # bookmark/link_preview の OGP 取得 + 画像ダウンロード
│   │   └── ogp.ts              # OGP メタデータ取得・画像処理 (cheerio + sharp)
│   ├── components/
│   │   ├── NotionRenderer.vue  # ブロックレンダラー (再帰)
│   │   ├── RichText.vue        # リッチテキストレンダラー
│   │   ├── SiteHeader.astro    # サイト共通ヘッダー
│   │   ├── PostHeader.astro    # 記事メタ表示
│   │   └── blocks/             # ブロック種別ごとのコンポーネント
│   ├── layouts/
│   │   └── Base.astro          # 共通レイアウト (head / OGP / oEmbed link)
│   ├── pages/
│   │   ├── [...page].astro     # 記事一覧 (10 件ごとページネーション)
│   │   ├── posts/[id].astro    # 記事詳細 (Notion page id をそのまま URL に使用)
│   │   └── oembed/[id].json.ts # oEmbed エンドポイント
│   └── styles/
│       └── global.css          # グローバルスタイル (Bootstrap 5.3 ベース)
└── worker/                     # 自動ビルドトリガー用 Cloudflare Worker
```

## ライセンス

MIT
