import { NextResponse } from 'next/server';
import { z } from 'zod';

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
    
    const videoId = extractVideoId(url);
    
    const videoData = {
      id: videoId,
      title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      author: 'Rick Astley',
      duration: '3:33'
    };
    
    return NextResponse.json(videoData);
  } catch (error) {
    console.error('動画情報取得エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '動画情報の取得に失敗しました' },
      { status: 400 }
    );
  }
}

function extractVideoId(url: string): string {
  let videoId = '';
  
  if (url.includes('youtube.com/watch')) {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get('v') || 'dQw4w9WgXcQ';
  } else if (url.includes('youtu.be/')) {
    const parts = url.split('/');
    videoId = parts[parts.length - 1].split('?')[0];
  } else {
    videoId = 'dQw4w9WgXcQ'; // デフォルトのビデオID
  }
  
  return videoId;
}
