"use client";

import React, { useEffect, useState } from 'react';

interface ConversionStatusProps {
  jobId: string;
  onComplete?: (downloadUrl: string, fileName: string) => void;
}

interface StatusData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    downloadUrl?: string;
    fileName?: string;
  };
}

export function ConversionStatus({ jobId, onComplete }: ConversionStatusProps) {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversion-status?jobId=${jobId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '変換状態の取得に失敗しました');
        }
        
        const data = await response.json();
        setStatusData(data);
        
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false);
          clearInterval(pollInterval);
          
          if (data.status === 'completed' && data.result?.downloadUrl && data.result?.fileName && onComplete) {
            onComplete(data.result.downloadUrl, data.result.fileName);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [jobId, isPolling, onComplete]);

  if (!statusData) {
    return (
      <div className="text-center p-4">
        <p>変換状態を取得中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 gradient-card rounded-xl shadow-xl">
      <h3 className="font-medium mb-4 text-white">変換状態</h3>
      
      <div className="mb-6">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div 
            className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full shadow-inner" 
            style={{ width: `${statusData.progress}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2 text-white/80">{statusData.progress}% 完了</p>
      </div>
      
      {statusData.status === 'pending' && (
        <p className="text-white">変換を準備中...</p>
      )}
      
      {statusData.status === 'processing' && (
        <p className="text-white">変換処理中...</p>
      )}
      
      {statusData.status === 'completed' && statusData.result && (
        <div>
          <p className="text-green-300 mb-3">変換が完了しました！</p>
          <a 
            href={statusData.result.downloadUrl} 
            download={statusData.result.fileName}
            className="inline-block px-6 py-3 gradient-button-success text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {statusData.result.fileName?.endsWith('.mp3') ? 'MP3をダウンロード' : '動画をダウンロード'}
          </a>
        </div>
      )}
      
      {statusData.status === 'failed' && (
        <p className="text-red-300">
          変換に失敗しました: {statusData.error || '不明なエラー'}
        </p>
      )}
    </div>
  );
}
