import React from 'react';

interface VideoInfoProps {
  videoData: {
    id: string;
    title: string;
    thumbnail: string;
    author: string;
    duration: string;
  } | null;
  onConvert: (videoId: string) => void;
}

export function VideoInfo({ videoData, onConvert }: VideoInfoProps) {
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
        <button 
          onClick={() => onConvert(videoData.id)} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          MP3に変換する
        </button>
      </div>
    </div>
  );
}
