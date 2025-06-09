# Cloudflare Pages 設定ガイド

このドキュメントでは、このプロジェクトをCloudflare Pagesにデプロイする方法について説明します。

## 1. Cloudflareアカウントの準備

まだアカウントをお持ちでない場合は、[Cloudflare](https://dash.cloudflare.com/sign-up)でアカウントを作成します。

## 2. Pagesプロジェクトの作成

### GitHubとの連携（推奨）

1. [Cloudflareダッシュボード](https://dash.cloudflare.com)にログイン
2. 左側のナビゲーションから「Pages」を選択
3. 「Create a project」ボタンをクリック
4. 「Connect to Git」を選択し、GitHubアカウントと連携
5. リポジトリを選択
6. 以下のビルド設定を構成:
   - **Project name**: 任意のプロジェクト名
   - **Production branch**: `main`（またはデフォルトブランチ）
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next/standalone`
   - **Root directory**: `/` (デフォルト)
   - **Environment variables**: 必要に応じて環境変数を設定
7. 「Save and Deploy」をクリック

### GitHub Actionsとの連携

このリポジトリにはすでに `.github/workflows/cloudflare-pages-deploy.yml` が含まれており、GitHub ActionsでのCI/CDが設定されています。この方法を利用するには、以下の手順に従ってください：

1. GitHubリポジトリの「Settings」 > 「Secrets and variables」 > 「Actions」に移動
2. 以下のシークレットを追加:
   - `CLOUDFLARE_API_TOKEN`: Cloudflare APIトークン
   - `CLOUDFLARE_ACCOUNT_ID`: CloudflareアカウントID

詳細な設定手順については `.github/CLOUDFLARE_SETUP.md` を参照してください。

## 3. カスタムドメインの設定

1. Cloudflare Pagesプロジェクトダッシュボードに移動
2. 「Custom domains」タブをクリック
3. 「Set up a custom domain」ボタンをクリック
4. 使用するドメインを入力
5. 画面の指示に従って設定を完了

## 4. 環境変数の設定

アプリケーションが必要とする環境変数を設定します:

1. Cloudflare Pagesプロジェクトダッシュボードに移動
2. 「Settings」 > 「Environment variables」に移動
3. 「Production」と「Preview」の両方に必要な環境変数を追加:
   - `NODE_VERSION`: `19`
   - その他アプリに必要な環境変数

## 5. Cloudflareサービスとの統合（オプション）

### KVストア（必要な場合）

1. Cloudflareダッシュボードで「Workers & Pages」 > 「KV」に移動
2. 「Create a namespace」をクリック
3. 名前を入力（例: `youtube_mp3_data`）
4. wrangler.tomlに以下を追加:

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "<namespace_id>"
```

### R2ストレージ（MP3ファイル保存用）

1. Cloudflareダッシュボードで「R2」 > 「Create bucket」に移動
2. バケット名を入力（例: `youtube-mp3-files`）
3. wrangler.tomlに以下を追加:

```toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "youtube-mp3-files"
```

## 6. ローカル開発

ローカル開発環境でCloudflareのサービス（KV、R2など）を使用する場合:

```bash
# Cloudflare Dev Platform機能を有効にしたローカル開発サーバーを起動
bun run pages:dev
```

## 7. トラブルシューティング

- **デプロイエラー**: ビルド出力とログを確認
- **ランタイムエラー**: Cloudflare Pages関数のログを確認
- **Node.js APIの互換性**: `wrangler.toml`で`nodejs_compat`フラグが有効になっていることを確認
- **画像最適化の問題**: カスタムローダーの設定を確認 