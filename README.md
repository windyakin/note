# notion-astro-blog

Notion を CMS として利用し、Astro (Vue) で静的ビルドして Cloudflare Pages にデプロイする短文ブログシステム。

## 特徴

- **Notion ブロック構造を忠実に再現** — Markdown 変換ではなく、Notion API のブロックデータをそのまま Vue コンポーネントでレンダリング
- **対応ブロックタイプ**: paragraph / heading / list / to_do / toggle / code / quote / callout / divider / image / video / bookmark / embed / link_preview / table / column_list / file / synced_block
- **リッチテキスト完全対応**: bold / italic / strikethrough / underline / inline code / color / link / mention / equation
- **Astro SSG** でビルド → Cloudflare Pages にデプロイ

---

## セットアップ

### 1. Notion Integration の作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「新しいインテグレーション」を作成し、**Internal Integration Token** を控える
3. 作成したインテグレーションに **コンテンツの読み取り** 権限があることを確認

### 2. Notion Database の準備

ブログ記事を管理するデータベースを作成し、以下のプロパティを設定する:

| プロパティ名 | タイプ       | 説明                    |
| ------------ | ------------ | ----------------------- |
| Title (Name) | Title        | 記事タイトル            |
| Slug         | Rich text    | URL スラッグ (例: `my-first-post`) |
| Published    | Checkbox     | 公開フラグ              |
| Date         | Date         | 公開日                  |
| Tags         | Multi-select | タグ                    |
| Description  | Rich text    | 記事の概要              |

> **重要**: データベースページの右上「…」メニューから「コネクションを追加」でインテグレーションを紐付けること。

データベース ID は URL から取得:
```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=...
                                  ^^^^^^^^^^^^
```

### 3. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# .env を作成
cp .env.example .env
# NOTION_TOKEN と NOTION_DATABASE_ID を設定

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

### 4. Cloudflare Pages へのデプロイ

#### 方法 A: Git 連携 (推奨)

1. リポジトリを GitHub / GitLab に push
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → 「プロジェクトを作成」
3. Git リポジトリを接続
4. ビルド設定:
   - **フレームワークプリセット**: Astro
   - **ビルドコマンド**: `npm run build`
   - **ビルド出力ディレクトリ**: `dist`
5. 環境変数に `NOTION_TOKEN` と `NOTION_DATABASE_ID` を追加
6. デプロイ

#### 方法 B: Wrangler CLI

```bash
npm install -g wrangler
wrangler pages deploy dist
```

---

## 記事の更新

Notion で記事を編集したあと、Cloudflare Pages のビルドを再トリガーすればサイトに反映される。

自動化する場合は以下のいずれかの方法が使える:

1. **Cloudflare Deploy Hook** — Cloudflare Pages の設定画面で Deploy Hook URL を発行し、Notion の Automation や外部サービス (Zapier / Make 等) から定期的に叩く
2. **GitHub Actions** — cron スケジュールで定期ビルドを実行
3. **Notion Webhook (サードパーティ)** — notion-webhook-proxy 等を使って変更検知→ビルドトリガー

### GitHub Actions の例 (1時間ごとにビルド)

```yaml
# .github/workflows/scheduled-build.yml
name: Scheduled Build
on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cloudflare Pages Deploy Hook
        run: curl -X POST "${{ secrets.CF_DEPLOY_HOOK_URL }}"
```

---

## カスタマイズ

### Bookmark ブロックのリッチ表示

デフォルトでは bookmark ブロックは URL のみ表示する。OGP 情報 (タイトル / 説明文 / 画像) を表示したい場合は、ビルド時に OGP を取得する処理を `src/lib/notion.ts` の `getBlocks()` 内に追加するか、別途 OGP フェッチ関数を作成して NotionRenderer 側で呼び出す方法がある。

### シンタックスハイライト

code ブロックにシンタックスハイライトを追加する場合は、[Shiki](https://shiki.style/) または [Prism.js](https://prismjs.com/) を導入し、`NotionRenderer.vue` の code ブロック部分にハイライト済み HTML を渡すとよい。

### ダークモード

CSS 変数で管理しているため、`@media (prefers-color-scheme: dark)` で変数を上書きすれば対応可能。

---

## プロジェクト構成

```
notion-astro-blog/
├── astro.config.mjs          # Astro 設定 (Vue 統合)
├── package.json
├── tsconfig.json
├── .env.example               # 環境変数テンプレート
├── public/
│   └── favicon.svg
└── src/
    ├── env.d.ts               # 型定義
    ├── lib/
    │   └── notion.ts          # Notion API クライアント
    ├── components/
    │   ├── NotionRenderer.vue  # ブロックレンダラー (再帰)
    │   └── RichText.vue        # リッチテキストレンダラー
    ├── layouts/
    │   └── Base.astro          # 共通レイアウト
    ├── pages/
    │   ├── index.astro         # 記事一覧
    │   └── posts/
    │       └── [slug].astro    # 記事詳細 (動的ルート)
    └── styles/
        └── global.css          # グローバルスタイル
```

## ライセンス

MIT
