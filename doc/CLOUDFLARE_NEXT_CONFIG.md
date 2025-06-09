# Next.js設定 - Cloudflare Pages対応

このドキュメントでは、Cloudflare Pagesで最適に動作するために行ったNext.js設定の変更点について説明します。

## 主な変更点

### 1. Cloudflare Dev Platform統合

```typescript
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// 開発環境の場合はCloudflare Dev Platformをセットアップ
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}
```

- `@cloudflare/next-on-pages/next-dev`からimportした`setupDevPlatform`関数を使用
- 開発環境でCloudflare Dev Platformを設定（KV、D1、R2などのCloudflareサービスにローカル開発環境からアクセス可能に）

### 2. Standalone出力設定

```typescript
output: "standalone",
```

- `standalone`出力モードを使用して、最小限の依存関係で実行可能な出力を生成
- Cloudflare Pagesにデプロイするためのサイズ最適化と互換性確保

### 3. 画像最適化

```typescript
images: {
  domains: ["img.youtube.com"],
  // Cloudflare Pages用の画像ローダー設定
  loader: "custom",
  loaderFile: "./lib/cloudflare-image-loader.ts",
},
```

- カスタム画像ローダーを使用してCloudflareの画像最適化機能を活用
- 外部ドメイン（例：YouTube）からの画像読み込みを許可
- 最適化された画像を提供するためのCloudflare CDN機能の利用

### 4. サーバーコンポーネント設定

```typescript
experimental: {
  serverComponentsExternalPackages: [],
},
```

- サーバーコンポーネントで使用する外部パッケージを指定可能
- 現在は空の配列として設定

## カスタム画像ローダー（lib/cloudflare-image-loader.ts）

カスタム画像ローダーはCloudflareの画像最適化APIを使用して画像を提供します：

```typescript
// CloudflareのImage Resizingを利用した画像最適化
const params = [`width=${width}`, `quality=${quality}`, "format=auto"];
return `${domain}/cdn-cgi/image/${params.join(",")}${src.startsWith("/") ? src : `/${src}`}`;
```

- `format=auto` - ブラウザがサポートする最適なフォーマット（WebP、AVIFなど）を自動選択
- 幅と品質を指定することでレスポンシブ画像の最適化をサポート
- 外部URLはそのまま使用し、内部画像のみ最適化

## パッケージスクリプトの追加

package.jsonに以下のスクリプトを追加：

```json
"pages:build": "npx @cloudflare/next-on-pages",
"pages:dev": "npx wrangler pages dev --compatibility-date=2024-01-01 -- bun run dev",
"pages:deploy": "bun run pages:build && npx wrangler pages deploy .vercel/output/static"
```

- `pages:build` - Next.jsアプリをビルドし、Cloudflare Pages形式に変換
- `pages:dev` - Cloudflare Wranglerを使用したローカル開発環境の起動
- `pages:deploy` - Cloudflare Pagesへのデプロイを実行

## 注意事項

1. Cloudflare Pagesでは一部のNode.js APIが制限される場合があります
2. `nodejs_compat` フラグを使用することで、より多くのNode.js APIが利用可能になります（wrangler.tomlで設定）
3. Edge Runtimeを使用する場合、一部のサードパーティライブラリに互換性の問題が生じる可能性があります
4. 画像最適化はCloudflareの`/cdn-cgi/image`エンドポイントを利用しています 