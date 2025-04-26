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
    <div className="flex flex-col md:flex-row gap-6 rounded-xl gradient-card p-6 shadow-xl">
      <div className="flex-shrink-0">
        <img 
          src={videoData.thumbnail} 
          alt={videoData.title} 
          className="w-full md:w-56 h-auto rounded-lg shadow-lg"
        />
      </div>
      <div className="flex-grow">
        <h3 className="text-xl font-medium text-white">{videoData.title}</h3>
        <p className="text-sm text-white/70">{videoData.author}</p>
        <p className="mt-2 text-white/80">{videoData.duration}</p>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="mp3" 
                checked={selectedFormat === 'mp3'} 
                onChange={() => setSelectedFormat('mp3')}
                className="form-radio h-5 w-5 text-white border-white/30 focus:ring-white/30"
              />
              <span className="text-white">MP3（音声のみ）</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="radio" 
                name="format" 
                value="mp4" 
                checked={selectedFormat === 'mp4'} 
                onChange={() => setSelectedFormat('mp4')}
                className="form-radio h-5 w-5 text-white border-white/30 focus:ring-white/30"
              />
              <span className="text-white">MP4（動画）</span>
            </label>
          </div>
          
          <button 
            onClick={() => onConvert(videoData.id, selectedFormat)} 
            className="px-6 py-3 gradient-button text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {selectedFormat === 'mp3' ? 'MP3に変換する' : '動画をダウンロードする'}
          </button>
        </div>
      </div>
    </div>
  );
}
