# 変換サービス実装

## 変換サービスの概要
変換サービスは、YouTubeの動画から音声を抽出してMP3ファイルに変換するための独立したコンポーネントです。このサービスは、主APIサーバーとは別のCloud Run インスタンスとして実装することで、リソース集約的な処理をメインアプリケーションから分離します。

## 技術的概要
- **デプロイ先**: Google Cloud Run
- **主要ツール**: yt-dlp, ffmpeg
- **処理フロー**: URLの受信 → 動画ダウンロード → 音声抽出 → MP3変換 → Cloud Storageへのアップロード
- **通信**: REST API経由

## セットアップスクリプト
```bash
#!/bin/bash
# setup-converter.sh

# yt-dlpのインストール
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# ffmpegのインストール
apt-get update && apt-get install -y ffmpeg

# 作業ディレクトリの作成
mkdir -p /tmp/youtube-converter
```

## Dockerfileの実装
```dockerfile
# Dockerfile.converter
FROM node:18-slim

# システム依存関係のインストール
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# yt-dlpのインストール
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係のコピーとインストール
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile

# アプリケーションコードのコピー
COPY . .

# 一時ディレクトリの作成
RUN mkdir -p /tmp/youtube-converter

# サービス起動
CMD ["bun", "run", "converter.ts"]
```

## 変換サービスの実装
```typescript
// converter.ts
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

// Cloud Storageの設定
const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');

// 一時ディレクトリ
const TMP_DIR = '/tmp/youtube-converter';

// コンバートリクエストの受信
app.post('/convert', async (req, res) => {
  const { videoId, youtubeUrl } = req.body;
  
  if (!videoId || !youtubeUrl) {
    return res.status(400).json({ error: 'videoIdとyoutubeUrlは必須です' });
  }
  
  // 実行IDの生成
  const jobId = uuidv4();
  const workDir = path.join(TMP_DIR, jobId);
  
  try {
    // 作業ディレクトリの作成
    await fs.promises.mkdir(workDir, { recursive: true });
    
    // 処理開始を通知
    res.status(202).json({ 
      jobId,
      status: 'processing',
      message: '変換処理を開始しました'
    });
    
    // バックグラウンドで変換処理を実行
    handleConversion(videoId, youtubeUrl, jobId, workDir);
    
  } catch (error) {
    console.error('変換開始エラー:', error);
    res.status(500).json({ error: '変換処理の開始に失敗しました' });
  }
});

// 変換ステータスの確認
app.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const statusFile = path.join(TMP_DIR, jobId, 'status.json');
  
  try {
    const statusData = await fs.promises.readFile(statusFile, 'utf8');
    const status = JSON.parse(statusData);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: '指定されたジョブが見つかりません' });
  }
});

// 非同期の変換処理
async function handleConversion(videoId: string, youtubeUrl: string, jobId: string, workDir: string) {
  const statusFile = path.join(workDir, 'status.json');
  const outputFile = path.join(workDir, `${videoId}.mp3`);
  
  try {
    // ステータスファイルの初期化
    await fs.promises.writeFile(
      statusFile, 
      JSON.stringify({ status: 'downloading', progress: 10 })
    );
    
    // YouTube動画のダウンロードと音声抽出
    console.log(`動画をダウンロード中: ${youtubeUrl}`);
    await fs.promises.writeFile(
      statusFile, 
      JSON.stringify({ status: 'downloading', progress: 30 })
    );
    
    // yt-dlpで音声のみを抽出してMP3形式で保存
    await execAsync(`
      yt-dlp -x --audio-format mp3 --audio-quality 0 \
      -o "${workDir}/%(id)s.%(ext)s" "${youtubeUrl}"
    `);
    
    // 変換完了を記録
    await fs.promises.writeFile(
      statusFile, 
      JSON.stringify({ status: 'converting', progress: 70 })
    );
    
    // Cloud Storageにアップロード
    console.log(`ファイルをアップロード中: ${outputFile}`);
    await bucket.upload(outputFile, {
      destination: `${videoId}.mp3`,
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          originalUrl: youtubeUrl,
          conversionTime: new Date().toISOString(),
        }
      }
    });
    
    // 署名付きURLを生成（24時間有効）
    const [url] = await bucket.file(`${videoId}.mp3`).getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });
    
    // 完了ステータスを記録
    await fs.promises.writeFile(
      statusFile, 
      JSON.stringify({ 
        status: 'completed', 
        progress: 100,
        downloadUrl: url,
        completedAt: new Date().toISOString()
      })
    );
    
    console.log(`変換完了: ${videoId}`);
    
    // 一時ファイルの削除（オプション）
    await fs.promises.unlink(outputFile).catch(() => {});
    
  } catch (error) {
    console.error(`変換エラー (${jobId}):`, error);
    
    // エラーステータスを記録
    await fs.promises.writeFile(
      statusFile, 
      JSON.stringify({ 
        status: 'failed', 
        error: error.message || '変換処理に失敗しました',
        failedAt: new Date().toISOString()
      })
    );
  }
}

// サーバー起動
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`変換サービスがポート ${PORT} で起動しました`);
});
```

