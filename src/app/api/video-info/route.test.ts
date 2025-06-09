import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { createMockRequest, mockVideoData } from '@/test/test-utils'

// Mock child_process
vi.mock('child_process')

describe('/api/video-info', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/video-info', () => {
    it('should return video info for valid YouTube URL using OEmbed', async () => {
      const request = createMockRequest('http://localhost:3000/api/video-info', {
        method: 'POST',
        body: { url: mockVideoData.validYouTubeUrl },
      })

      // Mock successful OEmbed response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test Video Title',
          author_name: 'Test Author',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        id: mockVideoData.videoId,
        title: 'Test Video Title',
        thumbnail: `https://img.youtube.com/vi/${mockVideoData.videoId}/maxresdefault.jpg`,
        author: 'Test Author',
        duration: '0:00',
      })
    })

    it('should handle youtu.be URLs correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/video-info', {
        method: 'POST',
        body: { url: mockVideoData.validYouTuBeUrl },
      })

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test Video Title',
          author_name: 'Test Author',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(mockVideoData.videoId)
    })

    it('should reject invalid URLs', async () => {
      const request = createMockRequest('http://localhost:3000/api/video-info', {
        method: 'POST',
        body: { url: mockVideoData.invalidUrl },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('有効なYouTube URLを入力してください')
    })

    it('should handle missing URL in request body', async () => {
      const request = createMockRequest('http://localhost:3000/api/video-info', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should extract video ID from URL with query parameters', async () => {
      const urlWithParams = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'
      const request = createMockRequest('http://localhost:3000/api/video-info', {
        method: 'POST',
        body: { url: urlWithParams },
      })

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Test Video Title',
          author_name: 'Test Author',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(mockVideoData.videoId)
    })
  })
})