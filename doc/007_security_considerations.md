# セキュリティ対策

## 概要
YouTube to MP3 変換アプリケーションを安全に運用するためのセキュリティ対策を詳述します。ユーザーデータ保護、サービス保護、法的コンプライアンスの観点からセキュリティリスクを最小化する方法を説明します。

## 主なセキュリティリスク

1. **悪意のあるURL入力** - ユーザーが悪意のあるURLを入力する可能性
2. **リソース乱用** - APIやサービスの過剰使用による DoS 状態
3. **データ漏洩** - 変換済みファイルへの不正アクセス
4. **権限昇格** - サービスアカウント認証情報の悪用
5. **コード脆弱性** - 依存関係に含まれる既知の脆弱性
6. **法的リスク** - 著作権法違反の可能性

## 実装すべきセキュリティ対策

### 1. 入力検証とサニタイズ

```typescript
// lib/validators.ts
import { z } from 'zod';

// YouTube URLの検証スキーマ
export const youtubeUrlSchema = z.string().url().refine(
  (url) => {
    // 正規表現でYouTubeの有効なURLパターンをチェック
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
    return youtubeRegex.test(url);
  },
  { message: '有効なYouTube URLを入力してください' }
);

// コマンドインジェクション防止のためのサニタイズ関数
export function sanitizeUrl(url: string): string {
  // URL内のシェル特殊文字をエスケープ
  return url.replace(/[&|;$><`\\]/g, '');
}
```

### 2. レート制限とリソース制約

```typescript
// middleware.ts (追加部分)
// 特定IPからの大量リクエスト検出
const suspiciousIpDetector = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '5m'), // 5分間に100リクエスト以上は疑わしい
  analytics: true,
  prefix: 'ratelimit:suspicious:',
});

// 監視リスト登録
export async function addToWatchlist(ip: string) {
  await redis.set(`watchlist:${ip}`, Date.now(), { ex: 86400 }); // 24時間監視リスト
  console.warn(`監視リストにIPを追加: ${ip}`);
}

// 不正アクセス検出時の処理
async function handleSuspiciousActivity(req: NextRequest, ip: string) {
  // 監視リストに追加
  await addToWatchlist(ip);
  
  // Cloud Securityログに記録
  console.error(`不審なアクティビティを検出: ${ip}, ${req.url}`);
  
  // 一時的にアクセスを拒否
  return NextResponse.json(
    { error: 'セキュリティ上の問題が検出されました。しばらくしてからお試しください。' },
    { status: 403 }
  );
}
```

### 3. 安全なファイル処理

```typescript
// lib/file-handler.ts
import crypto from 'crypto';
import { extname } from 'path';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');

// ファイル名のハッシュ化
export function generateSecureFilename(originalId: string): string {
  // 元のIDとタイムスタンプ、ランダム値を組み合わせてハッシュ化
  const timestamp = Date.now().toString();
  const randomValue = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(originalId + timestamp + randomValue)
    .digest('hex');
  
  return `${hash.substring(0, 16)}.mp3`;
}

// メタデータからの機密情報除去
export function sanitizeMetadata(metadata: any): any {
  const safeMetadata = { ...metadata };
  
  // IPアドレスなどの個人識別情報を削除
  delete safeMetadata.userIp;
  delete safeMetadata.userAgent;
  delete safeMetadata.email;
  
  return safeMetadata;
}
```

### 4. 安全なサービス間通信

```typescript
// lib/service-auth.ts
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// API呼び出しのための認証ヘッダー生成
export function generateAuthHeaders() {
  const apiKey = process.env.CONVERSION_SERVICE_API_KEY || '';
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // HMAC署名の生成
  const signature = crypto.createHmac('sha256', apiKey)
    .update(`${timestamp}:${nonce}`)
    .digest('hex');
  
  return {
    'Authorization': `Bearer ${apiKey}`,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature
  };
}

