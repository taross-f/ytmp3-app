interface CloudflareLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Cloudflare Pages用カスタム画像ローダー
 * Cloudflareのイメージ最適化APIを使用して画像を提供します
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality = 75,
}: CloudflareLoaderParams): string {
  // img.youtube.comなどの外部ドメインの画像URLはそのまま返す
  if (src.startsWith("http")) {
    return src;
  }

  // Cloudflareの画像最適化パラメータを設定
  const params = [`width=${width}`, `quality=${quality}`, "format=auto"];

  // プロジェクトがデプロイされるCloudflare Pagesドメインを動的に取得
  // 本番環境ではCF_PAGESが設定される
  const domain = process.env.CF_PAGES
    ? `https://${process.env.CF_PAGES_URL}`
    : "http://localhost:3000";

  // 最終的な画像URLを構築して返す
  return `${domain}/cdn-cgi/image/${params.join(",")}${
    src.startsWith("/") ? src : `/${src}`
  }`;
}
