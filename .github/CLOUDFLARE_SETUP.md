# Cloudflare Pages デプロイ設定手順

このドキュメントでは、GitHub ActionsからCloudflare Pagesにデプロイするために必要なシークレットの設定方法について説明します。

## 必要なシークレット

GitHubリポジトリに以下のシークレットを設定する必要があります：

1. `CLOUDFLARE_API_TOKEN` - Cloudflare APIトークン
2. `CLOUDFLARE_ACCOUNT_ID` - CloudflareアカウントID

## Cloudflare API Tokenの取得方法

1. Cloudflareダッシュボードにログイン（https://dash.cloudflare.com）
2. 右上のプロフィールアイコンをクリックし、「My Profile」を選択
3. 左サイドバーの「API Tokens」を選択
4. 「Create Token」ボタンをクリック
5. 「Edit Cloudflare Workers」テンプレートを選択するか、カスタムトークンを作成
6. カスタムトークンを作成する場合は、以下の権限を設定：
   - Account > Cloudflare Pages > Edit
   - Account > Account Settings > Read
7. 必要に応じて、特定のリソースに制限を設定
8. 「Continue to summary」をクリックし、「Create Token」で完了
9. 表示されたトークンをコピー（このトークンは一度しか表示されないので注意）

## Cloudflare Account IDの取得方法

1. Cloudflareダッシュボードにログイン
2. ダッシュボードのURLで確認できます：
   - 例: `https://dash.cloudflare.com/12345abcdef12345abcdef12345abcde`
   - この例では、`12345abcdef12345abcdef12345abcde`がアカウントIDです
3. または、Cloudflareダッシュボードの「Workers & Pages」ページの右サイドバーで確認可能

## GitHubリポジトリにシークレットを設定する方法

1. GitHubリポジトリページに移動
2. 「Settings」タブをクリック
3. 左サイドバーの「Secrets and variables」 > 「Actions」を選択
4. 「New repository secret」ボタンをクリック
5. 名前に「CLOUDFLARE_API_TOKEN」を入力し、値に取得したAPIトークンを貼り付け、「Add secret」をクリック
6. 同様の手順で「CLOUDFLARE_ACCOUNT_ID」も追加

## 注意事項

- APIトークンを他人と共有しないでください
- リポジトリを公開する場合は、トークンの権限を必要最小限に設定するか、特定のリソース（ゾーン、アカウント）に制限することを推奨します
- トークンの有効期限を設定することも可能です
- 定期的にトークンを更新することがセキュリティ上推奨されます

## トラブルシューティング

デプロイに失敗する場合、以下を確認してください：

1. シークレットが正しく設定されているか
2. APIトークンに必要な権限が付与されているか
3. トークンが有効（期限切れでない）か
4. GitHubアクションの設定ファイル（`.github/workflows/cloudflare-pages-deploy.yml`）が正しいか 