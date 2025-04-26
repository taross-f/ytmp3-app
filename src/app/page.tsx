"use client";

import React, { useState } from "react";
import { YouTubeUrlForm } from "@/components/youtube/YouTubeUrlForm";
import { VideoInfo } from "@/components/youtube/VideoInfo";
import { ConversionStatus } from "@/components/youtube/ConversionStatus";

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  duration: string;
}

export default function Home() {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionJobId, setConversionJobId] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; fileName: string } | null>(null);

  const handleUrlSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setConversionJobId(null);
    setDownloadInfo(null);
    
    try {
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '動画情報の取得に失敗しました');
      }
      
      const data = await response.json();
      setVideoData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setVideoData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async (videoId: string, format: 'mp3' | 'mp4') => {
    if (!videoData) return;
    
    setError(null);
    
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: `https://www.youtube.com/watch?v=${videoId}`,
          format
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '変換リクエストの送信に失敗しました');
      }
      
      const data = await response.json();
      setConversionJobId(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  };

  const handleConversionComplete = (downloadUrl: string, fileName: string) => {
    setDownloadInfo({ url: downloadUrl, fileName });
  };

  return (
    <div className="min-h-screen flex flex-col gradient-bg">
      <header className="glass-effect text-white p-6 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">YouTube コンバーター</h1>
        </div>
      </header>
      
      <main className="container mx-auto flex-grow p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <section className="mb-8 p-6 gradient-card rounded-xl shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-white">YouTube URLを入力</h2>
            <YouTubeUrlForm onSubmit={handleUrlSubmit} />
            
            {isLoading && (
              <div className="mt-4 text-center text-white">
                <p>動画情報を取得中...</p>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 backdrop-blur-sm text-white rounded-lg border border-red-500/30">
                <p>{error}</p>
              </div>
            )}
          </section>
          
          {videoData && !conversionJobId && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">動画情報</h2>
              <VideoInfo videoData={videoData} onConvert={handleConvert} />
            </section>
          )}
          
          {conversionJobId && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">変換状態</h2>
              <ConversionStatus 
                jobId={conversionJobId} 
                onComplete={handleConversionComplete} 
              />
            </section>
          )}
          
          {downloadInfo && (
            <section className="mb-8 p-6 gradient-card rounded-xl shadow-xl border border-green-500/30">
              <h2 className="text-xl font-semibold mb-4 text-white">ダウンロード準備完了</h2>
              <p className="mb-4 text-white">
                {downloadInfo.fileName.endsWith('.mp3')
                  ? 'MP3ファイルのダウンロードが準備できました。'
                  : '動画ファイルのダウンロードが準備できました。'}
              </p>
              <a 
                href={downloadInfo.url} 
                download={downloadInfo.fileName}
                className="inline-block px-6 py-3 gradient-button-success text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {downloadInfo.fileName.endsWith('.mp3') ? 'MP3をダウンロード' : '動画をダウンロード'}
              </a>
            </section>
          )}
        </div>
      </main>
      
      <footer className="glass-effect p-6 text-center text-white text-sm mt-auto">
        <div className="container mx-auto">
          <p>© 2025 YouTube コンバーター</p>
        </div>
      </footer>
    </div>
  );
}