// 受信側での認証検証
export function verifyServiceRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || '';
  const timestamp = req.headers.get('X-Timestamp') || '';
  const nonce = req.headers.get('X-Nonce') || '';
  const signature = req.headers.get('X-Signature') || '';
  
  // Bearer トークンの抽出
  const tokenMatch = authHeader.match(/Bearer\s+(\S+)/);
  if (!tokenMatch) {
    return false;
  }
  
  const token = tokenMatch[1];
  const expectedApiKey = process.env.CONVERSION_SERVICE_API_KEY || '';
  
  // APIキーの検証
  if (token !== expectedApiKey) {
    return false;
  }
  
  // タイムスタンプの検証（5分以内）
  const timestampValue = parseInt(timestamp, 10);
  const currentTime = Date.now();
  if (isNaN(timestampValue) || currentTime - timestampValue > 5 * 60 * 1000) {
    return false;
  }
  
  // 署名の検証
  const expectedSignature = crypto.createHmac('sha256', expectedApiKey)
    .update(`${timestamp}:${nonce}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 5. 依存関係の脆弱性対策

```bash
# セキュリティ監査スクリプト
# security-audit.sh

#!/bin/bash
set -e

echo "依存関係の脆弱性スキャンを実行中..."

# bunを使った脆弱性チェック
bun audit

# Dockerイメージのスキャン
echo "Dockerイメージのセキュリティスキャンを実行中..."
docker scan gcr.io/youtube-mp3-converter/main-app:latest
docker scan gcr.io/youtube-mp3-converter/converter-service:latest

# Node.jsの依存関係をアップデート
echo "依存関係を更新中..."
bun update

echo "セキュリティスキャン完了"
```

### 6. CORS対策

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'production' 
            ? 'https://mp3.example.com' 
            : 'http://localhost:3000' 
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};
```

### 7. 法的コンプライアンス

```typescript
// components/DisclaimerModal.tsx
import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    // 初回訪問時に表示
    const hasSeenDisclaimer = localStorage.getItem('disclaimerAccepted');
    if (!hasSeenDisclaimer) {
      setOpen(true);
    }
  }, []);
  
  const handleAccept = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">利用規約と免責事項</h2>
        <div className="space-y-4">
          <p>このサービスは個人的な利用のみを目的としています。著作権で保護されたコンテンツのダウンロードには、権利者の許可が必要な場合があります。</p>
          <p>以下の点に同意いただける場合のみ、本サービスをご利用ください：</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>ダウンロードしたコンテンツは個人的な利用のみに使用します</li>
            <li>著作権法に違反する方法でコンテンツを使用しません</li>
            <li>本サービスを継続的に使用して大量のコンテンツをダウンロードしません</li>
          </ul>
          <p className="font-semibold">本サービスの使用によって生じたいかなる法的問題についても、当サービスは責任を負いません。</p>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleAccept}>同意して続ける</Button>
        </div>
      </div>
    </Dialog>
  );
}
```

### 8. ログ記録と監視

```typescript
// lib/audit-logger.ts
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');

interface AuditLogEntry {
  timestamp: string;
  action: string;
  videoId?: string;
  ip?: string;
  userAgent?: string;
  status: string;
  details?: any;
}

export async function logAuditEvent(entry: Partial<AuditLogEntry>) {
  try {
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action: entry.action || 'unknown',
      status: entry.status || 'unknown',
      ...entry
    };
    
    // Cloud Loggingに記録
    console.log('AUDIT_LOG', JSON.stringify(logEntry));
    
    // 重要なイベントはCloud Storageにも保存
    if (entry.action === 'convert' || entry.action === 'download' || entry.status === 'error') {
      const date = new Date();
      const fileName = `audit-logs/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/audit-${date.getTime()}.json`;
      
      const file = bucket.file(fileName);
      await file.save(JSON.stringify(logEntry), {
        contentType: 'application/json',
        metadata: {
          contentType: 'application/json',
        }
      });
    }
  } catch (error) {
    console.error('監査ログの記録に失敗:', error);
  }
}
```

## セキュリティベストプラクティス

### 開発プロセス
- コードレビューでセキュリティチェックを含める
- 定期的な依存関係の監査と更新
- セキュアコーディングガイドラインの遵守

### デプロイメント
- 最小権限の原則に基づくサービスアカウント設定
- シークレット管理にGCP Secret Managerを使用
- イメージスキャンの実施

### 運用
- Cloud Securityコマンドセンターの有効化
- セキュリティアラートの設定
- 侵入検知と異常検出の実装
- 定期的なセキュリティレビュー 