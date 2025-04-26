"use client";

import React, { useState } from 'react';

interface VideoInfoProps {
  videoData: {
    id: string;
    title: string;
    thumbnail: string;
    author: string;
    duration: string;
  } | null;
  onConvert: (videoId: string, format: 'mp3' | 'mp4') => void;
}

export function VideoInfo({ videoData, onConvert }: VideoInfoProps) {
  const [selectedFormat, setSelectedFormat] = useState<'mp3' | 'mp4'>('mp3');
  
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
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="mp3" 
                checked={selectedFormat === 'mp3'} 
                onChange={() => setSelectedFormat('mp3')}
                className="form-radio"
              />
              <span>MP3（音声のみ）</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="mp4" 
                checked={selectedFormat === 'mp4'} 
                onChange={() => setSelectedFormat('mp4')}
                className="form-radio"
              />
              <span>MP4（動画）</span>
            </label>
          </div>
          
          <button 
            onClick={() => onConvert(videoData.id, selectedFormat)} 
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {selectedFormat === 'mp3' ? 'MP3に変換する' : '動画をダウンロードする'}
          </button>
        </div>
      </div>
    </div>
  );
}
