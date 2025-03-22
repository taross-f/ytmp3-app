# デプロイメント手順

## 概要
このドキュメントでは、YouTube to MP3 変換アプリケーションをGoogle Cloud Platformにデプロイするための手順を説明します。システムは次の2つの主要コンポーネントで構成されています：

1. メインアプリケーション（Next.js）- Cloud Run
2. 変換サービス - Cloud Run

また、以下のGCPリソースも使用します：
- Cloud Storage - 変換済みファイルの保存
- Cloud Scheduler - 定期的なクリーンアップジョブ

## 前提条件
- Google Cloud アカウントとプロジェクト
- gcloud CLIのインストール
- Dockerのインストール
- 必要なAPIの有効化
  - Cloud Run API
  - Cloud Storage API
  - Cloud Scheduler API
  - Cloud Build API

## 環境セットアップ

### 1. GCPプロジェクトの設定
```bash
# GCPプロジェクトの作成または選択
gcloud projects create youtube-mp3-converter --name="YouTube MP3 Converter"
gcloud config set project youtube-mp3-converter

# 必要なAPIの有効化
gcloud services enable cloudbuild.googleapis.com \
                       run.googleapis.com \
                       storage.googleapis.com \
                       cloudscheduler.googleapis.com
```

### 2. Cloud Storageバケットの作成
```bash
# 一意の名前のバケットを作成
gcloud storage buckets create gs://youtube-mp3-converter-files \
    --location=asia-northeast1 \
    --default-storage-class=STANDARD \
    --uniform-bucket-level-access
```

### 3. サービスアカウントの設定
```bash
# メインアプリ用のサービスアカウント作成
gcloud iam service-accounts create youtube-mp3-app \
    --display-name="YouTube MP3 Converter App"

# 変換サービス用のサービスアカウント作成
gcloud iam service-accounts create youtube-mp3-converter \
    --display-name="YouTube MP3 Converter Service"

# 権限付与
gcloud storage buckets add-iam-policy-binding gs://youtube-mp3-converter-files \
    --member="serviceAccount:youtube-mp3-converter@youtube-mp3-converter.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud storage buckets add-iam-policy-binding gs://youtube-mp3-converter-files \
    --member="serviceAccount:youtube-mp3-app@youtube-mp3-converter.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"
```

### 4. API キーの作成（サービス間認証用）
```bash
# シークレットマネージャで保存
gcloud secrets create conversion-service-api-key \
    --replication-policy="automatic" \
    --data-file=/dev/stdin <<< "$(openssl rand -base64 32)"

# メインアプリへアクセス権付与
gcloud secrets add-iam-policy-binding conversion-service-api-key \
    --member="serviceAccount:youtube-mp3-app@youtube-mp3-converter.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## ビルドとデプロイ

### 1. 変換サービスのデプロイ
```bash
# ソースディレクトリに移動
cd converter-service

# Dockerイメージのビルドとプッシュ
gcloud builds submit --tag gcr.io/youtube-mp3-converter/converter-service

# Cloud Runへのデプロイ
gcloud run deploy converter-service \
    --image=gcr.io/youtube-mp3-converter/converter-service \
    --platform=managed \
    --region=asia-northeast1 \
    --service-account=youtube-mp3-converter@youtube-mp3-converter.iam.gserviceaccount.com \
    --memory=1Gi \
    --timeout=600 \
    --concurrency=10 \
    --set-env-vars="GCS_BUCKET_NAME=youtube-mp3-converter-files" \
    --allow-unauthenticated
```

### 2. メインアプリケーションのデプロイ
```bash
# プロジェクトルートディレクトリに移動
cd ..

# 環境変数の設定
echo "GCS_BUCKET_NAME=youtube-mp3-converter-files
CONVERSION_SERVICE_URL=$(gcloud run services describe converter-service --region=asia-northeast1 --format='value(status.url)')
CONVERSION_SERVICE_API_KEY=$(gcloud secrets versions access latest --secret=conversion-service-api-key)" > .env.production

# Dockerイメージのビルドとプッシュ
gcloud builds submit --tag gcr.io/youtube-mp3-converter/main-app

# Cloud Runへのデプロイ
gcloud run deploy youtube-mp3-app \
    --image=gcr.io/youtube-mp3-converter/main-app \
    --platform=managed \
    --region=asia-northeast1 \
    --service-account=youtube-mp3-app@youtube-mp3-converter.iam.gserviceaccount.com \
    --memory=512Mi \
    --concurrency=80 \
    --set-env-vars="GCS_BUCKET_NAME=youtube-mp3-converter-files,CONVERSION_SERVICE_URL=$(gcloud run services describe converter-service --region=asia-northeast1 --format='value(status.url)')" \
    --set-secrets="CONVERSION_SERVICE_API_KEY=conversion-service-api-key:latest" \
    --allow-unauthenticated
