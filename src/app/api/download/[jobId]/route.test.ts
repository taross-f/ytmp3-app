import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { createMockRequest } from '@/test/test-utils'

// Mock fs
vi.mock('fs')
vi.mock('util')

describe('/api/download/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/download/[jobId]', () => {
    it('should return 400 when jobId is missing', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/download/'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ジョブIDが指定されていません')
    })

    it('should return 404 when job is not found', async () => {
      const jobId = 'non-existent-job'
      const request = createMockRequest(
        `http://localhost:3000/api/download/${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('指定されたジョブが見つかりません')
    })

    it('should return 400 when job is not completed', async () => {
      const jobId = 'test-job-id-123'
      const mockJobData = {
        job: {
          id: jobId,
          status: 'processing',
          progress: 50,
        },
      }

      const request = createMockRequest(
        `http://localhost:3000/api/download/${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('変換が完了していないか、ファイルが利用できません')
    })

    it('should return 400 when job result is missing fileName', async () => {
      const jobId = 'test-job-id-123'
      const mockJobData = {
        job: {
          id: jobId,
          status: 'completed',
          result: {
            filePath: '/tmp/youtube-converter/test-job-id-123/test.mp3',
          },
        },
      }

      const request = createMockRequest(
        `http://localhost:3000/api/download/${jobId}`,
        { headers: { host: 'localhost:3000' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockJobData,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('変換が完了していないか、ファイルが利用できません')
    })

    it('should use https protocol for non-localhost hosts', async () => {
      const jobId = 'test-job-id-123'
      const request = createMockRequest(
        `https://example.com/api/download/${jobId}`,
        { headers: { host: 'example.com' } }
      )

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await GET(request)

      expect(global.fetch).toHaveBeenCalledWith(
        `https://example.com/api/convert?jobId=${jobId}`
      )
    })
  })
})