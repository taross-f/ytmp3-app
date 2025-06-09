import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { createMockRequest } from '@/test/test-utils'

// Mock fetch for internal API calls
global.fetch = vi.fn()

describe('/api/conversion-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/conversion-status', () => {
    it('should return job status when jobId is valid', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const mockJobData = {
        job: {
          id: jobId,
          status: 'completed',
          progress: 100,
          result: {
            downloadUrl: `/api/download/${jobId}`,
            fileName: 'test.mp3',
          },
        },
      }

      const request = createMockRequest(
        `http://localhost:3000/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      // Mock successful response from /api/convert
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'completed',
        progress: 100,
        error: undefined,
        result: {
          downloadUrl: `/api/download/${jobId}`,
          fileName: 'test.mp3',
        },
      })

      // Verify fetch was called with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/convert?jobId=${jobId}`
      )
    })

    it('should return 400 when jobId is missing', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/conversion-status'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ジョブIDが指定されていません')
    })

    it('should return 400 when jobId is invalid UUID', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/conversion-status?jobId=invalid-uuid'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 404 when job is not found', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const request = createMockRequest(
        `http://localhost:3000/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      // Mock 404 response from /api/convert
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('指定されたジョブが見つかりません')
    })

    it('should use https protocol for non-localhost hosts', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const request = createMockRequest(
        `https://example.com/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'example.com' } }
      )

      const mockJobData = {
        job: {
          id: jobId,
          status: 'processing',
          progress: 50,
        },
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      await response.json()

      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledWith(
        `https://example.com/api/convert?jobId=${jobId}`
      )
    })

    it('should handle processing job status', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const mockJobData = {
        job: {
          id: jobId,
          status: 'processing',
          progress: 75,
        },
      }

      const request = createMockRequest(
        `http://localhost:3000/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'processing',
        progress: 75,
        error: undefined,
        result: undefined,
      })
    })

    it('should handle failed job status with error', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const mockJobData = {
        job: {
          id: jobId,
          status: 'failed',
          progress: 0,
          error: 'Video download failed',
        },
      }

      const request = createMockRequest(
        `http://localhost:3000/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'failed',
        progress: 0,
        error: 'Video download failed',
        result: undefined,
      })
    })

    it('should handle fetch errors gracefully', async () => {
      const jobId = '12345678-1234-1234-1234-123456789abc'
      const request = createMockRequest(
        `http://localhost:3000/api/conversion-status?jobId=${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      // Mock fetch to throw an error
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })
})