```

### 3. クリーンアップジョブの設定
```bash
# クリーンアップ関数のデプロイ
gcloud functions deploy cleanupExpiredFiles \
    --runtime=nodejs18 \
    --trigger-http \
    --region=asia-northeast1 \
    --service-account=youtube-mp3-converter@youtube-mp3-converter.iam.gserviceaccount.com \
    --entry-point=handleCleanup \
    --source=./functions/cleanup \
    --set-env-vars="GCS_BUCKET_NAME=youtube-mp3-converter-files"

# スケジューラーの設定（毎日午前4時に実行）
gcloud scheduler jobs create http cleanup-job \
    --schedule="0 4 * * *" \
    --uri="$(gcloud functions describe cleanupExpiredFiles --region=asia-northeast1 --format='value(httpsTrigger.url)')" \
    --http-method=POST \
    --oidc-service-account-email=youtube-mp3-converter@youtube-mp3-converter.iam.gserviceaccount.com \
    --oidc-token-audience="$(gcloud functions describe cleanupExpiredFiles --region=asia-northeast1 --format='value(httpsTrigger.url)')"
```

## カスタムドメインの設定（オプション）

### 1. ドメインの検証と設定
```bash
# ドメインのマッピング
gcloud beta run domain-mappings create \
    --service=youtube-mp3-app \
    --domain=mp3.example.com \
    --region=asia-northeast1
```

### 2. Cloud CDN と ロードバランサーの設定（大規模利用の場合）
```bash
# 外部IPの予約
gcloud compute addresses create youtube-mp3-ip \
    --global

# 証明書の作成
gcloud compute ssl-certificates create youtube-mp3-cert \
    --domains=mp3.example.com \
    --global

# ロードバランサーの設定
gcloud compute backend-services create youtube-mp3-backend \
    --global \
    --enable-cdn

# バックエンドサービスとCloud Runの接続
gcloud compute backend-services add-backend youtube-mp3-backend \
    --global \
    --network-endpoint-group=youtube-mp3-neg \
    --network-endpoint-group-region=asia-northeast1
```

## 監視とアラートの設定

### 1. Cloud Monitoringのアラート設定
```bash
# エラー率のアラート
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/error-rate-alert.yaml

# リソース使用量のアラート
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/resource-usage-alert.yaml
```

### 2. 予算アラートの設定
```bash
# 月額予算の設定
gcloud billing budgets create \
    --billing-account=BILLING_ACCOUNT_ID \
    --display-name="YouTube MP3 Converter Budget" \
    --budget-amount=50USD \
    --threshold-rule=percent=0.5 \
    --threshold-rule=percent=0.75 \
    --threshold-rule=percent=0.9 \
    --threshold-rule=percent=1.0
```

## CI/CD パイプラインの設定（オプション）

### 1. Cloud Buildトリガーの作成
```bash
# GitHubリポジトリとの接続
gcloud source repos create youtube-mp3-converter
git remote add google https://source.developers.google.com/p/youtube-mp3-converter/r/youtube-mp3-converter

# ビルドトリガーの作成
gcloud builds triggers create github \
    --repo-name=youtube-mp3-converter \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

### 2. cloudbuild.yaml の例
```yaml
steps:
  # テスト実行
  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'test']
  
  # メインアプリのビルドとデプロイ
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/main-app:$COMMIT_SHA', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/main-app:$COMMIT_SHA']
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'run'
      - 'deploy'
      - 'youtube-mp3-app'
      - '--image=gcr.io/$PROJECT_ID/main-app:$COMMIT_SHA'
      - '--region=asia-northeast1'
      - '--platform=managed'
  
  # 変換サービスのビルドとデプロイ
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/converter-service:$COMMIT_SHA', './converter-service']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/converter-service:$COMMIT_SHA']
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'run'
      - 'deploy'
      - 'converter-service'
      - '--image=gcr.io/$PROJECT_ID/converter-service:$COMMIT_SHA'
      - '--region=asia-northeast1'
      - '--platform=managed'

images:
  - 'gcr.io/$PROJECT_ID/main-app:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/converter-service:$COMMIT_SHA'
```

## デプロイ後の検証

### 1. 動作確認
- メインアプリケーションのURL: `https://youtube-mp3-app-xxxxx.a.run.app`
- 変換サービスの健全性チェック: `https://converter-service-xxxxx.a.run.app/health`

### 2. ログの確認
```bash
# メインアプリのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=youtube-mp3-app" --limit 10

# 変換サービスのログ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=converter-service" --limit 10
```

### 3. パフォーマンステスト
```bash
# 負荷テスト実行（別途Apache Benchなどのツールが必要）
ab -n 100 -c 10 https://youtube-mp3-app-xxxxx.a.run.app/
``` 