import { NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

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
    
    const videoData = await getVideoInfo(url, videoId);
    
    return NextResponse.json(videoData);
  } catch (error) {
    console.error('動画情報取得エラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '動画情報の取得に失敗しました' },
      { status: 400 }
    );
  }
}

async function getVideoInfo(url: string, videoId: string) {
  try {
    const { stdout } = await execAsync(`yt-dlp --dump-json "${url}"`);
    const videoInfo = JSON.parse(stdout);
    
    const title = videoInfo.title || 'Unknown Title';
    const thumbnail = videoInfo.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const author = videoInfo.uploader || 'Unknown Author';
    
    const duration = formatDuration(videoInfo.duration || 0);
    
    return {
      id: videoId,
      title,
      thumbnail,
      author,
      duration
    };
  } catch (error) {
    console.error('yt-dlpエラー:', error);
    return {
      id: videoId,
      title: 'Video Title (情報取得に失敗しました)',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      author: 'Unknown',
      duration: '0:00'
    };
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
