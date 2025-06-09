import { NextRequest } from 'next/server'

export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options
  
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export const mockVideoData = {
  validYouTubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  validYouTuBeUrl: 'https://youtu.be/dQw4w9WgXcQ',
  invalidUrl: 'https://example.com',
  videoId: 'dQw4w9WgXcQ',
}

export const mockExecResponse = {
  stdout: JSON.stringify({
    title: 'Test Video Title',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    uploader: 'Test Author',
    duration: 212,
  }),
  stderr: '',
}