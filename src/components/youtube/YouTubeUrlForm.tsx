"use client";

import React, { useState } from "react";
import { z } from "zod";

const youtubeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.includes("youtube.com/watch") || url.includes("youtu.be/"),
    { message: "有効なYouTube URLを入力してください" }
  );

interface YouTubeUrlFormProps {
  onSubmit: (url: string) => Promise<void>;
}

export function YouTubeUrlForm({ onSubmit }: YouTubeUrlFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      youtubeUrlSchema.parse(url);
      setIsLoading(true);

      await onSubmit(url);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("不明なエラーが発生しました");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <input
          type="url"
          placeholder="YouTube URLを入力（例：https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-5 py-3 bg-white/90 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 shadow-lg placeholder-gray-500"
          disabled={isLoading}
        />
        {error && <p className="text-red-300 text-sm">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-5 py-3 gradient-button text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "チェック中..." : "動画情報を取得"}
      </button>
    </form>
  );
}
