# バックエンド実装

## API エンドポイント設計

### 1. 動画情報取得 API
```typescript
// app/api/video-info/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

// リクエスト検証スキーマ
const requestSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
    { message: '有効なYouTube URLを入力してください' }
  )
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);
    
    // yt-dlpを使用して動画情報を取得
    const { stdout } = await execAsync(
      `yt-dlp --dump-json --no-playlist "${url}"`
    );
    
    const videoInfo = JSON.parse(stdout);
    
    return NextResponse.json({
      id: videoInfo.id,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnail,
      author: videoInfo.uploader,
      duration: formatDuration(videoInfo.duration),
    });
  } catch (error) {
    console.error('動画情報の取得に失敗:', error);
    return NextResponse.json(
      { error: error.message || '動画情報の取得に失敗しました' },
      { status: 400 }
    );
  }
}

// 秒数を「分:秒」形式にフォーマット
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

### 2. 変換リクエスト API
```typescript
// app/api/convert/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// Cloud Storageクライアント初期化
const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// リクエスト検証スキーマ
const requestSchema = z.object({
  videoId: z.string().min(1)
});

// 進行状況を保存する一時的なメモリストア
// 本番環境では Redis や Firestore などを使用
const conversionStatus = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoId } = requestSchema.parse(body);
    
    // 変換ID生成
    const conversionId = uuidv4();
    
    // 変換ステータスを初期化
    conversionStatus.set(conversionId, {
      status: 'pending',
      progress: 0,
      videoId,
    });
    
    // 非同期で変換処理を開始
    startConversionProcess(videoId, conversionId);
    
    return NextResponse.json({ conversionId });
  } catch (error) {
    console.error('変換リクエストの処理に失敗:', error);
    return NextResponse.json(
      { error: error.message || '変換リクエストの処理に失敗しました' },
      { status: 400 }
    );
  }
}

// 変換処理を非同期で実行
async function startConversionProcess(videoId: string, conversionId: string) {
  try {
    // ステータスを更新
    conversionStatus.set(conversionId, {
      ...conversionStatus.get(conversionId),
      status: 'processing',
      progress: 10,
    });
    
    // TODO: Cloud Run ジョブに変換タスクを送信
    // または、軽量な変換の場合はここで直接処理
    
    // 変換処理の模擬（実際はCloud Runジョブやタスクキューを使用）
    // 実装詳細は変換サービスのセクションで定義
    
    // 成功ステータスを設定
    setTimeout(() => {
      const fileName = `${videoId}.mp3`;
      const file = bucket.file(fileName);
      
      // 署名付きURLを生成（1時間有効）
      file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
      }).then(([url]) => {
        conversionStatus.set(conversionId, {
          status: 'completed',
          progress: 100,
          downloadUrl: url,
        });
      });
    }, 5000); // 模擬処理のため5秒後に完了
    
  } catch (error) {
    console.error('変換処理に失敗:', error);
    conversionStatus.set(conversionId, {
      ...conversionStatus.get(conversionId),
      status: 'failed',
      error: error.message,
    });
  }
}
```

### 3. 変換ステータス確認 API
```typescript
// app/api/conversion-status/route.ts
import { NextResponse } from 'next/server';

// 進行状況を保存する一時的なメモリストア（実際はRedisなど）
// convert/route.tsと共有
const conversionStatus = new Map();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: '変換IDが必要です' },
      { status: 400 }
    );
  }
  
  const status = conversionStatus.get(id);
  
  if (!status) {
    return NextResponse.json(
      { error: '指定された変換IDが見つかりません' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(status);
}
```

## Cloud Storage設定

### ストレージバケット設定
```typescript
// lib/storage.ts
import { Storage } from '@google-cloud/storage';

// Cloud Storageクライアント初期化
export const storage = new Storage();
export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// 署名付きURLの生成
export async function generateSignedUrl(fileName: string, expiryMinutes = 60) {
  const file = bucket.file(fileName);
  
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiryMinutes * 60 * 1000,
  });
  
  return url;
}

// ファイルアップロード
export async function uploadFile(buffer: Buffer, fileName: string) {
  const file = bucket.file(fileName);
  
  await file.save(buffer, {
    contentType: 'audio/mpeg',
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  
  return file;
}
```

## 環境変数設定
```
# .env.local
GCS_BUCKET_NAME=youtube-mp3-converter-files
GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account.json
YT_DLP_PATH=/usr/local/bin/yt-dlp
FFMPEG_PATH=/usr/local/bin/ffmpeg
MAX_CONVERSION_SIZE_MB=100
```

## レート制限の実装
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash Redis設定（または別のレート制限ソリューション）
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
});

// API呼び出しのレート制限
const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1m'), // 1分あたり10リクエスト
  analytics: true,
});

// 変換のレート制限（より厳しく）
const conversionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1h'), // 1時間あたり5変換
  analytics: true,
});

export async function middleware(request: NextRequest) {
  const ip = request.ip || '127.0.0.1';
  
  // API呼び出しのレート制限
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiLimit = await apiLimiter.limit(ip);
    
    if (!apiLimit.success) {
      return NextResponse.json(
        { error: 'レート制限を超えました。しばらくしてからもう一度お試しください。' },
        { status: 429 }
      );
    }
    
    // 変換APIのさらなる制限
    if (request.nextUrl.pathname === '/api/convert') {
      const conversionLimit = await conversionLimiter.limit(ip);
      
      if (!conversionLimit.success) {
        return NextResponse.json(
          { error: '変換リクエストの制限を超えました。1時間後にもう一度お試しください。' },
          { status: 429 }
        );
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

## エラーハンドリング
```typescript
// lib/error-handler.ts
import { ZodError } from 'zod';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof ZodError) {
    // バリデーションエラーの場合
    return {
      status: 400,
      message: '入力データが無効です',
      errors: error.errors,
    };
  }
  
  if (error instanceof Error) {
    // 一般的なエラー
    return {
      status: 500,
      message: error.message || 'サーバーエラーが発生しました',
    };
  }
  
  // その他の場合
  return {
    status: 500,
    message: '不明なエラーが発生しました',
  };
}
``` 