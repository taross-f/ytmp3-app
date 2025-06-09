import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, GET } from './route'
import { createMockRequest, mockVideoData } from '@/test/test-utils'

// Simple mocks for the modules
vi.mock('child_process')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('uuid', () => ({
  v4: () => 'test-job-id-123',
}))

describe('/api/convert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/convert', () => {
    it('should start conversion with valid YouTube URL', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert', {
        method: 'POST',
        body: { url: mockVideoData.validYouTubeUrl, format: 'mp3' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ jobId: 'test-job-id-123' })
    })

    it('should reject invalid URLs', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert', {
        method: 'POST',
        body: { url: mockVideoData.invalidUrl },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('有効なYouTube URLを入力してください')
    })

    it('should handle missing URL in request body', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should default to mp3 format when format is not specified', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert', {
        method: 'POST',
        body: { url: mockVideoData.validYouTubeUrl },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobId).toBe('test-job-id-123')
    })

    it('should handle youtu.be URLs', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert', {
        method: 'POST',
        body: { url: mockVideoData.validYouTuBeUrl, format: 'mp4' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobId).toBe('test-job-id-123')
    })
  })

  describe('GET /api/convert', () => {
    it('should return 400 when jobId is missing', async () => {
      const request = createMockRequest('http://localhost:3000/api/convert')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ジョブIDが指定されていません')
    })

    it('should return 404 when job is not found', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/convert?jobId=non-existent-job'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('指定されたジョブが見つかりません')
    })
  })
})