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
    <div className="p-4 border rounded-md">
      <h3 className="font-medium mb-2">変換状態</h3>
      
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${statusData.progress}%` }}
          ></div>
        </div>
        <p className="text-sm mt-1 text-gray-600">{statusData.progress}% 完了</p>
      </div>
      
      {statusData.status === 'pending' && (
        <p>変換を準備中...</p>
      )}
      
      {statusData.status === 'processing' && (
        <p>変換処理中...</p>
      )}
      
      {statusData.status === 'completed' && statusData.result && (
        <div>
          <p className="text-green-600 mb-2">変換が完了しました！</p>
          <a 
            href={statusData.result.downloadUrl} 
            download={statusData.result.fileName}
            className="inline-block px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            MP3をダウンロード
          </a>
        </div>
      )}
      
      {statusData.status === 'failed' && (
        <p className="text-red-600">
          変換に失敗しました: {statusData.error || '不明なエラー'}
        </p>
      )}
    </div>
  );
}