## メインサービスとの連携
```typescript
// lib/conversion-service.ts
export async function requestConversion(videoId: string, youtubeUrl: string) {
  const response = await fetch(process.env.CONVERSION_SERVICE_URL + '/convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CONVERSION_SERVICE_API_KEY}`
    },
    body: JSON.stringify({ videoId, youtubeUrl }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '変換サービスへのリクエストに失敗しました');
  }
  
  return response.json();
}

export async function checkConversionStatus(jobId: string) {
  const response = await fetch(`${process.env.CONVERSION_SERVICE_URL}/status/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CONVERSION_SERVICE_API_KEY}`
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '変換ステータスの取得に失敗しました');
  }
  
  return response.json();
}
```

## 自動クリーンアップ処理
```typescript
// cleanup-job.ts
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');
const TMP_DIR = '/tmp/youtube-converter';

// 古い一時ファイルの削除
async function cleanupTempFiles() {
  try {
    const dirs = await fs.promises.readdir(TMP_DIR);
    const currentTime = Date.now();
    
    for (const dir of dirs) {
      const dirPath = path.join(TMP_DIR, dir);
      const stats = await fs.promises.stat(dirPath);
      
      // 24時間以上経過したディレクトリを削除
      const ageInHours = (currentTime - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
        console.log(`古い一時ディレクトリを削除: ${dirPath}`);
      }
    }
  } catch (error) {
    console.error('一時ファイルのクリーンアップエラー:', error);
  }
}

// Cloud Storageの古いファイルを削除
async function cleanupStorageFiles() {
  try {
    const [files] = await bucket.getFiles();
    const currentTime = Date.now();
    
    for (const file of files) {
      const metadata = file.metadata;
      const createTime = new Date(metadata.timeCreated).getTime();
      
      // 7日以上経過したファイルを削除
      const ageInDays = (currentTime - createTime) / (1000 * 60 * 60 * 24);
      if (ageInDays > 7) {
        await file.delete();
        console.log(`古いストレージファイルを削除: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('ストレージファイルのクリーンアップエラー:', error);
  }
}

// Cloud Scheduler用のエントリーポイント
export async function handleCleanup(req, res) {
  try {
    await cleanupTempFiles();
    await cleanupStorageFiles();
    res.status(200).send('クリーンアップが完了しました');
  } catch (error) {
    console.error('クリーンアップエラー:', error);
    res.status(500).send('クリーンアップに失敗しました');
  }
}

// スタンドアロン実行用
if (require.main === module) {
  Promise.all([cleanupTempFiles(), cleanupStorageFiles()])
    .then(() => console.log('クリーンアップが完了しました'))
    .catch(error => console.error('クリーンアップエラー:', error));
}
```

## サービス制限と最適化
- 最大ファイルサイズ: 100MB
- 変換時間制限: 10分
- 同時変換数制限: Cloud Run インスタンスに基づく
- キャッシング: 同じビデオIDに対する繰り返しリクエストの最適化
- メモリ使用量: 512MB〜1GB のCloud Runインスタンス
- CPU割り当て: 1 vCPU

## クォータと監視
- Cloud Monitoringによるリソース使用量モニタリング
- エラーログのCloud Loggingへの送信
- 過剰利用の防止とアラート設定
- 予算アラートの設定 