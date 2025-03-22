# フロントエンド実装

## ページ構成
- **ホームページ**: メインのURL入力フォーム、変換開始画面
- **変換ページ**: 変換状況表示と進捗状態
- **履歴ページ**: 過去の変換履歴（オプション機能）

## コンポーネント設計

### URLフォームコンポーネント
```typescript
// components/YouTubeUrlForm.tsx
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

// YouTubeのURL検証スキーマ
const youtubeUrlSchema = z.string().url().refine(
  (url) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
  { message: '有効なYouTube URLを入力してください' }
);

export function YouTubeUrlForm({ onSubmit }) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // URLの検証
      youtubeUrlSchema.parse(url);
      setIsLoading(true);
      
      // 親コンポーネントに通知
      await onSubmit(url);
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="url"
        placeholder="YouTube URLを入力（例：https://www.youtube.com/watch?v=..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full"
      />
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'チェック中...' : '動画情報を取得'}
      </Button>
    </form>
  );
}
```

### 動画情報表示コンポーネント
```typescript
// components/VideoInfo.tsx
export function VideoInfo({ videoData, onConvert }) {
  if (!videoData) return null;
  
  return (
    <div className="flex flex-col md:flex-row gap-4 rounded-lg border p-4">
      <div className="flex-shrink-0">
        <img 
          src={videoData.thumbnail} 
          alt={videoData.title} 
          className="w-full md:w-48 h-auto rounded-md"
        />
      </div>
      <div className="flex-grow">
        <h3 className="text-lg font-medium">{videoData.title}</h3>
        <p className="text-sm text-gray-500">{videoData.author}</p>
        <p className="mt-2">{videoData.duration}</p>
        <Button 
          onClick={() => onConvert(videoData.id)} 
          className="mt-4"
        >
          MP3に変換する
        </Button>
      </div>
    </div>
  );
}
```

### 変換状態コンポーネント
```typescript
// components/ConversionStatus.tsx
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export function ConversionStatus({ conversionId, onComplete }) {
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  
  useEffect(() => {
    const checkStatus = async () => {
      // ステータス確認APIの呼び出し
      const response = await fetch(`/api/conversion-status?id=${conversionId}`);
      const data = await response.json();
      
      setStatus(data.status);
      setProgress(data.progress);
      
      if (data.status === 'completed') {
        setDownloadUrl(data.downloadUrl);
        onComplete && onComplete(data);
      } else if (data.status !== 'failed') {
        // 1秒後に再チェック
        setTimeout(checkStatus, 1000);
      }
    };
    
    checkStatus();
  }, [conversionId]);
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">
        {status === 'pending' && '変換を準備中...'}
        {status === 'processing' && '変換中...'}
        {status === 'completed' && '変換完了！'}
        {status === 'failed' && '変換に失敗しました'}
      </h3>
      
      {(status === 'pending' || status === 'processing') && (
        <Progress value={progress} max={100} />
      )}
      
      {status === 'completed' && (
        <Button asChild>
          <a href={downloadUrl} download>MP3をダウンロード</a>
        </Button>
      )}
      
      {status === 'failed' && (
        <p className="text-red-500">
          エラーが発生しました。もう一度お試しください。
        </p>
      )}
    </div>
  );
}
```

## 状態管理
- React Query を使用した非同期処理管理
- フォーム状態のローカル管理
- 変換履歴はローカルストレージに保存（オプション）

## API通信
```typescript
// lib/api.ts
export const fetchVideoInfo = async (url: string) => {
  const response = await fetch('/api/video-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '動画情報の取得に失敗しました');
  }
  
  return response.json();
};

export const startConversion = async (videoId: string) => {
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '変換の開始に失敗しました');
  }
  
  return response.json();
};
```

## レスポンシブデザイン
- モバイルファーストの設計
- Tailwind CSSによるメディアクエリの活用
- フレックスボックスとグリッドレイアウトの活用

## アクセシビリティ
- セマンティックHTMLの使用
- キーボードナビゲーション対応
- スクリーンリーダー対応のaria属性
- フォーカス可視化

## テーマ設計
- ダークモード対応
- カラーパレットの定義
- 一貫したスペーシングと余白
- アニメーションとトランジション 